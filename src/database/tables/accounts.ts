import type { Generated, GeneratedAlways, Insertable, Selectable, Updateable } from "kysely";

export interface AccountTable {
  id: GeneratedAlways<number>;
  player_id: number;
  provider_id: string;
  account_id: string;
  password: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type AccountRecord = Selectable<AccountTable>;
export type NewAccountRecord = Insertable<AccountTable>;
export type AccountRecordUpdate = Updateable<AccountTable>;
