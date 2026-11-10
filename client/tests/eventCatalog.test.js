import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCatalogQuery,
  clearCatalogFilters,
  updateCatalogFilter,
} from '../src/pages/eventCatalog.js';

test('catalog query combines all active filters and pagination', () => {
  const query = new URL(
    buildCatalogQuery({
      search: '  live music  ',
      category: 'Tech & Business',
      city: 'Pune',
      pricing: 'free',
      from: '2027-04-01',
      to: '2027-04-30',
      page: '2',
    }),
    'https://example.test'
  );

  assert.deepEqual(
    [...query.searchParams],
    [
      ['q', 'live music'],
      ['category', 'Tech & Business'],
      ['city', 'Pune'],
      ['pricing', 'free'],
      ['from', '2027-04-01'],
      ['to', '2027-04-30'],
      ['page', '2'],
      ['limit', '12'],
    ]
  );
});

test('catalog query omits empty filters', () => {
  const query = new URL(
    buildCatalogQuery({
      search: '  ',
      category: 'All',
      city: '',
      pricing: '',
      from: '',
      to: '',
    }),
    'https://example.test'
  );

  assert.deepEqual(
    [...query.searchParams],
    [
      ['page', '1'],
      ['limit', '12'],
    ]
  );
});

test('catalog query encodes search and filter values', () => {
  assert.equal(
    buildCatalogQuery({
      search: ' live music & art ',
      category: 'Tech & Business',
      city: 'Pune & Pimpri',
      pricing: 'free',
    }),
    '/events?q=live+music+%26+art&category=Tech+%26+Business&city=Pune+%26+Pimpri&pricing=free&page=1&limit=12'
  );
});

test('changing a filter preserves other URL filters and resets pagination', () => {
  const current = new URLSearchParams(
    'q=music&category=Music&city=Pune&pricing=free&from=2027-04-01&page=3&campaign=spring'
  );

  const next = updateCatalogFilter(current, 'city', 'Mumbai');

  assert.equal(next.get('city'), 'Mumbai');
  assert.equal(next.get('q'), 'music');
  assert.equal(next.get('category'), 'Music');
  assert.equal(next.get('pricing'), 'free');
  assert.equal(next.get('from'), '2027-04-01');
  assert.equal(next.has('page'), false);
  assert.equal(next.get('campaign'), 'spring');
});

test('changing a filter to its default removes only that filter', () => {
  const current = new URLSearchParams('category=Music&page=2&campaign=spring');

  const next = updateCatalogFilter(current, 'category', 'All');

  assert.equal(next.has('category'), false);
  assert.equal(next.has('page'), false);
  assert.equal(next.get('campaign'), 'spring');
});

test('changing pagination preserves active filters', () => {
  const current = new URLSearchParams(
    'q=music&category=Music&city=Pune&pricing=paid&from=2027-04-01&to=2027-04-30&page=1&campaign=spring'
  );

  const next = updateCatalogFilter(current, 'page', '2');

  assert.equal(next.get('page'), '2');
  assert.equal(next.get('q'), 'music');
  assert.equal(next.get('category'), 'Music');
  assert.equal(next.get('city'), 'Pune');
  assert.equal(next.get('pricing'), 'paid');
  assert.equal(next.get('from'), '2027-04-01');
  assert.equal(next.get('to'), '2027-04-30');
  assert.equal(next.get('campaign'), 'spring');
});

test('clearing catalog filters and pagination preserves unrelated parameters', () => {
  const current = new URLSearchParams(
    'q=music&category=Music&city=Pune&pricing=free&from=2027-04-01&to=2027-04-30&page=2&campaign=spring'
  );

  const next = clearCatalogFilters(current);

  assert.deepEqual([...next], [['campaign', 'spring']]);
});
