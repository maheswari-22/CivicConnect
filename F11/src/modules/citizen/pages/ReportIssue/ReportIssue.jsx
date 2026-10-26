import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, ImagePlus, MapPin, Crosshair, Check, X, Sparkles, LoaderCircle, ExternalLink, Search, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout/AppLayout';
import StepProgress from '../../components/StepProgress/StepProgress';
import CategoryCard from '../../components/CategoryCard/CategoryCard';
import CategoryIcon from '../../components/icons/CategoryIcon';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import SuccessState from '../../components/SuccessState/SuccessState';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { CATEGORIES, categoryById, createComplaint } from '../../data/mockData';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { AREAS, isArea, nearestArea, areaCentre } from '../../../../shared/areas';
import LocationPicker from '../../../../shared/LocationPicker';
import { locate, reverseGeocode, searchPlaces, explainGeoError, describeAccuracy, osmLink } from '../../../../shared/geo';
import { analyzePhoto, preloadClassifier, judgePhoto } from '../../../../shared/imageClassifier';
import { prepareImage } from '../../../../shared/imageTools';
import { estimateSeverity, suggestPriority } from '../../../../shared/severity';
import SeverityMeter from '../../../../shared/SeverityMeter';
import EmergencyBadge from '../../../../shared/EmergencyBadge';
import './ReportIssue.css';

const STEPS = ['Category', 'Details', 'Location', 'Review'];

