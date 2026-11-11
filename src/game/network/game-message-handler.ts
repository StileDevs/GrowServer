import { TextParser } from "../../utils/text-parser";
import { CADUCEUS_ID } from "../quests/constants";
import { DialogBuilder } from "../../utils/dialog-builder";
import { logger } from "../../utils/logger";
import { getItem } from "../item/item-utils";
import { getItemInfo } from "../item/item-wiki";
import { Player, PlayerStateFlags, MAX_LEVEL, DEFAULT_SKIN_COLOR } from "../player";
import { PLAYER_ROLE } from "../../constants";
import { Variant, int32 } from "../packets/variants";
import { serverManager } from "../server/server-manager";
import { BlockFlags, ITEM_ID, ActionTypes } from "../world/constants";
import { handleDialogReturn } from "./dialog-handler";
// registers the backpack and gazette dialog returns
import "./item-dialogs";
import { handleChatInput } from "./chat-handler";
import { openStore, handleStoreBuy } from "./store-handler";
import { selfProfileDialog, otherProfileDialog } from "./profile-dialogs";

function Quit(player: Player): void {
  player.disconnect();
}

function QuitToExit(player: Player): void {
  player.leaveWorld();
}

function RefreshItemData(player: Player): void {
  player.variants.sendOnConsoleMessage("One moment updating item data...");
  player.variants.sendItemData();
}

function RefreshPlayerTributeData(player: Player): void {
  player.variants.sendOnRefreshPlayerTributeData();
}

/**
 * The client sends `enter_game` once it has loaded items.dat and built its UI.
 * Everything that drives that UI (backpack, gems, GrowID state, world menu)
 * is sent here, in the order the official server uses.
 */
function EnterGame(player: Player): void {
  player.variants.sendOnConsoleMessage(`Welcome back, ${player.formattedName}. There are \`w${serverManager.getTotalPlayersCount()}\`\` players online.`);
  player.sendInventory();
  player.variants.sendOnSetBux(player.gems, true);
  player.variants.sendVariant(Variant.from("OnSetVouchers", int32(0)));
  // the GDPR override is also sent when the UI is (re)built
  player.variants.sendOnOverrideGdprFromServer(Math.max(18, player.auth.metadata.playerAge || 18));
  // tells the client which GrowID it is logged in with; without it the client
  // stays in guest mode (chat disabled, empty profile)
  player.variants.sendSetHasGrowID(true, player.tankIDName, player.auth.metadata.tankIDPass || player.auth.transferSession?.sessionToken || "");
  player.variants.sendOnTodaysDate();
  player.variants.sendOnRequestHoustonPricing();
  player.variants.sendGazette(player.homeWorld, player.playerId, player.lastVisitedWorlds);
  player.variants.sendPingRequest();
  player.variants.sendOnSetFeatureEnableFlags();
  player.addStateStatus(PlayerStateFlags.IN_GAME);
}

async function JoinRequest(player: Player, action: TextParser): Promise<void> {
  const name = action.get("name").trim();

  if (name.length <= 0) {
    player.variants.sendOnFailedToEnterWorld();
    player.variants.sendOnConsoleMessage("That world name is uhh `9empty``");
    return;
  }
  if (/\W|_|^EXIT$/i.test(name) || name.length > 24) {
    player.variants.sendOnFailedToEnterWorld();
    player.variants.sendOnConsoleMessage("That world name is too `9special`` to be entered.");
    return;
  }

  try {
    await player.enterWorld(name.toUpperCase());
  } catch (err) {
    logger.error({ err, world: name, player: player.tankIDName }, "failed to enter world");
    player.variants.sendOnFailedToEnterWorld();
    player.variants.sendOnConsoleMessage("`4Something went wrong while entering that world.``");
  }
}

async function Input(player: Player, action: TextParser): Promise<void> {
  await handleChatInput(player, action.get("text"));
}

