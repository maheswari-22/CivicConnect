/* ==========================================================================
   Photo analysis with TensorFlow.js — suggests the complaint category from the photo.

   It runs ENTIRELY IN THE BROWSER: the photo is analysed on the citizen's phone and is not sent
   anywhere for this. TensorFlow.js is loaded only when needed (separate download), and the result
   is only ever a SUGGESTION the citizen can accept or ignore — it never blocks a report.

   Two models are supported:
   1. YOUR OWN model (best accuracy). Train one with Google Teachable Machine (or any Keras model
      exported to TensorFlow.js) on photos of potholes, garbage, broken street lights, water leaks...
      Put the export in  F11/public/models/civic/  (model.json, weights.bin, metadata.json) and set
      VITE_CIVIC_MODEL_URL=/models/civic  in F11/.env.  Class names are matched to the categories by
      labelToCategory() below (e.g. "pothole", "road", "garbage", "street light", "water leak").
   2. MobileNet (default, no setup). A general ImageNet model. It knows everyday objects (trash can,
      manhole cover, fountain, street sign...) but NOT potholes, so it can only help for some photos.
   ========================================================================== */

const CUSTOM_MODEL_URL = (import.meta.env?.VITE_CIVIC_MODEL_URL || "").replace(/\/$/, "");

export const CUSTOM_MIN_CONFIDENCE = 0.6;      // a trained model must be at least this sure
export const GENERIC_MIN_CONFIDENCE = 0.2;     // MobileNet spreads probability over 1000 classes, so the bar is lower

/* ----------------------------------------------------------- zero-shot engine (CLIP)
   A model that was trained on hundreds of millions of photos WITH captions, so it can be asked "is this a pile of
   garbage, a pothole, a broken street light, a water leak, or none of those?" in plain words, without any civic
   training photos. It is far more accurate for these problems than MobileNet (which only knows 1000 everyday
   objects and has no idea what a pothole is).

   It runs in the browser through transformers.js. The first photo downloads the model (about 90 MB, then cached by the
   browser). If the download fails, takes too long, or the phone is on Data Saver, MobileNet is used instead.
   VITE_AI_ENGINE = auto (default) | clip | mobilenet                                                              */

const ENGINE = String(import.meta.env?.VITE_AI_ENGINE || "auto").toLowerCase();
const CLIP_MODEL = import.meta.env?.VITE_CLIP_MODEL || "Xenova/clip-vit-base-patch32";
export const CLIP_MIN_CONFIDENCE = 0.4;
export const CLIP_LOAD_TIMEOUT_MS = 75000;

/* Several phrasings per category: their probabilities are added up, which is much steadier than one phrase. */
export const CLIP_PROMPTS = {
  road: ["a pothole in a road", "a cracked and damaged road surface", "a broken asphalt road with holes", "a damaged footpath with broken paving"],
  garbage: ["a pile of garbage on the street", "an overflowing garbage bin", "litter and waste dumped on the roadside", "rubbish and plastic waste scattered on the ground"],
  light: ["a broken street light", "a street lamp pole beside a road", "a street light that is switched off at night", "an electric pole with a lamp"],
  water: ["a leaking water pipe", "a flooded street with dirty water", "sewage overflowing on the road", "a blocked drain with stagnant water"],
  none: ["a clean empty road", "a selfie of a person", "the inside of a room", "a pet animal", "a plate of food", "a screenshot of a phone", "a close-up of a face", "a clear blue sky"],
};

/* For the severity estimate: "how bad is it", asked of the category the model recognised. First phrase = the severe one. */
export const CLIP_SEVERITY_PROMPTS = {
  road: ["a large deep dangerous pothole", "a small minor crack in the road"],
  garbage: ["a huge pile of garbage covering a large area", "a small amount of litter"],
  light: ["a fallen or completely broken street light", "a street light that is only slightly damaged"],
  water: ["a major flood or a heavily leaking pipe", "a small puddle or a tiny drip"],
};

const PROMPT_CATEGORY = new Map(Object.entries(CLIP_PROMPTS).flatMap(([category, phrases]) => phrases.map((p) => [p, category])));
export const CLIP_LABELS = [...PROMPT_CATEGORY.keys()];

/** Pure: raw zero-shot results [{label, score}] -> [{category, label, probability}] best first.
    Probabilities of the phrases that belong to one category are added up (and the total is re-normalised to 1). */
export function groupClipScores(results) {
  const totals = {};
  const best = {};
  let sum = 0;
  for (const r of results || []) {
    const category = PROMPT_CATEGORY.get(r.label);
    if (!category) continue;
    const score = Number(r.score) || 0;
    totals[category] = (totals[category] || 0) + score;
    if (!best[category] || score > best[category].score) best[category] = { label: r.label, score };
    sum += score;
  }
  if (!sum) return [];
  return Object.entries(totals)
    .map(([category, total]) => ({ category, label: best[category].label, probability: total / sum }))
    .sort((a, b) => b.probability - a.probability);
}

