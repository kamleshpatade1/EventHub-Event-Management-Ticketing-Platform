import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  TicketCheck,
  Users,
} from 'lucide-react';
import { api } from '../lib/api.js';

function OrganizerAttendees() {
  const { eventId } = useParams();

  const [attendees, setAttendees] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAttendees = useCallback(
    async (page = 1, searchTerm = '') => {
      setLoading(true);
      setError('');

      try {
        const query = new URLSearchParams({
          page: String(page),
          limit: '10',
        });

        if (searchTerm.trim()) {
          query.set('search', searchTerm.trim());
        }

        const result = await api(
          `/organizer/events/${eventId}/attendees?${query.toString()}`
        );

        setAttendees(result.data ?? []);
        setPagination(result.pagination ?? { page, limit: 10, total: 0 });
      } catch (err) {
        setError(err.message || 'Unable to load attendees.');
      } finally {
        setLoading(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    let active = true;

    async function fetchAttendees() {
      try {
        const query = new URLSearchParams({ page: '1', limit: '10' });
        const result = await api(
          `/organizer/events/${eventId}/attendees?${query.toString()}`
        );

        if (!active) return;

        setAttendees(result.data ?? []);
        setPagination(result.pagination ?? { page: 1, limit: 10, total: 0 });
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load attendees.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAttendees();

    return () => {
      active = false;
    };
  }, [eventId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setNotice('');
    loadAttendees(1, searchInput.trim());
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();

    const code = ticketCode.trim();
    if (!code) {
      setError('Enter a ticket code before checking in.');
      return;
    }

    setCheckingIn(true);
    setError('');
    setNotice('');

    try {
      await api(`/organizer/events/${eventId}/check-ins`, {
        method: 'POST',
        body: { ticketCode: code },
      });

      setTicketCode('');
      setNotice('Ticket checked in successfully.');
      await loadAttendees(pagination.page, search);
    } catch (err) {
      setError(err.message || 'Unable to check in this ticket.');
    } finally {
      setCheckingIn(false);
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.total / pagination.limit)
  );

  return (
    <main className="min-h-screen bg-[#0b0b12] px-4 py-10 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          to={`/organizer/events/${eventId}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to event management
        </Link>

        <header className="mb-8">
          <p className="mb-2 text-sm font-medium text-purple-400">
            ORGANIZER WORKSPACE
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Attendees and check-in
          </h1>
          <p className="mt-2 text-gray-400">
            Find confirmed attendees and validate tickets at your event.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <TicketCheck className="text-purple-400" size={22} />
            <h2 className="text-lg font-semibold">Check in a ticket</h2>
          </div>

          <form
            onSubmit={handleCheckIn}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="ticketCode" className="sr-only">
              Ticket code
            </label>
            <input
              id="ticketCode"
              name="ticketCode"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value)}
              placeholder="Enter ticket code"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={checkingIn}
              className="rounded-xl bg-purple-600 px-5 py-3 font-semibold transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkingIn ? 'Checking in...' : 'Check in'}
            </button>
          </form>
          <p className="mt-3 text-xs text-gray-500">
            Check-in is accepted only during the event's permitted check-in
            window and for eligible confirmed tickets.
          </p>
        </section>

        {notice && (
          <div
            role="status"
            className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300"
          >
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadAttendees(pagination.page, search)}
              className="mt-2 font-semibold underline"
            >
              Reload attendees
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Users size={21} className="text-purple-400" />
                Confirmed attendees
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {pagination.total} attendee
                {pagination.total === 1 ? '' : 's'} found
              </p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => loadAttendees(pagination.page, search)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <form
            onSubmit={handleSearch}
            className="mb-6 flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="attendeeSearch" className="sr-only">
              Search attendees
            </label>
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                id="attendeeSearch"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by attendee name or booking ID"
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-white outline-none transition placeholder:text-gray-500 focus:border-purple-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl border border-white/15 px-5 py-3 font-medium transition hover:bg-white/10 disabled:opacity-50"
            >
              Search
            </button>
          </form>

          {loading ? (
            <div className="py-12 text-center text-gray-400">
              Loading attendees...
            </div>
          ) : attendees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 px-5 py-12 text-center">
              <Users size={36} className="mx-auto mb-3 text-gray-500" />
              <h3 className="font-semibold">No attendees found</h3>
              <p className="mt-2 text-sm text-gray-400">
                Confirmed bookings will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="px-3 py-3 font-medium">Attendee</th>
                    <th className="px-3 py-3 font-medium">Booking ID</th>
                    <th className="px-3 py-3 font-medium">Check-in status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((attendee) => (
                    <tr
                      key={attendee.bookingId}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="px-3 py-4 font-medium">
                        {attendee.name || 'Unnamed attendee'}
                      </td>
                      <td className="px-3 py-4 font-mono text-xs text-gray-300">
                        {attendee.bookingId}
                      </td>
                      <td className="px-3 py-4">
                        {attendee.checkedInAt ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                            <CheckCircle2 size={14} />
                            Checked in
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                            Not checked in
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <nav
              aria-label="Attendee pages"
              className="mt-6 flex items-center justify-between gap-4"
            >
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => loadAttendees(pagination.page - 1, search)}
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
                disabled={pagination.page >= totalPages}
                onClick={() => loadAttendees(pagination.page + 1, search)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}

export default OrganizerAttendees;
