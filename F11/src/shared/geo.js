/* ==========================================================================
   Location helpers built on the browser Geolocation API.
   - locate():        asks for the GPS position and keeps refining it for a few seconds, because
                      the very first fix of a phone is often 100 m - 2 km off.
   - reverseGeocode(): turns coordinates into a street address (through our own API).
   - helpers for accuracy wording, error wording and an OpenStreetMap preview.
   Nothing here runs until the citizen taps "Use current location".
   ========================================================================== */
export const ACCURACY_GOOD_M = 20;   // stop refining once the fix is this precise
export const ACCURACY_POOR_M = 150;  // above this, warn that the pin may be off

/** Plain-language reason for a failed Geolocation request. */
export function explainGeoError(error, { secure = typeof window === "undefined" ? true : window.isSecureContext } = {}) {
  if (!secure) return "Your browser only gives location on https:// or localhost. Open the site over https, or type the place.";
  switch (error?.code) {
    case 1: return "Location permission was denied. Allow location for this site in your browser settings, or type the place.";
    case 2: return "Your position is not available right now. Move to an open area, switch on GPS, or type the place.";
    case 3: return "Finding your position took too long. Please try again, or type the place.";
    default: return error?.message || "Could not get your location. Please type the place.";
  }
}

/** "Very precise (±12 m)" / "Approximate (±90 m)" / "Low accuracy (±800 m)" */
export function describeAccuracy(meters) {
  const m = Math.round(meters);
  if (m <= ACCURACY_GOOD_M) return { level: "good", text: `Precise location (±${m} m)` };
  if (m <= ACCURACY_POOR_M) return { level: "ok", text: `Approximate location (±${m} m)` };
  if (m > 1000) return { level: "poor", text: `Only an approximate area (±${(m / 1000).toFixed(1)} km): drag the pin to the exact spot` };
  return { level: "poor", text: `Low accuracy (±${m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`}) — check the address below` };
}

/**
 * Starts a GPS lookup and keeps the most accurate reading seen.
 * Resolves as soon as a reading is precise enough, or after `maxMs` with the best one so far.
 * Rejects (with the browser's error) only if no reading arrived at all.
 * Returns { promise, cancel }. `onUpdate({lat,lng,accuracy})` is called with every improvement.
 * `geolocation` can be replaced in tests.
 */
export function locate({ onUpdate, maxMs = 20000, goodEnoughM = ACCURACY_GOOD_M, geolocation = typeof navigator === "undefined" ? undefined : navigator.geolocation } = {}) {
  let cancel = () => {};
  const promise = new Promise((resolve, reject) => {
    if (!geolocation) {
      reject({ code: 0, message: "Location is not available on this device. Please type the place." });
      return;
    }
    let best = null;
    const readings = [];   // every reading, so the final position can be averaged (a single GPS fix jitters by several metres)
    let watchId = null;
    let timer = null;
    let finished = false;
    const finish = (fn, value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (watchId !== null) geolocation.clearWatch(watchId);
      fn(value);
    };
    // Weighted average of the readings that are about as good as the best one (weight 1 / accuracy²): smooths GPS jitter.
    const fuse = () => {
      if (!best) return best;
      const usable = readings.filter((r) => r.accuracy <= Math.max(best.accuracy * 2, best.accuracy + 15));
      let wSum = 0; let lat = 0; let lng = 0;
      for (const r of usable) { const w = 1 / Math.max(r.accuracy, 1) ** 2; wSum += w; lat += r.lat * w; lng += r.lng * w; }
      return { lat: lat / wSum, lng: lng / wSum, accuracy: best.accuracy, samples: usable.length, coarse: best.accuracy > 1000 };
    };
    cancel = () => finish(reject, { code: -1, message: "cancelled" });

    watchId = geolocation.watchPosition(
      (pos) => {
        const reading = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? Infinity };
        readings.push(reading);
        if (!best || reading.accuracy < best.accuracy) {
          best = reading;
          onUpdate?.(best);
        }
        if (best.accuracy <= goodEnoughM) finish(resolve, fuse());
      },
      (error) => { if (!best) finish(reject, error); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxMs },
    );
    timer = setTimeout(() => (best ? finish(resolve, fuse()) : finish(reject, { code: 3, message: "timeout" })), maxMs);
  });
  return { promise, cancel: () => cancel() };
}

/** What the geocoder knows about a position: { address, place: {name, type, district, state}, area } or null when it cannot be looked up
    (the page then keeps the coordinates). `place` is the village / town / city; `area` is the office that serves it. */
export async function reverseGeocode(lat, lng) {
  try {
    const { api } = await import("./api.js"); // loaded on demand, so the pure helpers above also run outside the browser (tests)
    const res = await api("citizen").get(`/api/geo/reverse?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
    if (!res.ok) return null;
    return { address: res.data.address || null, place: res.data.place?.name ? res.data.place : null, area: res.data.area || null };
  } catch {
    return null;
  }
}

/** Looks up a village / town / city by name inside Andhra Pradesh. Resolves { places: [{name,type,district,state,label,lat,lng,area}], unavailable }.
    Only called when the citizen presses Search (the free OpenStreetMap service does not allow search-as-you-type). */
export async function searchPlaces(text) {
  const q = String(text || "").trim();
  if (q.length < 2) return { places: [], unavailable: false };
  try {
    const { api } = await import("./api.js");
    const res = await api("citizen").get(`/api/geo/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return { places: [], unavailable: true, error: res.error };
    return { places: res.data.places || [], unavailable: Boolean(res.data.unavailable) };
  } catch {
    return { places: [], unavailable: true };
  }
}

/** Embeddable OpenStreetMap preview with a marker (no API key, no extra library). */
export function osmEmbedUrl(lat, lng) {
  const dLat = 0.0022;
  const dLng = 0.0035;
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => n.toFixed(6)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export const osmLink = (lat, lng) => `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}#map=18/${lat.toFixed(6)}/${lng.toFixed(6)}`;
