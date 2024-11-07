import type { Class } from "type-fest";
import { GazzetteEnd } from "./GazetteEnd.js";

export const DialogMap: Record<
  string,
  Class<{
    execute: () => Promise<void>;
  }>
> = {
  ["gazzette_end"]: GazzetteEnd
};
