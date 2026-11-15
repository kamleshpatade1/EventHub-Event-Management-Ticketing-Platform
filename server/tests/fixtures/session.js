import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

export async function createTestAccessToken(prisma, userId) {
  const familyId = randomUUID();
  await prisma.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: createHash('sha256').update(familyId).digest('hex'),
      expiresAt: new Date(Date.now() + 300_000),
    },
  });
  return jwt.sign({ id: userId, familyId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '5m',
  });
}
