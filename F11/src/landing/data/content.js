/*
  All copy and data for the landing page lives here, so the components stay
  about layout and behaviour only. Photos are the real street photographs in
  /public (served from the site root).
*/

// Role colours: the status colours the three portals use, kept apart from the
// burgundy brand colour so a chip is always readable on beige.
export const ROLE_COLOR = {
  citizen: "#75162D",
  worker: "#1F7A5A",
  authority: "#1D2B53",
  ai: "#94681F",
};

export const PHOTO = {
  pothole: "/road-image.jpg",
  garbage: "/garbage-image.jpg",
  leak: "/water-image.jpg",
  light: "/brokenstreetlights.jpg",
  garbageFixed: "/images/garbage-after.jpg",
  leakFixed: "/images/water-after.jpg",
  roadFixed: "/images/road-after.jpg",
};

/* ---- Hero: five cards that move to the front automatically ---- */
export const HERO_CARDS = [
  { role: "Citizen", color: ROLE_COLOR.citizen, photo: PHOTO.pothole, alt: "Pothole on a city road", title: "AI detected: Pothole", text: "High priority. Forwarded to the Roads Department." },
  { role: "Worker", color: ROLE_COLOR.worker, photo: PHOTO.leak, alt: "Burst water pipe on a street", title: "Task: repair burst pipe", text: "Ward 12. Upload an after photo to close it." },
  { role: "Authority", color: ROLE_COLOR.authority, photo: PHOTO.garbage, alt: "Overflowing garbage bin", title: "Garbage overflow flagged", text: "Medium priority. Assign a sanitation crew." },
  { role: "Citizen", color: ROLE_COLOR.citizen, photo: PHOTO.light, alt: "Fallen street light pole", title: "Street light is out", text: "Reported with a photo and the exact location." },
  { role: "Worker", color: ROLE_COLOR.worker, photo: PHOTO.garbageFixed, alt: "Cleaned street after garbage removal", title: "Garbage cleared", text: "Proof uploaded. Waiting for the citizen to confirm." },
];

export const MARQUEE = ["Roads", "Water supply", "Sanitation", "Street lights", "Drainage", "Waste collection", "Parks", "Public safety"];

/* ---- The problem ---- */
export const PROBLEMS = [
  { title: "Slow manual process", text: "Paper forms and office visits delay every complaint before work even begins.", color: "#B8322F" },
  { title: "No transparency", text: "Citizens never know who received their complaint or what happened next.", color: "#C9962E" },
  { title: "No tracking", text: "Without status updates, issues get lost and trust in public services drops.", color: ROLE_COLOR.authority },
];

/* ---- Problems go in. Solutions come out. (conveyor) ---- */
export const FLOW_ITEMS = [
  ["Pothole", "Main Road", "Roads Dept", "Road repaired"],
  ["Garbage overflow", "Market Street", "Sanitation", "Waste cleared"],
  ["Street light out", "Park Avenue", "Electrical", "Light restored"],
  ["Water leakage", "Lake Road", "Water Board", "Pipe fixed"],
  ["Blocked drain", "Station Road", "Drainage", "Drain cleaned"],
  ["Damaged footpath", "Gandhi Road", "Public Works", "Footpath repaired"],
];

/* ---- Upload a photo. We do the rest. ---- */
export const DEMO_POINTS = [
  "Simplify civic issue reporting",
  "Automatically detect and categorize issues",
  "Assign priority based on severity",
  "Enable real-time complaint tracking",
  "Improve transparency and response time",
];

// box = detection frame as % of the photo (photos are shown at 3:2)
export const DEMOS = [
  { key: "pothole", name: "Pothole", conf: 96, loc: "Main Road, Ward 12", priority: "High", priorityColor: "#B8322F", dept: "Roads Department", photo: PHOTO.pothole, alt: "Pothole on a city road", box: { left: 31, top: 36, width: 41, height: 33 } },
  { key: "garbage", name: "Garbage overflow", conf: 93, loc: "Market Street, Ward 5", priority: "Medium", priorityColor: "#C9962E", dept: "Sanitation", photo: PHOTO.garbage, alt: "Overflowing garbage bin on a street", box: { left: 4, top: 16, width: 90, height: 80 } },
  { key: "light", name: "Broken street light", conf: 91, loc: "Park Avenue, Ward 8", priority: "Low", priorityColor: ROLE_COLOR.worker, dept: "Electrical", photo: PHOTO.light, alt: "Leaning street light pole with loose wires", box: { left: 22, top: 8, width: 64, height: 60 } },
];

