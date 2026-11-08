import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CalendarDays, MapPin, Search, Ticket, ArrowRight } from 'lucide-react';
import { api } from '../lib/api.js';

const categories = [
  'All',
  'Music',
  'Comedy',
  'Workshops',
  'Tech & Business',
  'Art & Culture',
  'Sports',
  'Food & Drinks',
];

function formatPrice(event) {
  const amount = Number(event.priceMinor ?? 0) / 100;
  const currency = event.currency || 'INR';

  if (amount === 0) return 'Free';

  try {
    return `From ${new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(value) {
  if (!value) return 'Date to be announced';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const search = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'All';
  const city = searchParams.get('city') || '';
  const pricing = searchParams.get('pricing') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('q', search.trim());
        if (category !== 'All') params.set('category', category);
        if (city.trim()) params.set('city', city.trim());
        if (pricing) params.set('pricing', pricing);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        params.set('page', searchParams.get('page') || '1');
        params.set('limit', '12');

        const result = await api(`/events?${params.toString()}`);

        if (!cancelled) {
          setEvents(Array.isArray(result.data) ? result.data : []);
          setPagination(result.pagination || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load events. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [search, category, city, pricing, from, to, searchParams]);

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);

    if (key === 'page') {
      if (value) next.set(key, value);
      else next.delete(key);
    } else {
      if (value && value !== 'All') next.set(key, value);
      else next.delete(key);
      next.delete('page');
    }

    setSearchParams(next);
  }

  function clearFilters() {
    const next = new URLSearchParams(searchParams);
    ['q', 'category', 'city', 'pricing', 'from', 'to', 'page'].forEach((key) =>
      next.delete(key)
    );
    setSearchParams(next);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 bg-gradient-to-br from-purple-950/70 via-black to-black">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <Link
            to="/"
            className="text-sm font-medium text-purple-300 hover:text-purple-200"
          >
            ← Back to EventHub
          </Link>

          <p className="mt-8 text-xs font-semibold tracking-[0.24em] text-purple-400">
            FIND YOUR NEXT EXPERIENCE
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Explore Events
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400 sm:text-base">
            Discover concerts, workshops, comedy shows and experiences worth
            remembering.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-3 rounded-2xl border border-gray-800 bg-gray-950 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-3">
            <Search className="h-4 w-4 shrink-0 text-purple-400" />
            <input
              value={search}
              onChange={(event) => updateFilter('q', event.target.value)}
              placeholder="Search events"
              aria-label="Search events"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-gray-500"
            />
          </label>

          <label className="flex flex-col gap-1 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2">
            <span className="text-xs text-gray-500">Category</span>
            <select
              value={category}
              onChange={(event) => updateFilter('category', event.target.value)}
              className="bg-transparent text-sm text-white outline-none"
            >
              {categories.map((item) => (
                <option key={item} value={item} className="bg-gray-900">
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2">
            <span className="text-xs text-gray-500">City</span>
            <input
              value={city}
              onChange={(event) => updateFilter('city', event.target.value)}
              placeholder="e.g. Chennai"
              aria-label="Filter by city"
              className="bg-transparent text-sm outline-none placeholder:text-gray-500"
            />
          </label>

          <label className="flex flex-col gap-1 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2">
            <span className="text-xs text-gray-500">Price</span>
            <select
              value={pricing}
              onChange={(event) => updateFilter('pricing', event.target.value)}
              className="bg-transparent text-sm text-white outline-none"
            >
              <option value="" className="bg-gray-900">
                All prices
              </option>
              <option value="free" className="bg-gray-900">
                Free events
              </option>
              <option value="paid" className="bg-gray-900">
                Paid events
              </option>
            </select>
          </label>

          <label className="flex flex-col gap-1 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2">
            <span className="text-xs text-gray-500">From date</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => updateFilter('from', event.target.value)}
              aria-label="From date"
              className="bg-transparent text-sm text-white outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2">
            <span className="text-xs text-gray-500">To date</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => updateFilter('to', event.target.value)}
              aria-label="To date"
              className="bg-transparent text-sm text-white outline-none"
            />
          </label>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-purple-500/60 hover:text-white"
          >
            Clear filters
          </button>
        </div>

        <div className="mb-5 mt-8 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold sm:text-2xl">
            {category === 'All' ? 'Upcoming events' : category}
          </h2>
          {!loading && pagination && (
            <span className="text-sm text-gray-500">
              {pagination.total ?? events.length} events
            </span>
          )}
        </div>

        {loading && (
          <div
            role="status"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-2xl border border-gray-800 bg-gray-900"
              />
            ))}
            <span className="sr-only">Loading events...</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
            <p className="font-semibold text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams(searchParams))}
              className="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-950 px-5 py-16 text-center">
            <Ticket className="mx-auto h-10 w-10 text-purple-400" />
            <h3 className="mt-4 text-lg font-semibold">No events found</h3>
            <p className="mt-2 text-sm text-gray-400">
              Try another search or clear some filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold hover:bg-purple-500"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <article
                key={event.id}
                className="group overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 transition hover:-translate-y-1 hover:border-purple-500/60"
              >
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-purple-950 via-gray-900 to-indigo-950">
                  <Ticket className="h-12 w-12 text-purple-300/70 transition group-hover:scale-110" />
                </div>

                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-300">
                      {event.category || 'Event'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(event.startAt)}
                    </span>
                  </div>

                  <h3 className="mt-4 line-clamp-2 text-lg font-bold">
                    {event.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-gray-400">
                    {event.description || 'Discover this upcoming event.'}
                  </p>

                  <div className="mt-4 space-y-2 text-sm text-gray-400">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-purple-400" />
                      <span className="truncate">
                        {[event.venue, event.city].filter(Boolean).join(', ') ||
                          'Location to be announced'}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-purple-400" />
                      {formatDate(event.startAt)}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-800 pt-4">
                    <span className="font-semibold text-white">
                      {formatPrice(event)}
                    </span>
                    <Link
                      to={`/events/${event.id}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold hover:bg-purple-500"
                    >
                      Details <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && pagination?.page && pagination?.total && (
          <div className="mt-8 flex items-center justify-between border-t border-gray-800 pt-5">
            <span className="text-sm text-gray-500">
              Page {pagination.page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={Number(pagination.page) <= 1}
                onClick={() =>
                  updateFilter('page', String(Number(pagination.page) - 1))
                }
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={
                  Number(pagination.page) * Number(pagination.limit || 12) >=
                  Number(pagination.total)
                }
                onClick={() =>
                  updateFilter('page', String(Number(pagination.page) + 1))
                }
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
