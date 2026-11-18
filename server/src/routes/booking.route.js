import { Router } from 'express';
import {
  cancelBooking,
  createBooking,
  createCheckout,
  createPaidBooking,
  getBooking,
  getBookingTicket,
  getEventBooking,
  getTestCheckout,
  listBookings,
  paymentWebhook,
  processTestCheckout,
  reconcilePayment,
} from '../controllers/booking.controller.js';
import { requireAuth } from '../middleware/auth.js';

// app.js mounts these routes under /api and keeps the webhook body as raw bytes.
const router = Router();

router.get('/bookings', requireAuth, listBookings);
router.get('/bookings/:bookingId', requireAuth, getBooking);
router.get('/bookings/:bookingId/ticket', requireAuth, getBookingTicket);
router.post('/bookings/:bookingId/cancel', requireAuth, cancelBooking);
router.post('/bookings/:bookingId/checkout', requireAuth, createCheckout);
router.get('/test-checkouts/:checkoutId', requireAuth, getTestCheckout);
router.post(
  '/test-checkouts/:checkoutId/outcome',
  requireAuth,
  processTestCheckout
);
router.post('/bookings/:bookingId/reconcile', requireAuth, reconcilePayment);
router.get('/events/:eventId/bookings/mine', requireAuth, getEventBooking);
router.post('/events/:eventId/bookings', requireAuth, createBooking);
router.post('/events/:eventId/bookings/paid', requireAuth, createPaidBooking);
router.post('/payments/webhook', paymentWebhook);

export default router;
