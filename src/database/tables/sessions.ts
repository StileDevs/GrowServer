import type { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface SessionTable {
  id: string;
  player_id: number;
  token: string;
  ip_address: Generated<string>;
  user_agent: string | null;
  expires_at: string;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type SessionRecord = Selectable<SessionTable>;
export type NewSessionRecord = Insertable<SessionTable>;
export type SessionRecordUpdate = Updateable<SessionTable>;
