import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { api } from '../src/lib/api.js';

const unauthorized = () => new Response(null, { status: 401 });
const success = () => Response.json({ data: { id: 'attendee' } });

test('restores the session and shares refresh across concurrent requests', async (t) => {
  let signedIn = false;
  let refreshes = 0;
  t.mock.method(globalThis, 'fetch', async (path) => {
    if (path === '/api/auth/refresh') {
      refreshes += 1;
      await setImmediate();
      signedIn = true;
      return success();
    }
    return signedIn ? success() : unauthorized();
  });

  const responses = await Promise.all([
    api('/auth/me'),
    api('/auth/me', { method: 'PATCH', body: { name: 'Attendee' } }),
    api('/bookings'),
  ]);
  assert.equal(responses.length, 3);
  assert.equal(refreshes, 1);
});

test('failed refresh and login errors do not cause retry loops', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (path) => {
    calls.push(path);
    return unauthorized();
  });

  await assert.rejects(api('/auth/login', { method: 'POST' }), { status: 401 });
  await assert.rejects(api('/auth/me'), { status: 401 });
  assert.equal(calls.filter((path) => path === '/api/auth/refresh').length, 1);
  assert.equal(calls.filter((path) => path === '/api/auth/login').length, 1);
});
