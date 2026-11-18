import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api } from '../lib/api.js';
import {
  Alert,
  BookingPageFrame,
  ErrorMessage,
  LoadingState,
  Panel,
  StatusBadge,
} from './BookingUI.jsx';
import {
  formatEventDate,
  formatMoney,
  getEventDetails,
  primaryButtonClass,
  secondaryButtonClass,
} from './bookingUtils.js';

function TestCheckout() {
  const { checkoutId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingReference = searchParams.get('bookingId')?.trim();
  const checkoutPath = `/test-checkouts/${encodeURIComponent(checkoutId)}`;
  const [checkout, setCheckout] = useState(null);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState(null);
  const processingLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    api(checkoutPath, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setCheckout({ checkoutId, booking: data });
        }
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setCheckout({ checkoutId, error: requestError });
        }
      });
    return () => controller.abort();
  }, [checkoutId, checkoutPath, retry]);

  const current = checkout?.checkoutId === checkoutId ? checkout : null;
  const booking = current?.booking;
  const pending = booking?.status === 'PENDING_PAYMENT';
  const holdEndsAt = booking?.holdExpiresAt
    ? Date.parse(booking.holdExpiresAt)
    : null;
  const hasDeadline = pending && Number.isFinite(holdEndsAt);
  const remainingSeconds = hasDeadline
    ? Math.max(0, Math.ceil((holdEndsAt - now) / 1000))
    : null;
  const holdExpired = remainingSeconds === 0;
  const referenceMismatch = Boolean(
    booking && bookingReference && booking.id !== bookingReference
  );
  const event = getEventDetails(booking);

  useEffect(() => {
    if (!hasDeadline || holdExpired) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasDeadline, holdExpired]);

  async function submitOutcome(status) {
    if (processingLock.current || !pending || referenceMismatch) return;
    processingLock.current = true;
    setProcessing(status);
    setError(null);

    try {
      const response = await api(`${checkoutPath}/outcome`, {
        method: 'POST',
        body: { status },
      });
      if (response.data?.bookingId !== booking.id) {
        throw new Error(
          'We could not verify the booking. Open checkout again from booking details.'
        );
      }
      navigate(`/checkout/return?bookingId=${encodeURIComponent(booking.id)}`, {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError);
    } finally {
      processingLock.current = false;
      setProcessing(null);
    }
  }

  return (
    <BookingPageFrame
      subtitle="This is a test payment. No real money is charged."
      title="Test checkout"
    >
      <Panel className="max-w-2xl">
        {!current ? (
          <LoadingState label="Loading test checkout…" />
        ) : current.error || referenceMismatch ? (
          <div className="space-y-4">
            {referenceMismatch || current.error?.status === 404 ? (
              <Alert>
                This checkout is unavailable. Open it again from your booking
                details.
              </Alert>
            ) : (
              <ErrorMessage error={current.error} />
            )}
            {current.error && ![401, 404].includes(current.error.status) && (
              <button
                className={primaryButtonClass}
                onClick={() => {
                  setCheckout(null);
                  setRetry((value) => value + 1);
                }}
                type="button"
              >
                Retry checkout
              </button>
            )}
            <Link className={secondaryButtonClass} to="/my-bookings">
              My bookings
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eadecc] pb-5">
              <div>
                <h2 className="font-serif text-2xl font-bold">{event.title}</h2>
                <p className="mt-1 text-sm text-[#63564b]">
                  {formatEventDate(event.startAt, event.timezone)}
                  {event.venue && ` · ${event.venue}`}
                </p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#63564b]">1 ticket</p>
                <p className="mt-1 font-serif text-3xl font-bold">
                  {formatMoney(booking.amountMinor, booking.currency)}
                </p>
              </div>
              {hasDeadline && !holdExpired && (
                <p className="text-sm font-semibold tabular-nums text-[#a36209]">
                  Seat held for {Math.floor(remainingSeconds / 60)}:
                  {String(remainingSeconds % 60).padStart(2, '0')}
                </p>
              )}
            </div>

            {holdExpired && (
              <Alert tone="info">
                Your seat hold expired. Simulating a late payment sends it for
                review without issuing a ticket.
              </Alert>
            )}
            {error && <ErrorMessage error={error} />}
            {pending ? (
              <div>
                <p className="mb-3 text-sm text-[#63564b]">
                  {holdExpired
                    ? 'Try the late-payment case or return to your booking.'
                    : 'Successful payment issues your ticket. Failed payment releases your seat.'}
                </p>
                <div
                  className="flex flex-wrap gap-3"
                  aria-busy={Boolean(processing)}
                >
                  <button
                    className={primaryButtonClass}
                    disabled={Boolean(processing)}
                    onClick={() => submitOutcome('PAID')}
                    type="button"
                  >
                    {processing === 'PAID'
                      ? 'Processing test payment…'
                      : holdExpired
                        ? 'Simulate late payment'
                        : 'Simulate successful payment'}
                  </button>
                  {!holdExpired && (
                    <button
                      className={secondaryButtonClass}
                      disabled={Boolean(processing)}
                      onClick={() => submitOutcome('FAILED')}
                      type="button"
                    >
                      {processing === 'FAILED'
                        ? 'Processing failure…'
                        : 'Simulate failed payment'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#63564b]">
                This checkout has ended. Open your booking to see the result.
              </p>
            )}

            <Link
              className={secondaryButtonClass}
              to={`/bookings/${encodeURIComponent(booking.id)}`}
            >
              Return to booking
            </Link>
          </div>
        )}
      </Panel>
    </BookingPageFrame>
  );
}

export default TestCheckout;