/* ----------------------------------------------------------- label -> category (pure) */

/** Maps a class name from a custom model onto one of the app's categories. */
export function labelToCategory(label = "") {
  const l = String(label).toLowerCase();
  if (/\b(road|pothole|crack|pavement|asphalt|footpath|sidewalk|damage)\b/.test(l)) return "road";
  if (/\b(street ?light|streetlight|lamp|light|pole|bulb)\b/.test(l)) return "light";
  if (/\b(garbage|trash|waste|rubbish|litter|dump|bin)\b/.test(l)) return "garbage";
  if (/\b(water|leak|pipe|drain|drainage|sewage|sewer|flood|overflow)\b/.test(l)) return "water";
  return "other";
}

/* Words from ImageNet class names (what MobileNet outputs) that point at a category. */
const IMAGENET_HINTS = {
  garbage: /\b(ashcan|trash|garbage|dustbin|wastebin|dustcart|dumpster|plastic bag|carton|crate|packet|bucket|barrel|paper towel|hamper|wheelbarrow|barrow|shopping basket|pop bottle|beer bottle|water bottle|wine bottle|pill bottle|rubbish|waste|bin|sack|tub|trash can|toilet tissue)\b/,
  road: /\b(manhole|street sign|parking meter|sidewalk|pavement|crosswalk|speed bump|traffic cone|cone|barrier|pothole|asphalt|valley|dirt|gravel)\b/,
  light: /\b(traffic light|stoplight|lamp|lampshade|spotlight|torch|flagpole|totem pole|pole)\b/,
  water: /\b(fountain|water tower|water jug|water bottle|lakeside|lakeshore|seashore|sandbar|geyser|washbasin|wash-hand basin|bathtub|breakwater|dam)\b/,
};

/** From a custom model's predictions [{label, probability}] (best first) -> { category, confidence } or null. */
export function suggestFromCustom(predictions) {
  const top = predictions?.[0];
  if (!top || top.probability < CUSTOM_MIN_CONFIDENCE) return null;
  const category = labelToCategory(top.label);
  return category === "other" ? null : { category, confidence: top.probability, label: top.label, source: "custom" };
}

/** From MobileNet's predictions [{className, probability}] -> { category, confidence } or null. Adds up the evidence per category. */
export function suggestFromGeneric(predictions) {
  const score = {};
  const seen = {};
  for (const p of predictions || []) {
    const name = String(p.className || "").toLowerCase();
    for (const [category, pattern] of Object.entries(IMAGENET_HINTS)) {
      if (pattern.test(name)) {
        score[category] = (score[category] || 0) + p.probability;
        seen[category] ||= p.className.split(",")[0];
      }
    }
  }
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < GENERIC_MIN_CONFIDENCE) return null;
  return { category: best[0], confidence: Math.min(best[1], 0.99), label: seen[best[0]], source: "generic" };
}

/* ----------------------------------------------------------- the report gate (pure) */

/* Everyday objects a photo of a civic problem is NOT about: people, pets, food, screens, indoor furniture.
   Used only when MobileNet is VERY sure the picture is one of these (a selfie, a cat, a plate of food). */
const NOT_CIVIC = /\b(cat|tabby|tiger cat|persian cat|siamese cat|egyptian cat|dog|puppy|retriever|terrier|spaniel|hound|poodle|pizza|cheeseburger|hotdog|plate|ice cream|espresso|coffee mug|cup|laptop|notebook|keyboard|monitor|television|desktop computer|sofa|couch|studio couch|four-poster|desk|bookcase|jersey|suit|sunglasses|sweatshirt|lipstick|wig|bikini|miniskirt|cellular telephone|iPod|remote control|groom|scuba diver|ballplayer|bow tie|face powder)\b/i;
export const GENERIC_BLOCK_CONFIDENCE = 0.5;     // MobileNet must be at least this sure it is ANOTHER civic category to refuse the photo
export const NOT_CIVIC_CONFIDENCE = 0.8;         // ...and this sure it is an unrelated object

const LABELS = { road: "Road Damage", light: "Street Light", garbage: "Garbage", water: "Water", other: "Other" };

/** true when a photo the AI could not confirm must also be refused. Decided per result: a trained model is strict by default,
    MobileNet (which does not know potholes) is not. VITE_PHOTO_CHECK_STRICT=true|false overrides both. */
export function isStrict(source) {
  const flag = String(import.meta.env?.VITE_PHOTO_CHECK_STRICT ?? "").toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return source === "custom"; // the zero-shot engine is not strict by default: an unsure photo is flagged for the officer, not refused
}

