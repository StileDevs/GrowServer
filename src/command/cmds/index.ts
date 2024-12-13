import type { Class, NonEmptyObject } from "type-fest";
import { Ping } from "./Ping";
import type { CommandOptions } from "../../types/commands";
import { Find } from "./Find";
import { Sb } from "./Sb";
import { Help } from "./Help";
import { ClearWorld } from "./ClearWorld";

export const CommandMap: Record<
  string,
  Class<{
    execute: () => Promise<void>;
    opt: CommandOptions;
  }>
> = {
  ["ping"]: Ping,
  ["find"]: Find,
  ["sb"]: Sb,
  ["help"]: Help,
  ["clearworld"]: ClearWorld
};
