/* ==========================================================================
   AI severity estimate for a complaint photo (0-100 %).

   Runs entirely in the browser on the photo the citizen picked. The zero-shot photo model is asked how severe the problem is
   (see imageClassifier.js). The picture's own statistics are measured too, but only as a small nudge:

     damage    how much of the frame is dark / broken-up surface (cracks, holes, wet patches)
     clutter   how much of the frame is busy, high-contrast detail (piled garbage, debris)
     darkness  how dark the scene is (matters for a street light that is out)
     wetness   blue / grey-green tint with smooth reflective areas (water)
     closeness how much of the frame the problem fills (a close-up of a big hole is worse)

   Each category weighs these differently. The result is an ESTIMATE that helps the authority
   decide the priority; it is not a measurement. A model trained on real photos of your area
   (see public/models/civic/README.md) will always be more accurate than these image statistics.
   ========================================================================== */

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Pure: measures an RGBA pixel buffer (what canvas.getImageData returns). */
export function computeFeatures(rgba, width, height) {
  const n = width * height;
  if (!n || rgba.length < n * 4) return null;
  const lum = new Float32Array(n);
  let sum = 0;
  let dark = 0;
  let bright = 0;
  let blueish = 0;
  let sat = 0;
  for (let i = 0; i < n; i += 1) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[i] = y;
    sum += y;
    if (y < 55) dark += 1;
    if (y > 215) bright += 1;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    sat += mx === 0 ? 0 : (mx - mn) / mx;
    if (b > r + 8 && b >= g - 4 && y < 190) blueish += 1;
  }
  const mean = sum / n;
  let variance = 0;
  for (let i = 0; i < n; i += 1) variance += (lum[i] - mean) ** 2;
  variance /= n;

  // Edge density: share of pixels whose brightness jumps sharply against a neighbour (cracks, debris, broken edges).
  let edges = 0;
  let strongEdges = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx = lum[i + 1] - lum[i - 1];
      const gy = lum[i + width] - lum[i - width];
      const m = Math.abs(gx) + Math.abs(gy);
      if (m > 40) edges += 1;
      if (m > 110) strongEdges += 1;
    }
  }
  const inner = Math.max(1, (width - 2) * (height - 2));

  // Dark blobs: how much of the dark area sits together in one patch (a pothole) rather than scattered noise.
  const cols = 8;
  const rows = 8;
  const cell = new Float32Array(cols * rows);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (lum[y * width + x] < 70) cell[Math.floor((y / height) * rows) * cols + Math.floor((x / width) * cols)] += 1;
    }
  }
  const cellArea = (width / cols) * (height / rows);
  const denseCells = cell.reduce((a, c) => a + (c / cellArea > 0.45 ? 1 : 0), 0);

  return {
    mean: mean / 255,
    contrast: clamp(Math.sqrt(variance) / 90),
    darkShare: dark / n,
    brightShare: bright / n,
    edgeShare: edges / inner,
    strongEdgeShare: strongEdges / inner,
    blueShare: blueish / n,
    saturation: sat / n,
    blobShare: denseCells / (cols * rows),
  };
}

/** Pure: AI answer (+ the photo's pixel statistics as a minor nudge) -> { score, level, reasons, available }.

    Only the zero-shot model's "how severe is it?" answer is trusted. On the project's own before/after sample photos,
    pixel statistics alone got the direction wrong (an obvious pothole scored LOWER than a clean road), so without the model's
    answer there is NO score at all: an invented number would mislead the officer. The pixel statistics only move the result
    by at most about 10 points once the model has spoken. */
export function scoreSeverity(features, category, analysis = null) {
  const hint = analysis?.severityHint != null && analysis.severityCategory === category ? analysis.severityHint : null;
  if (hint == null) return { score: null, level: null, reasons: [], available: false, reason: "no-model" };

  let pixel = null;
  if (features) {
    const f = features;
    const damage = clamp(f.blobShare * 1.6 + f.darkShare * 0.9 + f.strongEdgeShare * 2.2);
    const clutter = clamp(f.edgeShare * 1.5 + f.contrast * 0.6);
    const darkness = clamp(1 - f.mean * 1.6);
    const wetness = clamp(f.blueShare * 1.7 + (1 - f.saturation) * 0.15 + f.brightShare * 0.5);
    pixel = ({
      road: damage * 0.62 + clutter * 0.2 + f.contrast * 0.18,
      garbage: clutter * 0.65 + f.saturation * 0.2 + damage * 0.15,
      light: darkness * 0.55 + f.contrast * 0.2 + damage * 0.1 + 0.15,
      water: wetness * 0.55 + clutter * 0.15 + f.contrast * 0.15 + 0.1,
    })[category] ?? damage * 0.35 + clutter * 0.35 + f.contrast * 0.3;
  }
  const raw = pixel == null ? hint : hint * 0.9 + clamp(pixel) * 0.1;
  const score = Math.round(8 + clamp(raw) * 88); // never 0 or 100: it is an estimate
  const reasons = [hint >= 0.6 ? "The AI sees a large or dangerous problem" : hint <= 0.3 ? "The AI sees a small, minor problem" : "The AI sees a moderate problem"];
  if (analysis?.suggestion?.category === category) reasons.push("The photo clearly matches the chosen problem");
  return { score, level: levelFor(score), reasons, available: true };
}

export const levelFor = (score) => (score == null ? null : score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low');

export const LEVEL_LABEL = { critical: 'Critical', high: 'High', moderate: 'Moderate', low: 'Low' };

/** The priority we would suggest to the authority for a score (an emergency is always High). */
export const suggestPriority = (score, emergency = false) => (emergency || (score != null && score >= 70) ? 'High' : score != null && score >= 40 ? 'Medium' : score == null ? 'Medium' : 'Low');

/* ----------------------------------------------------------- browser part */

const SIDE = 96; // analysed at 96 px on the long edge: fast, and plenty for these statistics

function loadBitmap(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The photo could not be read.')); };
    img.src = url;
  });
}

/** Photo file -> { available, score, level, reasons }. Never throws (the report works without it). */
export async function estimateSeverity(file, category, analysis = null) {
  try {
    const img = await loadBitmap(file);
    const scale = SIDE / Math.max(img.naturalWidth, img.naturalHeight);
    const w = Math.max(8, Math.round(img.naturalWidth * Math.min(1, scale)));
    const h = Math.max(8, Math.round(img.naturalHeight * Math.min(1, scale)));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    return scoreSeverity(computeFeatures(data, w, h), category, analysis);
  } catch (error) {
    console.warn('[severity] unavailable:', error.message);
    return { score: null, level: null, reasons: [], available: false };
  }
}
