/* ==========================================================================
   Photo preparation — used by the Citizen "Report an issue" page and the
   Worker task page, so big phone photos behave the same everywhere.

   Phone cameras often produce 5-20 MB pictures (and some gallery files are
   larger still). Instead of rejecting them, the photo is shrunk in the browser
   (longest side <= 1280 px, JPEG) before it is uploaded: it stays sharp enough
   to see the issue, uploads quickly on mobile data, and always fits the server
   limit.
   ========================================================================== */

export const MAX_INPUT_MB = 50;        // largest photo we will even try to open
const MAX_EDGE = 1280;                 // longest side after shrinking (px) — sharp on any phone, small to load
const TARGET_BYTES = 450 * 1024;       // aim for <= ~450 KB after shrinking, so photos upload and load fast
const SERVER_OK = new Set(["image/jpeg", "image/png", "image/webp"]);
const HEIC = /\.(heic|heif)$/i;

const fmtMb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const toBlob = (canvas, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

/** Opens the picture with its EXIF rotation applied. Returns { source, width, height, release }. */
async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close?.() };
    } catch { /* fall through to the <img> route */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * Turns whatever the user picked into an upload-ready image.
 * Resolves to { file, previewUrl, shrunk } — `file` is a File to put in FormData,
 * `previewUrl` is a blob: URL for an <img> (call URL.revokeObjectURL when done).
 * Rejects with an Error whose message is safe to show to the user.
 */
export async function prepareImage(file) {
  if (!file) throw new Error("No photo selected.");

  const looksLikeImage = file.type?.startsWith("image/") || HEIC.test(file.name || "");
  if (!looksLikeImage) throw new Error("Please choose an image file (JPG, PNG or WebP).");
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new Error(`That photo is ${fmtMb(file.size)} — please choose one under ${MAX_INPUT_MB} MB.`);
  }

  let decoded;
  try {
    decoded = await decode(file); // also proves the file really is a readable picture
  } catch {
    throw new Error(
      HEIC.test(file.name || "") || /hei[cf]/i.test(file.type || "")
        ? "This browser can't open HEIC photos. Choose a JPG/PNG photo, or on iPhone set Settings > Camera > Formats > Most Compatible."
        : "Could not read that photo. Please try another image."
    );
  }

  try {
    // Already small and in a format the server accepts: upload it untouched.
    if (SERVER_OK.has(file.type) && file.size <= TARGET_BYTES) {
      return { file, previewUrl: URL.createObjectURL(file), shrunk: false };
    }

    let edge = MAX_EDGE;
    let blob = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, edge / Math.max(decoded.width, decoded.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(decoded.width * scale));
      canvas.height = Math.max(1, Math.round(decoded.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; // PNGs with transparency would otherwise turn black as JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      blob = await toBlob(canvas, attempt === 0 ? 0.8 : 0.68);
      canvas.width = 0; // let the browser free the pixel buffer right away
      canvas.height = 0;
      if (blob && blob.size <= TARGET_BYTES) break;
      edge = Math.round(edge * 0.82);
    }
    if (!blob) throw new Error("Could not process that photo. Please try another image.");

    const base = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    const out = new File([blob], `${base}.jpg`, { type: "image/jpeg" });
    return { file: out, previewUrl: URL.createObjectURL(out), shrunk: true };
  } finally {
    decoded.release();
  }
}
