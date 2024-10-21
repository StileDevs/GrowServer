import { EmptyObject, type Class } from "type-fest";
import { RefreshItemData } from "./RefreshItemData";
import { Peer } from "../../core/Peer.js";

const ActionMap: Record<
  string,
  Class<{
    execute: (peer: Peer, action: Record<string, any>) => Promise<void>;
  }>
> = {
  ["refresh_item_data"]: RefreshItemData
};

export { ActionMap };
