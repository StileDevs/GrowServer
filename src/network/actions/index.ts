import { type NonEmptyObject, type Class } from "type-fest";
import { RefreshItemData } from "./RefreshItemData";
import { EnterGame } from "./EnterGame";
import { QuitToExit } from "./QuitToExit";
import { Quit } from "./Quit";
import { JoinRequest } from "./JoinRequest";
import { DialogReturn } from "./DialogReturn";
import { Input } from "./Input";
import { Respawn } from "./Respawn";
import { RespawnSpike } from "./RespawnSpike";
import { Drop } from "./Drop";
import { Trash } from "./Trash";
import { Wrench } from "./Wrench";
import { StoreBuy } from "./StoreBuy";
import { StoreHandler } from "./StoreHandler";
import { Info } from "./Info";

export const ActionMap: Record<
  string,
  Class<{
    execute: (action: NonEmptyObject<Record<string, string>>) => Promise<void>;
  }>
> = {
  ["refresh_item_data"]: RefreshItemData,
  ["enter_game"]:        EnterGame,
  ["quit_to_exit"]:      QuitToExit,
  ["quit"]:              Quit,
  ["join_request"]:      JoinRequest,
  ["dialog_return"]:     DialogReturn,
  ["input"]:             Input,
  ["respawn"]:           Respawn,
  ["respawn_spike"]:     RespawnSpike,
  ["drop"]:              Drop,
  ["trash"]:             Trash,
  ["wrench"]:            Wrench,
  ["buy"]:               StoreBuy,
  ["store"]:             StoreHandler,
  ["info"]:              Info
};
