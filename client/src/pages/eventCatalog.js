const categoryCovers = new Map([
  ['music', 'indie'],
  ['comedy', 'stand-up'],
  ['workshops', 'pottery'],
  ['workshop', 'pottery'],
  ['art & culture', 'dance'],
  ['tech & business', 'makers'],
  ['tech', 'makers'],
  ['sports', 'football'],
  ['food & drinks', 'food'],
]);
const coverKeys = new Set([...categoryCovers.values(), 'default']);

export function getEventCover(event) {
  const category = event.category?.trim().toLowerCase();
  const cover = coverKeys.has(event.coverKey)
    ? event.coverKey
    : (categoryCovers.get(category) ?? 'default');

  return `${import.meta.env?.BASE_URL ?? '/'}eventhub/covers/${cover}.webp`;
}

export function buildCatalogQuery({
  search = '',
  category = 'All',
  city = '',
  pricing = '',
  from = '',
  to = '',
  page = '1',
}) {
  const params = new URLSearchParams();
  if (search.trim()) params.set('q', search.trim());
  if (category !== 'All') params.set('category', category);
  if (city.trim()) params.set('city', city.trim());
  if (pricing) params.set('pricing', pricing);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('page', page || '1');
  params.set('limit', '12');

  return `/events?${params.toString()}`;
}

export function updateCatalogFilter(searchParams, key, value) {
  const next = new URLSearchParams(searchParams);

  if (key === 'page') {
    if (value) next.set(key, value);
    else next.delete(key);
  } else {
    if (value && value !== 'All') next.set(key, value);
    else next.delete(key);
    next.delete('page');
  }

  return next;
}

export function clearCatalogFilters(searchParams) {
  const next = new URLSearchParams(searchParams);
  ['q', 'category', 'city', 'pricing', 'from', 'to', 'page'].forEach((key) =>
    next.delete(key)
  );
  return next;
}
