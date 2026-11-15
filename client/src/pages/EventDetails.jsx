import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import {
  CalendarDays,
  MapPin,
  Ticket,
  Users,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../auth/useAuth.js';
import { api } from '../lib/api.js';
import { getEventCover } from './eventCatalog.js';
import {
  formatEventDateTime,
  getBookingState,
  isEventPaid,
} from './eventDetailsUtils.js';

function getBookingErrorMessage(error) {
  if (error?.status === 401 || error?.code === 'UNAUTHENTICATED') {
    return 'Your session has expired. Sign in again to continue booking.';
  }

  if (error?.status === 403 || error?.code === 'FORBIDDEN') {
    return 'You do not have permission to book this event.';
  }

  if (error?.code === 'EVENT_SOLD_OUT') {
    return 'This event is sold out.';
  }

  if (error?.code === 'REGISTRATION_CLOSED') {
    return 'Registration for this event is closed.';
  }

  if (error?.code === 'EVENT_UNAVAILABLE') {
    return 'This event is no longer available for booking.';
  }

  if (error?.code === 'PAYMENT_REQUIRED') {
    return 'This event requires payment. Refresh the page and try again.';
  }

  if (error?.code === 'PAYMENT_NOT_REQUIRED') {
    return 'This event no longer requires payment. Refresh the page and try again.';
  }

  if (error?.code === 'PAYMENT_HOLD_EXPIRED') {
    return 'Your payment hold expired. Please try booking the event again.';
  }

  if (error?.code === 'BOOKING_NOT_PAYABLE') {
    return 'This booking is no longer awaiting payment. View its booking details for the latest status.';
  }

  if (
    error?.code === 'BOOKING_NOT_FOUND' ||
    error?.code === 'PAYMENT_NOT_FOUND'
  ) {
    return 'We could not find this booking or its payment. Please try booking again.';
  }

  if (error?.status >= 500) {
    return 'We could not complete your booking right now. Please try again.';
  }

  return 'We could not complete your booking. Please try again.';
}

function formatPrice(event) {
  if (!Number.isFinite(event.priceMinor) || event.priceMinor < 0) {
    return 'Price unavailable';
  }

  if (event.priceMinor === 0) return 'Free';

  const amount = event.priceMinor / 100;
  const currency = event.currency || 'INR';

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function EventDetails() {
  const { eventId } = useParams();
  const { loading: authLoading, setUser, user } = useAuth();
  const userId = user?.id;
  const location = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingRequiresSignIn, setBookingRequiresSignIn] = useState(false);
  const [bookingLookup, setBookingLookup] = useState(null);
  const bookingLock = useRef(false);
  const eventUrl = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEvent() {
      setLoading(true);
      setError('');

      try {
        const result = await api(`/events/${encodeURIComponent(eventId)}`);
        if (!cancelled) setEvent(result.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || 'Unable to load event details. Please try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvent();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const currentLookup =
    userId &&
    bookingLookup?.userId === userId &&
    bookingLookup.eventId === eventId
      ? bookingLookup
      : null;
  const existingBooking = currentLookup?.booking;
  const checkingBooking = Boolean(userId && !currentLookup);

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();
    api(`/events/${encodeURIComponent(eventId)}/bookings/mine`, {
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setBookingLookup({ eventId, userId, booking: data });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setBookingLookup({ eventId, userId, failed: true });
      });
    return () => controller.abort();
  }, [eventId, userId]);

  async function handleBooking() {
    if (bookingLock.current || bookingLoading) return;

    setBookingError('');
    setBookingRequiresSignIn(false);

    if (!user) {
      navigate('/login', { state: { from: eventUrl } });
      return;
    }

    if (existingBooking?.id) {
      navigate(`/bookings/${encodeURIComponent(existingBooking.id)}`);
      return;
    }

    bookingLock.current = true;
    setBookingLoading(true);

    try {
      if (isEventPaid(event)) {
        const bookingResponse = await api(
          `/events/${encodeURIComponent(eventId)}/bookings`,
          { method: 'POST' }
        );
        const booking = bookingResponse.data ?? bookingResponse.ticket;
        const alreadyBooked = bookingResponse.created === false;

        if (!booking?.id) {
          throw new Error('The booking response did not include a booking ID.');
        }

        if (booking.status !== 'PENDING_PAYMENT') {
          navigate(`/bookings/${encodeURIComponent(booking.id)}`, {
            state: alreadyBooked
              ? { notice: 'You already have an active booking for this event.' }
              : undefined,
          });
          return;
        }

        const checkoutResponse = await api(
          `/bookings/${encodeURIComponent(booking.id)}/checkout`,
          { method: 'POST' }
        );
        const checkoutId = checkoutResponse.data?.checkout?.id;

        if (!checkoutId) {
          throw new Error(
            'The checkout response did not include a checkout ID.'
          );
        }

        navigate(
          `/checkout/test/${encodeURIComponent(checkoutId)}?bookingId=${encodeURIComponent(booking.id)}`,
          {
            state: alreadyBooked
              ? {
                  notice:
                    'You already have an active booking. Continue its checkout below.',
                }
              : undefined,
          }
        );
        return;
      }

      const bookingResponse = await api(
        `/events/${encodeURIComponent(eventId)}/bookings`,
        { method: 'POST' }
      );
      const booking = bookingResponse.data ?? bookingResponse.ticket;

      if (!booking?.id) {
        throw new Error('The booking response did not include a booking ID.');
      }

      navigate(`/bookings/${encodeURIComponent(booking.id)}`, {
        state:
          bookingResponse.created === false
            ? { notice: 'You already have an active booking for this event.' }
            : undefined,
      });
    } catch (requestError) {
      if (
        requestError?.status === 401 ||
        requestError?.code === 'UNAUTHENTICATED'
      ) {
        setUser(null);
        setBookingRequiresSignIn(true);
      }
      setBookingError(getBookingErrorMessage(requestError));
    } finally {
      bookingLock.current = false;
      setBookingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6">
          <div role="status" className="animate-pulse space-y-6">
            <div className="h-6 w-32 rounded-full bg-[#d4c7b9]/60" />
            <div className="h-10 w-2/3 rounded-xl bg-[#d4c7b9]/60" />
            <div className="aspect-[3/2] max-h-[28rem] rounded-2xl bg-[#d4c7b9]/40" />
            <span className="sr-only">Loading event details...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
        <Navbar />
        <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-16">
          <div className="rounded-2xl border border-[#d4c7b9] bg-white p-8 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fbebe8] text-[#9f3b27]">
              <Ticket className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold text-[#211c18]">
              Event unavailable
            </h1>
            <p role="alert" className="mt-2 text-sm text-[#63564b]">
              {error || 'We could not find this event.'}
            </p>
            <Link
              to="/events"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#211c18] px-5 py-2.5 text-sm font-semibold text-[#fff4e8] transition hover:bg-[#9f3b27]"
            >
              <ArrowLeft className="h-4 w-4" /> Browse all events
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const available = Number(event.availability);
  const bookingState = getBookingState(event, currentTime);
  const bookingStateLabel = {
    available: 'Available',
    sold_out: 'Sold out',
    registration_closed: 'Registration closed',
    cancelled: 'Event cancelled',
    unavailable: 'Booking unavailable',
  }[bookingState.status];
  const bookingActionLabel = bookingState.canBook
    ? Number(event.priceMinor ?? 0) > 0
      ? 'Continue to payment'
      : 'Book free ticket'
    : bookingStateLabel;

  return (
    <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
      <Navbar />

      <header className="border-b border-[#d4c7b9] bg-[#211c18] text-[#fff4e8]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#ff9979] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All events
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <span className="rounded-full bg-[#fff4e8]/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#fff4e8]">
              {event.category || 'Event'}
            </span>
            {event.status && (
              <span className="text-xs uppercase tracking-wider text-[#d4c7b9]">
                {String(event.status).toLowerCase()}
              </span>
            )}
          </div>

          <h1 className="mt-3 max-w-4xl font-serif text-3xl font-extrabold tracking-tight text-[#fff4e8] sm:text-5xl">
            {event.title}
          </h1>

          <p className="mt-4 flex items-center gap-2 text-sm text-[#d4c7b9] sm:text-base">
            <MapPin
              className="h-4 w-4 shrink-0 text-[#ff9979]"
              aria-hidden="true"
            />
            {[event.venue, event.address, event.city]
              .filter(Boolean)
              .join(', ') || 'Location to be announced'}
          </p>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-12">
        <div className="space-y-8">
          <div className="aspect-[3/2] max-h-[30rem] overflow-hidden rounded-2xl border border-[#d4c7b9] bg-[#eadecc] shadow-xs">
            <img
              src={getEventCover(event)}
              alt=""
              width="768"
              height="512"
              className="size-full object-cover"
            />
          </div>

          <section className="rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs sm:p-8">
            <h2 className="font-serif text-2xl font-bold text-[#211c18]">
              About this event
            </h2>
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-[#4d4036]">
              {event.description ||
                'More information about this event will be available soon.'}
            </p>
          </section>

          <section className="rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs sm:p-8">
            <h2 className="font-serif text-2xl font-bold text-[#211c18]">
              Event information
            </h2>
            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3.5">
                <CalendarDays
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#9f3b27]"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                    Date & Time
                  </p>
                  <p className="mt-1 text-base font-medium text-[#211c18]">
                    {formatEventDateTime(event.startAt, event.timezone)}
                  </p>
                </div>
              </div>

              {event.endAt && (
                <div className="flex items-start gap-3.5">
                  <Clock
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#9f3b27]"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                      Ends
                    </p>
                    <p className="mt-1 text-base font-medium text-[#211c18]">
                      {formatEventDateTime(event.endAt, event.timezone)}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-[#8c7d70]">
                Timezone: {event.timezone || 'Unavailable'}
              </p>

              <div className="flex items-start gap-3.5 border-t border-[#eadecc] pt-4">
                <MapPin
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#9f3b27]"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                    Venue
                  </p>
                  <p className="mt-1 text-base font-medium text-[#211c18]">
                    {[event.venue, event.address, event.city]
                      .filter(Boolean)
                      .join(', ') || 'To be announced'}
                  </p>
                </div>
              </div>

              {event.organizer?.name && (
                <div className="flex items-start gap-3.5 border-t border-[#eadecc] pt-4">
                  <Users
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#9f3b27]"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                      Organizer
                    </p>
                    <p className="mt-1 text-base font-medium text-[#211c18]">
                      {event.organizer.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside>
          <div className="sticky top-24 rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-sm sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#63564b]">
              Ticket price
            </p>
            <p className="mt-2 font-serif text-3xl font-extrabold text-[#211c18]">
              {formatPrice(event)}
            </p>

            <div className="mt-5 border-t border-[#eadecc] pt-5">
              <p className="text-sm font-medium text-[#211c18]">
                {Number.isFinite(available)
                  ? available > 0
                    ? `${available} places available`
                    : 'No places currently available'
                  : 'Availability subject to confirmation'}
              </p>

              <p className="mt-2 text-xs leading-relaxed text-[#63564b]">
                {event.registrationClosesAt
                  ? `Registration closes ${formatEventDateTime(event.registrationClosesAt, event.timezone)}`
                  : 'Check event details before booking.'}
              </p>
            </div>

            <p
              aria-live="polite"
              className="mt-4 text-xs font-medium text-[#63564b]"
            >
              Booking status:{' '}
              <span className="font-semibold text-[#211c18]">
                {existingBooking
                  ? existingBooking.status === 'PENDING_PAYMENT'
                    ? 'Awaiting payment'
                    : 'Already booked'
                  : bookingStateLabel}
              </span>
            </p>

            {isEventPaid(event) && (
              <p className="mt-4 rounded-xl border border-[#eadecc] bg-[#faf7f2] p-3 text-xs leading-relaxed text-[#63564b]">
                Paid ticket cancellation and refunds are not supported in this
                MVP. This is a simulated test payment. No real payment gateway
                or charge is involved, and no real money is charged.
              </p>
            )}

            {existingBooking ? (
              <Link
                to={`/bookings/${encodeURIComponent(existingBooking.id)}`}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#211c18] px-5 py-3 font-semibold text-[#fff4e8] transition hover:bg-[#9f3b27]"
              >
                View booking <Ticket className="h-4 w-4" />
              </Link>
            ) : checkingBooking ? (
              <p
                role="status"
                className="mt-6 text-center text-sm text-[#63564b]"
              >
                Checking your booking…
              </p>
            ) : bookingState.canBook ? (
              <button
                type="button"
                onClick={handleBooking}
                disabled={bookingLoading || authLoading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#9f3b27] px-5 py-3 font-semibold text-[#fff4e8] transition hover:bg-[#852f1e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bookingLoading
                  ? 'Processing booking...'
                  : authLoading
                    ? 'Checking sign-in...'
                    : bookingActionLabel}{' '}
                {!bookingLoading && <Ticket className="h-4 w-4" />}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-full bg-[#eadecc] px-5 py-3 font-semibold text-[#8c7d70]"
              >
                {bookingActionLabel}
              </button>
            )}

            {!existingBooking &&
              !checkingBooking &&
              bookingState.status === 'sold_out' && (
                <p
                  role="alert"
                  className="mt-3 text-center text-xs font-semibold text-[#9f3b27]"
                >
                  This event is sold out.
                </p>
              )}
            {currentLookup?.failed && (
              <Link
                to="/my-bookings"
                className="mt-3 block text-center text-xs font-semibold text-[#9f3b27] underline"
              >
                Check my bookings
              </Link>
            )}
            {bookingError && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-[#f4bebe] bg-[#fbebe8] p-3 text-xs leading-relaxed text-[#9f3b27]"
              >
                {bookingError}{' '}
                {bookingRequiresSignIn && (
                  <Link
                    className="font-bold underline underline-offset-2"
                    to="/login"
                    state={{ from: eventUrl }}
                  >
                    Sign in
                  </Link>
                )}
              </p>
            )}

            {!existingBooking && !checkingBooking && bookingState.canBook && (
              <p className="mt-3 text-center text-[11px] leading-5 text-[#8c7d70]">
                Booking and payment availability are confirmed in the next step.
              </p>
            )}
          </div>
        </aside>
      </section>

      <Footer />
    </div>
  );
}
