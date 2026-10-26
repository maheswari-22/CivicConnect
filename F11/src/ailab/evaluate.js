/* Pure helpers for the AI accuracy checker (ai-lab.html). */

export const CLASSES = ["road", "garbage", "light", "water", "none"];

/** "photos/Garbage/img1.jpg" -> "garbage". The folder a photo sits in is its true answer. */
export function expectedFromPath(path = "") {
  const parts = String(path).split("/");
  const folder = (parts.length > 1 ? parts[parts.length - 2] : "").toLowerCase();
  if (/road|pothole|crack|footpath/.test(folder)) return "road";
  if (/garbage|trash|waste|litter|rubbish/.test(folder)) return "garbage";
  if (/light|lamp|pole/.test(folder)) return "light";
  if (/water|leak|drain|flood|sewage/.test(folder)) return "water";
  if (/none|other|background|normal|clean|not/.test(folder)) return "none";
  return null;
}

/** rows: [{ expected, predicted }] (predicted null = "none"). -> overall accuracy, per-class recall and a confusion matrix. */
export function summarize(rows) {
  const norm = (v) => (v == null ? "none" : v);
  const matrix = Object.fromEntries(CLASSES.map((e) => [e, Object.fromEntries(CLASSES.map((p) => [p, 0]))]));
  let right = 0;
  let total = 0;
  for (const r of rows) {
    const e = norm(r.expected);
    const p = norm(r.predicted);
    if (!matrix[e] || matrix[e][p] === undefined) continue;
    matrix[e][p] += 1;
    total += 1;
    if (e === p) right += 1;
  }
  const perClass = Object.fromEntries(CLASSES.map((c) => {
    const n = Object.values(matrix[c]).reduce((a, b) => a + b, 0);
    return [c, { n, recall: n ? matrix[c][c] / n : null }];
  }));
  return { total, accuracy: total ? right / total : null, perClass, matrix };
}
