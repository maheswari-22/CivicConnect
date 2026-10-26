// The cities / areas CivicConnect serves. A complaint, an authority and a worker each
// belong to exactly ONE of these, and that is how a complaint reaches the right office.
// Keep this list in sync with F11/src/shared/areas.js (the dropdown shown in the app).
export const AREAS = [
  'Amaravathi',
  'Anantapur',
  'Bapatla',
  'Bhimavaram',
  'Chittoor',
  'Eluru',
  'Guntur',
  'Kadapa',
  'Kakinada',
  'Kurnool',
  'Machilipatnam',
  'Nandyal',
  'Narasaraopet',
  'Nellore',
  'Ongole',
  'Rajahmundry',
  'Srikakulam',
  'Tirupati',
  'Vijayawada',
  'Visakhapatnam',
  'Vizianagaram',
];

export const DEFAULT_AREA = 'Visakhapatnam';
export const isArea = (value) => AREAS.includes(value);

/* Rough centre of each area, used only to catch an obviously wrong map pin (for example a pin in another state).
   The radius is deliberately generous (in km): it is a sanity check, not a boundary. */
const CENTRES = {
  Amaravathi: [16.5131, 80.516, 60],
  Anantapur: [14.6819, 77.6006, 60],
  Bapatla: [15.9041, 80.4674, 40],
  Bhimavaram: [16.5449, 81.5212, 40],
  Chittoor: [13.2172, 79.1003, 50],
  Eluru: [16.7107, 81.0952, 50],
  Guntur: [16.3067, 80.4365, 50],
  Kadapa: [14.4673, 78.8242, 60],
  Kakinada: [16.9891, 82.2475, 60],
  Kurnool: [15.8281, 78.0373, 60],
  Machilipatnam: [16.1875, 81.1389, 50],
  Nandyal: [15.4786, 78.4836, 50],
  Narasaraopet: [16.235, 80.049, 40],
  Nellore: [14.4426, 79.9865, 60],
  Ongole: [15.5057, 80.0499, 60],
  Rajahmundry: [17.0005, 81.804, 60],
  Srikakulam: [18.2949, 83.8938, 60],
  Tirupati: [13.6288, 79.4192, 50],
  Vijayawada: [16.5062, 80.648, 50],
  Visakhapatnam: [17.6868, 83.2185, 60],
  Vizianagaram: [18.1067, 83.3956, 50],
};
const toRad = (d) => (d * Math.PI) / 180;
export function withinArea(area, lat, lng) {
  const c = CENTRES[area];
  if (!c) return true;
  const dLat = toRad(lat - c[0]);
  const dLng = toRad(lng - c[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(c[0])) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h)) <= c[2];
}

/** Great-circle distance in km. */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const h = Math.sin(toRad(lat2 - lat1) / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/* Rough box around Andhra Pradesh (where the listed offices are). A pin outside it is not served. */
const SERVICE_BOX = { lat: [12.5, 19.95], lng: [76.7, 84.9] };
/* Villages sit far from district headquarters. Beyond the HQ radius we still route a pin to the CLOSEST office,
   as long as it is within this distance, so a village is never left without an authority. */
export const NEAREST_OFFICE_MAX_KM = 120;

/** Which office serves a GPS position: { area, distanceKm, inside } or null when it is outside the service region.
    `inside` is true when the position is within that office's own radius, false when it is a village routed to the nearest office. */
export function locateArea(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < SERVICE_BOX.lat[0] || lat > SERVICE_BOX.lat[1] || lng < SERVICE_BOX.lng[0] || lng > SERVICE_BOX.lng[1]) return null;
  let best = null;
  for (const [area, [cLat, cLng, radius]] of Object.entries(CENTRES)) {
    const d = distanceKm(lat, lng, cLat, cLng);
    const score = d / radius; // compare by how deep inside each radius the point is, so a small town is not stolen by a big neighbour
    if (!best || score < best.score) best = { area, d, radius, score };
  }
  if (!best || best.d > NEAREST_OFFICE_MAX_KM) return null;
  return { area: best.area, distanceKm: Math.round(best.d * 10) / 10, inside: best.d <= best.radius };
}
