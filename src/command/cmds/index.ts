import type { Class, NonEmptyObject } from "type-fest";
import { Ping } from "./Ping.js";
import type { CommandOptions } from "../../types/commands";

export const CommandMap: Record<
  string,
  Class<{
    execute: () => Promise<void>;
    opt: CommandOptions;
  }>
> = {
  ["ping"]: Ping
};
