import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { HttpError } from '../lib/errors.js';

const bcryptRounds = (() => {
  const value = Number.parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
  return Number.isInteger(value) && value >= 4 && value <= 31 ? value : 10;
})();

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateAccessToken = (user, familyId) =>
  jwt.sign({ id: user.id, familyId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });

const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user.id, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

async function createSession(
  user,
  familyId = crypto.randomUUID(),
  client = prisma
) {
  const accessToken = generateAccessToken(user, familyId);
  const refreshToken = generateRefreshToken(user);

  await client.refreshToken.create({
    data: {
      userId: user.id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { user: publicUser(user), accessToken, refreshToken };
}

function validateEmail(email, fields) {
  if (typeof email !== 'string' || !email.trim()) {
    fields.email = 'Email is required.';
    return;
  }

  const normalized = email.trim().toLowerCase();

  if (!normalized.includes('@')) {
    fields.email = 'Email must contain @.';
  } else if (normalized.length > 254) {
    fields.email = 'Email must be at most 254 characters.';
  }
}

export async function registerUser({ name, email, password } = {}) {
  const fields = {};

  if (typeof name !== 'string' || !name.trim()) {
    fields.name = 'Name is required.';
  } else if (name.trim().length > 100) {
    fields.name = 'Name must be at most 100 characters.';
  }

  validateEmail(email, fields);

  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 72
  ) {
    fields.password = 'Password must be 8–72 characters.';
  }

  if (Object.keys(fields).length) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Invalid registration details.',
      fields
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const passwordHash = await bcrypt.hash(password, bcryptRounds);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });

    return await createSession(user);
  } catch (error) {
    if (error instanceof HttpError) throw error;

    if (error?.code === 'P2002') {
      throw new HttpError(409, 'EMAIL_TAKEN', 'Email is already registered.');
    }

    throw error;
  }
}

export async function loginUser({ email, password } = {}) {
  const fields = {};
  validateEmail(email, fields);

  if (typeof password !== 'string' || !password) {
    fields.password = 'Password is required.';
  }

  if (Object.keys(fields).length) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Invalid login details.',
      fields
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid email or password.'
    );
  }

  return createSession(user);
}

function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

export function readAccessSession(token) {
  const payload = verifyToken(token, process.env.JWT_ACCESS_SECRET);
  return payload?.id && payload?.familyId ? payload : null;
}

// Serialize rotation and revocation before reading or writing a session family.
function lockSessionOwner(tx, userId) {
  return tx.$queryRaw`
    SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR NO KEY UPDATE
  `;
}

function revokeFamily(client, userId, familyId) {
  return client.refreshToken.updateMany({
    where: { userId, familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeSession(refreshToken, accessToken) {
  const stored = refreshToken
    ? await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(refreshToken) },
        select: { userId: true, familyId: true },
      })
    : null;
  const access = readAccessSession(accessToken);
  const session =
    stored ?? (access && { userId: access.id, familyId: access.familyId });
  if (!session) return;

  await prisma.$transaction(async (tx) => {
    await lockSessionOwner(tx, session.userId);
    await revokeFamily(tx, session.userId, session.familyId);
  });
}

function invalidRefreshToken() {
  return new HttpError(
    401,
    'INVALID_REFRESH_TOKEN',
    'Refresh token is invalid or expired.'
  );
}

export async function refreshSession(token) {
  const payload = verifyToken(token, process.env.JWT_REFRESH_SECRET);
  if (!payload?.id || !payload.jti) throw invalidRefreshToken();

  const result = await prisma.$transaction(async (tx) => {
    await lockSessionOwner(tx, payload.id);
    const stored = await tx.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    const now = new Date();

    if (
      !stored ||
      stored.userId !== payload.id ||
      stored.revokedAt ||
      stored.expiresAt <= now
    ) {
      throw invalidRefreshToken();
    }

    if (stored.usedAt) {
      await revokeFamily(tx, stored.userId, stored.familyId);
      return null;
    }

    await tx.refreshToken.update({
      where: { id: stored.id },
      data: { usedAt: now },
    });
    return createSession(stored.user, stored.familyId, tx);
  });

  if (!result) {
    throw new HttpError(
      401,
      'REFRESH_TOKEN_REUSED',
      'Refresh token reuse detected.'
    );
  }
  return result;
}
