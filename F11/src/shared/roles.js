import {
  User,
  Landmark,
  HardHat,
  Camera,
  MapPin,
  Bell,
  ClipboardList,
  UserCheck,
  Activity,
  CircleCheck,
  Hammer,
} from "lucide-react";

/**
 * Single source of truth for the three CivicConnect portals. The shared
 * authentication page and the welcome intro both read from here, so the copy,
 * icons and labels stay identical everywhere and only the role changes.
 */
export const ROLES = {
  citizen: {
    id: "citizen",
    title: "Citizen",
    portal: "Citizen Portal",
    Icon: User,
    headline: "Report issues. Track every fix.",
    description:
      "Report issues in your area and track their progress in real time.",
    welcome: "Together, let's build cleaner and better communities.",
    features: [
      { Icon: Camera, text: "Report a problem with photos and location" },
      { Icon: MapPin, text: "Follow progress from report to resolution" },
      { Icon: Bell, text: "Get alerts the moment your issue moves" },
    ],
    identifier: {
      label: "Mobile number or email",
      placeholder: "98765 43210 or you@example.com",
      kind: "identifier",
    },
    footNote: "Citizen access",
  },
  authority: {
    id: "authority",
    title: "Authority",
    portal: "Authority Portal",
    Icon: Landmark,
    headline: "Review, assign and resolve.",
    description:
      "Review incoming reports, assign them, and monitor resolution.",
    welcome: "Ready to serve your community and make a difference?",
    features: [
      { Icon: ClipboardList, text: "Review incoming citizen complaints" },
      { Icon: UserCheck, text: "Assign the right worker to each task" },
      { Icon: Activity, text: "Monitor resolution across your area" },
    ],
    identifier: {
      label: "Employee ID",
      placeholder: "Enter your Employee ID",
    },
    footNote: "Municipal authority access only",
  },
  worker: {
    id: "worker",
    title: "Worker",
    portal: "Worker Portal",
    Icon: HardHat,
    headline: "Your work, on the record.",
    description:
      "Receive assigned tasks on the ground and mark issues resolved.",
    welcome: "Your work today shapes a better tomorrow.",
    features: [
      { Icon: ClipboardList, text: "See the tasks assigned to you" },
      { Icon: Hammer, text: "Update progress as the work happens" },
      { Icon: CircleCheck, text: "Mark issues resolved with proof" },
    ],
    identifier: {
      label: "Username",
      placeholder: "Enter your username",
    },
    footNote: "Municipal worker access only",
  },
};

/** Extra sign-up fields per role (password fields are added by the page). */
export const SIGNUP_FIELDS = {
  citizen: [
    { name: "name", label: "Full name", placeholder: "Enter your full name", kind: "name" },
    { name: "mobile", label: "Mobile number", placeholder: "10-digit mobile number", kind: "mobile", type: "tel" },
    { name: "email", label: "Email address", placeholder: "you@example.com", kind: "email", type: "email" },
  ],
  authority: [
    { name: "employeeId", label: "Employee ID", placeholder: "Enter your Employee ID", kind: "employeeId" },
    { name: "name", label: "Full name", placeholder: "Enter your full name", kind: "name" },
    { name: "mobile", label: "Mobile number", placeholder: "10-digit mobile number", kind: "mobile", type: "tel" },
    { name: "email", label: "Email address", placeholder: "you@example.com", kind: "email", type: "email" },
    { name: "area", label: "Area you serve", placeholder: "Select your city / area", kind: "required", type: "select" },
    { name: "inviteCode", label: "Authority invite code", placeholder: "Provided by your administrator", kind: "required" },
  ],
  worker: [
    { name: "name", label: "Full name", placeholder: "Enter your full name", kind: "name" },
    { name: "username", label: "Username", placeholder: "4-20 letters, numbers, . _ -", kind: "username" },
    { name: "email", label: "Email address", placeholder: "you@example.com", kind: "email", type: "email" },
    { name: "phone", label: "Mobile number", placeholder: "10-digit mobile number", kind: "mobile", type: "tel" },
    { name: "area", label: "Assigned area", placeholder: "Select your assigned area", kind: "required", type: "select" },
  ],
};

/** Fields used to find an account on the "forgot password" step. */
export const FORGOT_FIELDS = {
  citizen: [
    { name: "identifier", label: "Mobile number or email", placeholder: "98765 43210 or you@example.com", kind: "identifier" },
  ],
  authority: [
    { name: "employeeId", label: "Employee ID", placeholder: "Enter your Employee ID", kind: "required" },
    { name: "email", label: "Registered email", placeholder: "Enter your registered email", kind: "email", type: "email" },
  ],
  worker: [
    { name: "identifier", label: "Username or email", placeholder: "Enter username or email", kind: "required" },
  ],
};
