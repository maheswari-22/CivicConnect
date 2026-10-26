import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Calendar, Share2, Star, RotateCcw, CircleAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout/AppLayout';
import Card from '../../components/Card/Card';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import StatusTimeline from '../../components/StatusTimeline/StatusTimeline';
import WorkerProgress from '../../components/WorkerProgress/WorkerProgress';
import WorkPhotos from '../../components/WorkPhotos/WorkPhotos';
import CategoryIcon from '../../components/icons/CategoryIcon';
import ErrorState from '../../components/ErrorState/ErrorState';
import { Spinner } from '../../components/Loading/Loading';
import { categoryById, fetchComplaintById, rateComplaint, reopenComplaint } from '../../data/mockData';
import { useToast } from '../../context/ToastContext';
import EmergencyBadge from '../../../../shared/EmergencyBadge';
import SeverityMeter from '../../../../shared/SeverityMeter';
import './TrackStatus.css';
import SmartImage from "../../../../shared/SmartImage";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export default function TrackStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [complaint, setComplaint] = useState(undefined);

  useEffect(() => {
    setComplaint(undefined);
    fetchComplaintById(id).then((c) => setComplaint(c || null)).catch(() => setComplaint(null));
  }, [id]);

  // Keep the page live: while it is open, quietly re-check every 20 s (and when the tab comes back into
  // view) so worker progress photos and status changes show up without a manual reload.
  useEffect(() => {
    let stop = false;
    const refresh = () => {
      if (document.hidden) return;
      fetchComplaintById(id)
        .then((c) => {
          if (stop || !c) return;
          setComplaint((prev) => {
            if (!prev) return c;
            const sig = (x) => JSON.stringify([x.status, x.updatedAt, x.workPhotos?.progress?.map((p) => p.id), !!x.workPhotos?.completion]);
            return sig(prev) === sig(c) ? prev : c;
          });
        })
        .catch(() => {});
    };
    const timer = setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [id]);

  // --- resolved-complaint actions: rate the fix, or reopen it ---
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const runAction = async (action, successMessage) => {
    setBusy(true);
    setActionError('');
    try {
      setComplaint(await action());
      showToast(successMessage, 'success');
      return true;
    } catch (err) {
      setActionError(err.message || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitRating = () => {
    if (!stars) return setActionError('Pick a star rating first.');
    return runAction(() => rateComplaint(id, stars, comment.trim()), 'Thanks for your feedback');
  };

  const submitReopen = async () => {
    if (reopenReason.trim().length < 5) return setActionError('Tell us what is still wrong (at least 5 characters).');
    if (await runAction(() => reopenComplaint(id, reopenReason.trim()), 'Complaint reopened')) {
      setReopenOpen(false);
      setReopenReason('');
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(id);
    showToast('Complaint ID copied', 'info');
  };

  return (
    <AppLayout>
      <div className="container track">
        <div className="track__head">
          <button className="track__back" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <h1>Track Status</h1>
        </div>

        {complaint === undefined && (
          <div className="track__loading"><Spinner size={30} /></div>
        )}

        {complaint === null && (
          <ErrorState
            title="Complaint not found"
            description="We couldn\u2019t find a complaint with that ID."
            actionLabel="Back to Complaints"
            onAction={() => navigate('/complaints')}
          />
        )}

        {complaint && (
          <div className="track__content anim-fade-up">
            <Card elevated className="track__summary">
              {complaint.photo && (
                <SmartImage src={complaint.photo} alt="Reported issue" className="track__photo" />
              )}
              <div className="track__summary-top">
                <span className="track__icon"><CategoryIcon id={complaint.category} size={22} /></span>
                <div className="track__summary-heading">
                  <span className="track__id">{complaint.id}</span>
                  <h2>{categoryById(complaint.category).label}</h2>
                </div>
                <StatusBadge status={complaint.status} />
              </div>
              {complaint.isEmergency && !['resolved', 'rejected'].includes(complaint.status) && (
                <p><EmergencyBadge>Emergency · handled first</EmergencyBadge></p>
              )}
              {complaint.emergencyDismissed && (
                <p className="track__note">The officer reviewed your emergency flag and is handling this as a normal complaint{complaint.emergencyDismissReason ? `: ${complaint.emergencyDismissReason}` : ''}. If someone is in immediate danger, call 112.</p>
              )}
              {complaint.aiSeverity != null && <SeverityMeter score={complaint.aiSeverity} label="AI severity estimate" />}
              <p className="track__desc">{complaint.description}</p>
              <div className="track__meta">
                <span><MapPin size={14} /> {complaint.location}</span>
                <span><Calendar size={14} /> Submitted {formatDate(complaint.createdAt)}</span>
              </div>
              <button className="track__share" onClick={handleShare}>
                <Share2 size={14} /> Copy complaint ID
              </button>
            </Card>

            {complaint.status === 'rejected' && (
              <Card className="track__notice track__notice--rejected" role="status">
                <CircleAlert size={20} aria-hidden="true" />
                <div>
                  <strong>This complaint could not be taken forward</strong>
                  <p>{complaint.rejectionReason || 'The authority did not give a reason.'}</p>
                </div>
              </Card>
            )}

            <Card className="track__timeline-card">
              <h3 className="track__timeline-title">Progress</h3>
              <StatusTimeline status={complaint.status} />
              {complaint.worker && (
                <>
                  <h3 className="track__timeline-title track__worker-title">Worker Progress</h3>
                  <WorkerProgress worker={complaint.worker} />
                </>
              )}
            </Card>

            {(complaint.worker || complaint.workPhotos) && (
              <Card className="track__photos-card">
                <WorkPhotos
                  photos={complaint.workPhotos}
                  status={complaint.status}
                  workerAssigned={!!complaint.worker}
                />
              </Card>
            )}

            {complaint.status === 'resolved' && (
              <Card className="track__feedback">
                <h3 className="track__timeline-title">How did we do?</h3>

                {complaint.rating ? (
                  <p className="track__rated">
                    You rated this fix <strong>{complaint.rating}/5</strong>
                    {complaint.feedback ? ` — “${complaint.feedback}”` : ''}. Thank you!
                  </p>
                ) : (
                  <>
                    <div className="track__stars" role="radiogroup" aria-label="Rate the fix">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={stars === n}
                          aria-label={`${n} star${n > 1 ? 's' : ''}`}
                          className={`track__star${n <= stars ? ' is-on' : ''}`}
                          onClick={() => setStars(n)}
                        >
                          <Star size={26} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="track__textarea"
                      rows={2}
                      maxLength={500}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Anything to add? (optional)"
                      aria-label="Feedback comment"
                    />
                    <button type="button" className="track__btn track__btn--primary" onClick={submitRating} disabled={busy}>
                      Submit rating
                    </button>
                  </>
                )}

                {complaint.reopenCount < 2 && (
                  <div className="track__reopen">
                    {!reopenOpen ? (
                      <button type="button" className="track__btn track__btn--link" onClick={() => setReopenOpen(true)}>
                        <RotateCcw size={15} /> Problem still there? Reopen this complaint
                      </button>
                    ) : (
                      <>
                        <textarea
                          className="track__textarea"
                          rows={3}
                          maxLength={500}
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          placeholder="What is still wrong?"
                          aria-label="Why are you reopening this complaint?"
                        />
                        <div className="track__row">
                          <button type="button" className="track__btn" onClick={() => { setReopenOpen(false); setActionError(''); }} disabled={busy}>
                            Cancel
                          </button>
                          <button type="button" className="track__btn track__btn--primary" onClick={submitReopen} disabled={busy}>
                            Reopen complaint
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {actionError && <p className="track__error" role="alert">{actionError}</p>}
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
