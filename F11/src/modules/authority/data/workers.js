/* ==========================================================================
   Field-worker roster + location helpers for the Authority Portal.

   Every ward and worker has a position on a simple 12 km x 8.5 km city grid
   (x = east, y = south). Complaints carry the same kind of point, so the
   distance between a complaint and a worker is a straight-line distance in
   km. In production this would come from the Worker Portal / Google Maps
   Geolocation API - the shape below is what that API would need to return.
   ========================================================================== */

export const CATEGORY_DEPARTMENT = {
  Garbage: "Sanitation",
  Road: "Roads & Infrastructure",
  Water: "Water Works",
  Electricity: "Electrical",
  Other: "Municipal Services",
};

/* Workers who registered themselves have the general "Municipal Services"
   department; they can take any complaint. */
export const GENERAL_DEPARTMENT = "Municipal Services";

export const WARD_CENTERS = {
  "Ward 5": { x: 2.3, y: 5.6 },
  "Ward 8": { x: 5.2, y: 2.3 },
  "Ward 10": { x: 8.8, y: 5.0 },
  "Ward 12": { x: 6.1, y: 6.2 },
};

export const MAP_SIZE = { width: 12, height: 8.5 };

/* Known positions on the city grid (x = east, y = south, in km). Workers that
   are not listed here get a stable position derived from their ID. In
   production this would come from the worker's live GPS location. */
const KNOWN_POSITIONS = {
  "WK-101": { x: 5.7, y: 5.8 }, "WK-102": { x: 4.8, y: 2.6 }, "WK-103": { x: 1.9, y: 5.2 },
  "WK-104": { x: 5.6, y: 1.8 }, "WK-105": { x: 6.6, y: 6.7 }, "WK-106": { x: 9.3, y: 4.5 },
  "WK-107": { x: 2.7, y: 6.0 }, "WK-108": { x: 8.4, y: 5.5 }, "WK-109": { x: 5.5, y: 6.6 },
  "WK-110": { x: 8.9, y: 4.7 }, "WK-111": { x: 6.4, y: 5.7 }, "WK-112": { x: 2.5, y: 5.2 },
};

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

export function positionForKey(key) {
  return KNOWN_POSITIONS[key] || {
    x: 0.8 + hash(`${key}:x`) * (MAP_SIZE.width - 1.6),
    y: 0.8 + hash(`${key}:y`) * (MAP_SIZE.height - 1.6),
  };
}

export function nearestWard(point) {
  return Object.entries(WARD_CENTERS).sort(
    ([, a], [, b]) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y)
  )[0][0];
}

/* The roster, filled from GET /api/authority/workers (updated in place so every
   import sees the latest list). */
export const WORKERS = [];

export function setWorkers(apiWorkers) {
  WORKERS.splice(
    0,
    WORKERS.length,
    ...apiWorkers.map((w) => {
      const position = positionForKey(w.workerId);
      return {
        id: w.workerId,
        name: w.name,
        department: w.department || GENERAL_DEPARTMENT,
        ward: nearestWard(position),
        phone: w.phone || "—",
        position,
      };
    })
  );
}

export function getWorkerById(id) {
  return WORKERS.find((worker) => worker.id === id) || null;
}

export function getInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function distanceKm(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/* Ranks workers for one complaint: nearest first.
   - `activeTasks` = how many open jobs the worker already has
   - `sameWard`    = worker is based in the complaint's ward
   - `departmentMatch` = worker's department fits the complaint category */
export function rankWorkers(complaint, allComplaints, { sameDepartmentOnly = true } = {}) {
  const department = CATEGORY_DEPARTMENT[complaint.category];
  const zone = complaint.wardZone || complaint.ward;

  return WORKERS.map((worker) => ({
    ...worker,
    distance: distanceKm(worker.position, complaint.point),
    sameWard: worker.ward === zone,
    departmentMatch: worker.department === department || worker.department === GENERAL_DEPARTMENT,
    activeTasks: allComplaints.filter(
      (item) => item.assignedWorkerId === worker.id && item.status !== "Completed"
    ).length,
  }))
    .filter((worker) => !sameDepartmentOnly || worker.departmentMatch)
    .sort((a, b) => a.distance - b.distance);
}
