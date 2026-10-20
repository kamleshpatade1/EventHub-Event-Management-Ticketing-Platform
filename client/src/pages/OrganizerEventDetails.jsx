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

  async function performAction(action, confirmation) {
    if (!event) return;

    if (confirmation && !window.confirm(confirmation)) return;

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      if (action === 'publish') {
        await api(`/organizer/events/${event.id}/publish`, {
          method: 'POST',
        });
        setMessage('Event published successfully.');
      } else if (action === 'cancel') {
        await api(`/organizer/events/${event.id}/cancel`, {
          method: 'POST',
        });
        setMessage('Event cancelled.');
      } else if (action === 'delete') {
        await api(`/organizer/events/${event.id}`, {
          method: 'DELETE',
        });
        navigate('/organizer', {
          replace: true,
          state: { notice: 'Draft event deleted.' },
        });
        return;
      }

      await loadEvent();
    } catch (err) {
      setError(err.message || 'Unable to complete this action.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b12] p-8 text-white">
        Loading event...
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="min-h-screen bg-[#0b0b12] p-8 text-white">
        <p role="alert" className="mb-4 text-red-400">
          {error}
        </p>
        <button type="button" onClick={loadEvent} className="mr-4 underline">
          Try again
        </button>
        <Link to="/organizer" className="underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  if (!event) return null;

  const counts = event.counts ?? {};
  const isDraft = event.status === 'DRAFT';
  const isPublished = event.status === 'PUBLISHED';

  const statusColor =
    event.status === 'PUBLISHED'
      ? 'text-emerald-400 bg-emerald-500/10'
      : event.status === 'CANCELLED'
        ? 'text-red-400 bg-red-500/10'
        : 'text-amber-400 bg-amber-500/10';

  return (
    <main className="min-h-screen bg-[#0b0b12] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/organizer"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Organizer dashboard
        </Link>

        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}
            >
              {event.status}
            </span>

            <h1 className="mt-4 break-words text-3xl font-bold sm:text-4xl">
              {event.title}
            </h1>

            <p className="mt-3 text-gray-400">
              Manage your event, publishing status, and attendees.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={`/organizer/events/${event.id}/edit`}
              className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/5"
            >
              Edit event
            </Link>

            <Link
              to={`/organizer/events/${event.id}/attendees`}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold hover:bg-purple-500"
            >
              <Users size={17} />
              Attendees
            </Link>
          </div>
        </header>

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300"
          >
            {error}
          </div>
        )}

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
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="mb-3 flex items-center justify-between text-gray-400">
                <span className="text-sm">{label}</span>
                <Icon size={19} className="text-purple-300" />
              </div>
              <p className="text-3xl font-bold">{value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">
          <h2 className="mb-6 text-xl font-semibold">Event information</h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm text-gray-400">Category</p>
              <p>{event.category || 'Not set'}</p>
            </div>

            <div>
              <p className="mb-2 text-sm text-gray-400">Ticket price</p>
              <p>{formatPrice(event.priceMinor, event.currency)}</p>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                <CalendarDays size={16} />
                Starts
              </p>
              <p>{formatDate(event.startAt)}</p>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                <Clock size={16} />
                Ends
              </p>
              <p>{formatDate(event.endAt)}</p>
            </div>

            <div>
              <p className="mb-2 text-sm text-gray-400">Registration closes</p>
              <p>{formatDate(event.registrationClosesAt)}</p>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                <MapPin size={16} />
                Venue
              </p>
              <p>{event.venue}</p>
              <p className="mt-1 text-sm text-gray-400">
                {[event.address, event.city].filter(Boolean).join(', ')}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="mb-2 text-sm text-gray-400">Description</p>
              <p className="whitespace-pre-wrap leading-7 text-gray-300">
                {event.description}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">
          <h2 className="mb-2 text-xl font-semibold">Event actions</h2>
          <p className="mb-6 text-sm text-gray-400">
            Available actions depend on the event status and its bookings.
          </p>

          <div className="flex flex-wrap gap-3">
            {isDraft && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  performAction(
                    'publish',
                    'Publish this event? It will become visible to attendees.'
                  )
                }
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
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
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                <XCircle size={17} />
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
                className="rounded-xl border border-red-500/30 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                Delete draft
              </button>
            )}
          </div>

          <p className="mt-5 text-xs leading-5 text-gray-500">
            The server enforces publishing requirements and deletion or
            cancellation restrictions. If an action is not permitted, the API
            error will be displayed here.
          </p>
        </section>
      </div>
    </main>
  );
}

export default OrganizerEventDetails;