/** Routes the native discovery Home button using the account's saved destination. */
async function GoHomeWorld(player: Player): Promise<void> {
  const name = player.homeWorld;
  if (!name) {
    player.variants.sendOnFailedToEnterWorld();
    player.variants.sendOnConsoleMessage("You haven't set a home world yet. Use /sethome in a world you own.");
    return;
  }
  if (player.world?.name === name) {
    const door = player.world.mainDoor;
    player.setPosition((door?.x ?? 0) * 32, (door?.y ?? 0) * 32);
    player.world.playPositioned("audio/door_open.wav", player.netID);
    return;
  }
  const action = new TextParser();
  action.set("name", name);
  await JoinRequest(player, action);
}

function Respawn(player: Player): void {
  player.respawn();
}

function DialogReturn(player: Player, action: TextParser): Promise<void> {
  return handleDialogReturn(player, action);
}

/** Wrench on an avatar: the profile menu for yourself, the player menu for others. */
function Wrench(player: Player, action: TextParser): void {
  const netId = action.getInt("netid", 0, player.netID);
  if (netId === player.netID || !player.world) {
    player.variants.sendOnDialogRequest(selfProfileDialog(player));
    return;
  }
  const target = player.world.players.find((other) => other.netID === netId);
  if (target) player.variants.sendOnDialogRequest(otherProfileDialog(target));
}

function Drop(player: Player, action: TextParser): void {
  const itemId = action.getInt("itemID", 0, 0);
  if (itemId === CADUCEUS_ID) {
    player.sendTextBubble("Caduceus cannot be dropped.");
    return;
  }
  if (itemId === ITEM_ID.FIST || itemId === ITEM_ID.WRENCH) {
    player.variants.sendOnConsoleMessage("You'd be sorry if you lost that.");
    return;
  }
  const item = getItem(itemId);
  if (!item || !player.inventory.hasItem(itemId)) return;

  const isFish = item.type === ActionTypes.PETFISH;
  const owned = player.inventory.getAmount(itemId);

  const dialog = new DialogBuilder()
    .defaultColor()
    .addLabelWithIcon(`Drop ${item.name}`, itemId, "big");

  if (isFish) {
    dialog
      .addTextBox(`Drop this ${owned} lb. ${item.name}?`)
      .addInputBox("drop_count", "", owned, 5);
  } else {
    dialog
      .addTextBox("How many to drop?")
      .addInputBox("drop_count", "", owned, 5);
  }

  dialog
    .embed("itemID", itemId)
    .endDialog("drop_end", "Cancel", "OK");

  player.variants.sendOnDialogRequest(dialog.str());
}

function Info(player: Player, action: TextParser): void {
  const itemId = action.getInt("itemID", 0, -1);
  const item = getItem(itemId);
  if (!item) return player.variants.sendOnTextOverlay("Item not found.");
  const info = getItemInfo(itemId);

  const dialog = new DialogBuilder()
    .defaultColor()
    .addLabelWithIcon(`\`wAbout ${item.name} (${itemId})`, itemId, "small")
    .addSpacer("small")
    .addSmallText(info?.desc || "`oNo description available.")
    .addSpacer("small")
    .addSmallText(`Rarity: \`w${(item.rarity ?? 999) >= 999 ? "None" : item.rarity}`);

  const splice = info?.recipe?.splice ?? [];
  if (splice.length > 0) {
    const seeds = splice.map((seedId) => getItem(seedId)?.name ?? seedId).join(" + ");
    dialog.addSmallText(`Recipe: ${seeds} = ${item.name}`).addSpacer("small");
  } else {
    dialog.addSmallText("`oThis item cannot be spliced.");
  }

  if ((item.flags ?? 0) & BlockFlags.PERMANENT) {
    dialog.addSpacer("small").addSmallText("`3This item can't be destroyed - smashing it will return it to your backpack if you have room!");
  }

  player.variants.sendOnDialogRequest(dialog.addButton("info_end", "OK").str());
}

