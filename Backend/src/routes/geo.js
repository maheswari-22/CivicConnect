import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { asyncHandler, ok } from '../utils/http.js';
import { locateArea } from '../config/areas.js';

/* Reverse geocoding: GPS coordinates -> a readable street address.
   It runs on the SERVER because OpenStreetMap's usage policy requires an identifying User-Agent header, which a browser
   cannot set. Results are cached (nearby taps share one lookup), so the public service is hit as little as possible. */

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const TTL_MS = 24 * 3600 * 1000;
const MAX_ENTRIES = 1000;
const cache = new Map(); // "lat,lng" rounded to ~11 m -> { at, value }

export const clearGeoCache = () => { cache.clear(); };

/** Builds "Road, Neighbourhood, City" from a Nominatim `address` object. */
export function shortAddress(address = {}, displayName = '') {
  // A named building / shop / temple nearby, and the house number, make the address much easier to find on the ground.
  const landmark = address.amenity || address.shop || address.tourism || address.leisure || address.office || address.man_made || '';
  const roadName = address.road || address.pedestrian || address.footway || address.residential || '';
  const road = [address.house_number, roadName].filter(Boolean).join(', ') || '';
  const local = address.neighbourhood || address.suburb || address.quarter || address.city_district || '';
  const city = address.city || address.town || address.village || address.municipality || address.state_district || '';
  const parts = [landmark, road, local, city].filter(Boolean);
  const unique = parts.filter((p, i) => parts.indexOf(p) === i);
  return unique.length ? unique.join(', ') : displayName.split(',').slice(0, 3).join(',').trim();
}

/** The settlement the point is in: a village, hamlet, town or city, with its district. Used to name villages correctly. */
export function placeFrom(address = {}) {
  const pick = [
    ['city', address.city],
    ['town', address.town],
    ['village', address.village],
    ['hamlet', address.hamlet],
    ['town', address.municipality],
    ['village', address.suburb && !address.city && !address.town ? address.suburb : ''],
  ].find(([, name]) => name);
  const state = address.state || '';
  return {
    name: pick ? pick[1] : '',
    type: pick ? pick[0] : null,
    // Andhra Pradesh calls the district "state_district" in OpenStreetMap; "county" is used in some places.
    district: address.state_district || address.county || '',
    state,
  };
}

/** Result of a place search -> { name, type, district, state, lat, lng, area }. */
export function searchResult(item) {
  const address = item.address || {};
  const place = placeFrom(address);
  const name = place.name || item.name || String(item.display_name || '').split(',')[0].trim();
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  const served = Number.isFinite(lat) && Number.isFinite(lng) ? locateArea(lat, lng) : null;
  return {
    name,
    type: place.type || item.type || 'place',
    district: place.district,
    state: place.state,
    label: [name, place.district, place.state].filter(Boolean).filter((p, i, all) => all.indexOf(p) === i).join(', '),
    lat,
    lng,
    area: served?.area || null,
  };
}

/** `geocoderUrl` is injectable so tests can point it at a local stub instead of the real service. */
export function createGeoRouter({ geocoderUrl = env.geocoderUrl, searchUrl = env.geocoderSearchUrl || geocoderUrl.replace(/\/reverse\/?$/, '/search'), minGapMs = 1000 } = {}) {
// Nominatim's usage policy allows at most one request per second, so upstream calls are queued one after another.
let queue = Promise.resolve();
let waiting = 0;
const MAX_WAITING = 12;          // when this many lookups are already queued, new ones fail fast (the page keeps the pin and lets the citizen type)
const inflight = new Map();      // identical lookups made at the same moment share ONE upstream call
const upstream = (url) => {
  const key = String(url);
  if (inflight.has(key)) return inflight.get(key);
  if (waiting >= MAX_WAITING) return Promise.reject(new Error('geocoder queue is full'));
  waiting += 1;
  const run = queue.then(async () => {
    const response = await fetch(url, {
      headers: { 'User-Agent': `CivicConnect/1.0 (${env.appUrl})`, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error(`geocoder answered ${response.status}`);
    return response.json();
  });
  queue = run.catch(() => {}).then(() => (minGapMs > 0 ? new Promise((r) => setTimeout(r, minGapMs)) : undefined));
  const tracked = run.finally(() => { waiting -= 1; inflight.delete(key); });
  inflight.set(key, tracked);
  return tracked;
};
const contact = env.geocoderEmail ? { email: env.geocoderEmail } : {};
const router = Router();
router.get('/reverse', asyncHandler(async (req, res) => {
  const { lat, lng } = querySchema.parse(req.query);
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return ok(res, hit.value);

  let data;
  try {
    const url = new URL(geocoderUrl);
    url.search = new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lng), zoom: '18', addressdetails: '1', ...contact }).toString();
    data = await upstream(url);
  } catch (error) {
    // Not an error for the citizen: the page falls back to showing the coordinates and lets them type the place.
    console.error('[geo] reverse geocoding failed:', error.message);
    return ok(res, { address: null, displayName: '', postcode: null, place: null, area: locateArea(lat, lng)?.area || null, unavailable: true });
  }
  if (!data || data.error) return ok(res, { address: null, displayName: '', postcode: null, place: null, area: locateArea(lat, lng)?.area || null });

  const value = {
    address: shortAddress(data.address, data.display_name || ''),
    displayName: data.display_name || '',
    postcode: data.address?.postcode || null,
    place: placeFrom(data.address),
    // The office that serves this position (a village is routed to the nearest office). Null = outside the service region.
    area: locateArea(lat, lng)?.area || null,
  };
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value); // drop the oldest
  cache.set(key, { at: Date.now(), value });
  ok(res, value);
}));

const searchQuery = z.object({ q: z.string().trim().min(2, 'Type at least 2 letters.').max(80) });
const searchCache = new Map();
const SEARCH_TTL_MS = 3600 * 1000;
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = searchQuery.parse(req.query);
  const key = q.toLowerCase();
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < SEARCH_TTL_MS) return ok(res, hit.value);
  let rows;
  try {
    const url = new URL(searchUrl);
    // Bounded to the Andhra Pradesh box, so "Kothapalem" finds the one in the state, not one in another state.
    url.search = new URLSearchParams({
      format: 'jsonv2', q, countrycodes: 'in', addressdetails: '1', limit: '8', dedupe: '1',
      viewbox: '76.7,19.95,84.9,12.5', bounded: '1', ...contact,
    }).toString();
    rows = await upstream(url);
  } catch (error) {
    console.error('[geo] place search failed:', error.message);
    return ok(res, { places: [], unavailable: true });
  }
  const seen = new Set();
  const places = (Array.isArray(rows) ? rows : [])
    .map(searchResult)
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.name && p.area) // only places an office serves
    .filter((p) => { const k = `${p.name}|${p.district}`.toLowerCase(); return seen.has(k) ? false : seen.add(k); });
  const value = { places };
  if (searchCache.size >= 500) searchCache.delete(searchCache.keys().next().value);
  searchCache.set(key, { at: Date.now(), value });
  ok(res, value);
}));
return router;
}

export default createGeoRouter;
