import { useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { api } from '../lib/api.js';
import { Alert, BookingPageFrame, Panel } from './BookingUI.jsx';
import { primaryButtonClass, secondaryButtonClass } from './bookingUtils.js';

function TestCheckout() {
  const { checkoutId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const bookingId = searchParams.get('bookingId')?.trim() ?? '';
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const processingLock = useRef(false);

  async function submitOutcome(status) {
    if (processingLock.current || processing) return;
    processingLock.current = true;
    setProcessing(true);
    setError('');

    try {
      const response = await api(
        `/test-checkouts/${encodeURIComponent(checkoutId)}/outcome`,
        { method: 'POST', body: { status } }
      );
      const verifiedBookingId = response.data?.bookingId;

      if (!verifiedBookingId || verifiedBookingId !== bookingId) {
        setError(
          'We could not verify this checkout against its booking. Please open checkout again from your booking details.'
        );
        return;
      }

      navigate(
        `/checkout/return?bookingId=${encodeURIComponent(verifiedBookingId)}`
      );
    } catch (requestError) {
      if (
        requestError.status === 401 ||
        requestError.code === 'UNAUTHENTICATED'
      ) {
        setError('Your session has expired. Sign in again to continue.');
      } else if (
        requestError.status === 404 ||
        requestError.code === 'CHECKOUT_NOT_FOUND'
      ) {
        setError(
          'This test checkout is unavailable. Open your booking details to start a new checkout.'
        );
      } else if (
        requestError.status === 503 ||
        requestError.code === 'PAYMENT_PROVIDER_UNAVAILABLE' ||
        requestError.code === 'PAYMENT_WEBHOOK_NOT_CONFIGURED'
      ) {
        setError(
          'Test payments are temporarily unavailable. Please contact the event organizer or try again later.'
        );
      } else {
        setError(
          'We could not process this test payment. Please try again or return to your booking details.'
        );
      }
    } finally {
      processingLock.current = false;
      setProcessing(false);
    }
  }

  return (
    <BookingPageFrame
      subtitle="This is a simulated test payment environment. No real payment gateway or real currency is charged."
      title="Test Checkout"
    >
      <Panel className="max-w-2xl">
        <div className="space-y-6">
          <Alert tone="info">
            Choose an outcome to simulate the payment provider response. Your
            booking status will be verified and processed by the server upon
            receipt.
          </Alert>
          {typeof location.state?.notice === 'string' && (
            <Alert tone="info">{location.state.notice}</Alert>
          )}
          <div className="rounded-xl border border-[#d4c7b9] bg-[#faf7f2] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#63564b]">
              Test Checkout Session ID
            </p>
            <p className="mt-1.5 break-all font-mono text-sm font-semibold text-[#9f3b27]">
              {checkoutId}
            </p>
          </div>
          {!bookingId && (
            <Alert>
              The booking reference is missing. Return to your booking details
              and open checkout again.
            </Alert>
          )}
          {error && <Alert>{error}</Alert>}
          {processing && (
            <p
              aria-live="polite"
              role="status"
              className="text-sm font-medium text-[#63564b]"
            >
              Processing test payment outcome…
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className={primaryButtonClass}
              disabled={processing || !bookingId || !checkoutId}
              onClick={() => submitOutcome('PAID')}
              type="button"
            >
              {processing ? 'Processing…' : 'Simulate Successful Payment'}
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#f4bebe] bg-[#fbebe8] px-5 py-2.5 text-sm font-semibold text-[#9f3b27] transition-colors hover:bg-[#f8ded9] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={processing || !bookingId || !checkoutId}
              onClick={() => submitOutcome('FAILED')}
              type="button"
            >
              Simulate Failed Payment
            </button>
            <Link
              className={secondaryButtonClass}
              to={
                bookingId
                  ? `/bookings/${encodeURIComponent(bookingId)}`
                  : '/my-bookings'
              }
            >
              Return to booking
            </Link>
          </div>
        </div>
      </Panel>
    </BookingPageFrame>
  );
}

export default TestCheckout;
