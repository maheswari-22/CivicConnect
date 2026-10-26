import { User, Landmark, HardHat } from 'lucide-react';

// Photos live in /public/roles (square, colour matched). The same files are used
// on the Get Started cards and in each module's welcome banner.
export const roles = [
  {
    id: 'citizen',
    title: 'Citizen',
    photo: '/roles/citizen.jpg',
    Icon: User,
    description: 'Report issues in your area and track their progress in real time.',
    action: 'Continue as Citizen',
  },
  {
    id: 'authority',
    title: 'Authority',
    photo: '/roles/authority.jpg',
    Icon: Landmark,
    description: 'Review incoming reports, assign them, and monitor resolution.',
    action: 'Continue as Authority',
  },
  {
    id: 'worker',
    title: 'Worker',
    photo: '/roles/worker.jpg',
    Icon: HardHat,
    description: 'Receive assigned tasks on the ground and mark issues resolved.',
    action: 'Continue as Worker',
  },
];
