import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Ticket,
  Users,
  XCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../lib/api.js';

function formatDate(value) {
  if (!value) return 'Not set';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPrice(priceMinor, currency = 'INR') {
  if (priceMinor == null) return 'Not set';
  if (priceMinor === 0) return 'Free';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(priceMinor / 100);
}

function OrganizerEventDetails() {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.notice ?? '');
  const [actionLoading, setActionLoading] = useState(false);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await api(`/organizer/events/${eventId}`);
      setEvent(result.data);
    } catch (err) {
      setError(err.message || 'Unable to load this event.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    let active = true;

    async function fetchEvent() {
      try {
        const result = await api(`/organizer/events/${eventId}`);

        if (active) {
          setEvent(result.data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load this event.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchEvent();

    return () => {
      active = false;
    };
  }, [eventId]);

  async function performAction(action, confirmPrompt) {
    if (confirmPrompt && !window.confirm(confirmPrompt)) return;

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      if (action === 'delete') {
        await api(`/organizer/events/${eventId}`, { method: 'DELETE' });
        navigate('/organizer', {
          replace: true,
          state: { notice: 'Event was permanently deleted.' },
        });
        return;
      }

      const result = await api(`/organizer/events/${eventId}/${action}`, {
        method: 'POST',
      });
      setEvent(result.data);
      setMessage(
        action === 'publish'
          ? 'Event published successfully.'
          : 'Event cancelled.'
      );
    } catch (err) {
      setError(err.message || `Unable to ${action} event.`);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl flex-1 p-8 text-center text-sm font-medium text-[#63564b]">
          Loading event details...
        </main>
        <Footer />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
        <Navbar />
        <main className="mx-auto w-full max-w-lg flex-1 py-16 px-4">
          <div className="rounded-2xl border border-[#f4bebe] bg-[#fbebe8] p-8 text-center">
            <p role="alert" className="text-sm font-semibold text-[#9f3b27]">
              {error}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={loadEvent}
                className="rounded-full bg-[#211c18] px-5 py-2 text-xs font-semibold text-[#fff4e8]"
              >
                Try again
              </button>
              <Link
                to="/organizer"
                className="rounded-full border border-[#d4c7b9] bg-white px-5 py-2 text-xs font-semibold text-[#211c18]"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) return null;

  const counts = event.counts ?? {};
  const isDraft = event.status === 'DRAFT';
  const isPublished = event.status === 'PUBLISHED';

  const statusColor =
    event.status === 'PUBLISHED'
      ? 'text-[#1b6e49] bg-[#e8f5ec] border border-[#a3d9b8]'
      : event.status === 'CANCELLED'
        ? 'text-[#9f3b27] bg-[#fbebe8] border border-[#f4bebe]'
        : 'text-[#a36209] bg-[#fef3e2] border border-[#f4d19b]';

  return (
    <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link
          to="/organizer"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#63564b] hover:text-[#9f3b27] transition-colors"
        >
          <ArrowLeft size={14} /> Organizer dashboard
        </Link>

        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-start border-b border-[#d4c7b9] pb-6">
          <div>
            <span
              className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusColor}`}
            >
              {event.status}
            </span>

            <h1 className="mt-3 break-words font-serif text-3xl font-extrabold tracking-tight text-[#211c18] sm:text-4xl">
              {event.title}
            </h1>

            <p className="mt-2 text-sm text-[#63564b]">
              Manage event status, review registration statistics, and inspect
              attendees.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {event.editLocked ? (
              <p className="self-center text-xs text-[#8c7d70]">
                Editing locked while bookings exist.
              </p>
            ) : (
              <Link
                to={`/organizer/events/${event.id}/edit`}
                className="rounded-full border border-[#d4c7b9] bg-white px-5 py-2 text-xs font-semibold text-[#211c18] transition hover:bg-[#faf7f2] hover:border-[#9f3b27]"
              >
                Edit event
              </Link>
            )}

            <Link
              to={`/organizer/events/${event.id}/attendees`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#9f3b27] px-5 py-2 text-xs font-semibold text-[#fff4e8] transition hover:bg-[#852f1e] shadow-xs"
            >
              <Users size={15} />
              Attendees & Check-in
            </Link>
          </div>
        </header>

        {event.hiddenAt && (
          <p className="mb-6 rounded-2xl border border-[#f4d19b] bg-[#fef3e2] p-4 text-xs font-medium text-[#a36209]">
            An admin hid this event. Public discovery, new bookings, and
            first-time check-in are paused while it is hidden.
          </p>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-[#a3d9b8] bg-[#e8f5ec] p-4 text-xs font-medium text-[#1b6e49]"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-[#f4bebe] bg-[#fbebe8] p-4 text-xs font-semibold text-[#9f3b27]"
          >
            {error}
          </div>
        )}

        {/* Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Bookings',
              value: counts.bookings ?? 0,
              icon: Ticket,
            },
            {
              label: 'Checked in',
              value: counts.checkedIn ?? 0,
              icon: CheckCircle2,
            },
            {
              label: 'Seats remaining',
              value: counts.seatsLeft ?? event.capacity ?? 0,
              icon: Users,
            },
          ].map(({ label, value, icon: Icon }) => (
            <article
              key={label}
              className="rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs"
            >
              <div className="mb-3 flex items-center justify-between text-[#63564b]">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {label}
                </span>
                <Icon size={18} className="text-[#9f3b27]" />
              </div>
              <p className="font-serif text-3xl font-extrabold text-[#211c18]">
                {value}
              </p>
            </article>
          ))}
        </section>

        {/* Info panel */}
        <section className="rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs sm:p-8">
          <h2 className="mb-6 font-serif text-xl font-bold text-[#211c18] border-b border-[#eadecc] pb-3">
            Event information
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                Category
              </p>
              <p className="text-sm font-medium text-[#211c18]">
                {event.category || 'Not set'}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                Ticket price
              </p>
              <p className="font-serif text-lg font-bold text-[#9f3b27]">
                {formatPrice(event.priceMinor, event.currency)}
              </p>
            </div>

            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                <CalendarDays size={14} className="text-[#9f3b27]" />
                Starts
              </p>
              <p className="text-sm font-medium text-[#211c18]">
                {formatDate(event.startAt)}
              </p>
            </div>

            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                <Clock size={14} className="text-[#9f3b27]" />
                Ends
              </p>
              <p className="text-sm font-medium text-[#211c18]">
                {formatDate(event.endAt)}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                Registration closes
              </p>
              <p className="text-sm font-medium text-[#211c18]">
                {formatDate(event.registrationClosesAt)}
              </p>
            </div>

            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                <MapPin size={14} className="text-[#9f3b27]" />
                Venue
              </p>
              <p className="text-sm font-medium text-[#211c18]">
                {event.venue}
              </p>
              <p className="mt-0.5 text-xs text-[#63564b]">
                {[event.address, event.city].filter(Boolean).join(', ')}
              </p>
            </div>

            <div className="sm:col-span-2 border-t border-[#eadecc] pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#4d4036]">
                {event.description}
              </p>
            </div>
          </div>
        </section>

        {/* Actions panel */}
        <section className="mt-8 rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs sm:p-8">
          <h2 className="mb-1 font-serif text-xl font-bold text-[#211c18]">
            Event actions
          </h2>
          <p className="mb-6 text-xs text-[#63564b]">
            Available actions depend on the event status and whether tickets
            have been booked.
          </p>

          <div className="flex flex-wrap gap-3">
            {isDraft && !event.hiddenAt && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  performAction(
                    'publish',
                    'Publish this event? It will become visible to attendees.'
                  )
                }
                className="rounded-full bg-[#1b6e49] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-[#145336] disabled:opacity-50 shadow-xs"
              >
                {actionLoading ? 'Please wait...' : 'Publish event'}
              </button>
            )}

            {isPublished && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  performAction(
                    'cancel',
                    'Cancel this event? This action may affect existing bookings.'
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-[#f4bebe] bg-[#fbebe8] px-5 py-2.5 text-xs font-semibold text-[#9f3b27] transition hover:bg-[#f8ded9] disabled:opacity-50"
              >
                <XCircle size={15} />
                Cancel event
              </button>
            )}

            {isDraft && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  performAction(
                    'delete',
                    'Permanently delete this draft event? This cannot be undone.'
                  )
                }
                className="rounded-full border border-[#f4bebe] bg-[#fbebe8] px-5 py-2.5 text-xs font-semibold text-[#9f3b27] transition hover:bg-[#f8ded9] disabled:opacity-50"
              >
                Delete draft
              </button>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default OrganizerEventDetails;
