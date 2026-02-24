/** Allowlisted identity for email login. Pre-populated with the group's emails. */
export type User = {
  id: string; // ULID
  email: string; // normalized lowercase, unique
  displayName: string;
  isAdmin: boolean;
  avatarUrl: string | null;
  avatarMediaId: string | null;
  bankingNombre: string | null;
  bankingCuenta: string | null;
  bankingBanco: string | null;
  bankingClabe: string | null;
  createdAt: string; // ISO datetime
};

/** Subset of User embedded in enriched API responses (members, participants, host order). */
export type EmbeddedUser = {
  id: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
  avatarMediaId?: string | null;
};
