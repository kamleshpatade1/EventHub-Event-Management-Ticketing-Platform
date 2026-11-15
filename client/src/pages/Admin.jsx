import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useSearchParams } from 'react-router';
import { api } from '../lib/api.js';

const inputClass =
  'min-h-11 rounded-lg border border-gray-700 bg-gray-950 px-3 text-gray-100 focus-visible:outline-2 focus-visible:outline-purple-400';
const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-purple-400/40 px-4 py-2 text-sm font-semibold text-purple-100 hover:bg-purple-500/15 focus-visible:outline-2 focus-visible:outline-purple-400 disabled:opacity-50';
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
    <main className="min-h-screen bg-[#0b0b12] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm text-gray-300 hover:underline">
          Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Admin</h1>
        <nav
          aria-label="Admin"
          className="mb-6 mt-4 flex gap-3 border-b border-white/10"
        >
          {['users', 'events'].map((item) => (
            <NavLink
              key={item}
              to={`/admin/${item}`}
              className={({ isActive }) =>
                `border-b-2 px-3 py-3 text-sm font-semibold ${isActive ? 'border-purple-400 text-white' : 'border-transparent text-gray-300 hover:text-white'}`
              }
            >
              {item === 'users' ? 'Users' : 'Events'}
            </NavLink>
          ))}
        </nav>

        <h2 className="mb-4 text-xl font-semibold">
          {users ? 'User roles' : 'Event moderation'}
        </h2>
        <form
          key={query}
          onSubmit={applyFilters}
          className="mb-5 flex flex-wrap items-end gap-3"
        >
          <label className="grid min-w-48 flex-1 gap-1 text-sm text-gray-300">
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
          <label className="grid gap-1 text-sm text-gray-300">
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
            <label className="grid gap-1 text-sm text-gray-300">
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
          <button className={buttonClass} disabled={busy}>
            Apply filters
          </button>
        </form>

        {notice && (
          <p role="status" className="mb-4 text-sm text-emerald-300">
            {notice}
          </p>
        )}
        {actionError && (
          <p role="alert" className="mb-4 text-sm text-red-300">
            {actionError}
          </p>
        )}
        {moderating && (
          <form
            onSubmit={updateVisibility}
            className="mb-5 rounded-xl border border-white/15 bg-gray-900 p-4"
          >
            <h3 className="mb-3 font-semibold">
              {moderating.hiddenAt ? 'Unhide' : 'Hide'} {moderating.title}
            </h3>
            <label className="grid gap-1 text-sm text-gray-300">
              Moderation reason
              <textarea
                ref={reasonInput}
                className={`${inputClass} py-2`}
                name="reason"
                required
                maxLength={500}
                rows={3}
                disabled={busy}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={buttonClass} disabled={busy}>
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
          <p role="status" className="text-sm text-gray-300">
            Loading {section}…
          </p>
        )}
        {current?.error && (
          <div className="flex flex-wrap items-center gap-3">
            <p role="alert" className="text-sm text-red-300">
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
          <p className="rounded-xl border border-white/10 p-5 text-gray-300">
            No {section} found.
          </p>
        )}
        {result?.data.length > 0 && (
          <ul
            aria-label={users ? 'Users' : 'Events'}
            className="divide-y divide-white/10 rounded-xl border border-white/10 bg-gray-900/70"
          >
            {result.data.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-4 px-4 py-4"
              >
                <div className="min-w-0 flex-1 basis-48 break-words">
                  <h3 className="font-semibold">
                    {users ? row.name : row.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-300">
                    {users
                      ? row.email
                      : `${row.organizer.name} · ${row.city} · ${formatDateTime.format(new Date(row.startAt))}`}
                  </p>
                  {!users && row.moderationReason && (
                    <div className="mt-2 text-sm text-gray-300">
                      <p>Moderation reason: {row.moderationReason}</p>
                      {row.moderatedAt && (
                        <p>
                          {formatDateTime.format(new Date(row.moderatedAt))}
                          {row.moderatedBy ? ` · ${row.moderatedBy.name}` : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-gray-300">
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
            className="mt-4 flex flex-wrap items-center gap-3"
          >
            <button
              className={buttonClass}
              disabled={busy || page === 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </button>
            <span className="text-sm text-gray-300">
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
      </div>
    </main>
  );
}
