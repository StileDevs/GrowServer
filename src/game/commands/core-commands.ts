import { CHARACTER_STATE, PLAYER_ROLE, PLAYER_ROLE_NAMES } from "../../constants";
import { DialogBuilder } from "../../utils/dialog-builder";
import { PlayerDB } from "../../database/services/player-db";
import { items } from "../item/item-info";
import { getItem } from "../item/item-utils";
import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { serverManager } from "../server/server-manager";
import { registerDialog } from "../network/dialog-handler";
import { ActionTypes, ITEM_ID, LOCKS } from "../world/constants";
import { worldManager } from "../world/world-manager";
import { canUseCommand, commands, registerCommand, type ChatCommand } from "./registry";

const ROLE_NAMES = PLAYER_ROLE_NAMES;

/**
 * Resolves a command target written as `/name` (exact GrowID) or `#id`
 * (database id) to an online player or a database record.
 */
async function resolveTarget(raw: string): Promise<{ online?: Player; playerId?: number; name?: string } | null> {
  if (raw.startsWith("#")) {
    const id = Number.parseInt(raw.slice(1), 10);
    if (Number.isNaN(id)) return null;
    const online = serverManager.players.find((player) => player.playerId === id);
    if (online) return { online, playerId: id, name: online.tankIDName };
    const record = await PlayerDB.getById(id);
    return record ? { playerId: record.id, name: record.name } : null;
  }

  const name = raw.replace(/^\//, "").toLowerCase();
  if (!name) return null;
  const online = serverManager.players.find((player) => player.tankIDName.toLowerCase() === name);
  if (online) return { online, playerId: online.playerId, name: online.tankIDName };
  const record = await PlayerDB.getByName(name);
  return record ? { playerId: record.id, name: record.name } : null;
}

function sendTargetUsage(player: Player, usage: string): void {
  player.variants.sendOnConsoleMessage(`\`4Usage: ${usage}\`o - target is \`/username\`\` or \`#id\`\``);
}

registerCommand({
  name: "help",
  aliases: ["?"],
  description: "Shows available commands",
  usage: "/help [command]",
  cooldown: 2,
  execute(player, args) {
    const requested = args[0]?.replace(/^\//, "").toLowerCase();
    if (requested) {
      const command = commands.get(requested) ?? commands.find((entry) => (entry.aliases ?? []).includes(requested));
      if (!command) return player.variants.sendOnConsoleMessage("It seems that command doesn't exist.");

      const dialog = new DialogBuilder()
        .defaultColor()
        .addLabelWithIcon(`/${command.name}`, ITEM_ID.WRENCH, "small")
        .addSpacer("small")
        .addSmallText(`Description: ${command.description}`)
        .addSmallText(`Usage: ${command.usage ?? `/${command.name}`}`)
        .addSmallText(`Aliases: ${command.aliases?.length ? command.aliases.map((alias) => `/${alias}`).join(", ") : "None"}`)
        .addSmallText(`Cooldown: ${command.cooldown ?? 1}s`)
        .addSmallText(`Role: ${ROLE_NAMES[command.role ?? PLAYER_ROLE.BASIC]}`)
        .addQuickExit()
        .endDialog("help_end", "", "Ok")
        .str();
      return player.variants.sendOnDialogRequest(dialog);
    }

    const available = commands
      .toArray()
      .filter((command: ChatCommand) => canUseCommand(player, command))
      .map((command) => `/${command.name}`)
      .sort();
    player.variants.sendOnConsoleMessage(`Available commands: ${available.join(", ")}`);
  },
});

registerCommand({
  name: "ping",
  aliases: ["pong"],
  description: "Ping pong",
  cooldown: 2,
  execute(player) {
    player.variants.sendOnConsoleMessage("Pong :>");
  },
});

registerCommand({
  name: "sb",
  description: "Broadcast a message to everyone",
  usage: "/sb <message>",
  cooldown: 5,
  execute(player, args) {
    if (args.length === 0) return player.variants.sendOnConsoleMessage("Message are required.");
    const message = args.join(" ").replace(/`./g, "");
    const location = player.currentWorld || "the menu";
    // super broadcasts use the retail layout, with the world hidden when a
    // signal jammer is on
    const worldLabel = player.world?.signalJammed ? "`4JAMMED!``" : location;
    const textColor = player.isDeveloper ? "`5" : player.isModerator ? "`^" : "`$";

    serverManager.broadcast(
      Variant.from("OnConsoleMessage", "CP:_PL:0_OID:_CT:[SB]_ `5** from (`0" + player.displayName + "`````5) in [```$" + worldLabel + "```5] ** : ``" + textColor + message + "``").parsePacket(),
    );
    for (const other of serverManager.players.values()) other.sendSfx("audio/beep.wav");
  },
});

registerCommand({
  name: "sdb",
  description: "Send a global message to everyone via a dialog box",
  usage: "/sdb <message>",
  role: PLAYER_ROLE.DEVELOPER,
  cooldown: 5,
  execute(player, args) {
    if (args.length === 0) return player.variants.sendOnConsoleMessage("Message are required.");

    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon("Super Duper Broadcast", 2480, "big")
      .addSpacer("small")
      .addSmallText(`\`oMessage from: \`$${player.displayName}`)
      .addSmallText(`\`oWorld: \`o${player.currentWorld || "the menu"}`)
      .addSpacer("small")
      .addSmallText(`\`5${args.join(" ")}`)
      .addQuickExit()
      .endDialog("ok", "Close", "")
      .str();

    for (const other of serverManager.players.values()) {
      other.variants.sendOnDialogRequest(dialog);
      other.sendSfx("audio/beep.wav");
    }
    player.variants.sendOnConsoleMessage("`2Super Duper Broadcast sent to all players.");
  },
});

registerCommand({
  name: "warp",
  description: "Warp to another world or door.",
  usage: "/warp <world name:door id>",
  role: PLAYER_ROLE.MODERATOR,
  cooldown: 2,
  async execute(player, args) {
    const destination = args[0];
    if (!destination) return player.variants.sendOnConsoleMessage("`4Usage: /warp <world name:door id>");

    const [rawWorld, doorId] = destination.split(":");
    const worldName = (rawWorld || player.currentWorld).toUpperCase();
    if (!worldName) return player.variants.sendOnConsoleMessage("`4That world name is empty.");
    if (/\W|_/.test(worldName) || worldName === "EXIT") return player.variants.sendOnConsoleMessage("`4That world name contains invalid characters.");

    const world = await worldManager.get(worldName);
    const door = (doorId && world.data.blocks.find((block) => block.door?.id?.toUpperCase() === doorId.toUpperCase())) || world.mainDoor;
    if (doorId && !door) return player.variants.sendOnConsoleMessage("`4Door not found in that world.");

    player.variants.sendOnConsoleMessage(`Warping to \`2${doorId ? `${worldName}:${doorId}` : worldName}\`\`...`);
    if (player.world === world) {
      player.variants.sendOnZoomCamera(10000, 1000);
      player.setPosition((door?.x ?? 0) * 32, (door?.y ?? 0) * 32);
      world.playPositioned("audio/door_open.wav", player.netID);
      return;
    }
    await player.enterWorld(worldName, door?.x, door?.y);
  },
});

function sendFindResults(player: Player, query: string, seedsOnly: boolean): void {
  const dialog = new DialogBuilder().defaultColor().addQuickExit().addLabelWithIcon("Find the item", 6016, "big").addSpacer("small");
  const needle = query.toLowerCase();
  let count = 0;

  for (const item of items.meta.items.values()) {
    const id = item.id ?? 0;
    if (id <= 0 || !item.name?.toLowerCase().includes(needle)) continue;
    if (seedsOnly ? id % 2 === 0 : id % 2 === 1) continue;
    dialog.addButtonWithIcon(id, id, item.name, "staticBlueFrame", id);
    if (++count >= 100) break;
  }

  if (count === 0) dialog.addSmallText("`4No items found.``");
  dialog.endDialog("find_item_end", "Cancel", "");
  player.variants.sendOnDialogRequest(dialog.str());
}

registerCommand({
  name: "find",
  description: "Find some items",
  usage: "/find [item name]",
  role: PLAYER_ROLE.DEVELOPER,
  cooldown: 2,
  execute(player, args) {
    if (args.length > 0) return sendFindResults(player, args.join(" "), false);

    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon("Find the item", 6016, "big")
      .addCheckbox("seed_only", "Only seed", "not_selected")
      .addInputBox("find_item_name", "", "", 30)
      .addQuickExit()
      .endDialog("find_item", "Cancel", "Find")
      .str();
    player.variants.sendOnDialogRequest(dialog);
  },
});

registerDialog("find_item", (player, action) => {
  if (!player.isDeveloper) return;
  const query = action.get("find_item_name");
  if (!query) return;
  sendFindResults(player, query, action.get("seed_only") === "1");
});

registerDialog("find_item_end", (player, action) => {
  if (!player.isDeveloper) return;
  const itemId = action.getInt("buttonClicked", 0, 0);
  const item = getItem(itemId);
  if (!item) return;
  player.addItemInven(itemId, 200);
  player.variants.sendOnConsoleMessage(`Added \`6${item.name}\`\` to your inventory.`);
});

registerCommand({
  name: "search",
  description: "Search items with the searchable item list",
  role: PLAYER_ROLE.DEVELOPER,
  cooldown: 2,
  execute(player) {
    const dialog = new DialogBuilder()
      .defaultColor()
      .addInputBox("n", "Search: ", "", 26)
      .raw("add_searchable_item_list||sourceType:allItems;listType:iconWithCustomLabel;resultLimit:50|n|\n")
      .addQuickExit()
      .endDialog("search_item", "", "")
      .str();
    player.variants.sendOnDialogRequest(dialog);
  },
});

registerDialog("search_item", (player, action) => {
  if (!player.isDeveloper) return;
  const clicked = action.get("buttonClicked");
  // searchableItemListButton_{itemID}_{index}_{param}
  const itemId = Number.parseInt(clicked.startsWith("searchableItemListButton_") ? (clicked.split("_")[1] ?? "") : clicked, 10);
  const item = getItem(itemId);
  if (!item) return player.variants.sendOnConsoleMessage("`4Error: Invalid item ID.``");
  player.addItemInven(itemId, 200);
  player.variants.sendOnConsoleMessage(`Added \`6${item.name}\`\` (200) to your inventory.`);
});

const GHOST_STATE = CHARACTER_STATE.WALK_IN_BLOCKS | CHARACTER_STATE.DOUBLE_JUMP | CHARACTER_STATE.HAVE_FLYING_PINEAPPLE;

registerCommand({
  name: "ghost",
  description: "Toggle ghost mode to walk through blocks.",
  role: PLAYER_ROLE.DEVELOPER,
  cooldown: 2,
  execute(player) {
    player.state.isGhost = !player.state.isGhost;

    if (player.state.isGhost) {
      player.state.characterState |= GHOST_STATE;
      player.variants.sendOnConsoleMessage("`2Ghost mode enabled``. You can now walk through blocks!");
      // semi-transparent white appearance
      for (const other of player.world?.players ?? [player]) {
        other.variants.sendClothes(player.netID, player.inventory.clothes, 0xffffff80);
      }
    } else {
      player.state.characterState &= ~GHOST_STATE;
      player.variants.sendOnConsoleMessage("`4Ghost mode disabled``. You are back to normal.");
      player.sendClothesToWorld();
    }
    player.sendCharacterState();
  },
});

registerCommand({
  name: "pid",
  aliases: ["punchid"],
  description: "Change your punch effect id",
  usage: "/pid <id>",
  role: PLAYER_ROLE.DEVELOPER,
  cooldown: 1,
  execute(player, args) {
    const punchId = Number.parseInt(args[0] ?? "", 10);
    if (Number.isNaN(punchId) || punchId < 0 || punchId > 255) return player.variants.sendOnConsoleMessage("`4Usage: /pid <id> (0-255)");
    player.customPunchId = punchId;
    player.variants.sendOnConsoleMessage(`\`2Your punch id has been changed to: ${punchId}`);
    player.sendCharacterState();
  },
});

registerCommand({
  name: "addgems",
  description: "Add gems to a player.",
  usage: "/addgems <target> <amount>",
  role: PLAYER_ROLE.DEVELOPER,
  cooldown: 1,
  async execute(player, args) {
    const [rawTarget, rawAmount] = args;
    const amount = Number.parseInt(rawAmount ?? "", 10);
    if (!rawTarget || Number.isNaN(amount) || amount <= 0) return sendTargetUsage(player, "/addgems <target> <amount>");

    const target = await resolveTarget(rawTarget);
    if (!target?.playerId) return player.variants.sendOnConsoleMessage(`\`4Player \`o${rawTarget}\`4 not found.\`\``);

    if (target.online) {
      target.online.addGems(amount);
      target.online.variants.sendOnConsoleMessage(`\`2You have received \`o${amount}\`2 gems from an administrator!\`\``);
    } else {
      await PlayerDB.addGems(target.playerId, amount);
    }
    player.variants.sendOnConsoleMessage(`\`2Successfully added \`o${amount}\`2 gems to \`o${target.name}\`2${target.online ? "" : " (offline)"}.\`\``);
  },
});

registerCommand({
  name: "giverole",
  description: "Change a player's role.",
  usage: "/giverole <target> <0 user|1 developer|2 moderator|3 supporter|4 owner>",
  role: PLAYER_ROLE.DEVELOPER,
  cooldown: 1,
  async execute(player, args) {
    const [rawTarget, rawRole] = args;
    const role = Number.parseInt(rawRole ?? "", 10) as PLAYER_ROLE;
    if (!rawTarget || !(role in ROLE_NAMES)) return sendTargetUsage(player, "/giverole <target> <0|1|2|3|4>");

    const target = await resolveTarget(rawTarget);
    if (!target?.playerId) return player.variants.sendOnConsoleMessage(`\`4Player \`o${rawTarget}\`4 not found.\`\``);

    await PlayerDB.updateById(target.playerId, { role_id: role });
    if (target.online) {
      target.online.role = role;
      target.online.variants.sendOnConsoleMessage(`\`2Your role has been changed to \`o${ROLE_NAMES[role]}\`2 by an administrator!\`\``);
      target.online.sendCountryState();
      if (target.online.world) target.online.world.broadcastVariant(Variant.from({ netID: target.online.netID }, "OnNameChanged", target.online.formattedName));
    }
    player.variants.sendOnConsoleMessage(`\`2Successfully changed role of \`o${target.name}\`2 to \`o${ROLE_NAMES[role]}\`2.\`\``);
  },
});

registerCommand({
  name: "clearworld",
  description: "Clear everything in your world",
  cooldown: 10,
  execute(player) {
    const world = player.world;
    if (!world) return;
    const ownerId = world.getOwnerPlayerId();
    if (ownerId === undefined || (ownerId !== player.playerId && !player.isDeveloper)) {
      return player.variants.sendOnConsoleMessage("`4You need to own this world to clear it.``");
    }

    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon("Warning", 1432, "big")
      .addTextBox("This will clear everything on your world, including your building. Are you sure?")
      .endDialog("confirm_clearworld", "Nevermind", "Yes")
      .str();
    player.variants.sendOnDialogRequest(dialog);
  },
});

registerDialog("confirm_clearworld", (player) => {
  const world = player.world;
  if (!world) return;
  const ownerId = world.getOwnerPlayerId();
  if (ownerId === undefined || (ownerId !== player.playerId && !player.isDeveloper)) return;

  for (const block of world.data.blocks) {
    const item = getItem(block.fg || block.bg);
    const isAreaLock = LOCKS.some((lock) => lock.id === item?.id);
    // keep the main door, bedrock floor and the world lock itself
    if (block.fg === ITEM_ID.MAIN_DOOR || block.fg === ITEM_ID.BEDROCK || (item?.type === ActionTypes.LOCK && !isAreaLock)) continue;

    const { x, y } = block;
    const record = block as unknown as Record<string, unknown>;
    for (const key of Object.keys(record)) delete record[key];
    Object.assign(block, { x, y, fg: 0, bg: 0, flags: 0 });
  }
  world.clearDrops();
  world.markDirty();

  for (const other of world.players) other.leaveWorld();
});

registerCommand({
  name: "save",
  aliases: ["saveserver"],
  description: "Save every player and world now",
  role: PLAYER_ROLE.DEVELOPER,
  cooldown: 5,
  async execute(player) {
    for (const other of serverManager.players.values()) await other.saveToDatabase();
    await worldManager.saveAll();
    player.variants.sendOnConsoleMessage("Successfully saved all worlds & players");
  },
});

registerCommand({
  name: "changename",
  description: "Change your display name",
  usage: "/changename <new name>",
  role: PLAYER_ROLE.DEVELOPER,
  cooldown: 5,
  async execute(player, args) {
    const name = args.join(" ").trim();
    if (!name) return player.variants.sendOnConsoleMessage("`4Usage: /changename <new name>");

    player.displayName = name;
    await PlayerDB.updateById(player.playerId, { display_name: name });
    player.world?.broadcastVariant(Variant.from({ netID: player.netID }, "OnNameChanged", player.formattedName));
    player.variants.sendOnConsoleMessage(`Your display name has been changed to ${player.formattedName}.`);
  },
});

registerCommand({
  name: "online",
  aliases: ["who"],
  description: "Show how many players are online",
  cooldown: 2,
  execute(player) {
    const total = serverManager.getTotalPlayersCount();
    const here = player.world?.players.length ?? 0;
    player.variants.sendOnConsoleMessage(`There are \`w${total}\`\` players online, \`w${here}\`\` in this world.`);
  },
});
