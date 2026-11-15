import { Router } from 'express';
import { prisma } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { lockEvent } from '../lib/event-lock.js';
import { parsePagination } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

const editableRoles = ['ATTENDEE', 'ORGANIZER'];
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
};
const eventSelect = {
  id: true,
  title: true,
  city: true,
  startAt: true,
  status: true,
  hiddenAt: true,
  moderationReason: true,
  moderatedAt: true,
  organizer: { select: { name: true } },
  moderatedBy: { select: { id: true, name: true } },
};
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readSearch(q) {
  if (q === undefined) return '';
  if (typeof q !== 'string' || q.trim().length > 100) {
    throw new HttpError(
      400,
      'INVALID_QUERY',
      'Search must be at most 100 characters.'
    );
  }
  return q.trim();
}

function validateFilter(value, allowed, field) {
  if (value !== undefined && !allowed.includes(value)) {
    throw new HttpError(400, 'INVALID_QUERY', `Invalid ${field} filter.`);
  }
}

async function list(model, query, where, select) {
  const { page, limit, skip } = parsePagination(query);
  const [data, total] = await prisma.$transaction([
    model.findMany({
      where,
      select,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
    }),
    model.count({ where }),
  ]);
  return { data, pagination: { page, limit, total } };
}

router.get('/users', async (req, res) => {
  const { q, role } = req.query;
  validateFilter(role, [...editableRoles, 'ADMIN'], 'role');
  const search = readSearch(q);
  const match = { contains: search, mode: 'insensitive' };
  const where = {
    role,
    ...(search && { OR: [{ name: match }, { email: match }] }),
  };
  res.json(await list(prisma.user, req.query, where, userSelect));
});

router.patch('/users/:userId/role', async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body ?? {};
  if (!editableRoles.includes(role)) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Select Attendee or Organizer.'
    );
  }
  if (!uuidPattern.test(userId)) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  const [updated] = await prisma.user.updateManyAndReturn({
    where: { id: userId, role: { not: 'ADMIN' } },
    data: { role },
    select: userSelect,
  });
  if (!updated) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === 'ADMIN') {
      throw new HttpError(
        403,
        'ADMIN_ROLE_PROTECTED',
        'Admin roles cannot be changed here.'
      );
    }
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found.');
  }
  res.json({ data: updated });
});

router.get('/events', async (req, res) => {
  const { q, status, hidden } = req.query;
  validateFilter(status, ['DRAFT', 'PUBLISHED', 'CANCELLED'], 'status');
  validateFilter(hidden, ['true', 'false'], 'hidden');
  const search = readSearch(q);
  const where = {
    status,
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
    ...(hidden !== undefined && {
      hiddenAt: hidden === 'true' ? { not: null } : null,
    }),
  };
  res.json(await list(prisma.event, req.query, where, eventSelect));
});

router.patch('/events/:eventId/visibility', async (req, res) => {
  const { eventId } = req.params;
  const { hidden, reason } = req.body ?? {};
  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
  if (
    typeof hidden !== 'boolean' ||
    !trimmedReason ||
    trimmedReason.length > 500
  ) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Choose a visibility state and enter a reason of 1–500 characters.'
    );
  }
  if (!uuidPattern.test(eventId)) {
    throw new HttpError(404, 'EVENT_UNAVAILABLE', 'Event not found.');
  }

  const data = await prisma.$transaction(async (tx) => {
    const locked = await lockEvent(tx, eventId);
    if (!locked.length) {
      throw new HttpError(404, 'EVENT_UNAVAILABLE', 'Event not found.');
    }

    const event = await tx.event.findUniqueOrThrow({
      where: { id: eventId },
      select: eventSelect,
    });
    if (Boolean(event.hiddenAt) === hidden) return event;

    const moderatedAt = new Date();
    return tx.event.update({
      where: { id: eventId },
      data: {
        hiddenAt: hidden ? moderatedAt : null,
        moderationReason: trimmedReason,
        moderatedById: req.user.id,
        moderatedAt,
      },
      select: eventSelect,
    });
  });
  res.json({ data });
});

export default router;
