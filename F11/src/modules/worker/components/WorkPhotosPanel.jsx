import { useRef } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Camera, Trash2 } from "lucide-react";
import { MAX_PROGRESS_PHOTOS } from "../../../shared/workPhotos.js";
import SmartImage from "../../../shared/SmartImage";

/**
 * Progress + completion photos for a task. The photos are shown to the authority and the
 * citizen, so this panel only edits them while the task is "In Progress".
 */
function WorkPhotosPanel({
  taskStatus,
  progressPhotos,
  completionPhoto,
  canEditPhotos,
  uploading,
  caption,
  onCaptionChange,
  photoError,
  onRemovePhoto,
  onProgressPhoto,
  onCompletionPhoto,
}) {
  const progressInput = useRef(null);
  const completionInput = useRef(null);
  const progressGallery = useRef(null);
  const completionGallery = useRef(null);

  return (
    <motion.section
      className="work-photos-section"

      initial={{
        opacity: 0,
        y: 20,
      }}

      animate={{
        opacity: 1,
        y: 0,
      }}

      transition={{
        delay: 0.12,
        duration: 0.45,
      }}
    >

      <div className="section-heading">

        <div>

          <h2>
            Work Photos
          </h2>

          <p>
            Photos you upload here are shown to the authority and the citizen who reported this issue.
          </p>

        </div>

      </div>

      {taskStatus === "Pending" && (
        <p className="work-photos-hint">
          Start the task to begin uploading progress photos.
        </p>
      )}

      {taskStatus !== "Pending" && (
        <>

          {/* PROGRESS PHOTOS */}

          <div className="work-photos-block">

            <div className="work-photos-block-head">
              <h3>Progress photos</h3>
              <span>
                {progressPhotos.length}/{MAX_PROGRESS_PHOTOS}
              </span>
            </div>

            <div className="work-photos-grid">

              {progressPhotos.map((photo) => (
                <figure className="work-photo" key={photo.id}>
                  <SmartImage src={photo.src} alt={photo.caption} />
                  <figcaption>{photo.caption}</figcaption>

                  {canEditPhotos && (
                    <button
                      type="button"
                      className="work-photo-remove"
                      onClick={() => onRemovePhoto(photo.id)}
                      aria-label="Remove this photo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </figure>
              ))}

              {canEditPhotos && progressPhotos.length < MAX_PROGRESS_PHOTOS && (
                <button
                  type="button"
                  className="work-photo-add"
                  onClick={() => progressInput.current?.click()}
                  disabled={uploading}
                >
                  <ImagePlus size={24} />
                  <span>{uploading ? "Uploading..." : "Add progress photo"}</span>
                </button>
              )}

            </div>

            {canEditPhotos && (
              <input
                type="text"
                className="work-photo-caption"
                placeholder="Caption for the next photo (optional)"
                maxLength={80}
                value={caption}
                onChange={(event) => onCaptionChange(event.target.value)}
              />
            )}

            {!canEditPhotos && progressPhotos.length === 0 && (
              <p className="work-photos-hint">No progress photos were uploaded.</p>
            )}

            {canEditPhotos && progressPhotos.length < MAX_PROGRESS_PHOTOS && (
              <button
                type="button"
                className="work-photo-gallery"
                onClick={() => progressGallery.current?.click()}
                disabled={uploading}
              >
                <ImagePlus size={15} />
                Choose from gallery
              </button>
            )}

            <input
              ref={progressInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onProgressPhoto}
            />
            <input
              ref={progressGallery}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              hidden
              onChange={onProgressPhoto}
            />

          </div>

          {/* COMPLETION PHOTO */}

          <div className="work-photos-block">

            <div className="work-photos-block-head">
              <h3>Completion photo</h3>
              <span className={completionPhoto ? "work-photos-ok" : ""}>
                {completionPhoto ? "Added" : "Required"}
              </span>
            </div>

            {completionPhoto ? (
              <figure className="work-photo work-photo-wide">
                <SmartImage src={completionPhoto.src} alt="Completed work" />
                <figcaption>Work completed</figcaption>

                {canEditPhotos && (
                  <button
                    type="button"
                    className="work-photo-retake"
                    onClick={() => completionInput.current?.click()}
                    disabled={uploading}
                  >
                    <Camera size={15} />
                    Replace
                  </button>
                )}
              </figure>
            ) : canEditPhotos ? (
              <button
                type="button"
                className="work-photo-add work-photo-add-wide"
                onClick={() => completionInput.current?.click()}
                disabled={uploading}
              >
                <Camera size={26} />
                <span>{uploading ? "Uploading..." : "Upload completion photo"}</span>
                <small>Show the finished work to close this task</small>
              </button>
            ) : (
              <p className="work-photos-hint">No completion photo.</p>
            )}

            {canEditPhotos && (
              <button
                type="button"
                className="work-photo-gallery"
                onClick={() => completionGallery.current?.click()}
                disabled={uploading}
              >
                <ImagePlus size={15} />
                {completionPhoto ? "Replace from gallery" : "Choose from gallery"}
              </button>
            )}

            <input
              ref={completionInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={onCompletionPhoto}
            />
            <input
              ref={completionGallery}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              hidden
              onChange={onCompletionPhoto}
            />

          </div>

        </>
      )}

      {photoError && (
        <p className="work-photos-error" role="alert">
          {photoError}
        </p>
      )}

    </motion.section>
  );
}

export default WorkPhotosPanel;
