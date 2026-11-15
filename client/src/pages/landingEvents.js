import { getEventCover } from './eventCatalog.js';

export const homepageEventRequests = {
  upcoming: '/events?limit=8',
  free: '/events?pricing=free&limit=8',
  paid: '/events?pricing=paid&limit=8',
};

export async function fetchHomepageEvents(request, path) {
  const result = await request(path);

  if (!Array.isArray(result?.data)) {
    throw new Error('The event service returned an unexpected response.');
  }

  return result.data;
}

export function formatHomepageEvent(event) {
  const date = event.startAt ? new Date(event.startAt) : null;
  const amount = Number(event.priceMinor ?? 0) / 100;
  const currency = event.currency || 'INR';

  let formattedPrice = 'Free';
  if (amount !== 0) {
    try {
      formattedPrice = `From ${new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount)}`;
    } catch {
      formattedPrice = `${currency} ${amount.toFixed(2)}`;
    }
  }

  return {
    href: `/events/${encodeURIComponent(event.id)}`,
    image: getEventCover(event),
    date:
      date && !Number.isNaN(date.getTime())
        ? new Intl.DateTimeFormat('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(date)
        : 'Date to be announced',
    location:
      [event.venue, event.city].filter(Boolean).join(', ') ||
      'Location to be announced',
    price: formattedPrice,
    category: event.category || 'Event',
    description: event.description || 'Discover this upcoming event.',
  };
}

export function getHomepageSectionState({ loading, error, events }) {
  if (loading) return 'loading';
  if (error) return 'error';
  return events.length > 0 ? 'events' : 'empty';
}

export function getEventSearchPath(search) {
  const query = search.trim();
  return query ? `/events?${new URLSearchParams({ q: query })}` : '/events';
}

export function getCategoryPath(category) {
  return category === 'All Events'
    ? '/events'
    : `/events?${new URLSearchParams({ category })}`;
}
