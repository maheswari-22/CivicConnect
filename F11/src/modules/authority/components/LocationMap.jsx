import React from "react";
import { WARD_CENTERS, MAP_SIZE, getInitials } from "../data/workers";
import "./LocationMap.css";

const SCALE = 40; // px per km inside the SVG
const W = MAP_SIZE.width * SCALE;
const H = MAP_SIZE.height * SCALE;

const px = (km) => km * SCALE;

/* City map showing where the complaint is and where each worker is based.
   Clicking a worker pin selects that worker. */
function LocationMap({ complaint, workers, selectedId, onSelect }) {
  const selected = workers.find((worker) => worker.id === selectedId);
  const nearestId = workers[0]?.id;

  return (
    <figure className="location-map">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Map showing the complaint in ${complaint.ward} and nearby workers`}
      >
        {/* base */}
        <rect width={W} height={H} rx="14" className="map-bg" />

        {/* grid */}
        {Array.from({ length: MAP_SIZE.width - 1 }, (_, i) => (
          <line key={`v${i}`} x1={px(i + 1)} y1="0" x2={px(i + 1)} y2={H} className="map-grid" />
        ))}
        {Array.from({ length: MAP_SIZE.height - 1 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={px(i + 1)} x2={W} y2={px(i + 1)} className="map-grid" />
        ))}

        {/* main roads */}
        <path
          d={`M0 ${px(4.1)} C ${px(3)} ${px(3.6)}, ${px(7)} ${px(5.6)}, ${W} ${px(4.6)}`}
          className="map-road"
        />
        <path
          d={`M${px(4.3)} 0 C ${px(5)} ${px(3)}, ${px(5.4)} ${px(5.5)}, ${px(5)} ${H}`}
          className="map-road"
        />

        {/* ward zones */}
        {Object.entries(WARD_CENTERS).map(([ward, center]) => (
          <g key={ward}>
            <circle
              cx={px(center.x)}
              cy={px(center.y)}
              r={px(1.9)}
              className={`map-ward${ward === (complaint.wardZone || complaint.ward) ? " is-active" : ""}`}
            />
            <text
              x={px(center.x)}
              y={px(center.y) + px(1.9) - 6}
              textAnchor="middle"
              className={`map-ward-label${ward === (complaint.wardZone || complaint.ward) ? " is-active" : ""}`}
            >
              {ward}
            </text>
          </g>
        ))}

        {/* route to the selected worker */}
        {selected && (
          <g>
            <line
              x1={px(selected.position.x)}
              y1={px(selected.position.y)}
              x2={px(complaint.point.x)}
              y2={px(complaint.point.y)}
              className="map-route"
            />
            <g
              transform={`translate(${(px(selected.position.x) + px(complaint.point.x)) / 2}, ${Math.min(
                Math.max(px(selected.position.y), px(complaint.point.y)) + 32,
                H - 16
              )})`}
            >
              <rect x="-27" y="-13" width="54" height="22" rx="11" className="map-distance-bg" />
              <text y="3" textAnchor="middle" className="map-distance-text">
                {selected.distance.toFixed(1)} km
              </text>
            </g>
          </g>
        )}

        {/* worker pins */}
        {workers.map((worker) => {
          const isSelected = worker.id === selectedId;
          return (
            <g
              key={worker.id}
              className={`map-worker${isSelected ? " is-selected" : ""}`}
              transform={`translate(${px(worker.position.x)}, ${px(worker.position.y)})`}
              onClick={() => onSelect(worker.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(worker.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${worker.name}, ${worker.distance.toFixed(1)} kilometres away`}
              aria-pressed={isSelected}
            >
              <circle r="17" className="map-worker-halo" />
              <circle r="13" className="map-worker-dot" />
              <text y="4" textAnchor="middle" className="map-worker-text">
                {getInitials(worker.name)}
              </text>
              {worker.id === nearestId && !isSelected && (
                <circle cx="10" cy="-10" r="5" className="map-nearest-dot" />
              )}
            </g>
          );
        })}

        {/* complaint pin */}
        <g transform={`translate(${px(complaint.point.x)}, ${px(complaint.point.y)})`}>
          <circle r="20" className="map-complaint-pulse" />
          <path
            d="M0 0 C -14 -16 -16 -22 -16 -27 A 16 16 0 1 1 16 -27 C 16 -22 14 -16 0 0 Z"
            className="map-complaint-pin"
          />
          <circle cy="-27" r="6" className="map-complaint-core" />
        </g>
      </svg>

      <figcaption className="map-legend">
        <span><i className="legend-dot complaint" /> Complaint location</span>
        <span><i className="legend-dot worker" /> Worker base</span>
        <span><i className="legend-dot nearest" /> Nearest match</span>
      </figcaption>
    </figure>
  );
}

export default LocationMap;
