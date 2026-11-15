import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, Save } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../lib/api.js';
import { saveOrganizerEvent } from '../lib/organizerEventWorkflow.js';

const initialForm = {
  title: '',
  description: '',
  category: '',
  venue: '',
  address: '',
  city: '',
  timezone: 'Asia/Kolkata',
  startAt: '',
  endAt: '',
  registrationClosesAt: '',
  capacity: '100',
  price: '0',
  currency: 'INR',
};

const fields = [
  ['title', 'Event title', 'text'],
  ['category', 'Category', 'text'],
  ['venue', 'Venue name', 'text'],
  ['address', 'Full address', 'text'],
  ['city', 'City', 'text'],
  ['timezone', 'Timezone', 'text'],
];

function toLocalInput(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 16);
}

function parsePriceMinor(value) {
  const normalized = value.trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  const minor = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));

  if (!Number.isSafeInteger(minor) || minor > 2147483647) {
    return null;
  }

  return minor;
}

function toPayload(form, originalDates = {}) {
  function getDateValue(field) {
    const original = originalDates[field];

    if (original && original.localValue === form[field]) {
      return original.isoValue;
    }

    const date = new Date(form[field]);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid ${field}.`);
    }

    return date.toISOString();
  }

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    venue: form.venue.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    timezone: form.timezone.trim(),
    startAt: getDateValue('startAt'),
    endAt: getDateValue('endAt'),
    registrationClosesAt: getDateValue('registrationClosesAt'),
    capacity: Number(form.capacity),
    priceMinor: parsePriceMinor(form.price),
    currency: form.currency.trim().toUpperCase(),
  };
}

function OrganizerEventForm() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(eventId);
  const originalDates = useRef({});
  const submitLock = useRef(false);

  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState('');
  const [editLocked, setEditLocked] = useState(false);

  useEffect(() => {
    if (!editing) return;

    let active = true;

    async function loadEvent() {
      setLoading(true);
      setError('');

      try {
        const result = await api(`/organizer/events/${eventId}`);
        const event = result.data;

        if (!active) return;

        if (event.bookingsCount > 0) {
          setEditLocked(true);
          return;
        }

        const dateFields = ['startAt', 'endAt', 'registrationClosesAt'];
        const dates = {};

        for (const field of dateFields) {
          const isoValue = event[field];
          dates[field] = {
            isoValue,
            localValue: toLocalInput(isoValue),
          };
        }

        originalDates.current = dates;

        setForm({
          title: event.title ?? '',
          description: event.description ?? '',
          category: event.category ?? '',
          venue: event.venue ?? '',
          address: event.address ?? '',
          city: event.city ?? '',
          timezone: event.timezone ?? 'Asia/Kolkata',
          startAt: dates.startAt.localValue,
          endAt: dates.endAt.localValue,
          registrationClosesAt: dates.registrationClosesAt.localValue,
          capacity: String(event.capacity ?? '100'),
          price:
            event.priceMinor != null
              ? (Number(event.priceMinor) / 100).toFixed(2)
              : '0',
          currency: event.currency ?? 'INR',
        });
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load event details.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEvent();

    return () => {
      active = false;
    };
  }, [editing, eventId]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFieldErrors((current) => {
      if (!current[name]) return current;

      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function validateClient(payload) {
    const errors = {};

    if (!payload.title) errors.title = 'Title is required.';
    if (!payload.category) errors.category = 'Category is required.';
    if (!payload.venue) errors.venue = 'Venue is required.';
    if (!payload.address) errors.address = 'Address is required.';
    if (!payload.city) errors.city = 'City is required.';
    if (!payload.timezone) errors.timezone = 'Timezone is required.';
    if (!payload.startAt) errors.startAt = 'Start time is required.';
    if (!payload.endAt) errors.endAt = 'End time is required.';
    if (!payload.registrationClosesAt) {
      errors.registrationClosesAt = 'Registration closing time is required.';
    }

    if (payload.priceMinor == null) {
      errors.price = 'Enter a valid price.';
    }

    if (
      !Number.isInteger(payload.capacity) ||
      payload.capacity < 1 ||
      payload.capacity > 100000
    ) {
      errors.capacity = 'Capacity must be between 1 and 100,000.';
    }

    if (!payload.currency || payload.currency.length !== 3) {
      errors.currency = 'Currency must be a 3-letter code.';
    }

    const start = new Date(payload.startAt).getTime();
    const end = new Date(payload.endAt).getTime();
    const reg = new Date(payload.registrationClosesAt).getTime();

    if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
      errors.endAt = 'End time must be after the start time.';
    }

    if (Number.isFinite(start) && Number.isFinite(reg) && reg > start) {
      errors.registrationClosesAt =
        'Registration must close before the event starts.';
    }

    return errors;
  }

  async function handleSubmit(event, publish = false) {
    event.preventDefault();

    if (submitLock.current) return;

    setError('');
    setNotice('');

    let payload;

    try {
      payload = toPayload(form, originalDates.current);
    } catch (parseError) {
      setError(parseError.message);
      return;
    }

    const clientErrors = validateClient(payload);

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError('Please resolve the highlighted field errors before saving.');
      return;
    }

    submitLock.current = true;
    setSaving(true);
    setSavingAction(publish ? 'publish' : 'save');

    try {
      await saveOrganizerEvent({
        api,
        editing,
        eventId,
        payload,
        publish,
        navigate,
      });
    } catch (err) {
      if (err.workflowStage === 'publish') {
        setError(
          `Your event was saved, but publishing failed. Your changes are preserved. Please retry publishing. ${err.message || ''}`
        );
      } else {
        setError(err.message || 'Unable to save this event. Please try again.');
      }

      const serverErrors = err.fields ?? {};

      setFieldErrors({
        ...serverErrors,
        ...(serverErrors.priceMinor ? { price: serverErrors.priceMinor } : {}),
      });
    } finally {
      submitLock.current = false;
      setSaving(false);
      setSavingAction('');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl flex-1 p-8 text-center text-sm font-medium text-[#63564b]">
          Loading event details...
        </main>
        <Footer />
      </div>
    );
  }

  if (editing && editLocked) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
        <Navbar />
        <main className="mx-auto w-full max-w-lg flex-1 py-16 px-4">
          <div className="rounded-2xl border border-[#d4c7b9] bg-white p-8 text-center shadow-xs">
            <h1 className="font-serif text-2xl font-bold text-[#211c18]">
              Editing is locked
            </h1>
            <p role="status" className="mt-2 text-sm text-[#63564b]">
              Editing is locked while this event has active ticket bookings.
            </p>
            <Link
              to={`/organizer/events/${eventId}`}
              className="mt-6 inline-flex rounded-full bg-[#211c18] px-5 py-2.5 text-sm font-semibold text-[#fff4e8]"
            >
              Back to event details
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (editing && error && !form.title) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
        <Navbar />
        <main className="mx-auto w-full max-w-lg flex-1 py-16 px-4">
          <div className="rounded-2xl border border-[#f4bebe] bg-[#fbebe8] p-8 text-center">
            <p role="alert" className="text-sm font-semibold text-[#9f3b27]">
              {error}
            </p>
            <Link
              to="/organizer"
              className="mt-6 inline-flex rounded-full bg-[#211c18] px-5 py-2.5 text-sm font-semibold text-[#fff4e8]"
            >
              Back to dashboard
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  function inputClass(name) {
    return `mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#211c18] outline-none placeholder:text-[#8c7d70] focus:border-[#9f3b27] focus:ring-1 focus:ring-[#9f3b27] transition-colors ${
      fieldErrors[name] ? 'border-[#f4bebe] bg-[#fbebe8]' : 'border-[#d4c7b9]'
    }`;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <Link
          to={editing ? `/organizer/events/${eventId}` : '/organizer'}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#63564b] hover:text-[#9f3b27] transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5e9e2] text-[#9f3b27]">
            <CalendarDays size={24} />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-[#211c18]">
              {editing ? 'Edit Event' : 'Create Event'}
            </h1>
            <p className="mt-1 text-sm text-[#63564b]">
              {editing
                ? 'Update your event information and schedule.'
                : 'Enter your event details to save as draft or publish to EventHub.'}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-[#f4bebe] bg-[#fbebe8] p-4 text-xs font-semibold text-[#9f3b27]"
          >
            {error}
          </div>
        )}

        {notice && (
          <p
            role="status"
            className="mb-6 rounded-2xl border border-[#a3d9b8] bg-[#e8f5ec] p-4 text-xs font-semibold text-[#1b6e49]"
          >
            {notice}
          </p>
        )}

        <form
          onSubmit={(event) => handleSubmit(event, false)}
          className="space-y-8 rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs sm:p-9"
        >
          <section>
            <h2 className="mb-4 font-serif text-xl font-bold text-[#211c18] border-b border-[#eadecc] pb-2">
              Basic information
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map(([name, label, type]) => (
                <label
                  key={name}
                  className="block text-xs font-semibold uppercase tracking-wider text-[#63564b]"
                >
                  {label}
                  <input
                    id={name}
                    name={name}
                    type={type}
                    value={form[name]}
                    onChange={updateField}
                    maxLength={name === 'title' ? 150 : undefined}
                    aria-invalid={Boolean(fieldErrors[name])}
                    aria-describedby={
                      fieldErrors[name] ? `${name}-error` : undefined
                    }
                    className={inputClass(name)}
                  />
                  {fieldErrors[name] && (
                    <span
                      id={`${name}-error`}
                      className="mt-1 block text-xs text-[#9f3b27]"
                    >
                      {fieldErrors[name]}
                    </span>
                  )}
                </label>
              ))}

              <label className="block text-xs font-semibold uppercase tracking-wider text-[#63564b] sm:col-span-2">
                Description
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  maxLength={5000}
                  rows={5}
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={
                    fieldErrors.description ? 'description-error' : undefined
                  }
                  className={inputClass('description')}
                />
                {fieldErrors.description && (
                  <span
                    id="description-error"
                    className="mt-1 block text-xs text-[#9f3b27]"
                  >
                    {fieldErrors.description}
                  </span>
                )}
              </label>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-xl font-bold text-[#211c18] border-b border-[#eadecc] pb-2">
              Schedule & Timing
            </h2>
            <p className="mb-4 text-xs text-[#8c7d70]">
              Dates and times are entered in your browser's local timezone. The
              selected event timezone is stored separately.
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ['startAt', 'Event starts'],
                ['endAt', 'Event ends'],
                ['registrationClosesAt', 'Registration closes'],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="block text-xs font-semibold uppercase tracking-wider text-[#63564b]"
                >
                  {label}
                  <input
                    id={name}
                    type="datetime-local"
                    name={name}
                    value={form[name]}
                    onChange={updateField}
                    aria-invalid={Boolean(fieldErrors[name])}
                    aria-describedby={
                      fieldErrors[name] ? `${name}-error` : undefined
                    }
                    className={inputClass(name)}
                  />
                  {fieldErrors[name] && (
                    <span
                      id={`${name}-error`}
                      className="mt-1 block text-xs text-[#9f3b27]"
                    >
                      {fieldErrors[name]}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-xl font-bold text-[#211c18] border-b border-[#eadecc] pb-2">
              Capacity and pricing
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                Capacity
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  step="1"
                  name="capacity"
                  value={form.capacity}
                  onChange={updateField}
                  aria-invalid={Boolean(fieldErrors.capacity)}
                  aria-describedby={
                    fieldErrors.capacity ? 'capacity-error' : undefined
                  }
                  className={inputClass('capacity')}
                />
                {fieldErrors.capacity && (
                  <span
                    id="capacity-error"
                    className="mt-1 block text-xs text-[#9f3b27]"
                  >
                    {fieldErrors.capacity}
                  </span>
                )}
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                Ticket price (in major currency units)
                <input
                  id="price"
                  type="text"
                  inputMode="decimal"
                  name="price"
                  value={form.price}
                  onChange={updateField}
                  aria-invalid={Boolean(fieldErrors.price)}
                  aria-describedby={
                    fieldErrors.price ? 'price-error' : undefined
                  }
                  className={inputClass('price')}
                />
                {fieldErrors.price && (
                  <span
                    id="price-error"
                    className="mt-1 block text-xs text-[#9f3b27]"
                  >
                    {fieldErrors.price}
                  </span>
                )}
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                Currency (e.g. INR)
                <input
                  id="currency"
                  name="currency"
                  maxLength={3}
                  value={form.currency}
                  onChange={updateField}
                  aria-invalid={Boolean(fieldErrors.currency)}
                  aria-describedby={
                    fieldErrors.currency ? 'currency-error' : undefined
                  }
                  className={inputClass('currency')}
                />
                {fieldErrors.currency && (
                  <span
                    id="currency-error"
                    className="mt-1 block text-xs text-[#9f3b27]"
                  >
                    {fieldErrors.currency}
                  </span>
                )}
              </label>
            </div>
            <p className="mt-3 text-xs text-[#8c7d70]">
              Enter 0 for free events, or standard currency amount (e.g. 250.00
              for ₹250).
            </p>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-[#eadecc] pt-6 sm:flex-row sm:justify-end">
            <Link
              to={editing ? `/organizer/events/${eventId}` : '/organizer'}
              className="rounded-full border border-[#d4c7b9] bg-white px-5 py-2.5 text-center text-sm font-semibold text-[#211c18] hover:bg-[#faf7f2]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d4c7b9] bg-white px-5 py-2.5 text-sm font-semibold text-[#211c18] hover:border-[#9f3b27] hover:text-[#9f3b27] disabled:opacity-50"
            >
              <Save size={16} />
              {saving && savingAction === 'save' ? 'Saving...' : 'Save draft'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={(event) => handleSubmit(event, true)}
              className="rounded-full bg-[#9f3b27] px-6 py-2.5 text-sm font-semibold text-[#fff4e8] transition hover:bg-[#852f1e] disabled:opacity-50 shadow-xs"
            >
              {saving && savingAction === 'publish'
                ? 'Publishing...'
                : 'Save and publish'}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

export default OrganizerEventForm;
