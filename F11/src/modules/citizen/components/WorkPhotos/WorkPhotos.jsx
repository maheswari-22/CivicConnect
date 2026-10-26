import { useState } from 'react';
import { Camera, ImageOff } from 'lucide-react';
import Modal from '../Modal/Modal';
import './WorkPhotos.css';
import SmartImage from "../../../../shared/SmartImage";

const formatDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Read-only gallery of the photos the assigned worker uploaded: progress photos
// while the job is under way and a completion photo once it is done.
export default function WorkPhotos({ photos, status, workerAssigned }) {
  const [open, setOpen] = useState(null);

  const items = [
    ...(photos?.progress || []).map((p) => ({
      key: p.id || p.src,
      src: p.src,
      tone: 'progress',
      label: 'Work in progress',
      caption: `${p.caption} · ${formatDay(p.at)}`,
    })),
    ...(photos?.completion
      ? [{
          key: 'completion',
          src: photos.completion.src,
          tone: 'completed',
          label: 'Work completed',
          caption: `Completed on ${formatDay(photos.completion.at)}`,
        }]
      : []),
  ];

  // Nothing to show before a worker is on the job.
  if (!workerAssigned && items.length === 0) return null;

  return (
    <div className="work-photos">
      <h3 className="work-photos__title">Worker Photos</h3>
      <p className="work-photos__hint">
        Photos uploaded by the field worker as the work happens.
      </p>

      {items.length === 0 ? (
        <div className="work-photos__empty">
          <ImageOff size={26} />
          <strong>No photos yet</strong>
          <span>
            {status === 'resolved'
              ? 'The worker did not upload photos for this job.'
              : 'Progress and completion photos will appear here as the worker uploads them.'}
          </span>
        </div>
      ) : (
        <div className="work-photos__grid">
          {items.map((item) => (
            <button
              type="button"
              key={item.key}
              className="work-photos__item"
              onClick={() => setOpen(item)}
              aria-label={`View ${item.label.toLowerCase()} photo`}
            >
              <SmartImage src={item.src} alt={item.label} loading="lazy" />
              <span className={`work-photos__tag work-photos__tag--${item.tone}`}>
                <Camera size={12} /> {item.label}
              </span>
              <span className="work-photos__caption">{item.caption}</span>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.label || 'Photo'}>
        {open && (
          <figure className="work-photos__viewer">
            <SmartImage src={open.src} alt={open.label} />
            <figcaption>{open.caption}</figcaption>
          </figure>
        )}
      </Modal>
    </div>
  );
}