/**
 * Compares what the AI sees with the category the citizen chose.
 *   analysis  the result of analyzePhoto()
 *   category  "road" | "light" | "garbage" | "water" | "other"
 * Returns { verdict, detected, label, blocked, message }
 *   verdict   "match"      the photo shows the chosen problem
 *             "mismatch"   it clearly shows something else (another civic problem, or an unrelated object)
 *             "uncertain"  the AI is not sure (blocked only in strict mode)
 *             "unchecked"  the AI could not run (offline, old browser): never blocks, the authority is told
 *   detected  the category the AI thinks it is, when it knows one
 */
export function judgePhoto(analysis, category, { strict } = {}) {
  const chosen = LABELS[category] || "the selected category";
  if (!analysis?.available) return { verdict: "unchecked", detected: null, label: null, blocked: false, message: "" };
  const mustBeSure = strict ?? isStrict(analysis.source);
  const top = analysis.top?.[0];
  let verdict = "uncertain";
  let detected = null;
  let label = top?.label || null;

  if (analysis.source === "custom") {
    if (top && top.probability >= CUSTOM_MIN_CONFIDENCE) {
      detected = labelToCategory(top.label);
      if (detected === category) verdict = "match";
      else if (category === "other") verdict = "uncertain";
      else verdict = "mismatch"; // another civic class, or the "nothing here" class
      if (detected === "other") detected = null;
    }
  } else if (analysis.source === "clip") {
    // Zero-shot engine: `top` is the grouped result [{category, label, probability}], category "none" = not a civic problem.
    if (top && top.probability >= CLIP_MIN_CONFIDENCE) {
      label = top.label;
      detected = top.category === "none" ? null : top.category;
      if (top.category === category) verdict = "match";
      else if (category === "other") verdict = "uncertain";
      else if (top.category === "none") verdict = top.probability >= 0.6 ? "mismatch" : "uncertain";
      else verdict = top.probability >= 0.5 ? "mismatch" : "uncertain";
    }
  } else {
    const s = analysis.suggestion;
    if (s) {
      detected = s.category;
      label = s.label;
      if (s.category === category) verdict = "match";
      else if (category !== "other" && s.confidence >= GENERIC_BLOCK_CONFIDENCE) verdict = "mismatch";
    } else if (top && top.probability >= NOT_CIVIC_CONFIDENCE && NOT_CIVIC.test(top.label)) {
      verdict = "mismatch"; // clearly a selfie / pet / food / screen, not a civic problem
      label = String(top.label).split(",")[0];
    }
  }

  const blocked = verdict === "mismatch" || (verdict === "uncertain" && mustBeSure);
  let message = "";
  if (verdict === "mismatch") {
    message = detected
      ? `This photo looks like ${LABELS[detected]}, not ${chosen}. Take a photo of the actual problem, or switch the category.`
      : `This photo does not show a ${chosen.toLowerCase()} problem${label ? ` (it looks like “${label}”)` : ""}. Take a clear photo of the actual issue.`;
  } else if (verdict === "uncertain" && mustBeSure) {
    message = `We could not confirm that this photo shows ${chosen.toLowerCase()}. Take a clearer, closer photo of the problem.`;
  }
  return { verdict, detected, label, blocked, message };
}

/* ----------------------------------------------------------- model loading (browser) */

let classifierPromise = null;

const withTimeout = (promise, ms, message) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
]);

/** The zero-shot engine is used unless the person asked for MobileNet only, is on Data Saver, or the phone is very small. */
function clipAllowed() {
  if (ENGINE === "mobilenet") return false;
  if (ENGINE === "clip") return true;
  if (typeof navigator === "undefined") return false;
  const net = navigator.connection;
  if (net?.saveData || /^(slow-2g|2g|3g)$/.test(net?.effectiveType || "")) return false;
  // deviceMemory only exists in Chromium. Safari and Firefox do not report it, so judge by the number of CPU cores instead.
  if (navigator.deviceMemory != null) return navigator.deviceMemory >= 4;
  return (navigator.hardwareConcurrency || 0) >= 4;
}

async function loadClip() {
  const lib = await import("@xenova/transformers");
  lib.env.allowLocalModels = false;   // models come from the Hugging Face hub, then stay in the browser cache
  lib.env.useBrowserCache = true;
  const pipe = await lib.pipeline("zero-shot-image-classification", CLIP_MODEL);
  return { kind: "clip", pipe };
}

async function loadMobilenet() {
  const tf = await import("@tensorflow/tfjs");
  await tf.ready();
  const mobilenet = await import("@tensorflow-models/mobilenet");
  const model = await mobilenet.load({ version: 2, alpha: 1.0 });
  return { kind: "generic", tf, model };
}

