/** Allowlisted identity for email login. Pre-populated with the group's emails. */
export type User = {
  id: string; // ULID
  email: string; // normalized lowercase, unique
  displayName: string;
  isAdmin: boolean;
  createdAt: string; // ISO datetime
};
