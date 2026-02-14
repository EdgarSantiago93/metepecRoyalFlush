import type { User } from '@/types';

/** Pre-populated allowlisted users for mock auth. */
export const SEED_USERS: User[] = [
  {
    id: '01JA0000000000000000000001',
    email: 'edgar@poker.local',
    displayName: 'Edgar Santiago',
    isAdmin: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '01JA0000000000000000000002',
    email: 'carlos@poker.local',
    displayName: 'Carlos Mendoza',
    isAdmin: false,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '01JA0000000000000000000003',
    email: 'miguel@poker.local',
    displayName: 'Miguel Torres',
    isAdmin: false,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '01JA0000000000000000000004',
    email: 'andres@poker.local',
    displayName: 'Andres Ramirez',
    isAdmin: false,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '01JA0000000000000000000005',
    email: 'jorge@poker.local',
    displayName: 'Jorge Herrera',
    isAdmin: false,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '01JA0000000000000000000006',
    email: 'luis@poker.local',
    displayName: 'Luis Vargas',
    isAdmin: false,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '01JA0000000000000000000007',
    email: 'ricardo@poker.local',
    displayName: 'Ricardo Flores',
    isAdmin: false,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '01JA0000000000000000000008',
    email: 'fernando@poker.local',
    displayName: 'Fernando Ortiz',
    isAdmin: false,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '01JA0000000000000000000009',
    email: 'daniel@poker.local',
    displayName: 'Daniel Castro',
    isAdmin: false,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '01JA0000000000000000000010',
    email: 'pablo@poker.local',
    displayName: 'Pablo Navarro',
    isAdmin: false,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

/** Quick lookup by email (normalized lowercase). */
export const SEED_USERS_BY_EMAIL = new Map(
  SEED_USERS.map((u) => [u.email.toLowerCase(), u]),
);
