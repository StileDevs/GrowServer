import { type NonEmptyObject, type Class } from "type-fest";
import { RefreshItemData } from "./RefreshItemData.js";
import { Peer } from "../../core/Peer.js";
import { EnterGame } from "./EnterGame.js";
import { QuitToExit } from "./QuitToExit.js";
import { Quit } from "./Quit.js";
import { JoinRequest } from "./JoinRequest.js";

const ActionMap: Record<
  string,
  Class<{
    execute: (peer: Peer, action: NonEmptyObject<any>) => Promise<void>;
  }>
> = {
  ["refresh_item_data"]: RefreshItemData,
  ["enter_game"]: EnterGame,
  ["quit_to_exit"]: QuitToExit,
  ["quit"]: Quit,
  ["join_request"]: JoinRequest
};

export { ActionMap };
