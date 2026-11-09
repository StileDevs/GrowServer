import type { TextParser } from "../../utils/text-parser";
import { PlayerStateFlags, type Player } from "../player";

function Quit(player: Player, action: TextParser): void {
  player.disconnect();
}

function QuitToExit(player: Player, action: TextParser): void {
  player.world.leave();

  if (!player.world.isInside) {
    player.world.leave();
    player.variants.sendOnRequestWorldSelectMenu();
  }
}

function RefreshItemData(player: Player, action: TextParser): void {
  player.variants.sendOnConsoleMessage("One moment updating item data...");
  player.variants.sendItemData();
}

function RefreshPlayerTributeData(player: Player, action: TextParser): void {
  player.variants.sendOnRefreshPlayerTributeData();
}

function EnterGame(player: Player, action: TextParser): void {
  player.inventory.sendInventory();
  player.variants.sendGazette();
  player.variants.sendOnSetFeatureEnableFlags();

  player.addStateStatus(PlayerStateFlags.IN_GAME);
}

function JoinRequest(player: Player, action: TextParser): void {
  const rawName = action.get("name") ?? "";
  const parts = rawName.split("|");
  const worldName = parts[0] ?? "";
  const doorId = parts[1] ?? "";

  player.world.join(worldName, doorId);
}

function Input(player: Player, action: TextParser): void {
  // @TODO
}

function Respawn(player: Player, action: TextParser): void {
  // @TODO
}

function RespawnSpike(player: Player, action: TextParser): void {
  // @TODO a bit complicated
}

function DialogReturn(player: Player, action: TextParser): void {
  // @TODO this where we handled the dialog return
}

function Wrench(player: Player, action: TextParser): void {
  // @TODO
}

function Drop(player: Player, action: TextParser): void {
  // @TODO
}

function Info(player: Player, action: TextParser): void {
  // @TODO
}

function Trash(player: Player, action: TextParser): void {
  // @TODO
}

function Store(player: Player, action: TextParser): void {
  // @TODO
}

// related with Store
function Buy(player: Player, action: TextParser): void {
  // @TODO
}

function SetSkin(player: Player, action: TextParser): void {
  const color = action.get("color");
  player.variants.sendClothes(player.netID, player.inventory.clothes, parseInt(color));
}

export const GameMessageMap: Record<string, (player: Player, action: TextParser) => void> = {
  enter_game: EnterGame,
  quit: Quit,
  quit_to_exit: QuitToExit,
  refresh_item_data: RefreshItemData,
  refresh_player_tribute_data: RefreshPlayerTributeData,
  join_request: JoinRequest,
  input: Input,
  respawn: Respawn,
  respawn_spike: RespawnSpike,
  dialog_return: DialogReturn,
  wrench: Wrench,
  drop: Drop,
  info: Info,
  trash: Trash,
  store: Store,
  buy: Buy,
  setSkin: SetSkin,
};
