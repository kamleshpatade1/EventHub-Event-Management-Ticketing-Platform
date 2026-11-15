import { useEffect, useState } from 'react';
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
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../lib/api.js';

function OrganizerAttendees() {
  const { eventId } = useParams();

  const [filters, setFilters] = useState({
    page: 1,
    search: '',
    checkedIn: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [request, setRequest] = useState(null);
  const [revision, setRevision] = useState(0);
  const [ticketCode, setTicketCode] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const query = new URLSearchParams({
    page: String(filters.page),
    limit: '10',
    ...(filters.search && { search: filters.search }),
    ...(filters.checkedIn && { checkedIn: filters.checkedIn }),
  }).toString();
  const url = `/organizer/events/${eventId}/attendees?${query}`;
  const current =
    request?.url === url && request.revision === revision ? request : null;
  const loading = !current;
  const attendees = current?.result?.data ?? [];
  const pagination = current?.result?.pagination ?? {
    page: filters.page,
    limit: 10,
    total: 0,
  };
  const error = actionError || current?.error;
  const totalPages = Math.max(
    1,
    Math.ceil(pagination.total / pagination.limit)
  );

  useEffect(() => {
    const controller = new AbortController();
    api(url, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setRequest({ url, revision, result });
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setRequest({
            url,
            revision,
            error: err.message || 'Unable to load attendees.',
          });
        }
      });
    return () => controller.abort();
  }, [url, revision]);

  function reloadAttendees() {
    setActionError('');
    setRevision((value) => value + 1);
  }

  function goToPage(page) {
    setActionError('');
    setFilters((currentFilters) => ({ ...currentFilters, page }));
  }

  function handleSearch(event) {
    event.preventDefault();
    setFilters({ page: 1, search: searchInput.trim(), checkedIn: statusInput });
    setNotice('');
    reloadAttendees();
  }

  async function checkIn(selector) {
    if (checkingIn) return;
    setCheckingIn(true);
    setActionError('');
    setNotice('');

    try {
      const { data } = await api(`/organizer/events/${eventId}/check-ins`, {
        method: 'POST',
        body: selector,
      });

      if (selector.ticketCode) setTicketCode('');
      setNotice(
        data.alreadyCheckedIn
          ? 'This ticket was already checked in.'
          : 'Ticket checked in successfully.'
      );
      if (filters.checkedIn === 'false') goToPage(1);
      reloadAttendees();
    } catch (err) {
      setActionError(err.message || 'Unable to check in this ticket.');
    } finally {
      setCheckingIn(false);
    }
  }

  function handleCheckIn(event) {
    event.preventDefault();
    const code = ticketCode.trim();
    if (!code) {
      setNotice('');
      setActionError('Enter a ticket code before checking in.');
      return;
    }
    checkIn({ ticketCode: code });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to={`/organizer/events/${eventId}`}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#63564b] hover:text-[#9f3b27] transition-colors"
        >
          <ArrowLeft size={14} /> Back to event management
        </Link>

        <header className="mb-8 border-b border-[#d4c7b9] pb-6">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#9f3b27]">
            ORGANIZER WORKSPACE
          </p>
          <h1 className="font-serif text-3xl font-extrabold tracking-tight text-[#211c18] sm:text-4xl">
            Attendees & Check-in
          </h1>
          <p className="mt-1 text-sm text-[#63564b]">
            Validate guest tickets at the door and review confirmed bookings.
          </p>
        </header>

        {/* Check-in input box */}
        <section className="mb-8 rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs sm:p-7">
          <div className="mb-4 flex items-center gap-2.5">
            <TicketCheck className="text-[#9f3b27]" size={22} />
            <h2 className="font-serif text-xl font-bold text-[#211c18]">
              Check in a ticket
            </h2>
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
              placeholder="Enter ticket admission code"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-[#d4c7b9] bg-white px-4 py-2.5 font-mono text-sm text-[#211c18] outline-none placeholder:font-sans placeholder:text-[#8c7d70] focus:border-[#9f3b27] focus:ring-1 focus:ring-[#9f3b27] transition-colors"
            />
            <button
              type="submit"
              disabled={checkingIn}
              className="rounded-full bg-[#9f3b27] px-6 py-2.5 text-sm font-semibold text-[#fff4e8] transition hover:bg-[#852f1e] disabled:cursor-not-allowed disabled:opacity-50 shadow-xs"
            >
              {checkingIn ? 'Checking in...' : 'Validate & Check In'}
            </button>
          </form>
          <p className="mt-3 text-xs text-[#8c7d70]">
            Check-in is verified against real ticket codes during the permitted
            event entrance window.
          </p>
        </section>

        {notice && (
          <div
            role="status"
            className="mb-6 flex items-center gap-2 rounded-2xl border border-[#a3d9b8] bg-[#e8f5ec] p-4 text-xs font-semibold text-[#1b6e49]"
          >
            <CheckCircle2 size={16} />
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-[#f4bebe] bg-[#fbebe8] p-4 text-xs font-semibold text-[#9f3b27]"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={reloadAttendees}
              className="mt-2 font-bold underline"
            >
              Reload attendees
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs sm:p-7">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-[#eadecc] pb-4">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-[#211c18]">
                <Users size={20} className="text-[#9f3b27]" />
                Confirmed attendees
              </h2>
              <p className="mt-0.5 text-xs text-[#63564b]">
                {pagination.total} attendee
                {pagination.total === 1 ? '' : 's'} total
              </p>
            </div>

            <button
              type="button"
              disabled={loading || checkingIn}
              onClick={reloadAttendees}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#d4c7b9] bg-white px-4 py-1.5 text-xs font-semibold text-[#211c18] transition hover:bg-[#faf7f2] disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
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
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c7d70]"
              />
              <input
                id="attendeeSearch"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                maxLength={100}
                placeholder="Search by attendee name or booking ID"
                className="w-full rounded-xl border border-[#d4c7b9] bg-white py-2.5 pl-10 pr-4 text-sm text-[#211c18] outline-none placeholder:text-[#8c7d70] focus:border-[#9f3b27] focus:ring-1 focus:ring-[#9f3b27] transition-colors"
              />
            </div>
            <label htmlFor="attendeeCheckInStatus" className="sr-only">
              Check-in status
            </label>
            <select
              id="attendeeCheckInStatus"
              value={statusInput}
              onChange={(event) => setStatusInput(event.target.value)}
              className="rounded-xl border border-[#d4c7b9] bg-white px-4 py-2.5 text-sm font-medium text-[#211c18] outline-none focus:border-[#9f3b27]"
            >
              <option value="">All check-in statuses</option>
              <option value="true">Checked in</option>
              <option value="false">Not checked in</option>
            </select>
            <button
              type="submit"
              disabled={loading || checkingIn}
              className="rounded-full border border-[#d4c7b9] bg-white px-5 py-2.5 text-xs font-semibold text-[#211c18] transition hover:bg-[#faf7f2] hover:border-[#9f3b27] disabled:opacity-50"
            >
              Apply filters
            </button>
          </form>

          {loading ? (
            <div className="py-12 text-center text-sm font-medium text-[#63564b]">
              Loading attendees...
            </div>
          ) : current.error ? null : attendees.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d4c7b9] px-5 py-12 text-center">
              <Users size={32} className="mx-auto mb-2 text-[#8c7d70]" />
              <h3 className="font-serif text-lg font-bold text-[#211c18]">
                No attendees found
              </h3>
              <p className="mt-1 text-xs text-[#63564b]">
                No confirmed bookings match these search filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eadecc] text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                    <th className="px-3 py-3">Attendee</th>
                    <th className="px-3 py-3">Booking ID</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eadecc]">
                  {attendees.map((attendee) => (
                    <tr
                      key={attendee.bookingId}
                      className="transition-colors hover:bg-[#faf7f2]"
                    >
                      <td className="px-3 py-4 font-medium text-[#211c18]">
                        {attendee.name || 'Unnamed attendee'}
                      </td>
                      <td className="px-3 py-4 font-mono text-xs text-[#63564b]">
                        {attendee.bookingId}
                      </td>
                      <td className="px-3 py-4">
                        {attendee.checkedInAt ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a3d9b8] bg-[#e8f5ec] px-3 py-0.5 text-xs font-semibold text-[#1b6e49]">
                            <CheckCircle2 size={13} />
                            Checked in
                          </span>
                        ) : (
                          <span className="rounded-full border border-[#d4c7b9] bg-[#faf7f2] px-3 py-0.5 text-xs font-semibold text-[#63564b]">
                            Not checked in
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        {!attendee.checkedInAt && (
                          <button
                            type="button"
                            disabled={checkingIn}
                            aria-label={`Check in ${attendee.name || 'attendee'}`}
                            onClick={() =>
                              checkIn({ bookingId: attendee.bookingId })
                            }
                            className="whitespace-nowrap rounded-full border border-[#d4c7b9] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#211c18] transition hover:border-[#9f3b27] hover:text-[#9f3b27] disabled:opacity-50"
                          >
                            Check in
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading &&
            current.result &&
            (totalPages > 1 || pagination.page > 1) && (
              <nav
                aria-label="Attendee pages"
                className="mt-6 flex items-center justify-between gap-4 border-t border-[#eadecc] pt-4"
              >
                <button
                  type="button"
                  disabled={checkingIn || pagination.page <= 1}
                  onClick={() => goToPage(pagination.page - 1)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d4c7b9] bg-white px-4 py-1.5 text-xs font-semibold text-[#211c18] transition hover:bg-[#faf7f2] disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>

                <span className="text-xs font-medium text-[#63564b]">
                  Page {pagination.page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={checkingIn || pagination.page >= totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d4c7b9] bg-white px-4 py-1.5 text-xs font-semibold text-[#211c18] transition hover:bg-[#faf7f2] disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </nav>
            )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default OrganizerAttendees;
