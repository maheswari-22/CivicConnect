import { useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import './CivicScene.css';

/**
 * A layered 2.5D skyline used as the signature visual on the
 * landing hero and dashboard hero. Desktop pointers tilt the
 * layers for a parallax depth effect via plain CSS transforms
 * (no animation library required). Touch devices get a gentle
 * ambient CSS float instead.
 */
export default function CivicScene({ compact = false }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x, y });
  };

  const handleLeave = () => setTilt({ x: 0, y: 0 });

  const rotateX = tilt.y * -12;
  const rotateY = tilt.x * 16;
  const shiftBack = tilt.x * 20;
  const shiftMid = tilt.x * 36;
  const shiftFront = tilt.x * 56;

  return (
    <div
      ref={ref}
      className={`civic-scene ${compact ? 'civic-scene--compact' : ''}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div
        className="civic-scene__stage"
        style={{ transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)` }}
      >
        <div className="civic-scene__glow" />

        <div className="civic-scene__layer civic-scene__layer--back" style={{ transform: `translateX(${shiftBack}px)` }}>
          <div className="skyline skyline--back">
            {[38, 52, 30, 60, 44].map((h, i) => (
              <span key={i} className="skyline__bldg" style={{ height: h }} />
            ))}
          </div>
        </div>

        <div className="civic-scene__layer civic-scene__layer--mid" style={{ transform: `translateX(${shiftMid}px)` }}>
          <div className="skyline skyline--mid">
            {[70, 96, 60, 110, 78, 90].map((h, i) => (
              <span key={i} className="skyline__bldg skyline__bldg--mid" style={{ height: h }}>
                <span className="skyline__windows" />
              </span>
            ))}
          </div>
        </div>

        <div className="civic-scene__layer civic-scene__layer--front" style={{ transform: `translateX(${shiftFront}px)` }}>
          <div className="civic-scene__card civic-scene__card--pin anim-float">
            <MapPin size={16} />
            <span>Pothole reported</span>
          </div>
          <div className="civic-scene__card civic-scene__card--status anim-float-slow">
            <span className="civic-scene__pulse" />
            <span>Worker en route</span>
          </div>
          <div className="civic-scene__road" />
        </div>
      </div>
    </div>
  );
}
