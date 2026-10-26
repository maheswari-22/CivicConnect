import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./locationPicker.css";

/* ==========================================================================
   A map the citizen can correct: the GPS position is only a starting point (phones are often
   10-50 m off, and on a laptop several km off). They drag the pin, or tap the map, onto the exact
   spot, and the address is looked up again for the new position.

   Props
     position   { lat, lng } or null  - the pin (null = no pin yet; tapping the map drops one)
     accuracy   metres, draws a circle around the GPS fix
     centre     [lat, lng] used to centre the map while there is no pin
     onChange   ({ lat, lng }) => void   called when the pin is dragged or the map is tapped
   Tiles come from OpenStreetMap (no key needed).
   ========================================================================== */

const pinIcon = L.divIcon({
  className: "cc-pin",
  html: '<span class="cc-pin__head"></span><span class="cc-pin__tip"></span>',
  iconSize: [30, 42],
  iconAnchor: [15, 40],
});

function Tap({ onChange }) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Moves the map to a new position (and zooms in on the first fix) without fighting the user's own panning. */
function Follow({ position }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (!position) return;
    if (first.current) { map.setView([position.lat, position.lng], 18); first.current = false; return; }
    if (!map.getBounds().contains([position.lat, position.lng])) map.panTo([position.lat, position.lng]);
  }, [position, map]);
  return null;
}

export default function LocationPicker({ position, accuracy, centre, onChange }) {
  const markerRef = useRef(null);
  const handlers = useMemo(() => ({
    dragend() {
      const m = markerRef.current;
      if (m) { const { lat, lng } = m.getLatLng(); onChange({ lat, lng }); }
    },
  }), [onChange]);
  const start = position ? [position.lat, position.lng] : centre;

  return (
    <div className="cc-picker">
      <MapContainer center={start} zoom={position ? 18 : 11} scrollWheelZoom={false} className="cc-picker__map" attributionControl>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <Tap onChange={onChange} />
        <Follow position={position} />
        {position && accuracy != null && accuracy > 8 && accuracy < 1500 && (
          <Circle center={[position.lat, position.lng]} radius={accuracy} pathOptions={{ color: "#75162D", weight: 1, fillColor: "#75162D", fillOpacity: 0.1 }} />
        )}
        {position && (
          <Marker position={[position.lat, position.lng]} draggable icon={pinIcon} ref={markerRef} eventHandlers={handlers} keyboard />
        )}
      </MapContainer>
      <p className="cc-picker__hint">
        {position ? "Drag the pin, or tap the map, to the exact spot of the problem." : "Tap the map to drop a pin on the exact spot."}
      </p>
    </div>
  );
}
