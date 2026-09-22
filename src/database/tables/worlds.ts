import type { Generated, GeneratedAlways, Insertable, Selectable, Updateable } from "kysely";

export interface WorldTable {
  id: GeneratedAlways<number>;
  name: string;
  version: Generated<number>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
  deleted_at: string | null;
}

export type WorldRecord = Selectable<WorldTable>;
export type NewWorldRecord = Insertable<WorldTable>;
export type WorldRecordUpdate = Updateable<WorldTable>;