function Trash(player: Player, action: TextParser): void {
  const itemId = action.getInt("itemID", 0, 0);
  if (itemId === ITEM_ID.FIST || itemId === ITEM_ID.WRENCH) {
    player.variants.sendOnTextOverlay("You'd be sorry if you lost that.");
    return;
  }
  const item = getItem(itemId);
  if (!item) return;
  if (!player.inventory.hasItem(itemId)) {
    player.sendTextBubble("That item doesn't exist in your inventory");
    return;
  }

  const isFish = item.type === ActionTypes.PETFISH;
  const owned = player.inventory.getAmount(itemId);

  const dialog = new DialogBuilder()
    .defaultColor()
    .addLabelWithIcon(`Trash ${item.name}`, itemId, "big");

  if (isFish) {
    dialog
      .addTextBox(`Trash this ${owned} lb. ${item.name}?`)
      .addInputBox("trash_count", "", owned, 5);
  } else {
    dialog
      .addTextBox("How many to `4destroy`o?")
      .addInputBox("trash_count", "", 0, 5);
  }

  dialog
    .embed("itemID", itemId)
    .endDialog("trash_end", "Cancel", "OK");

  player.variants.sendOnDialogRequest(dialog.str());
}

function Store(player: Player): void {
  openStore(player);
}

function Buy(player: Player, action: TextParser): void {
  handleStoreBuy(player, action.get("item"));
}

/** 5.x store navigation: `item` is the tab, `selection` the chosen entry. */
function StoreNavigate(player: Player, action: TextParser): void {
  handleStoreBuy(player, action.get("item"), action.get("selection"));
}

/** Skin colors every account may pick in the settings menu. */
const BASIC_SKIN_COLORS: ReadonlySet<number> = new Set([0x505c78ff, 0x647296ff, 0x788ab4ff, 0x8295c3ff, 0x96ace1ff, 0xaac3ffff, 0xb4ceffff, 0xc8e5ffff]);
/** Extra skin colors for supporters. */
const SUPPORTER_SKIN_COLORS: ReadonlySet<number> = new Set([0xa3ddb1ff, 0xc5c241ff, 0x2b4bd7ff, 0x2a8a41ff, 0xd551a9ff, 0xf0f0f0ff, 0xd27a3cff, 0xefcbb1ff, 0x0b94ffff, 0x5032ffa0]);

/**
 * Validates a skin color picked by the client: basic colors for everyone,
 * supporter colors for supporters and staff, anything else falls back to the default.
 */
function normalizeSkinColor(player: Player, color: number): number {
  if (BASIC_SKIN_COLORS.has(color)) return color;
  if (SUPPORTER_SKIN_COLORS.has(color) && (player.role === PLAYER_ROLE.SUPPORTER || player.isModerator)) return color;
  if (player.isDeveloper) return color;
  return DEFAULT_SKIN_COLOR;
}

/** `action|setSkin` from the settings menu (older clients send `set_skin`). */
function SetSkin(player: Player, action: TextParser): void {
  const raw = action.get("color");
  if (!/^\d+$/.test(raw)) return;
  player.skinColor = normalizeSkinColor(player, Number.parseInt(raw, 10) >>> 0);
  player.sendClothesToWorld();
  player.scheduleInventorySave();
}

/**
 * Newer clients start new accounts in tutorial mode and send
 * `on_use_door_tutorial` instead of a normal door action. The server has no
 * tutorial, so treat it like the exit door.
 */
function TutorialDoor(player: Player): void {
  player.leaveWorld();
}

/** Client notifications that need no server reaction. */
function Ignore(): void {}

export const GameMessageMap: Record<string, (player: Player, action: TextParser) => Promise<void> | void> = {
  enter_game: EnterGame,
  quit: Quit,
  quit_to_exit: QuitToExit,
  refresh_item_data: RefreshItemData,
  refresh_player_tribute_data: RefreshPlayerTributeData,
  join_request: JoinRequest,
  gohomeworld: GoHomeWorld,
  input: Input,
  respawn: Respawn,
  respawn_spike: Respawn,
  dialog_return: DialogReturn,
  wrench: Wrench,
  drop: Drop,
  info: Info,
  trash: Trash,
  store: Store,
  buy: Buy,
  storenavigate: StoreNavigate,
  // the client reports closing the store; nothing to do server-side
  killstore: Ignore,
  set_skin: SetSkin,
  setSkin: SetSkin,
  on_use_door_tutorial: TutorialDoor,
  validate_world: Ignore,
  log: Ignore,
  growid: Ignore,
  friends: Ignore,
  getDRAnimations: Ignore,
  dialog_action: Ignore,
};
