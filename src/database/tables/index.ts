import type { PlayerTable } from "./players";
import type { AccountTable } from "./accounts";
import type { SessionTable } from "./sessions";
import type { VerificationTable } from "./verifications";
import type { WorldTable } from "./worlds";

export * from "./players";
export * from "./accounts";
export * from "./sessions";
export * from "./verifications";
export * from "./worlds";

/**
 * Main database schema interface definition for Kysely.
 */
export interface Database {
  players: PlayerTable;
  accounts: AccountTable;
  sessions: SessionTable;
  verifications: VerificationTable;
  worlds: WorldTable;
}
