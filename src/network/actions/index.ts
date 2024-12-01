import { type NonEmptyObject, type Class } from "type-fest";
import { RefreshItemData } from "./RefreshItemData";
import { Peer } from "../../core/Peer";
import { EnterGame } from "./EnterGame";
import { QuitToExit } from "./QuitToExit";
import { Quit } from "./Quit";
import { JoinRequest } from "./JoinRequest";
import { DialogReturn } from "./DialogReturn";
import { Input } from "./Input";
import { Respawn } from "./Respawn";
import { RespawnSpike } from "./RespawnSpike";

export const ActionMap: Record<
  string,
  Class<{
    execute: (action: NonEmptyObject<any>) => Promise<void>;
  }>
> = {
  ["refresh_item_data"]: RefreshItemData,
  ["enter_game"]: EnterGame,
  ["quit_to_exit"]: QuitToExit,
  ["quit"]: Quit,
  ["join_request"]: JoinRequest,
  ["dialog_return"]: DialogReturn,
  ["input"]: Input,
  ["respawn"]: Respawn,
  ["respawn_spike"]: RespawnSpike
};
