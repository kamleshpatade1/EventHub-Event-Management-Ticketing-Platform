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
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
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
      return 'bg-[#e8f5ec] text-[#1b6e49] border border-[#a3d9b8]';
    case 'DRAFT':
      return 'bg-[#fef3e2] text-[#a36209] border border-[#f4d19b]';
    case 'CANCELLED':
      return 'bg-[#fbebe8] text-[#9f3b27] border border-[#f4bebe]';
    default:
      return 'bg-[#faf7f2] text-[#63564b] border border-[#d4c7b9]';
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

  const loadEvents = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError('');

    try {
      const result = await api(`/organizer/events?page=${targetPage}&limit=10`);
      setEvents(result.data ?? []);
      setPagination(
        result.pagination ?? {
          page: targetPage,
          limit: 10,
          total: result.data?.length ?? 0,
        }
      );
    } catch (err) {
      setError(err.message || 'Unable to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

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
    <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#9f3b27]">
              ORGANIZER WORKSPACE
            </p>
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-[#211c18] sm:text-4xl">
              Your Events
            </h1>
            <p className="mt-1 text-sm text-[#63564b]">
              Create new listings, track attendance, and manage ticket check-in.
            </p>
          </div>

          <Link
            to="/organizer/events/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#9f3b27] px-6 py-2.5 text-sm font-semibold text-[#fff4e8] shadow-xs transition hover:bg-[#852f1e]"
          >
            <CirclePlus size={18} />
            Create event
          </Link>
        </header>

        <section className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#d4c7b9] pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#211c18]">
              All events
            </h2>
            <p className="mt-0.5 text-xs text-[#63564b]">
              {pagination.total} event
              {pagination.total === 1 ? '' : 's'} total
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadEvents(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#d4c7b9] bg-white px-4 py-1.5 text-xs font-semibold text-[#211c18] transition hover:bg-[#faf7f2] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-[#f4bebe] bg-[#fbebe8] p-4 text-xs font-medium text-[#9f3b27]"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadEvents(pagination.page)}
              className="mt-2 font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#d4c7b9] bg-white/70 p-12 text-center text-sm font-medium text-[#63564b]">
            Loading your events...
          </div>
        ) : !error && events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d4c7b9] bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f5e9e2] text-[#9f3b27]">
              <CalendarDays size={28} />
            </div>
            <h3 className="mt-4 font-serif text-2xl font-bold text-[#211c18]">
              No events listed yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#63564b]">
              Publish your first concert, workshop, or gathering to begin
              selling tickets.
            </p>
            <Link
              to="/organizer/events/new"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#9f3b27] px-6 py-2.5 text-sm font-semibold text-[#fff4e8] shadow-xs transition hover:bg-[#852f1e]"
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
                  className="rounded-2xl border border-[#d4c7b9] bg-white p-5 shadow-xs transition hover:border-[#9f3b27]/60 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-0.5 text-xs font-semibold ${statusClass(event.status)}`}
                        >
                          {event.status ?? 'UNKNOWN'}
                        </span>

                        {event.category && (
                          <span className="rounded-full bg-[#f5e9e2] px-3 py-0.5 text-xs font-semibold text-[#9f3b27]">
                            {event.category}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-xl font-bold text-[#211c18]">
                        <Link
                          to={`/organizer/events/${event.id}`}
                          className="hover:text-[#9f3b27] transition-colors"
                        >
                          {event.title || 'Untitled event'}
                        </Link>
                      </h3>

                      <div className="mt-4 flex flex-col gap-2.5 text-xs text-[#63564b] sm:flex-row sm:flex-wrap sm:gap-6">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} className="text-[#9f3b27]" />
                          {formatDate(event.startAt)}
                        </span>

                        {(event.city || event.venue) && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={14} className="text-[#9f3b27]" />
                            {[event.venue, event.city]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1.5 font-semibold text-[#211c18]">
                          <Ticket size={14} className="text-[#9f3b27]" />
                          {formatPrice(event.priceMinor, event.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 pt-1 sm:pt-0">
                      <Link
                        to={`/organizer/events/${event.id}`}
                        className="rounded-full border border-[#d4c7b9] bg-white px-4 py-1.5 text-xs font-semibold text-[#211c18] transition hover:bg-[#faf7f2] hover:border-[#9f3b27]"
                      >
                        Manage
                      </Link>

                      <Link
                        to={`/organizer/events/${event.id}/edit`}
                        className="rounded-full bg-[#211c18] px-4 py-1.5 text-xs font-semibold text-[#fff4e8] transition hover:bg-[#9f3b27]"
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
                className="mt-8 flex items-center justify-between gap-4 border-t border-[#d4c7b9] pt-6"
              >
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => loadEvents(pagination.page - 1)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d4c7b9] bg-white px-4 py-2 text-xs font-semibold text-[#211c18] transition hover:bg-[#faf7f2] disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span className="text-xs font-medium text-[#63564b]">
                  Page {pagination.page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={pagination.page >= totalPages || loading}
                  onClick={() => loadEvents(pagination.page + 1)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d4c7b9] bg-white px-4 py-2 text-xs font-semibold text-[#211c18] transition hover:bg-[#faf7f2] disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default OrganizerDashboard;
