import { prisma } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { readAccessSession } from '../services/auth.service.js';

export async function requireAuth(req, res, next) {
  const session = readAccessSession(req.cookies?.accessToken);
  const user =
    session &&
    (await prisma.user.findFirst({
      where: {
        id: session.id,
        refreshTokens: {
          some: {
            familyId: session.familyId,
            usedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        },
      },
      select: { id: true, name: true, email: true, role: true },
    }));
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'Please log in.');

  req.user = user;
  next();
}

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new HttpError(
        403,
        'FORBIDDEN',
        'You do not have access to this resource.'
      );
    }
    next();
  };
