import { EmptyObject, type Class } from "type-fest";
import { RefreshItemData } from "./RefreshItemData";
import { Peer } from "../../core/Peer.js";
import { EnterGame } from "./EnterGame";

const ActionMap: Record<
  string,
  Class<{
    execute: (peer: Peer, action: Record<string, any>) => Promise<void>;
  }>
> = {
  ["refresh_item_data"]: RefreshItemData,
  ["enter_game"]: EnterGame
};

export { ActionMap };
