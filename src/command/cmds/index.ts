import type { Class, NonEmptyObject } from "type-fest";
import { Ping } from "./Ping";
import type { CommandOptions } from "../../types/commands";
import { Find } from "./Find";

export const CommandMap: Record<
  string,
  Class<{
    execute: () => Promise<void>;
    opt: CommandOptions;
  }>
> = {
  ["ping"]: Ping,
  ["find"]: Find
};