export default function ReportIssue() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const fileRef = useRef(null);       // gallery / files picker
  const cameraRef = useRef(null);     // opens the camera directly

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const previewRef = useRef(null);
  const [location, setLocation] = useState('');
  // The area decides WHICH authority receives the complaint. Starts as the area on the citizen's profile.
  const [area, setArea] = useState(isArea(user?.location) ? user.location : '');
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locStatus, setLocStatus] = useState('');       // live text while the GPS fix is being refined
  const [accuracy, setAccuracy] = useState(null);       // metres, of the attached GPS pin
  const [areaNote, setAreaNote] = useState('');
  const [pinnedByHand, setPinnedByHand] = useState(false); // the pin was dragged / tapped on the map, not taken from the GPS
  const geoRequest = useRef(0);
  const [locError, setLocError] = useState('');
  const locateRef = useRef(null);
  // TensorFlow.js photo check: the photo must show the problem that was chosen.
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);        // what the AI saw in the photo (re-checked whenever the category changes)
  const analysisRef = useRef(0);                         // ignores the result of an older photo
  // Village / town / city: found from the GPS position, or searched by name.
  const [place, setPlace] = useState(null);              // { name, district, label }
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState(null); // null = not searched yet
  const [placeBusy, setPlaceBusy] = useState(false);
  const [placeError, setPlaceError] = useState('');
  // AI severity estimate (0-100 %) of the photo, kept together with the photo + category it was measured for.
  const [severityState, setSeverityState] = useState(null);
  // The citizen can flag a danger to life / safety: the authority and the worker see it highlighted in red.
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  // The photo must show the problem that was chosen. Re-evaluated when the category changes.
  const gate = useMemo(() => (photo && analysis ? judgePhoto(analysis, category) : null), [photo, analysis, category]);

  // Severity only counts while it still describes the current photo and category.
  const severity = severityState && severityState.photo === photo && severityState.category === category && severityState.result.available
    ? severityState.result
    : null;

  // The photo was checked but the AI could not judge how severe it is (model not available): say so instead of showing an invented number.
  const severityMissing = Boolean(photo && analysis && category && severityState && severityState.photo === photo && severityState.category === category && !severityState.result.available);

  // Measure how bad the problem looks once the photo check is done (and again if the category is changed).
  useEffect(() => {
    if (!photo || !analysis || !category) return undefined;
    let live = true;
    estimateSeverity(photo, category, analysis).then((result) => {
      if (live) setSeverityState({ photo, category, result });
    });
    return () => { live = false; };
  }, [photo, analysis, category]);

  const canGoNext = () => {
    if (step === 0) return !!category;
    if (step === 1) return description.trim().length >= 10 && !!photo && !analyzing && !photoBusy && !gate?.blocked;
    if (step === 2) return isArea(area) && location.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (!canGoNext()) {
      if (step === 0) setErrors({ category: 'Choose a category to continue' });
      if (step === 1) {
        if (!photo) setErrors({ photo: 'Add a photo of the problem to continue' });
        else if (analyzing || photoBusy) setErrors({ photo: 'Please wait while we check your photo' });
        else if (gate?.blocked) setErrors({ photo: gate.message });
        else setErrors({ description: 'Add at least 10 characters describing the issue' });
      }
      if (step === 2) setErrors(!isArea(area) ? { area: 'Choose your city / area so the right authority receives this' } : { location: 'Add a location so we can dispatch the right team' });
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    if (step === 0) return navigate(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  // Start downloading the TensorFlow.js model while the citizen writes the description.
  useEffect(() => { if (step === 1) preloadClassifier(); }, [step]);
  // Stop the GPS if the page is left while it is still searching (saves battery).
  useEffect(() => () => locateRef.current?.cancel(), []);

  // Frees the temporary preview image the browser is holding for the picked photo.
  const releasePreview = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
  };
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const handlePhoto = async (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      // Large phone photos are shrunk in the browser first, so they always upload.
      const prepared = await prepareImage(picked);
      releasePreview();
      previewRef.current = prepared.previewUrl;
      setPhoto(prepared.file);
      setPhotoPreview(prepared.previewUrl);
      runAnalysis(prepared.file);
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  // TensorFlow.js looks at the photo on the phone and may suggest a category. It never blocks anything.
  const runAnalysis = async (file) => {
    const id = ++analysisRef.current;
    setAnalysis(null);
    setAnalyzing(true);
    const result = await analyzePhoto(file);
    if (id !== analysisRef.current) return;
    setAnalyzing(false);
    setAnalysis(result);
    setErrors({});
  };

  const removePhoto = () => {
    analysisRef.current += 1;
    setAnalyzing(false);
    setAnalysis(null);
    releasePreview();
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError('');
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  // Browser Geolocation API: keeps refining the GPS fix for a few seconds, then looks up the street address
  // and picks the city / area. Everything stays editable.
  const useCurrentLocation = async () => {
    setLocating(true);
    setLocError('');
    setAreaNote('');
    setLocStatus('Finding your position…');
    const handle = locate({ onUpdate: (r) => setLocStatus(`Improving accuracy… ±${Math.round(r.accuracy)} m`) });
    locateRef.current = handle;
    try {
      const fix = await handle.promise;
      setCoords({ lat: fix.lat, lng: fix.lng });
      setAccuracy(fix.accuracy);
      setPinnedByHand(false);
      if (fix.coarse) setAreaNote('This device only gave an approximate position (common on laptops). Drag the pin on the map to the exact spot.');

      setLocStatus('Looking up the address…');
      const geo = await reverseGeocode(fix.lat, fix.lng);
      // The server also names the village / town and the office that serves it; the local list is the fallback when it is unreachable.
      const detected = geo?.area || nearestArea(fix.lat, fix.lng);
      if (detected) {
        if (detected !== area && !fix.coarse) setAreaNote(`We set your city / area to ${detected} from your position.`);
        setArea(detected);
      } else {
        setAreaNote('Your position is outside the regions we serve right now. Please choose the city / area yourself.');
      }
      if (geo?.place) {
        setPlace({ name: geo.place.name, district: geo.place.district, label: [geo.place.name, geo.place.district].filter(Boolean).filter((v, i, all) => all.indexOf(v) === i).join(', ') });
        setPlaceResults(null);
      }
      setLocation(geo?.address || `Lat ${fix.lat.toFixed(5)}, Lng ${fix.lng.toFixed(5)}`);
      setErrors({});
    } catch (err) {
      if (err?.code !== -1) setLocError(explainGeoError(err));   // -1 = we cancelled it ourselves
    } finally {
      locateRef.current = null;
      setLocating(false);
      setLocStatus('');
    }
  };

  const removePin = () => { geoRequest.current += 1; setCoords(null); setAccuracy(null); setPinnedByHand(false); };

  // The citizen drags the pin (or taps the map) onto the exact spot: keep that position and look the address up again.
  const movePin = async ({ lat, lng }) => {
    setCoords({ lat, lng });
    setAccuracy(null);
    setPinnedByHand(true);
    setLocError('');
    const id = ++geoRequest.current;
    const geo = await reverseGeocode(lat, lng);
    if (id !== geoRequest.current || !geo) return;
    if (geo.address) setLocation(geo.address);
    if (geo.place) {
      setPlace({ name: geo.place.name, district: geo.place.district, label: [geo.place.name, geo.place.district].filter(Boolean).filter((v, i, all) => all.indexOf(v) === i).join(', ') });
    }
    const detected = geo.area || nearestArea(lat, lng);
    if (detected && detected !== area) { setArea(detected); setAreaNote(`The pin is in the ${detected} area, so we set your city / area to ${detected}.`); }
    else if (!detected) setAreaNote('That spot is outside the regions we serve right now.');
    setErrors({});
  };

  // Search a village / town / city by name (only when the button is pressed: the free map service does not allow search-as-you-type).
  const runPlaceSearch = async () => {
    if (placeQuery.trim().length < 2) { setPlaceError('Type at least 2 letters of the village or town name.'); return; }
    setPlaceBusy(true);
    setPlaceError('');
    const res = await searchPlaces(placeQuery);
    setPlaceBusy(false);
    if (res.unavailable) setPlaceError('Place search is not available right now. Type the place in the Location box instead.');
    setPlaceResults(res.places);
  };

  const pickPlace = (p) => {
    setPlace({ name: p.name, district: p.district, label: [p.name, p.district].filter(Boolean).filter((v, i, all) => all.indexOf(v) === i).join(', ') });
    setArea(p.area);
    setAreaNote(`${p.name} is served by the ${p.area} office.`);
    if (!coords) setCoords({ lat: p.lat, lng: p.lng }); // the middle of the village, so the officer sees roughly where
    if (!location.trim()) setLocation(p.name);
    setPlaceResults(null);
    setPlaceQuery('');
    setErrors({});
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const complaint = await createComplaint({
        category,
        description,
        location,
        area,
        place: place?.label,
        coords,
        photoFile: photo,
        aiVerdict: gate?.verdict ?? 'unchecked',
        aiLabel: gate?.label || undefined,
        aiSeverity: severity?.score ?? undefined,
        isEmergency,
        emergencyReason: isEmergency ? emergencyReason.trim() || undefined : undefined,
      });
      setSubmitted(complaint);
      showToast('Complaint submitted successfully', 'success');
    } catch (err) {
      showToast(err?.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AppLayout>
        <div className="container report-success">
          <SuccessState
            title="Complaint Submitted"
            description={`Your report has been logged as ${submitted.id}. We\u2019ll notify you as it progresses.`}
          >
            <Card className="report-success__id-card">
              <span>Complaint ID</span>
              <strong>{submitted.id}</strong>
              <StatusBadge status="submitted" size="sm" />
              {submitted.isEmergency && <EmergencyBadge>Emergency flagged</EmergencyBadge>}
            </Card>
            <Button size="lg" fullWidth onClick={() => navigate(`/track/${submitted.id}`)}>
              Track This Complaint
            </Button>
            <Button size="lg" fullWidth variant="ghost" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </SuccessState>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container report">
        <div className="report__head">
          <button className="report__back" onClick={handleBack} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <h1>Report an Issue</h1>
        </div>

        <StepProgress steps={STEPS} current={step} />

        <Card className="report__card" elevated>
                      {step === 0 && (
              <div key="cat" className="report__step anim-fade-up">
                <h2 className="report__step-title">Choose a category</h2>
                <p className="report__step-hint">What kind of issue are you reporting?</p>
                <div className="report__categories">
                  {CATEGORIES.map((c, i) => (
                    <CategoryCard
                      key={c.id}
                      category={c}
                      selected={category === c.id}
                      onSelect={(id) => { setCategory(id); setErrors({}); }}
                      index={i}
                    />
                  ))}
                </div>
                {errors.category && <p className="report__error">{errors.category}</p>}
              </div>
            )}

            {step === 1 && (
              <div key="details" className="report__step anim-fade-up">
                <h2 className="report__step-title">Add details</h2>
                <p className="report__step-hint">A photo and clear description help us resolve it faster.</p>

                <div className="report__photo">
                  {photoPreview ? (
                    <div className="report__photo-preview">
                      <img src={photoPreview} alt="Uploaded issue" />
                      <button type="button" className="report__photo-remove" onClick={removePhoto} aria-label="Remove photo">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="report__photo-options" role="group" aria-label="Add a photo">
                      <button type="button" className="report__photo-upload" onClick={() => cameraRef.current?.click()} disabled={photoBusy}>
                        <Camera size={26} />
                        <span>{photoBusy ? 'Preparing…' : 'Take a photo'}</span>
                        <span className="report__photo-hint">Open the camera</span>
                      </button>
                      <button type="button" className="report__photo-upload" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                        <ImagePlus size={26} />
                        <span>{photoBusy ? 'Preparing…' : 'From gallery'}</span>
                        <span className="report__photo-hint">Choose an existing photo</span>
                      </button>
                    </div>
                  )}
                  {/* Camera: capture opens the camera app. Gallery: no capture, so the phone shows its photo picker. */}
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto} />
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={handlePhoto} />
                  {photoError && <p className="report__error" role="alert">{photoError}</p>}

                  {photo && analyzing && (
                    <p className="report__ai report__ai--busy" role="status">
                      <LoaderCircle size={16} className="report__locate-spin" /> Checking your photo with AI…
                    </p>
                  )}
                  {photo && !analyzing && gate?.verdict === 'match' && (
                    <p className="report__ai report__ai--ok" role="status"><Check size={16} /> Your photo matches the category you chose.</p>
                  )}
                  {photo && !analyzing && gate?.blocked && (
                    <div className="report__ai report__ai--bad" role="alert">
                      <p><AlertTriangle size={16} /> {gate.message}</p>
                      <div className="report__ai-actions">
                        {gate.verdict === 'mismatch' && gate.detected && (
                          <button type="button" onClick={() => { setCategory(gate.detected); setErrors({}); }}>
                            Switch to {categoryById(gate.detected).label}
                          </button>
                        )}
                        <button type="button" className="report__ai-keep" onClick={removePhoto}>Choose another photo</button>
                      </div>
                    </div>
                  )}
                  {photo && !analyzing && gate && !gate.blocked && gate.verdict === 'uncertain' && (
                    <p className="report__ai" role="status"><Sparkles size={16} /> We could not confirm the photo automatically, so the officer will check it by eye.</p>
                  )}
                  {errors.photo && !gate?.blocked && <p className="report__error" role="alert">{errors.photo}</p>}
                </div>

                {photo && !analyzing && !gate?.blocked && severityMissing && (
                  <p className="report__chip report__chip--ok"><Sparkles size={14} /> The AI could not judge how severe this is. The officer will assess the photo.</p>
                )}
                {photo && !analyzing && !gate?.blocked && severity && (
                  <div className="cc-sev-card" aria-live="polite">
                    <SeverityMeter score={severity.score} level={severity.level} label="AI severity estimate" />
                    <ul>{severity.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                    <p>The authority sees this score and uses it to decide the priority. It is an estimate from your photo, not a final decision.</p>
                  </div>
                )}

                <Input
                  label="Description"
                  textarea
                  rows={5}
                  placeholder="Describe what you saw — the more detail, the better."
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setErrors({}); }}
                  error={errors.description}
                  helper={`${description.length} characters`}
                />

                <div className={`cc-emergency-switch${isEmergency ? ' is-on' : ''}`}>
                  <label htmlFor="report-emergency">
                    <input id="report-emergency" type="checkbox" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} />
                    <span className="cc-emergency-switch__text">
                      <strong>This is an emergency</strong>
                      <em>Tick this only if someone could be hurt right now, for example a live wire, an open manhole, a flooded road or a collapsed surface. It is shown in red to the authority and the worker, and chased much sooner. <b>If someone is in immediate danger, call 112 first.</b> Flags that turn out not to be urgent can stop your future emergency flags from being used.</em>
                    </span>
                  </label>
                  {isEmergency && (
                    <input
                      type="text"
                      maxLength={200}
                      value={emergencyReason}
                      onChange={(e) => setEmergencyReason(e.target.value)}
                      placeholder="What is the danger? (optional)"
                      aria-label="What is the danger?"
                    />
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div key="location" className="report__step anim-fade-up">
                <h2 className="report__step-title">Location</h2>
                <p className="report__step-hint">Tell us where this issue is so we can dispatch the right team.</p>

                <button type="button" className="report__locate-btn" onClick={useCurrentLocation} disabled={locating}>
                  <Crosshair size={17} className={locating ? 'report__locate-spin' : ''} />
                  {locating ? 'Locating…' : coords ? 'Update my location' : 'Use current location'}
                </button>
                {locating && locStatus && <p className="report__note" role="status">{locStatus}</p>}
                {locError && <p className="report__error" role="alert">{locError}</p>}
                {areaNote && !locating && <p className="report__note" role="status">{areaNote}</p>}

                <Input
                  label="City / area"
                  icon={MapPin}
                  options={AREAS}
                  placeholder="Select your city / area"
                  value={area}
                  onChange={(e) => { setArea(e.target.value); setErrors({}); }}
                  error={errors.area}
                  helper="Your complaint goes to the municipal authority of this area."
                />

                <div className="report__place">
                  <label htmlFor="place-search">Village / town / city <span>(optional)</span></label>
                  {place ? (
                    <p className="report__chip report__chip--good">
                      <MapPin size={14} /> {place.label}
                      <button type="button" onClick={() => setPlace(null)} aria-label="Remove village or town"><X size={14} /></button>
                    </p>
                  ) : (
                    <div className="report__place-row">
                      <input
                        id="place-search"
                        type="search"
                        value={placeQuery}
                        placeholder="Search your village or town"
                        onChange={(e) => setPlaceQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runPlaceSearch(); } }}
                      />
                      <button type="button" onClick={runPlaceSearch} disabled={placeBusy}>
                        {placeBusy ? <LoaderCircle size={16} className="report__locate-spin" /> : <Search size={16} />} Search
                      </button>
                    </div>
                  )}
                  {placeError && <p className="report__error" role="alert">{placeError}</p>}
                  {placeResults && placeResults.length === 0 && !placeError && <p className="report__note">No place found in Andhra Pradesh. Check the spelling, or type it in the Location box.</p>}
                  {placeResults && placeResults.length > 0 && (
                    <ul className="report__place-list">
                      {placeResults.map((p) => (
                        <li key={`${p.label}-${p.lat}`}>
                          <button type="button" onClick={() => pickPlace(p)}>
                            <strong>{p.name}</strong>
                            <span>{[p.type, p.district].filter(Boolean).join(' · ')} — {p.area} office</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Input
                  label="Location"
                  icon={MapPin}
                  placeholder="Street, landmark, or area"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setErrors({}); }}
                  error={errors.location}
                />

                {coords && (pinnedByHand || accuracy != null) && (
                  <p className={`report__chip report__chip--${pinnedByHand ? 'good' : describeAccuracy(accuracy).level}`}>
                    <MapPin size={14} /> {pinnedByHand ? 'Pin placed on the exact spot' : `GPS pin attached · ${describeAccuracy(accuracy).text}`}
                    <button type="button" onClick={removePin} aria-label="Remove GPS pin"><X size={14} /></button>
                  </p>
                )}

                <LocationPicker position={coords} accuracy={accuracy} centre={areaCentre(area)} onChange={movePin} />
                {coords && (
                  <p className="report__map-link">
                    <a href={osmLink(coords.lat, coords.lng)} target="_blank" rel="noreferrer noopener">
                      Open in maps <ExternalLink size={13} />
                    </a>
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div key="review" className="report__step anim-fade-up">
                <h2 className="report__step-title">Review & submit</h2>
                <p className="report__step-hint">Confirm the details before you submit your report.</p>

                <div className="report__review">
                  {photoPreview && (
                    <img src={photoPreview} alt="Issue" className="report__review-photo" />
                  )}
                  <div className="report__review-row">
                    <span className="report__review-icon"><CategoryIcon id={category} size={18} /></span>
                    <div>
                      <strong>{categoryById(category).label}</strong>
                      <p>{description}</p>
                    </div>
                  </div>
                  {severity && (
                    <div className="report__review-row">
                      <span className="report__review-icon"><Sparkles size={18} /></span>
                      <div>
                        <strong>AI severity {severity.score}%</strong>
                        <p>The authority will see a suggested {suggestPriority(severity.score, isEmergency).toLowerCase()} priority.</p>
                      </div>
                    </div>
                  )}
                  {isEmergency && (
                    <div className="report__review-row">
                      <span className="report__review-icon"><AlertTriangle size={18} /></span>
                      <div>
                        <EmergencyBadge>Emergency</EmergencyBadge>
                        <p>{emergencyReason.trim() || 'Marked as an emergency.'}</p>
                      </div>
                    </div>
                  )}
                  <div className="report__review-row">
                    <span className="report__review-icon"><MapPin size={18} /></span>
                    <div><strong>Location</strong><p>{location}{place ? `, ${place.label}` : ''}, {area}</p></div>
                  </div>
                </div>
              </div>
            )}
        </Card>

        <div className="report__actions">
          {step < STEPS.length - 1 ? (
            <Button size="lg" fullWidth icon={ArrowRight} iconPosition="right" onClick={handleNext}>
              Continue
            </Button>
          ) : (
            <Button size="lg" fullWidth icon={Check} iconPosition="right" loading={submitting} onClick={handleSubmit}>
              Submit Complaint
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
