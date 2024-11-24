import type { Class } from "type-fest";
import { GazzetteEnd } from "./GazetteEnd";
import { FindItem } from "./FindItem";
import { FindItemEnd } from "./FindItemEnd";

export const DialogMap: Record<
  string,
  Class<{
    execute: () => Promise<void>;
  }>
> = {
  ["gazzette_end"]: GazzetteEnd,
  ["find_item"]: FindItem,
  ["find_item_end"]: FindItemEnd
};
