import { HttpError } from '../lib/errors.js';
import {
  registerUser,
  loginUser,
  refreshSession,
  revokeSession,
} from '../services/auth.service.js';
import { prisma } from '../db.js';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

const refreshCookieOptions = {
  ...cookieOptions,
  path: '/api/auth',
};

function sendSession(res, session, status = 200) {
  res.cookie('accessToken', session.accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', session.refreshToken, {
    ...refreshCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(status).json({ data: session.user });
}

function clearSessionCookies(res) {
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', refreshCookieOptions);
}

export async function register(req, res) {
  return sendSession(res, await registerUser(req.body ?? {}), 201);
}

export async function login(req, res) {
  return sendSession(res, await loginUser(req.body ?? {}));
}

export async function refresh(req, res) {
  try {
    return sendSession(res, await refreshSession(req.cookies?.refreshToken));
  } catch (error) {
    if (error.status === 401 || error.statusCode === 401) {
      clearSessionCookies(res);
    }
    throw error;
  }
}

export function me(req, res) {
  return res.status(200).json({ data: req.user });
}

export async function logout(req, res) {
  await revokeSession(req.cookies?.refreshToken, req.cookies?.accessToken);
  clearSessionCookies(res);
  return res.status(204).end();
}

export async function updateMe(req, res) {
  const name = req.body?.name;

  if (typeof name !== 'string' || !name.trim()) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Please enter your name.', {
      name: 'Name is required.',
    });
  }

  const trimmedName = name.trim();

  if (trimmedName.length > 100) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Name must be 100 characters or fewer.',
      { name: 'Name must be 100 characters or fewer.' }
    );
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name: trimmedName },
    select: { id: true, name: true, email: true, role: true },
  });

  return res.status(200).json({ data: user });
}
