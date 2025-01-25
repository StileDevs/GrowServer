import type { Class } from "type-fest";
import { GazzetteEnd } from "./GazetteEnd";
import { FindItem } from "./FindItem";
import { FindItemEnd } from "./FindItemEnd";
import { AreaLockEdit } from "./AreaLockEdit";
import { ConfirmClearWorld } from "./ConfirmClearWorld";
import { DoorEdit } from "./DoorEdit";
import { DropEnd } from "./DropEnd";
import { SignEdit } from "./SignEdit";
import { TrashEnd } from "./TrashEnd";

export const DialogMap: Record<
  string,
  Class<{
    execute: () => Promise<void>;
  }>
> = {
  ["gazzette_end"]:       GazzetteEnd,
  ["find_item"]:          FindItem,
  ["find_item_end"]:      FindItemEnd,
  ["area_lock_edit"]:     AreaLockEdit,
  ["confirm_clearworld"]: ConfirmClearWorld,
  ["door_edit"]:          DoorEdit,
  ["drop_end"]:           DropEnd,
  ["sign_edit"]:          SignEdit,
  ["trash_end"]:          TrashEnd
};
