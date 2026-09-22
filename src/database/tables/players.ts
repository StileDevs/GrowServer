import type { Generated, GeneratedAlways, Insertable, Selectable, Updateable } from "kysely";

export interface PlayerTable {
  id: GeneratedAlways<number>;
  mac: string | null;
  ip: Generated<string>;
  name: Generated<string>;
  display_name: Generated<string>;
  email: string | null;
  email_verified: Generated<number>;
  password: Generated<string | null>;
  last_seen_time: string | null;
  rid: Generated<Uint8Array>;
  platform_type: Generated<number>;
  gid: Generated<Uint8Array>;
  inventory: Uint8Array | null;
  role_id: number | null;
  vid: Generated<Uint8Array>;
  hash: Generated<number>;
  sid: Generated<Uint8Array>;
  skin_color: Generated<number>;
  gems: Generated<number>;
  level: Generated<number>;
  xp: Generated<number>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
  deleted_at: string | null;
}

export type PlayerRecord = Selectable<PlayerTable>;
export type NewPlayerRecord = Insertable<PlayerTable>;
export type PlayerRecordUpdate = Updateable<PlayerTable>;
