import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useSearchParams } from 'react-router';
import { ArrowLeft, Shield } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../lib/api.js';

const inputClass =
  'min-h-11 rounded-xl border border-[#d4c7b9] bg-white px-3.5 text-sm text-[#211c18] outline-none focus:border-[#9f3b27] focus:ring-1 focus:ring-[#9f3b27] transition-colors';
const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-[#d4c7b9] bg-white px-5 py-2 text-xs font-semibold text-[#211c18] hover:border-[#9f3b27] hover:text-[#9f3b27] transition hover:bg-[#faf7f2] disabled:opacity-50';
const primaryActionClass =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-[#9f3b27] px-5 py-2 text-xs font-semibold text-[#fff4e8] transition hover:bg-[#852f1e] disabled:opacity-50 shadow-xs';

const labels = {
  ATTENDEE: 'Attendee',
  ORGANIZER: 'Organizer',
  ADMIN: 'Admin',
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CANCELLED: 'Cancelled',
};

const formatDateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function Admin({ section }) {
  const users = section === 'users';
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [request, setRequest] = useState(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [moderating, setModerating] = useState(null);
  const reasonInput = useRef(null);
  const current =
    request?.query === query && request.revision === revision ? request : null;
  const result = current?.result;
  const { page = 1, limit = 20, total = 0 } = result?.pagination ?? {};
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    if (moderating) reasonInput.current?.focus();
  }, [moderating]);

  useEffect(() => {
    const controller = new AbortController();
    api(`/admin/${section}?${query}`, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setRequest({ query, revision, result });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setRequest({ query, revision, error: error.message });
      });
    return () => controller.abort();
  }, [query, revision, section]);

  function applyFilters(event) {
    event.preventDefault();
    const filters = new URLSearchParams();
    for (const [field, value] of new FormData(event.currentTarget)) {
      const trimmed = value.trim();
      if (trimmed) filters.set(field, trimmed);
    }
    setModerating(null);
    setActionError('');
    setNotice('');
    setParams(filters);
  }

  function goToPage(nextPage) {
    setModerating(null);
    setActionError('');
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('page', String(nextPage));
      return next;
    });
  }

  async function save(path, body, success) {
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      await api(path, { method: 'PATCH', body });
      setModerating(null);
      setNotice(success);
      setRevision((value) => value + 1);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function updateVisibility(event) {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get('reason').trim();
    if (!reason) {
      setActionError('Enter a moderation reason.');
      return;
    }
    const hidden = !moderating.hiddenAt;
    save(
      `/admin/events/${moderating.id}/visibility`,
      { hidden, reason },
      `${moderating.title} ${hidden ? 'hidden' : 'restored'}.`
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#63564b] hover:text-[#9f3b27] transition-colors"
        >
          <ArrowLeft size={14} /> Back to home
        </Link>

        <div className="mt-4 mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5e9e2] text-[#9f3b27]">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-[#211c18]">
              Admin Workspace
            </h1>
            <p className="text-xs text-[#63564b]">
              Manage user permissions and moderate public event listings.
            </p>
          </div>
        </div>

        <nav
          aria-label="Admin"
          className="mb-8 flex gap-3 border-b border-[#d4c7b9]"
        >
          {['users', 'events'].map((item) => (
            <NavLink
              key={item}
              to={`/admin/${item}`}
              className={({ isActive }) =>
                `border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-[#9f3b27] text-[#9f3b27]'
                    : 'border-transparent text-[#63564b] hover:text-[#211c18]'
                }`
              }
            >
              {item === 'users' ? 'User Roles' : 'Event Moderation'}
            </NavLink>
          ))}
        </nav>

        <div className="rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs sm:p-7 mb-8">
          <h2 className="mb-4 font-serif text-xl font-bold text-[#211c18]">
            {users ? 'User roles & permissions' : 'Event listings moderation'}
          </h2>

          <form
            key={query}
            onSubmit={applyFilters}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="grid min-w-48 flex-1 gap-1 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
              Search {section}
              <input
                className={inputClass}
                name="q"
                type="search"
                maxLength={100}
                defaultValue={params.get('q') ?? ''}
                placeholder={users ? 'Name or email' : 'Event title'}
              />
            </label>

            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
              {users ? 'Role' : 'Status'}
              <select
                className={inputClass}
                name={users ? 'role' : 'status'}
                defaultValue={params.get(users ? 'role' : 'status') ?? ''}
              >
                <option value="">All</option>
                {(users
                  ? ['ATTENDEE', 'ORGANIZER', 'ADMIN']
                  : ['DRAFT', 'PUBLISHED', 'CANCELLED']
                ).map((value) => (
                  <option key={value} value={value}>
                    {labels[value]}
                  </option>
                ))}
              </select>
            </label>

            {!users && (
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                Visibility
                <select
                  className={inputClass}
                  name="hidden"
                  defaultValue={params.get('hidden') ?? ''}
                >
                  <option value="">All</option>
                  <option value="false">Visible</option>
                  <option value="true">Hidden</option>
                </select>
              </label>
            )}

            <button className={primaryActionClass} disabled={busy}>
              Apply filters
            </button>
          </form>
        </div>

        {notice && (
          <p
            role="status"
            className="mb-6 rounded-2xl border border-[#a3d9b8] bg-[#e8f5ec] p-4 text-xs font-semibold text-[#1b6e49]"
          >
            {notice}
          </p>
        )}

        {actionError && (
          <p
            role="alert"
            className="mb-6 rounded-2xl border border-[#f4bebe] bg-[#fbebe8] p-4 text-xs font-semibold text-[#9f3b27]"
          >
            {actionError}
          </p>
        )}

        {moderating && (
          <form
            onSubmit={updateVisibility}
            className="mb-8 rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs"
          >
            <h3 className="mb-3 font-serif text-lg font-bold text-[#211c18]">
              {moderating.hiddenAt ? 'Unhide' : 'Hide'} {moderating.title}
            </h3>
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#63564b]">
              Moderation reason
              <textarea
                ref={reasonInput}
                className="w-full rounded-xl border border-[#d4c7b9] bg-[#faf7f2] p-3 text-sm text-[#211c18] outline-none focus:border-[#9f3b27] focus:ring-1 focus:ring-[#9f3b27]"
                name="reason"
                required
                maxLength={500}
                rows={3}
                disabled={busy}
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button className={primaryActionClass} disabled={busy}>
                {moderating.hiddenAt ? 'Unhide event' : 'Hide event'}
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={busy}
                onClick={() => {
                  setModerating(null);
                  setActionError('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!current && (
          <p
            role="status"
            className="py-8 text-center text-sm font-medium text-[#63564b]"
          >
            Loading {section}…
          </p>
        )}

        {current?.error && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#f4bebe] bg-[#fbebe8] p-4">
            <p role="alert" className="text-xs font-semibold text-[#9f3b27]">
              {current.error}
            </p>
            <button
              className={buttonClass}
              onClick={() => setRevision((value) => value + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {result?.data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#d4c7b9] bg-white p-8 text-center text-sm text-[#63564b]">
            No {section} found.
          </div>
        )}

        {result?.data.length > 0 && (
          <ul
            aria-label={users ? 'Users' : 'Events'}
            className="divide-y divide-[#eadecc] rounded-2xl border border-[#d4c7b9] bg-white shadow-xs"
          >
            {result.data.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-4 p-5 transition hover:bg-[#faf7f2]"
              >
                <div className="min-w-0 flex-1 basis-48 break-words">
                  <h3 className="font-serif text-lg font-bold text-[#211c18]">
                    {users ? row.name : row.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#63564b]">
                    {users
                      ? row.email
                      : `${row.organizer.name} · ${row.city} · ${formatDateTime.format(new Date(row.startAt))}`}
                  </p>
                  {!users && row.moderationReason && (
                    <div className="mt-2 rounded-lg border border-[#eadecc] bg-[#faf7f2] p-2.5 text-xs text-[#63564b]">
                      <p className="font-semibold text-[#211c18]">
                        Reason: {row.moderationReason}
                      </p>
                      {row.moderatedAt && (
                        <p className="mt-0.5 text-[11px] text-[#8c7d70]">
                          {formatDateTime.format(new Date(row.moderatedAt))}
                          {row.moderatedBy ? ` · ${row.moderatedBy.name}` : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[#f5e9e2] px-3 py-1 text-xs font-semibold text-[#9f3b27]">
                    {users
                      ? labels[row.role]
                      : `${labels[row.status]} · ${row.hiddenAt ? 'Hidden' : 'Visible'}`}
                  </span>
                  {users ? (
                    row.role !== 'ADMIN' && (
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() => {
                          const role =
                            row.role === 'ATTENDEE' ? 'ORGANIZER' : 'ATTENDEE';
                          save(
                            `/admin/users/${row.id}/role`,
                            { role },
                            `${row.name} is now an ${labels[role].toLowerCase()}.`
                          );
                        }}
                      >
                        {row.role === 'ATTENDEE'
                          ? 'Make organizer'
                          : 'Revoke organizer'}
                      </button>
                    )
                  ) : (
                    <button
                      className={buttonClass}
                      disabled={busy}
                      onClick={() => {
                        setActionError('');
                        setModerating(row);
                      }}
                    >
                      {row.hiddenAt ? 'Unhide' : 'Hide'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {result && (totalPages > 1 || page > 1) && (
          <nav
            aria-label="Pagination"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#d4c7b9] pt-4"
          >
            <button
              className={buttonClass}
              disabled={busy || page === 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </button>
            <span className="text-xs font-medium text-[#63564b]">
              Page {page} of {totalPages}
            </span>
            <button
              className={buttonClass}
              disabled={busy || page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </main>

      <Footer />
    </div>
  );
}
