import React, { useEffect } from "react";
import { X } from "lucide-react";
import "./PhotoLightbox.css";
import SmartImage from "../../../shared/SmartImage";

function PhotoLightbox({ src, title, caption, onClose }) {
  useEffect(() => {
    if (!src) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose} role="presentation">
      <div
        className="lightbox-frame"
        role="dialog"
        aria-modal="true"
        aria-label={title || "Photo"}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close photo"
        >
          <X size={18} />
        </button>

        {title && <p className="lightbox-title">{title}</p>}

        <SmartImage src={src} alt={title || "Complaint photo"} />

        {caption && <p className="lightbox-caption">{caption}</p>}
      </div>
    </div>
  );
}

export default PhotoLightbox;
