import 'dotenv/config';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { HttpError } from '../src/lib/errors.js';
import {
  registerUser,
  loginUser,
  refreshSession,
} from '../src/services/auth.service.js';

process.env.JWT_ACCESS_SECRET ||= 'auth-test-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'auth-test-refresh-secret';

test('registration rejects an invalid email with HTTP 400', async () => {
  await assert.rejects(
    () =>
      registerUser({
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
      }),
    (error) => error instanceof HttpError && error.status === 400
  );
});

test('login rejects an invalid email with HTTP 400', async () => {
  await assert.rejects(
    () => loginUser({ email: 'invalid-email', password: 'password123' }),
    (error) => error instanceof HttpError && error.status === 400
  );
});

test('refresh without a token returns HttpError 401', async () => {
  await assert.rejects(
    () => refreshSession(),
    (error) => error instanceof HttpError && error.status === 401
  );
});

test(
  'register, login, refresh, token reuse revocation, and logout',
  {
    skip:
      !process.env.DATABASE_URL &&
      'DATABASE_URL is required for auth integration tests.',
  },
  async (t) => {
    const [{ default: app }, { prisma }] = await Promise.all([
      import('../src/app.js'),
      import('../src/db.js'),
    ]);

    const server = createServer(app);
    const email = `auth-test-${crypto.randomUUID()}@example.test`;

    await prisma.$connect();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    function cookiePair(response, name) {
      const headers = response.headers.getSetCookie?.() ?? [
        response.headers.get('set-cookie') ?? '',
      ];
      const entry = headers.find((header) => header.startsWith(`${name}=`));
      assert.ok(entry, `Expected ${name} cookie`);
      return entry.split(';', 1)[0];
    }

    async function post(path, body, cookie, origin = baseUrl) {
      return fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          ...(origin ? { origin } : {}),
          'content-type': 'application/json',
          ...(cookie ? { cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    }

    function me(cookie) {
      return fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } });
    }

    t.after(async () => {
      await prisma.user.deleteMany({ where: { email } });
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      await prisma.$disconnect();
    });

    // Register
    const registered = await post('/api/auth/register', {
      name: 'Auth Test User',
      email,
      password: 'password123',
    });
    assert.equal(registered.status, 201);
    assert.equal((await registered.json()).data.email, email);
    const originalRefreshCookie = cookiePair(registered, 'refreshToken');

    // Login
    const loggedIn = await post('/api/auth/login', {
      email,
      password: 'password123',
    });
    assert.equal(loggedIn.status, 200);
    const loginRefreshCookie = cookiePair(loggedIn, 'refreshToken');
    const loginAccessCookie = cookiePair(loggedIn, 'accessToken');
    const authenticated = await me(loginAccessCookie);
    assert.equal(authenticated.status, 200);
    assert.equal(authenticated.headers.get('cache-control'), 'no-store');

    const loginToken = loginRefreshCookie.slice('refreshToken='.length);
    const loginTokenHash = (await import('node:crypto')).default
      .createHash('sha256')
      .update(loginToken)
      .digest('hex');

    // Refresh successfully; the replacement stays in the same family.
    const refreshed = await post(
      '/api/auth/refresh',
      undefined,
      originalRefreshCookie
    );
    assert.equal(refreshed.status, 200);
    const replacementRefreshCookie = cookiePair(refreshed, 'refreshToken');
    const replacementAccessCookie = cookiePair(refreshed, 'accessToken');

    const oldToken = originalRefreshCookie.slice('refreshToken='.length);
    const oldTokenHash = crypto
      .createHash('sha256')
      .update(oldToken)
      .digest('hex');
    const oldRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: oldTokenHash },
    });
    assert.ok(oldRecord?.usedAt);

    const replacementToken = replacementRefreshCookie.slice(
      'refreshToken='.length
    );
    const replacementHash = crypto
      .createHash('sha256')
      .update(replacementToken)
      .digest('hex');
    const replacementRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: replacementHash },
    });
    assert.equal(replacementRecord.familyId, oldRecord.familyId);

    // Reusing the old token must revoke every token in its family.
    const reused = await post(
      '/api/auth/refresh',
      undefined,
      originalRefreshCookie
    );
    assert.equal(reused.status, 401);

    const reusedFamily = await prisma.refreshToken.findMany({
      where: { familyId: oldRecord.familyId },
    });
    assert.ok(reusedFamily.length >= 2);
    assert.ok(reusedFamily.every((token) => token.revokedAt));
    assert.equal((await me(replacementAccessCookie)).status, 401);
    assert.equal((await me(loginAccessCookie)).status, 200);

    // Logout revokes the whole family and returns 204.
    const loginRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: loginTokenHash },
    });
    assert.ok(loginRecord);

    for (const origin of ['https://untrusted.example', null]) {
      const rejected = await post(
        '/api/auth/logout',
        undefined,
        loginRefreshCookie,
        origin
      );
      assert.equal(rejected.status, 403);
      assert.equal((await me(loginAccessCookie)).status, 200);
    }

    const loggedOut = await post(
      '/api/auth/logout',
      undefined,
      loginRefreshCookie
    );
    assert.equal(loggedOut.status, 204);
    assert.equal(await loggedOut.text(), '');
    assert.equal((await me(loginAccessCookie)).status, 401);

    const logoutFamily = await prisma.refreshToken.findMany({
      where: { familyId: loginRecord.familyId },
    });
    assert.ok(logoutFamily.length >= 1);
    assert.ok(logoutFamily.every((token) => token.revokedAt));

    const racingLogin = await post('/api/auth/login', {
      email,
      password: 'password123',
    });
    const racingAccess = cookiePair(racingLogin, 'accessToken');
    const racingRefresh = cookiePair(racingLogin, 'refreshToken');
    const [rotation, logout] = await Promise.all([
      post('/api/auth/refresh', undefined, racingRefresh),
      post('/api/auth/logout', undefined, racingRefresh),
    ]);

    assert.equal(logout.status, 204);
    assert.equal((await me(racingAccess)).status, 401);
    if (rotation.ok) {
      assert.equal((await me(cookiePair(rotation, 'accessToken'))).status, 401);
      const replay = await post(
        '/api/auth/refresh',
        undefined,
        cookiePair(rotation, 'refreshToken')
      );
      assert.equal(replay.status, 401);
    } else {
      assert.equal(rotation.status, 401);
    }
  }
);
