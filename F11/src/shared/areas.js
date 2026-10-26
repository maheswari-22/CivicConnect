/* The cities / areas CivicConnect serves. A complaint, an authority and a worker each
   belong to ONE of these — that is how a complaint reaches the right office.
   Keep in sync with Backend/src/config/areas.js (the server rejects anything else). */
export const AREAS = [
  "Amaravathi",
  "Anantapur",
  "Bapatla",
  "Bhimavaram",
  "Chittoor",
  "Eluru",
  "Guntur",
  "Kadapa",
  "Kakinada",
  "Kurnool",
  "Machilipatnam",
  "Nandyal",
  "Narasaraopet",
  "Nellore",
  "Ongole",
  "Rajahmundry",
  "Srikakulam",
  "Tirupati",
  "Vijayawada",
  "Visakhapatnam",
  "Vizianagaram",
];

export const isArea = (value) => AREAS.includes(value);

/* Rough centre (lat, lng) and radius in km of each area. Used to pick the area from a GPS position.
   Keep in sync with Backend/src/config/areas.js. It is a convenience, not a boundary. */
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

/** [lat, lng] of an area's office, for centring a map before the citizen has a position. */
export const areaCentre = (area) => (CENTRES[area] ? [CENTRES[area][0], CENTRES[area][1]] : [16.3, 80.4]);

const toRad = (d) => (d * Math.PI) / 180;
/** Great-circle distance in km. */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const h = Math.sin(toRad(lat2 - lat1) / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/* Same limits as the server (Backend/src/config/areas.js): a rough box around Andhra Pradesh, and the farthest a village
   may be from an office and still be routed to it. */
const SERVICE_BOX = { lat: [12.5, 19.95], lng: [76.7, 84.9] };
const NEAREST_OFFICE_MAX_KM = 120;

/** The office that serves this position, or null when it is outside the region we serve.
    A village far from every headquarters is routed to the closest office (compared by how deep it sits inside each radius). */
export function nearestArea(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < SERVICE_BOX.lat[0] || lat > SERVICE_BOX.lat[1] || lng < SERVICE_BOX.lng[0] || lng > SERVICE_BOX.lng[1]) return null;
  let best = null;
  for (const [name, [cLat, cLng, radius]] of Object.entries(CENTRES)) {
    const d = distanceKm(lat, lng, cLat, cLng);
    const score = d / radius;
    if (!best || score < best.score) best = { name, d, score };
  }
  return best && best.d <= NEAREST_OFFICE_MAX_KM ? best.name : null;
}