async function loadClassifier() {
  if (CUSTOM_MODEL_URL) {
    try {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const [model, meta] = await Promise.all([
        tf.loadLayersModel(`${CUSTOM_MODEL_URL}/model.json`),
        fetch(`${CUSTOM_MODEL_URL}/metadata.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error("no metadata")))),
      ]);
      const labels = meta.labels || meta.classes;
      if (!Array.isArray(labels) || !labels.length) throw new Error("metadata.json has no labels");
      return { kind: "custom", tf, model, labels };
    } catch (error) {
      console.warn("[classifier] custom model not usable, trying the next engine:", error.message);
    }
  }
  if (clipAllowed()) {
    try {
      return await withTimeout(loadClip(), CLIP_LOAD_TIMEOUT_MS, "the AI model took too long to download");
    } catch (error) {
      console.warn("[classifier] zero-shot model not usable, falling back to MobileNet:", error.message);
    }
  }
  return loadMobilenet();
}

const getClassifier = () => {
  classifierPromise ||= loadClassifier().catch((error) => { classifierPromise = null; throw error; });
  return classifierPromise;
};

/** Starts downloading the model in the background (skipped when the phone is on Data Saver). */
export function preloadClassifier() {
  if (typeof navigator !== "undefined" && navigator.connection?.saveData) return;
  getClassifier().catch(() => { /* analysis simply stays unavailable */ });
}

/* ----------------------------------------------------------- inference */

/** Runs a Teachable-Machine-style model on a [h, w, 3] image tensor. Returns [{label, probability}] best first. */
export async function classifyTensor(tf, model, labels, image, topK = 3) {
  const input = tf.tidy(() => tf.image
    .resizeBilinear(image.toFloat(), [224, 224])
    .div(127.5)
    .sub(1) // the models Teachable Machine exports expect pixels in [-1, 1]
    .expandDims(0));
  const output = model.predict(input);
  const probabilities = await output.data();
  input.dispose();
  output.dispose();
  return Array.from(probabilities, (probability, i) => ({ label: labels[i] ?? `class ${i}`, probability }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, topK);
}

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("The photo could not be read."));
  img.src = url;
});

/** Zero-shot analysis of one photo URL. Also asks "how severe?" for the category it recognised. */
async function analyzeWithClip(pipe, url) {
  const results = await pipe(url, CLIP_LABELS);
  const top = groupClipScores(results);
  const best = top[0];
  const civic = top.find((t) => t.category !== "none");
  const suggestion = civic && best.category !== "none" && best.probability >= CLIP_MIN_CONFIDENCE
    ? { category: civic.category, confidence: civic.probability, label: civic.label, source: "clip" }
    : null;
  let severityHint = null;
  let severityCategory = null;
  if (suggestion && CLIP_SEVERITY_PROMPTS[suggestion.category]) {
    try {
      const prompts = CLIP_SEVERITY_PROMPTS[suggestion.category];
      const sev = await pipe(url, prompts);
      const severe = sev.find((r) => r.label === prompts[0]);
      if (severe) { severityHint = Math.min(1, Math.max(0, severe.score)); severityCategory = suggestion.category; }
    } catch (error) { console.warn("[classifier] severity question failed:", error.message); }
  }
  return { available: true, source: "clip", suggestion, top, severityHint, severityCategory };
}

/**
 * Analyses a photo (a File/Blob). Resolves
 *   { available: true, source, suggestion: { category, confidence, label } | null, top: [...] }
 * or { available: false } when TensorFlow.js or the model could not be loaded (offline, old browser...).
 * It never throws: the report flow must work without it.
 */
export async function analyzePhoto(file) {
  let url;
  try {
    const classifier = await getClassifier();
    url = URL.createObjectURL(file);
    if (classifier.kind === "clip") return await analyzeWithClip(classifier.pipe, url);
    const img = await loadImage(url);
    if (classifier.kind === "custom") {
      const image = classifier.tf.browser.fromPixels(img);
      try {
        const top = await classifyTensor(classifier.tf, classifier.model, classifier.labels, image);
        return { available: true, source: "custom", suggestion: suggestFromCustom(top), top };
      } finally {
        image.dispose();
      }
    }
    const raw = await classifier.model.classify(img, 10);
    return { available: true, source: "generic", suggestion: suggestFromGeneric(raw), top: raw.map((r) => ({ label: r.className, probability: r.probability })) };
  } catch (error) {
    console.warn("[classifier] photo analysis unavailable:", error.message);
    return { available: false };
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

/** The category the photo engine itself thinks the picture shows (ignoring what the citizen chose), or null for "none of them".
    Used by the accuracy checker (ai-lab.html). */
export function predictedCategory(analysis) {
  if (!analysis?.available) return null;
  if (analysis.source === "clip") {
    const t = analysis.top?.[0];
    return t && t.probability >= CLIP_MIN_CONFIDENCE && t.category !== "none" ? t.category : null;
  }
  return analysis.suggestion?.category || null;
}
