import { useState } from "react";
import { Ban } from "lucide-react";
import { rejectComplaint } from "../data/complaints";

/**
 * "Can't be taken forward?" control on a New complaint. The authority gives the citizen a reason;
 * `onRejected` runs once the server has accepted the rejection.
 */
function RejectComplaint({ complaintId, onRejected }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (reason.trim().length < 5) {
      setError("Give the citizen a short reason (at least 5 characters).");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await rejectComplaint(complaintId, reason.trim());
      onRejected();
    } catch (err) {
      setError(err.message || "Could not reject this complaint. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="aw-reject">
      {!open ? (
        <button type="button" className="aw-btn-ghost-danger" onClick={() => setOpen(true)}>
          <Ban size={16} />
          Can&rsquo;t be taken forward? Reject this complaint
        </button>
      ) : (
        <div className="aw-reject-form">
          <label htmlFor="aw-reject-reason">Reason shown to the citizen</label>
          <textarea
            id="aw-reject-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Duplicate of an existing report, or outside municipal limits"
          />
          {error && <p className="aw-reject-error" role="alert">{error}</p>}
          <div className="aw-reject-actions">
            <button type="button" className="aw-btn-ghost" onClick={() => { setOpen(false); setError(""); }} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="aw-btn-danger" onClick={submit} disabled={busy}>
              {busy ? "Rejecting…" : "Reject complaint"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RejectComplaint;
