import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CalendarDays, MapPin, Search, Ticket, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../lib/api.js';
import {
  buildCatalogQuery,
  clearCatalogFilters,
  eventCategories,
  getEventCover,
  updateCatalogFilter,
} from './eventCatalog.js';

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
    const controller = new AbortController();
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError('');

      try {
        const path = buildCatalogQuery({
          search,
          category,
          city,
          pricing,
          from,
          to,
          page: searchParams.get('page') || '1',
        });
        const result = await api(path, {
          signal: controller.signal,
        });

        if (!cancelled) {
          setEvents(Array.isArray(result.data) ? result.data : []);
          setPagination(result.pagination || null);
        }
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') {
          setError(err.message || 'Unable to load events. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timeoutId = setTimeout(loadEvents, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [search, category, city, pricing, from, to, searchParams]);

  function updateFilter(key, value) {
    setSearchParams(updateCatalogFilter(searchParams, key, value));
  }

  function clearFilters() {
    setSearchParams(clearCatalogFilters(searchParams));
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
      <Navbar />

      <header className="border-b border-[#d4c7b9] bg-[#211c18] text-[#fff4e8]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#ff9979] hover:underline"
          >
            ← Back to Home
          </Link>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#d4c7b9]">
            DISCOVER EXPERIENCES
          </p>
          <h1 className="mt-2 font-serif text-4xl font-extrabold tracking-tight text-[#fff4e8] sm:text-5xl">
            Explore Events
          </h1>
          <p className="mt-3 max-w-xl text-base text-[#d4c7b9]">
            Find concerts, comedy shows, culinary pop-ups and workshops worth
            experiencing.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Filter bar */}
        <section
          aria-label="Event filters"
          className="rounded-2xl border border-[#d4c7b9] bg-white p-5 shadow-xs"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex items-center gap-3 rounded-xl border border-[#d4c7b9] bg-[#faf7f2] px-3.5 focus-within:border-[#9f3b27] focus-within:bg-white transition-colors">
              <Search
                className="h-4 w-4 shrink-0 text-[#9f3b27]"
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={(event) => updateFilter('q', event.target.value)}
                placeholder="Search events"
                aria-label="Search events"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[#211c18] outline-none placeholder:text-[#8c7d70]"
              />
            </label>

            <label className="flex flex-col gap-1 rounded-xl border border-[#d4c7b9] bg-[#faf7f2] px-3.5 py-1.5 focus-within:border-[#9f3b27] focus-within:bg-white transition-colors">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#63564b]">
                Category
              </span>
              <select
                value={category}
                onChange={(event) =>
                  updateFilter('category', event.target.value)
                }
                className="bg-transparent text-sm font-medium text-[#211c18] outline-none"
              >
                {['All', ...eventCategories].map((item) => (
                  <option
                    key={item}
                    value={item}
                    className="bg-white text-[#211c18]"
                  >
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 rounded-xl border border-[#d4c7b9] bg-[#faf7f2] px-3.5 py-1.5 focus-within:border-[#9f3b27] focus-within:bg-white transition-colors">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#63564b]">
                City
              </span>
              <input
                value={city}
                onChange={(event) => updateFilter('city', event.target.value)}
                placeholder="e.g. Pune"
                aria-label="Filter by city"
                className="bg-transparent text-sm font-medium text-[#211c18] outline-none placeholder:text-[#8c7d70]"
              />
            </label>

            <label className="flex flex-col gap-1 rounded-xl border border-[#d4c7b9] bg-[#faf7f2] px-3.5 py-1.5 focus-within:border-[#9f3b27] focus-within:bg-white transition-colors">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#63564b]">
                Price
              </span>
              <select
                value={pricing}
                onChange={(event) =>
                  updateFilter('pricing', event.target.value)
                }
                className="bg-transparent text-sm font-medium text-[#211c18] outline-none"
              >
                <option value="" className="bg-white text-[#211c18]">
                  All prices
                </option>
                <option value="free" className="bg-white text-[#211c18]">
                  Free events
                </option>
                <option value="paid" className="bg-white text-[#211c18]">
                  Paid events
                </option>
              </select>
            </label>

            <label className="flex flex-col gap-1 rounded-xl border border-[#d4c7b9] bg-[#faf7f2] px-3.5 py-1.5 focus-within:border-[#9f3b27] focus-within:bg-white transition-colors">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#63564b]">
                From date
              </span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => updateFilter('from', event.target.value)}
                aria-label="From date"
                className="bg-transparent text-sm text-[#211c18] outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 rounded-xl border border-[#d4c7b9] bg-[#faf7f2] px-3.5 py-1.5 focus-within:border-[#9f3b27] focus-within:bg-white transition-colors">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#63564b]">
                To date
              </span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => updateFilter('to', event.target.value)}
                aria-label="To date"
                className="bg-transparent text-sm text-[#211c18] outline-none"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#eadecc] pt-3">
            <span className="text-xs text-[#63564b]">
              {!loading &&
                pagination &&
                `${pagination.total ?? events.length} events listed`}
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-[#d4c7b9] bg-[#faf7f2] px-4 py-1.5 text-xs font-semibold text-[#63564b] transition-colors hover:border-[#9f3b27] hover:text-[#9f3b27]"
            >
              Clear filters
            </button>
          </div>
        </section>

        {/* Section title */}
        <div className="mb-6 mt-10 flex items-baseline justify-between gap-3 border-b border-[#d4c7b9] pb-3">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#211c18] sm:text-3xl">
            {category === 'All' ? 'Upcoming events' : category}
          </h2>
          {!loading && pagination && (
            <span className="text-sm font-medium text-[#63564b]">
              {pagination.total ?? events.length} events
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div
            role="status"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="h-80 animate-pulse rounded-2xl border border-[#d4c7b9] bg-white/70"
              />
            ))}
            <span className="sr-only">Loading events...</span>
          </div>
        )}

        {/* Error message */}
        {!loading && error && (
          <div className="rounded-2xl border border-[#f4bebe] bg-[#fbebe8] p-6 text-center">
            <p className="font-semibold text-[#9f3b27]">{error}</p>
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams(searchParams))}
              className="mt-4 rounded-full bg-[#211c18] px-5 py-2 text-sm font-medium text-[#fff4e8] transition hover:bg-[#9f3b27]"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && events.length === 0 && (
          <div className="rounded-2xl border border-[#d4c7b9] bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f5e9e2] text-[#9f3b27]">
              <Ticket className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-serif text-2xl font-bold text-[#211c18]">
              No events found
            </h3>
            <p className="mt-2 text-sm text-[#63564b]">
              We couldn't find any events matching your criteria. Try adjusting
              your filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-full bg-[#9f3b27] px-6 py-2.5 text-sm font-semibold text-[#fff4e8] transition hover:bg-[#852f1e]"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Event cards grid */}
        {!loading && !error && events.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <article
                key={event.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#d4c7b9] bg-white shadow-xs transition duration-200 hover:-translate-y-1 hover:border-[#9f3b27]/60 hover:shadow-md"
              >
                <div className="aspect-[3/2] overflow-hidden bg-[#eadecc]">
                  <img
                    src={getEventCover(event)}
                    alt=""
                    width="768"
                    height="512"
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-[#f5e9e2] px-3 py-0.5 text-xs font-semibold text-[#9f3b27]">
                      {event.category || 'Event'}
                    </span>
                    <span className="text-xs font-medium text-[#63564b]">
                      {formatDate(event.startAt)}
                    </span>
                  </div>

                  <h3 className="mt-3 line-clamp-2 font-serif text-xl font-bold text-[#211c18]">
                    <Link
                      to={`/events/${event.id}`}
                      className="hover:text-[#9f3b27] transition-colors"
                    >
                      {event.title}
                    </Link>
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#63564b]">
                    {event.description ||
                      'Discover this upcoming event on EventHub.'}
                  </p>

                  <div className="mt-4 space-y-1.5 text-xs text-[#63564b]">
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0 text-[#9f3b27]"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {[event.venue, event.city].filter(Boolean).join(', ') ||
                          'Location to be announced'}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CalendarDays
                        className="h-3.5 w-3.5 shrink-0 text-[#9f3b27]"
                        aria-hidden="true"
                      />
                      <span>{formatDate(event.startAt)}</span>
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#eadecc] pt-4 mt-5">
                    <span className="font-serif text-lg font-bold text-[#211c18]">
                      {formatPrice(event)}
                    </span>
                    <Link
                      to={`/events/${event.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#211c18] px-4 py-1.5 text-xs font-medium text-[#fff4e8] transition-colors hover:bg-[#9f3b27]"
                    >
                      View event{' '}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pagination?.page && pagination?.total && (
          <div className="mt-10 flex items-center justify-between border-t border-[#d4c7b9] pt-6">
            <span className="text-sm text-[#63564b]">
              Page {pagination.page} of{' '}
              {Math.max(
                1,
                Math.ceil(
                  Number(pagination.total) / Number(pagination.limit || 12)
                )
              )}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={Number(pagination.page) <= 1}
                onClick={() =>
                  updateFilter('page', String(Number(pagination.page) - 1))
                }
                className="rounded-full border border-[#d4c7b9] bg-white px-4 py-2 text-sm font-medium text-[#211c18] transition hover:bg-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-full border border-[#d4c7b9] bg-white px-4 py-2 text-sm font-medium text-[#211c18] transition hover:bg-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
