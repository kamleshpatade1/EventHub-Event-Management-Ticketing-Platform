import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, Save } from 'lucide-react';
import { api } from '../lib/api.js';

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

function toPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    venue: form.venue.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    timezone: form.timezone.trim(),
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt).toISOString(),
    registrationClosesAt: new Date(form.registrationClosesAt).toISOString(),
    capacity: Number(form.capacity),
    priceMinor: Math.round(Number(form.price) * 100),
    currency: form.currency.trim().toUpperCase(),
  };
}

function OrganizerEventForm() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(eventId);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState('');

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

        setForm({
          title: event.title ?? '',
          description: event.description ?? '',
          category: event.category ?? '',
          venue: event.venue ?? '',
          address: event.address ?? '',
          city: event.city ?? '',
          timezone: event.timezone ?? 'Asia/Kolkata',
          startAt: toLocalInput(event.startAt),
          endAt: toLocalInput(event.endAt),
          registrationClosesAt: toLocalInput(event.registrationClosesAt),
          capacity: String(event.capacity ?? 100),
          price: String((event.priceMinor ?? 0) / 100),
          currency: event.currency ?? 'INR',
        });
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load this event.');
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

    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setError('');
    setNotice('');
  }

  function validate() {
    const errors = {};

    for (const [key, label] of fields) {
      if (!form[key].trim()) errors[key] = `${label} is required.`;
    }

    if (!form.description.trim()) {
      errors.description = 'Description is required.';
    }

    if (!form.startAt) errors.startAt = 'Start date is required.';
    if (!form.endAt) errors.endAt = 'End date is required.';
    if (!form.registrationClosesAt) {
      errors.registrationClosesAt = 'Registration deadline is required.';
    }

    const start = new Date(form.startAt);
    const end = new Date(form.endAt);
    const deadline = new Date(form.registrationClosesAt);

    if (form.startAt && form.endAt && end <= start) {
      errors.endAt = 'End date must be after start date.';
    }

    if (form.startAt && form.registrationClosesAt && deadline >= start) {
      errors.registrationClosesAt =
        'Registration must close before the event starts.';
    }

    if (form.startAt && !editing && start <= new Date()) {
      errors.startAt = 'Choose a future start date.';
    }

    if (
      form.capacity.trim() === '' ||
      !Number.isInteger(Number(form.capacity)) ||
      Number(form.capacity) < 1
    ) {
      errors.capacity = 'Capacity must be a positive integer.';
    }

    if (
      form.price.trim() === '' ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0 ||
      !Number.isSafeInteger(Number(form.price) * 100)
    ) {
      errors.price =
        'Enter a valid non-negative price with at most two decimal places.';
    }

    if (!/^[A-Za-z]{3}$/.test(form.currency.trim())) {
      errors.currency = 'Use a three-letter currency code, such as INR.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event, publish = false) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!validate()) {
      setError('Please correct the highlighted fields.');
      return;
    }

    if (publish && !window.confirm('Publish this event now?')) {
      return;
    }

    setSaving(true);

    try {
      const payload = toPayload(form);
      let savedEvent;

      if (editing) {
        const result = await api(`/organizer/events/${eventId}`, {
          method: 'PATCH',
          body: payload,
        });
        savedEvent = result.data;
      } else {
        const result = await api('/organizer/events', {
          method: 'POST',
          body: payload,
        });
        savedEvent = result.data;
      }

      if (publish) {
        await api(`/organizer/events/${savedEvent.id}/publish`, {
          method: 'POST',
        });
      }

      navigate(`/organizer/events/${savedEvent.id}`, {
        replace: true,
        state: {
          notice: publish
            ? 'Event published successfully.'
            : editing
              ? 'Event changes saved.'
              : 'Draft created successfully.',
        },
      });
    } catch (err) {
      setError(err.message || 'Unable to save this event.');
      setFieldErrors(err.fields ?? {});
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b12] p-8 text-white">
        Loading event...
      </main>
    );
  }

  if (editing && error && !form.title) {
    return (
      <main className="min-h-screen bg-[#0b0b12] p-8 text-white">
        <p role="alert" className="mb-4 text-red-400">
          {error}
        </p>
        <Link to="/organizer" className="underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  function inputClass(name) {
    return `mt-2 w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-purple-500 ${
      fieldErrors[name] ? 'border-red-500' : 'border-white/10'
    }`;
  }

  return (
    <main className="min-h-screen bg-[#0b0b12] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          to={editing ? `/organizer/events/${eventId}` : '/organizer'}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-purple-500/15 p-3 text-purple-300">
            <CalendarDays size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              {editing ? 'Edit event' : 'Create event'}
            </h1>
            <p className="mt-1 text-gray-400">
              {editing
                ? 'Update your event information.'
                : 'Add your event details and save a draft or publish it.'}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300"
          >
            {error}
          </div>
        )}

        {notice && (
          <p role="status" className="mb-6 text-emerald-400">
            {notice}
          </p>
        )}

        <form
          onSubmit={(event) => handleSubmit(event, false)}
          className="space-y-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-8"
        >
          <section>
            <h2 className="mb-5 text-lg font-semibold">Basic information</h2>

            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map(([name, label, type]) => (
                <label key={name} className="block text-sm text-gray-300">
                  {label}
                  <input
                    name={name}
                    type={type}
                    value={form[name]}
                    onChange={updateField}
                    maxLength={name === 'title' ? 150 : undefined}
                    className={inputClass(name)}
                  />
                  {fieldErrors[name] && (
                    <span className="mt-1 block text-xs text-red-400">
                      {fieldErrors[name]}
                    </span>
                  )}
                </label>
              ))}

              <label className="block text-sm text-gray-300 sm:col-span-2">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  maxLength={5000}
                  rows={5}
                  className={inputClass('description')}
                />
                {fieldErrors.description && (
                  <span className="mt-1 block text-xs text-red-400">
                    {fieldErrors.description}
                  </span>
                )}
              </label>
            </div>
          </section>

          <section>
            <h2 className="mb-5 text-lg font-semibold">Schedule</h2>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ['startAt', 'Event starts'],
                ['endAt', 'Event ends'],
                ['registrationClosesAt', 'Registration closes'],
              ].map(([name, label]) => (
                <label key={name} className="block text-sm text-gray-300">
                  {label}
                  <input
                    type="datetime-local"
                    name={name}
                    value={form[name]}
                    onChange={updateField}
                    className={inputClass(name)}
                  />
                  {fieldErrors[name] && (
                    <span className="mt-1 block text-xs text-red-400">
                      {fieldErrors[name]}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-5 text-lg font-semibold">Capacity and pricing</h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm text-gray-300">
                Capacity
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="capacity"
                  value={form.capacity}
                  onChange={updateField}
                  className={inputClass('capacity')}
                />
                {fieldErrors.capacity && (
                  <span className="mt-1 block text-xs text-red-400">
                    {fieldErrors.capacity}
                  </span>
                )}
              </label>

              <label className="block text-sm text-gray-300">
                Ticket price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="price"
                  value={form.price}
                  onChange={updateField}
                  className={inputClass('price')}
                />
                {fieldErrors.price && (
                  <span className="mt-1 block text-xs text-red-400">
                    {fieldErrors.price}
                  </span>
                )}
              </label>

              <label className="block text-sm text-gray-300">
                Currency
                <input
                  name="currency"
                  maxLength={3}
                  value={form.currency}
                  onChange={updateField}
                  className={inputClass('currency')}
                />
                {fieldErrors.currency && (
                  <span className="mt-1 block text-xs text-red-400">
                    {fieldErrors.currency}
                  </span>
                )}
              </label>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Enter the ticket price in major currency units, for example 250.00
              for ₹250.
            </p>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
            <Link
              to={editing ? `/organizer/events/${eventId}` : '/organizer'}
              className="rounded-xl border border-white/15 px-5 py-3 text-center text-sm font-semibold hover:bg-white/5"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-400/40 px-5 py-3 text-sm font-semibold hover:bg-purple-500/10 disabled:opacity-50"
            >
              <Save size={17} />
              {saving ? 'Saving...' : 'Save draft'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={(event) => handleSubmit(event, true)}
              className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold hover:bg-purple-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save and publish'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default OrganizerEventForm;
