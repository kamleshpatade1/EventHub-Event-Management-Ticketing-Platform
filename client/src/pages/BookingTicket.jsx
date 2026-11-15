import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Check, Copy, Printer, Ticket } from 'lucide-react';
import { api } from '../lib/api.js';
import {
  Alert,
  BookingPageFrame,
  ErrorMessage,
  LoadingState,
  Panel,
} from './BookingUI.jsx';
import {
  formatEventDate,
  getEventDetails,
  primaryButtonClass,
  secondaryButtonClass,
} from './bookingUtils.js';

function BookingTicket() {
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [copyMessage, setCopyMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchTicket() {
      try {
        const bookingResponse = await api(
          `/bookings/${encodeURIComponent(bookingId)}`
        );

        if (active) {
          setBooking(bookingResponse.data);
        }

        const ticketResponse = await api(
          `/bookings/${encodeURIComponent(bookingId)}/ticket`
        );

        const ticketData = ticketResponse.data;

        if (
          bookingResponse.data.status !== 'CONFIRMED' ||
          ticketData?.status !== 'CONFIRMED' ||
          typeof ticketData?.ticketCode !== 'string' ||
          ticketData.ticketCode.length === 0
        ) {
          const ticketError = new Error(
            'A valid ticket is not available for this booking.'
          );
          ticketError.status = 409;
          ticketError.code = 'BOOKING_NOT_CONFIRMED';
          throw ticketError;
        }

        if (active) {
          setTicket(ticketData);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchTicket();

    return () => {
      active = false;
    };
  }, [bookingId, retry]);

  function retryTicket() {
    setLoading(true);
    setError(null);
    setRetry((value) => value + 1);
  }

  async function copyTicketCode() {
    if (!ticket?.ticketCode) return;

    try {
      if (typeof navigator?.clipboard?.writeText === 'function') {
        await navigator.clipboard.writeText(ticket.ticketCode);
        setCopied(true);
        setCopyMessage('Ticket code copied to clipboard.');
        setTimeout(() => setCopied(false), 2500);
        return;
      }
      throw new Error('Clipboard API unavailable');
    } catch {
      const codeElement = document.getElementById('ticket-code');

      if (codeElement) {
        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(codeElement);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      setCopyMessage(
        'Automatic copying is unavailable. Your ticket code is selected; copy it manually.'
      );
    }
  }

  if (loading) {
    return (
      <BookingPageFrame title="Your Ticket">
        <Panel>
          <LoadingState label="Checking ticket availability…" />
        </Panel>
      </BookingPageFrame>
    );
  }

  const event = ticket?.event ?? getEventDetails(booking);
  const attendeeName = ticket?.attendee?.name || 'Attendee';
  const ticketCode = ticket?.ticketCode || '';

  const ticketAvailable =
    !error &&
    booking?.status === 'CONFIRMED' &&
    ticket?.status === 'CONFIRMED' &&
    ticketCode.length > 0;

  return (
    <BookingPageFrame
      subtitle="Keep your ticket code ready for event entrance check-in."
      title="Your Ticket"
    >
      <div className="space-y-6">
        {error ? (
          <div className="space-y-4">
            {error.status === 409 ? (
              <Alert tone="info">
                This booking does not currently have an available ticket.
                Tickets are available only after successful confirmation. If you
                recently completed payment, check your booking status again.
              </Alert>
            ) : (
              <ErrorMessage error={error} />
            )}

            {error.status !== 401 && error.status !== 404 && (
              <button
                className={primaryButtonClass}
                onClick={retryTicket}
                type="button"
              >
                Check again
              </button>
            )}
          </div>
        ) : ticketAvailable ? (
          <div className="ticket-print mx-auto max-w-2xl overflow-hidden rounded-3xl border-2 border-[#d4c7b9] bg-white shadow-md">
            {/* Top decorative pass header */}
            <div className="bg-[#211c18] px-6 py-6 text-[#fff4e8] sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff9979]">
                    <Ticket className="size-3.5" /> EventHub Admission Pass
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-[#fff4e8] sm:text-3xl">
                    {event?.title ?? 'Event'}
                  </h2>
                </div>

                <span className="rounded-full bg-[#e8f5ec] px-3.5 py-1 text-xs font-semibold text-[#1b6e49] border border-[#a3d9b8]">
                  Confirmed
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="border-b border-[#eadecc] pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                  Attendee
                </p>
                <p className="mt-1 font-serif text-xl font-bold text-[#211c18]">
                  {attendeeName}
                </p>
              </div>

              <dl className="grid gap-5 py-6 sm:grid-cols-2">
                <TicketDetail
                  label="Date & Time"
                  value={formatEventDate(event?.startAt, event?.timezone)}
                />

                <TicketDetail
                  label="Ends"
                  value={formatEventDate(event?.endAt, event?.timezone)}
                />

                <TicketDetail
                  label="Venue"
                  value={event?.venue ?? 'Not available'}
                />

                <TicketDetail
                  label="City"
                  value={event?.city ?? 'Not available'}
                />

                <TicketDetail
                  label="Timezone"
                  value={event?.timezone ?? 'Not available'}
                />

                <TicketDetail
                  label="Check-in status"
                  value={
                    booking?.checkedInAt
                      ? `Checked in · ${formatEventDate(
                          booking.checkedInAt,
                          event?.timezone
                        )}`
                      : 'Not checked in'
                  }
                />

                <TicketDetail label="Booking ID" value={ticket.bookingId} />
              </dl>

              {/* Perforated tear line effect */}
              <div className="relative my-4 flex items-center justify-between">
                <div className="h-6 w-3 rounded-r-full bg-[#f3eee6] -ml-6 sm:-ml-8 border-y border-r border-[#d4c7b9]" />
                <div className="w-full border-t-2 border-dashed border-[#d4c7b9]" />
                <div className="h-6 w-3 rounded-l-full bg-[#f3eee6] -mr-6 sm:-mr-8 border-y border-l border-[#d4c7b9]" />
              </div>

              <div className="rounded-2xl border-2 border-dashed border-[#9f3b27]/30 bg-[#faf7f2] p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                  Admission Verification Code
                </p>

                <p
                  id="ticket-code"
                  className="mt-3 select-all break-all font-mono text-2xl font-bold tracking-widest text-[#9f3b27] sm:text-3xl"
                >
                  {ticketCode}
                </p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    className="print:hidden inline-flex items-center gap-1.5 rounded-full border border-[#d4c7b9] bg-white px-4 py-2 text-xs font-semibold text-[#211c18] transition hover:border-[#9f3b27] hover:text-[#9f3b27]"
                    onClick={copyTicketCode}
                    type="button"
                  >
                    {copied ? (
                      <Check size={14} className="text-[#1b6e49]" />
                    ) : (
                      <Copy size={14} />
                    )}
                    {copied ? 'Copied!' : 'Copy ticket code'}
                  </button>
                </div>

                {copyMessage && (
                  <p
                    aria-live="polite"
                    className="print:hidden mt-2 text-xs text-[#63564b]"
                  >
                    {copyMessage}
                  </p>
                )}
              </div>

              <p className="mt-5 text-center text-xs text-[#8c7d70]">
                Present this code or printed pass at the venue door for
                validation.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {ticketAvailable && (
            <button
              className={primaryButtonClass}
              onClick={() => window.print()}
              type="button"
            >
              <Printer className="mr-2 size-4" /> Print ticket
            </button>
          )}

          {booking && (
            <Link
              className={secondaryButtonClass}
              to={`/bookings/${encodeURIComponent(booking.id)}`}
            >
              Booking details
            </Link>
          )}

          <Link className={secondaryButtonClass} to="/my-bookings">
            My bookings
          </Link>
        </div>
      </div>
    </BookingPageFrame>
  );
}

function TicketDetail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#63564b]">
        {label}
      </dt>

      <dd className="mt-1 break-words text-sm font-medium text-[#211c18]">
        {value}
      </dd>
    </div>
  );
}

export default BookingTicket;
