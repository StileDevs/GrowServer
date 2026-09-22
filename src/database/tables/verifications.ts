import type { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expires_at: string;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type VerificationRecord = Selectable<VerificationTable>;
export type NewVerificationRecord = Insertable<VerificationTable>;
export type VerificationRecordUpdate = Updateable<VerificationTable>;
