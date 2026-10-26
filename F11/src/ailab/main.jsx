import { useState } from "react";
import { createRoot } from "react-dom/client";
import { analyzePhoto, predictedCategory } from "../shared/imageClassifier.js";
import { CLASSES, expectedFromPath, summarize } from "./evaluate.js";

/* Developer tool: measures how accurate the photo AI really is on YOUR photos.
   Run `npm run dev`, open http://localhost:5173/ai-lab.html, and choose a folder that holds one sub-folder per answer:
     photos/road/  photos/garbage/  photos/light/  photos/water/  photos/none/   (none = selfies, rooms, clean streets...)
   Every photo goes through the same engine the Report page uses. Nothing is uploaded anywhere. */

const pct = (v) => (v == null ? "-" : `${Math.round(v * 100)}%`);

function Lab() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);

  const run = async (event) => {
    const files = [...event.target.files].filter((f) => /^image\//.test(f.type));
    setRows([]); setDone(0); setTotal(files.length); setBusy(true);
    const out = [];
    for (const file of files) {
      const expected = expectedFromPath(file.webkitRelativePath || file.name);
      const analysis = await analyzePhoto(file);
      out.push({ name: file.webkitRelativePath || file.name, expected, predicted: predictedCategory(analysis), source: analysis.source || "none", hint: analysis.severityHint });
      setRows([...out]); setDone(out.length);
    }
    setBusy(false);
  };

  const scored = rows.filter((r) => r.expected);
  const sum = summarize(scored);
  return (
    <main style={{ font: "15px/1.5 system-ui, sans-serif", maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <h1>CivicConnect AI lab</h1>
      <p>Choose a folder with sub-folders named <code>road</code>, <code>garbage</code>, <code>light</code>, <code>water</code> and <code>none</code>. The first photo may take a minute while the model downloads.</p>
      <input type="file" webkitdirectory="" directory="" multiple onChange={run} disabled={busy} />
      {total > 0 && <p>{done} / {total} photos checked{busy ? "..." : ""}</p>}
      {sum.total > 0 && (
        <>
          <h2>Accuracy: {pct(sum.accuracy)} ({sum.total} photos, engine: {rows[0]?.source})</h2>
          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse" }}>
            <thead><tr><th>true answer \ AI said</th>{CLASSES.map((c) => <th key={c}>{c}</th>)}<th>recall</th></tr></thead>
            <tbody>{CLASSES.map((e) => (
              <tr key={e}><th>{e}</th>{CLASSES.map((p) => <td key={p} style={{ background: e === p && sum.matrix[e][p] ? "#dff3df" : sum.matrix[e][p] ? "#fbe3e3" : "" }}>{sum.matrix[e][p]}</td>)}<td>{pct(sum.perClass[e].recall)}</td></tr>
            ))}</tbody>
          </table>
          <h3>Mistakes</h3>
          <ul>{scored.filter((r) => (r.predicted || "none") !== r.expected).map((r) => <li key={r.name}>{r.name}: expected <b>{r.expected}</b>, AI said <b>{r.predicted || "none"}</b></li>)}</ul>
        </>
      )}
      {rows.some((r) => !r.expected) && <p>{rows.filter((r) => !r.expected).length} photo(s) were skipped: their folder name is not road / garbage / light / water / none.</p>}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<Lab />);
