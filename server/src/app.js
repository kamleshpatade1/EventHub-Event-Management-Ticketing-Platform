import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { prisma } from './db.js';
import { HttpError, errorHandler } from './lib/errors.js';
import authRoutes from './routes/auth.route.js';
import adminRoutes from './routes/admin.route.js';
import organizerRoutes from './routes/organizer.route.js';
import eventRoutes from './routes/event.route.js';
import bookingRoutes from './routes/booking.route.js';

const app = express();
const configuredOrigin = process.env.CORS_ORIGIN;
const browserOrigin = /^https?:\/\/[^/]+$/.test(configuredOrigin ?? '')
  ? configuredOrigin
  : false;

app.use(
  cors({
    origin: browserOrigin,
    credentials: true,
  })
);

// The webhook signature is checked against the original bytes.
app.use('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }));
app.use(cookieParser());
app.use('/api', (req, res, next) => {
  const isReadRequest = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (isReadRequest) return next();

  const isPaymentWebhook =
    req.method === 'POST' && /^\/payments\/webhook\/?$/i.test(req.path);
  if (isPaymentWebhook) return next();

  const startsSession = /^\/auth\/(login|register)\/?$/i.test(req.path);
  const hasSessionCookie = req.cookies.accessToken || req.cookies.refreshToken;
  if (!startsSession && !hasSessionCookie) return next();

  const origin = req.get('Origin');
  const requestOrigin = `${req.protocol}://${req.get('Host')}`;

  if (!origin || (origin !== requestOrigin && origin !== browserOrigin)) {
    throw new HttpError(
      403,
      'UNTRUSTED_ORIGIN',
      'Request origin is not allowed.'
    );
  }

  next();
});
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));

app.get('/api/health', (req, res) => res.json({ data: { status: 'ok' } }));

app.get('/api/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ data: { status: 'ready' } });
  } catch {
    res.status(503).json({
      error: { code: 'NOT_READY', message: 'Not ready.', fields: {} },
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', bookingRoutes);

app.use('/api', () => {
  throw new HttpError(404, 'NOT_FOUND', 'Route not found.');
});

app.use(errorHandler);

export default app;
