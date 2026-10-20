import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Clock,
  MapPin,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import { api } from '../lib/api.js';

function formatDate(date) {
  if (!date) return 'Date not set';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return 'Date not set';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatPrice(priceMinor, currency = 'INR') {
  if (priceMinor == null) return 'Price not set';
  if (priceMinor === 0) return 'Free';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(priceMinor / 100);
}

function statusClass(status) {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-emerald-500/10 text-emerald-400';
    case 'DRAFT':
      return 'bg-amber-500/10 text-amber-400';
    case 'CANCELLED':
      return 'bg-red-500/10 text-red-400';
    default:
      return 'bg-white/10 text-gray-300';
  }
}

function OrganizerDashboard() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const result = await api(`/organizer/events?page=${page}&limit=10`);

      setEvents(result.data ?? []);
      setPagination(result.pagination ?? { page, limit: 10, total: 0 });
    } catch (err) {
      setError(err.message || 'Unable to load your events.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial events without calling the state-updating loadEvents
  // function directly from the effect.
  useEffect(() => {
    let active = true;

    async function fetchEvents() {
      try {
        const result = await api('/organizer/events?page=1&limit=10');

        if (!active) return;

        setEvents(result.data ?? []);
        setPagination(result.pagination ?? { page: 1, limit: 10, total: 0 });
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load your events.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchEvents();

    return () => {
      active = false;
    };
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.total / pagination.limit)
  );

  return (
    <main className="min-h-screen bg-[#0b0b12] px-4 py-10 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-purple-400">
              ORGANIZER WORKSPACE
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your events
            </h1>
            <p className="mt-2 text-gray-400">
              Create events and manage your existing listings.
            </p>
          </div>

          <Link
            to="/organizer/events/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold transition hover:bg-purple-500"
          >
            <CirclePlus size={19} />
            Create event
          </Link>
        </header>

        <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">All events</h2>
            <p className="mt-1 text-sm text-gray-400">
              {pagination.total} event
              {pagination.total === 1 ? '' : 's'} in total
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadEvents(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadEvents(pagination.page)}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center text-gray-400">
            Loading your events...
          </div>
        ) : !error && events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
            <CalendarDays size={42} className="mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-semibold">No events yet</h3>
            <p className="mx-auto mt-2 max-w-md text-gray-400">
              Your events will appear here after you create them.
            </p>
            <Link
              to="/organizer/events/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500"
            >
              <CirclePlus size={18} />
              Create your first event
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-purple-500/40 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(event.status)}`}
                        >
                          {event.status ?? 'UNKNOWN'}
                        </span>

                        {event.category && (
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">
                            {event.category}
                          </span>
                        )}
                      </div>

                      <h3 className="break-words text-xl font-semibold">
                        {event.title || 'Untitled event'}
                      </h3>

                      <div className="mt-4 flex flex-col gap-3 text-sm text-gray-400 sm:flex-row sm:flex-wrap sm:gap-5">
                        <span className="inline-flex items-center gap-2">
                          <Clock size={16} />
                          {formatDate(event.startAt)}
                        </span>

                        {(event.city || event.venue) && (
                          <span className="inline-flex items-center gap-2">
                            <MapPin size={16} />
                            {[event.venue, event.city]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-2">
                          <Ticket size={16} />
                          {formatPrice(event.priceMinor, event.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        to={`/organizer/events/${event.id}`}
                        className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
                      >
                        Manage
                      </Link>

                      <Link
                        to={`/organizer/events/${event.id}/edit`}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium transition hover:bg-purple-500"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Event pages"
                className="mt-8 flex items-center justify-between gap-4"
              >
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => loadEvents(pagination.page - 1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span className="text-sm text-gray-400">
                  Page {pagination.page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={pagination.page >= totalPages || loading}
                  onClick={() => loadEvents(pagination.page + 1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default OrganizerDashboard;