/* ---- One platform, three roles ---- */
export const ROLE_CARDS = [
  { id: "citizen", label: "Citizen", color: ROLE_COLOR.citizen, title: "Report in seconds", text: "Snap a photo or pick from your gallery, pin the location and track every update.", action: "Open Citizen" },
  { id: "worker", label: "Worker", color: ROLE_COLOR.worker, title: "Know your tasks", text: "See assigned work, update progress and upload proof of resolution from the field.", action: "Open Worker" },
  { id: "authority", label: "Authority", color: ROLE_COLOR.authority, title: "Stay in control", text: "Monitor complaints, assign workers and keep the whole city accountable.", action: "Open Authority" },
];

/* ---- Everything the loop needs ---- */
export const FEATURE_TABS = [
  { id: "all", label: "All" },
  { id: "ai", label: "AI" },
  { id: "citizen", label: "Citizen" },
  { id: "worker", label: "Worker" },
  { id: "authority", label: "Authority" },
];

export const FEATURES = [
  { group: "ai", title: "AI issue detection", text: "Image classification identifies the type of problem from the photo." },
  { group: "ai", title: "Automatic priority", text: "Severity decides how urgently each complaint is handled." },
  { group: "ai", title: "Fake photo check", text: "Checks the photo against the chosen category to block false reports." },
  { group: "citizen", title: "Register and login", text: "Secure accounts for every citizen." },
  { group: "citizen", title: "Photo upload with location", text: "Camera or gallery, with the location captured." },
  { group: "citizen", title: "Complaint tracking", text: "Follow every status change until resolved." },
  { group: "worker", title: "Task inbox", text: "All assigned work in one clean list." },
  { group: "worker", title: "Proof of work", text: "Upload an after photo to close a task." },
  { group: "worker", title: "Instant alerts", text: "Get notified the moment new work is assigned." },
  { group: "authority", title: "Admin dashboard", text: "Open, assigned and resolved at a glance." },
  { group: "authority", title: "Auto forwarding", text: "Complaints reach the concerned department." },
  { group: "authority", title: "Accountability", text: "A clear record of every action taken." },
];

/* ---- From report to resolved ---- */
export const STEPS = [
  { title: "Upload image", text: "A citizen uploads a photo of the issue.", photo: PHOTO.pothole, alt: "Photo of a pothole ready to upload", tag: "Photo uploaded" },
  { title: "Detect issue and location", text: "AI classifies the problem and the location is captured automatically.", photo: PHOTO.pothole, alt: "Pothole with a detection frame", tag: "Pothole 96% · Main Road, Ward 12", detect: true },
  { title: "Assign priority", text: "Severity decides how urgent the complaint is.", photo: PHOTO.leak, alt: "Burst water pipe flooding a street", tag: "Priority: High" },
  { title: "Forward to authority", text: "The complaint goes straight to the concerned department.", photo: PHOTO.light, alt: "Fallen street light pole", tag: "Forwarded to Electrical Department" },
  { title: "Status updates", text: "Citizens get real-time updates as work progresses.", photo: PHOTO.garbage, alt: "Garbage pile waiting for collection", tag: "Status: Work in progress" },
  { title: "Issue resolved", text: "The worker uploads proof and the loop closes.", photo: PHOTO.garbageFixed, alt: "Clean street after the garbage was removed", tag: "Resolved · Citizen notified", done: true },
];

export const STATS = [
  { n: 3, suffix: "", label: "Role-based workspaces" },
  { n: 24, suffix: "/7", label: "Complaint tracking" },
  { n: 6, suffix: " steps", label: "Upload to resolved" },
  { n: 100, suffix: "%", label: "Transparent updates" },
];

export const ABOUT_POINTS = [
  "Simple and easy communication",
  "Better coordination between users",
  "Faster civic issue resolution",
];

// Where each role's "Open ..." button goes: the shared sign-in page of that portal.
export const portalPath = (role) => `/${role}`;
