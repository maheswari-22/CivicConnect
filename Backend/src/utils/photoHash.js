import sharp from 'sharp';

/* A tiny "fingerprint" of a picture (average hash): shrink to 8x8 grey, then one bit per pixel for brighter / darker than the average.
   The same photo re-saved, resized or re-compressed gives (almost) the same fingerprint, so a photo that was already used
   for a complaint can be recognised even when it is not byte-for-byte identical. */
export async function averageHash(input) {
  const { data } = await sharp(input).rotate().greyscale().resize(8, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
  let bits = 0n;
  for (const v of data) bits = (bits << 1n) | (v >= mean ? 1n : 0n);
  return bits.toString(16).padStart(16, '0');
}

/** Number of differing bits between two fingerprints (0 = identical picture). */
export function hammingHex(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

export const SAME_PHOTO_MAX_BITS = 4;
