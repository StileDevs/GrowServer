import { Packet, PacketKind, type Peer } from "growtopia.wasm";
import { Variant, VariantHandler, type SpawnOptions } from "../packets/variants";
import { PlayerInventory, CLOTH_MAP, type ClothTypes } from "./inventory";
import { PlayerAuth } from "./auth";
import { ActionsHandler } from "../packets/actions";
import { CHARACTER_STATE, LOGON_MODE, PLAYER_ROLE, WORLD_FEATURE_FLAGS, playerRoleRank } from "../../constants";
import { logger } from "../../utils/logger";
import { PlayerDB } from "../../database/services/player-db";
import type { PlayerRecord } from "../../database/tables";
import { getItem } from "../item/item-utils";
import { getItemInfo } from "../item/item-wiki";
import type { World } from "../world/world";
import { worldManager } from "../world/world-manager";
import { ActionTypes, ITEM_ID } from "../world/constants";
import type { BlockPosition } from "../world/types";
import { PlayModController } from "./play-mod-controller";
import { applyXenonite, tintSkinColor, type CharacterStats } from "./play-mods";
import { QuestController } from "../quests/quest-state";
import type { FishingSession } from "../fishing/fishing-manager";
import type { GeigerSession } from "../geiger/geiger-manager";
import type { ActiveSurgery } from "../surgery/surgery-manager";

export * from "./inventory";

/** Delay between an inventory change and the database write that persists it. */
const INVENTORY_SAVE_DEBOUNCE_MS = 1500;
/** How many recently visited worlds are remembered for the world menu. */
const MAX_RECENT_WORLDS = 6;
/** Highest reachable level. */
export const MAX_LEVEL = 125;
/** Default avatar skin color (the client's default peach tone). */
export const DEFAULT_SKIN_COLOR = 0x8295c3ff;
/** Value the login server writes for new accounts before a skin is chosen. */
const PLACEHOLDER_SKIN_COLOR = 0x80808080;

export interface PlayerStateWorld {
  name: string;
}

export interface PlayerState {
  /** Position in pixels (32 per tile). */
  x: number;
  y: number;
  status: number; // bitwise flags
  isMod: boolean;
  isMuted: boolean;
  /** Facing left (from the last STATE packet). */
  rotatedLeft: boolean;
  /** Ghost mode: immune to death and item pickup. */
  isGhost: boolean;
  /** Character modifiers sent with SET_CHARACTER_STATE. */
  characterState: number;
  world: PlayerStateWorld;
}

export enum PlayerStateFlags {
  LOGIN_REQUEST = 1 << 0,
  ENTERING_GAME = 1 << 1,
  IN_GAME = 1 << 2,
  LOGOUT = 1 << 3,
}

/** Items that can never leave the backpack. */
const PROTECTED_ITEMS: ReadonlySet<number> = new Set([ITEM_ID.FIST, ITEM_ID.WRENCH]);

export class Player {
  /** Global unique player identifier (e.g. "server-17091:0") */
  public id: string;
  /** Database unique player ID (primary key from database) */
  public playerId: number = 0;
  /**
   * Avatar net ID inside the current world, assigned by the world on entry
   * (starting at 1). 0 means the player is not in a world; the client treats
   * 0 as "no avatar", so it must never be used for a spawned player.
   */
  public netID = 0;
  public serverLabel: string;
  public serverPort: number;
  public tankIDName = "";
  public displayName = "";
  public role: PLAYER_ROLE = PLAYER_ROLE.BASIC;
  public gems = 0;
  public level = 1;
  public xp = 0;
  /** Raw 32-bit skin color as sent to the client. */
  public skinColor: number = DEFAULT_SKIN_COLOR;

  public variants: VariantHandler;
  public actions: ActionsHandler;
  public inventory: PlayerInventory = new PlayerInventory();
  public auth: PlayerAuth = new PlayerAuth();

  /** The world the player is in, or null while in the world menu. */
  public world: World | null = null;
  /** Checkpoint to respawn at instead of the main door. */
  public lastCheckpoint: BlockPosition | null = null;
  /** Recently visited world names, oldest first. */
  public lastVisitedWorlds: string[] = [];

  private inventorySaveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Whether `loadFromRecord` ran; only then may this instance write to the database. */
  private recordLoaded = false;

  /** When the account was created (profile "playing since"). */
  public createdAt: Date = new Date();
  /** Seconds online before this session, from the database. */
  private savedPlaytime = 0;
  /** When this session's playtime started counting. */
  private sessionStartedAt = Date.now();
  /** Wearable and timed play mods. */
  public playMods: PlayModController = new PlayModController(this);
  /** Quest state: Crazy Jim delivery, personal points, role levels, surgery skill. */
  public quests: QuestController = new QuestController(this);
  /** Active fishing session, if currently fishing. */
  public fishing: FishingSession | null = null;
  /** Geiger counter radiation tracking state. */
  public geiger: GeigerSession | null = null;
  /** Active surgery session, if performing surgery. */
  public surgery: ActiveSurgery | null = null;
  /** World `/home` warps to, null when the player has not set one. */
  public homeWorld: string | null = null;

  public state: PlayerState = {
    x: 0,
    y: 0,
    status: 0,
    isMod: false,
    isMuted: false,
    rotatedLeft: false,
    isGhost: false,
    characterState: 0,
    world: { name: "" },
  };

  public get currentWorld(): string {
    return this.state.world.name;
  }

  /** Developer or owner: unrestricted building and developer commands. */
  public get isDeveloper(): boolean {
    return playerRoleRank(this.role) >= playerRoleRank(PLAYER_ROLE.DEVELOPER);
  }

  /** Moderator or above. */
  public get isModerator(): boolean {
    return playerRoleRank(this.role) >= playerRoleRank(PLAYER_ROLE.MODERATOR);
  }

  public get isOwner(): boolean {
    return this.role === PLAYER_ROLE.OWNER;
  }

  /** Country shown on the name tag; developers get the "rt" badge. */
  public get country(): string {
    if (this.isDeveloper) return "rt";
    return this.auth.metadata.country || "us";
  }

  constructor(
    public peer: Peer,
    serverLabel: string,
    serverPort: number,
  ) {
    this.serverLabel = serverLabel;
    this.serverPort = serverPort;
    this.id = `${serverLabel}:${peer.id}`;
    this.variants = new VariantHandler(peer);
    this.actions = new ActionsHandler(peer);
  }

  public addStateStatus(flag: PlayerStateFlags): void {
    this.state.status |= flag;
  }

  public removeStateStatus(flag: PlayerStateFlags): void {
    this.state.status &= ~flag;
  }

  public hasStateStatus(flag: PlayerStateFlags): boolean {
    return (this.state.status & flag) !== 0;
  }

  /**
   * Fills the in-memory player from its database record (role, gems, level,
   * inventory). New players get the default fist and wrench.
   */
  public loadFromRecord(record: PlayerRecord): void {
    this.recordLoaded = true;
    this.playerId = record.id;
    this.tankIDName = record.name;
    this.displayName = record.display_name || record.name;
    this.role = (record.role_id ?? PLAYER_ROLE.BASIC) as PLAYER_ROLE;
    this.gems = record.gems ?? 0;
    this.level = record.level || 1;
    this.xp = record.xp ?? 0;
    const storedSkin = (record.skin_color ?? 0) >>> 0;
    // 0 and the registration placeholder mean "never chosen"
    this.skinColor = storedSkin && storedSkin !== PLACEHOLDER_SKIN_COLOR ? storedSkin : DEFAULT_SKIN_COLOR;
    this.createdAt = record.created_at ? new Date(record.created_at.endsWith("Z") || record.created_at.includes("+") ? record.created_at : `${record.created_at.replace(" ", "T")}Z`) : new Date();
    this.savedPlaytime = record.playtime ?? 0;
    this.sessionStartedAt = Date.now();
    this.playMods.load(record.play_mods);
    this.quests.load(record.quest_data);
    this.homeWorld = record.home_world ?? null;

    if (!this.inventory.load(record.inventory)) {
      this.inventory.addItem(ITEM_ID.FIST, 1);
      this.inventory.addItem(ITEM_ID.WRENCH, 1);
    }
    // the tools can never be missing
    if (!this.inventory.hasItem(ITEM_ID.FIST)) this.inventory.addItem(ITEM_ID.FIST, 1);
    if (!this.inventory.hasItem(ITEM_ID.WRENCH)) this.inventory.addItem(ITEM_ID.WRENCH, 1);

    this.playMods.syncWearables(false);
  }

  /** Seconds spent online, including the current session. */
  public get playtime(): number {
    return this.savedPlaytime + Math.floor((Date.now() - this.sessionStartedAt) / 1000);
  }

  /** Days since the account was created. */
  public get accountAgeDays(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / 86_400_000);
  }

  /** The avatar modifiers currently in effect. */
  public get characterStats(): CharacterStats {
    const stats = this.playMods.stats;
    const xenonite = this.world?.xenoniteSettings();
    return xenonite ? applyXenonite(stats, xenonite) : stats;
  }

  /** Skin color as drawn, with the active mods' tint. */
  public get effectiveSkinColor(): number {
    return tintSkinColor(this.skinColor, this.playMods.stats.skinTint);
  }

  /**
   * Name as shown in chat and name tags. Role colors win (owners black,
   * developers orange, moderators purple, supporters blue); below them the
   * world role colors the name green for the world owner and its co-owners.
   */
  public get formattedName(): string {
    switch (this.role) {
      case PLAYER_ROLE.OWNER:
        return `\`b@${this.displayName}\`\``;
      case PLAYER_ROLE.DEVELOPER:
        return `\`8@${this.displayName}\`\``;
      case PLAYER_ROLE.MODERATOR:
        return `\`5@${this.displayName}\`\``;
      case PLAYER_ROLE.SUPPORTER:
        return `\`e${this.displayName}\`\``;
    }

    if (this.isWorldOwner) return `\`2${this.displayName}\`\``;
    if (this.world?.isWorldAdmin(this.playerId)) return `\`2${this.displayName}\`\``;
    return `\`w${this.displayName}\`\``;
  }

  /** Whether this player owns the world lock of the world they are in. */
  public get isWorldOwner(): boolean {
    return this.world !== null && this.world.getOwnerPlayerId() === this.playerId;
  }

  /** OnSpawn parameters for this player. `local` marks the receiving client's own avatar. */
  public spawnOptions(local: boolean): SpawnOptions {
    const options: SpawnOptions = {
      netID: this.netID,
      userID: this.playerId,
      x: this.state.x,
      y: this.state.y,
      displayName: this.formattedName,
      country: this.country,
      invis: this.state.isGhost ? 1 : 0,
      mstate: this.isModerator && !this.isDeveloper ? 1 : 0,
      smstate: this.isDeveloper ? 1 : 0,
    };
    if (local) options.type = "local";
    return options;
  }

  /**
   * Sends OnSendToServer variant packet to redirect player to another server or world.
   * Uses unique database playerId instead of transient peer netID.
   */
  public sendOnSendToServer(address?: string, port?: number, doorID: string = "", logonMode: LOGON_MODE = LOGON_MODE.WELCOME, token?: number): void {
    this.variants.sendOnSendToServer(address, port, this.playerId, doorID, logonMode, this.tankIDName || this.displayName, token);
  }

  /**
   * Send a packet to this player. A peer that already went away throws
   * `NotConnected` inside the ENet binding; that is not an error worth
   * crashing for, so it is swallowed and logged at debug level.
   */
  public send(packet: Packet): void {
    try {
      this.peer.send(packet);
    } catch (err) {
      logger.debug({ err, id: this.id }, "dropped packet for disconnected peer");
    }
  }

  /** Send a raw packet buffer to this player */
  public sendBuffer(buffer: Buffer): void {
    this.send(new Packet(buffer, PacketKind.Reliable));
  }

  /** Disconnect this player */
  public disconnect(data?: number): void {
    this.peer.disconnect(data);
  }

  /** Disconnect this player immediately */
  public disconnectNow(data?: number): void {
    this.peer.disconnectNow(data);
  }

  /** Disconnect this player after queued packets are sent */
  public disconnectLater(data?: number): void {
    this.peer.disconnectLater(data);
  }

  // ---------------------------------------------------------------------------
  // messaging helpers
  // ---------------------------------------------------------------------------

  /**
   * Shows a talk bubble above an avatar (this player's by default).
   * @param stacked When true the bubble replaces the one currently shown.
   */
  public sendTextBubble(message: string, stacked = true, netID = this.netID): void {
    this.variants.sendOnTalkBubble(netID, message, stacked);
  }

  /** Plays a positioned sound at this player's avatar, for this player only. */
  public sendPlayPositioned(file: string): void {
    this.variants.sendOnPlayPositioned(file, this.netID);
  }

  /** Plays a sound effect for this player. */
  public sendSfx(file: string, delayMs = 0): void {
    this.actions.sendPlaySfx(file, delayMs);
  }

  // ---------------------------------------------------------------------------
  // inventory
  // ---------------------------------------------------------------------------

  /** Sends the whole backpack to the client. */
  public sendInventory(): void {
    this.variants.sendInventoryState(this.inventory);
  }

  /**
   * Adds items to the backpack and tells the client.
   * @param notifyClient false when the client already counts the items
   * itself, as it does for a collected drop (ITEM_CHANGE_OBJECT).
   * @returns the amount actually added.
   */
  public addItemInven(itemId: number, amount = 1, notifyClient = true): number {
    const added = this.inventory.addItem(itemId, amount);
    if (added > 0) {
      if (notifyClient) this.variants.sendModifyItemInventory(itemId, added);
      this.scheduleInventorySave();
    }
    return added;
  }

  /**
   * Removes items from the backpack and tells the client. Fist and wrench are never removed.
   * @param notifyClient false when the client already subtracts the items
   * itself, as it does for a block it placed (TILE_CHANGE_REQUEST echo).
   * @returns the amount actually removed.
   */
  public removeItemInven(itemId: number, amount = 1, notifyClient = true): number {
    if (PROTECTED_ITEMS.has(itemId) || itemId <= 0) return 0;
    const wasEquipped = this.inventory.isEquipped(itemId);
    const removed = this.inventory.removeItem(itemId, amount);
    if (removed > 0) {
      if (notifyClient) this.variants.sendModifyItemInventory(itemId, -removed);
      if (wasEquipped && !this.inventory.isEquipped(itemId)) this.onClothesChanged(itemId, false);
      this.scheduleInventorySave();
    }
    return removed;
  }

  /** Persists the inventory soon (debounced). */
  public scheduleInventorySave(): void {
    if (this.inventorySaveTimer) clearTimeout(this.inventorySaveTimer);
    this.inventorySaveTimer = setTimeout(() => {
      this.inventorySaveTimer = null;
      void this.saveToDatabase();
    }, INVENTORY_SAVE_DEBOUNCE_MS);
  }

  /** Writes inventory, gems, level and xp to the database. */
  public async saveToDatabase(): Promise<void> {
    // the login-hop connection knows the player id but never loaded the
    // record; saving it would overwrite the real inventory with an empty one
    if (this.playerId <= 0 || !this.recordLoaded) return;
    if (this.inventorySaveTimer) {
      clearTimeout(this.inventorySaveTimer);
      this.inventorySaveTimer = null;
    }
    try {
      // fold the session so far into the saved total and start counting again
      this.savedPlaytime = this.playtime;
      this.sessionStartedAt = Date.now();
      await PlayerDB.updateById(this.playerId, {
        inventory: this.inventory.toBuffer(),
        gems: this.gems,
        level: this.level,
        xp: this.xp,
        skin_color: this.skinColor,
        playtime: this.savedPlaytime,
        play_mods: this.playMods.serialize(),
        quest_data: this.quests.serialize(),
      });
    } catch (err) {
      logger.error({ err, playerId: this.playerId }, "failed to save player");
    }
  }

  // ---------------------------------------------------------------------------
  // gems & xp
  // ---------------------------------------------------------------------------

  /** Sets the gem balance and updates the client HUD. */
  public setGems(amount: number, skipAnimation = false): void {
    this.gems = Math.max(0, amount);
    this.variants.sendOnSetBux(this.gems, skipAnimation);
    this.scheduleInventorySave();
  }

  public addGems(amount: number): void {
    this.setGems(this.gems + amount);
  }

  /** XP needed to advance from the given level. */
  public static requiredXpForLevel(level: number): number {
    return 50 * (level * level + 2);
  }

  /** Grants experience and handles level ups. */
  public addXp(amount: number): void {
    if (this.level >= MAX_LEVEL) {
      this.xp = 0;
      return;
    }

    let finalAmount = amount;
    if (this.playMods.has("triple_xp") && Math.random() < 0.1) {
      finalAmount *= 3;
    } else if (this.playMods.has("extra_xp") && Math.random() < 0.25) {
      finalAmount *= 2;
    }

    this.xp += finalAmount;
    const required = Player.requiredXpForLevel(this.level);
    if (this.xp >= required) {
      this.level++;
      this.xp = 0;

      const message = `${this.displayName} is now level ${this.level}!`;
      if (this.world) {
        this.world.broadcastVariant(Variant.from("OnParticleEffect", 46, [this.state.x + 10, this.state.y + 16]));
        this.world.broadcastVariant(Variant.from("OnTalkBubble", this.netID, message, 0));
        this.world.broadcastVariant(Variant.from("OnConsoleMessage", message));
      }
      this.sendCountryState();
    }
    this.scheduleInventorySave();
  }

  // ---------------------------------------------------------------------------
  // clothes & character state
  // ---------------------------------------------------------------------------

  /** Toggles a clothing item on or off. */
  public equipClothes(itemId: number): void {
    if (!this.inventory.hasItem(itemId)) return;

    if (this.inventory.isEquipped(itemId)) {
      this.unequipClothes(itemId);
      return;
    }

    // Special item effects on equip (from GTOS world.h:7384)
    if (itemId === 3172 && this.playMods.has("malpractice")) {
      this.sendTextBubble("`2Your briefs have stunned the judge!", true);
      this.removeItemInven(3172, 1, true);
      this.playMods.remove("malpractice");
      this.variants.sendOnConsoleMessage("You've paid your debt to society! (`$Malpractice`` mod removed)");
      this.sendSfx("audio/dialog_confirm.wav");
      if (!this.inventory.hasItem(3172)) return;
    }

    const item = getItem(itemId);
    if (!item) return;

    if (item.type === ActionTypes.ANCES) {
      this.inventory.clothes.ances = itemId;
    } else {
      const slot = CLOTH_MAP[item.bodyPartType as ClothTypes];
      if (!slot) return;
      this.inventory.clothes[slot] = itemId;
    }

    this.onClothesChanged(itemId, true);
  }

  public unequipClothes(itemId: number): void {
    if (this.inventory.unequipById(itemId)) this.onClothesChanged(itemId, false);
  }

  private onClothesChanged(itemId: number, equipped: boolean): void {
    const info = getItemInfo(itemId);
    const message = equipped ? info?.func?.add : info?.func?.rem;
    if (message) this.variants.sendOnConsoleMessage(message);

    this.applyPlayMods();
    this.sendClothesToWorld();
    this.sendSfx("audio/change_clothes.wav");
    this.scheduleInventorySave();
  }

  /** Sends the current clothes to everyone in the world (including this player). */
  public sendClothesToWorld(): void {
    const skin = this.effectiveSkinColor;
    if (this.world) {
      for (const other of this.world.players) {
        other.variants.sendClothes(this.netID, this.inventory.clothes, skin);
        other.variants.sendOnChangeSkin(this.netID, skin);
      }
    } else {
      this.variants.sendClothes(this.netID, this.inventory.clothes, skin);
    }
  }

  /** Sets (or clears) the player's home world and persists it. */
  public setHomeWorld(worldName: string | null = null): void {
    this.homeWorld = worldName;
    if (!this.recordLoaded || this.playerId <= 0) return;

    PlayerDB.updateById(this.playerId, { home_world: worldName }).catch((err) =>
      logger.error({ err, playerId: this.playerId }, "failed to save the player home world"),
    );
  }

  /** Recomputes the play mods granted by the worn clothes and sends the result. */
  public applyPlayMods(): void {
    this.playMods.syncWearables(true);
  }

  /** Sends SET_CHARACTER_STATE for this player to the world. */
  public sendCharacterState(): void {
    const buffer = this.variants.buildCharacterState(this.netID, this.characterStats, this.state.characterState, this.punchId);
    this.sendBuffer(buffer);
    this.world?.broadcast(buffer, this.id);
  }

  /** Punch effect id forced with /pid; null uses the active mods' punch type. */
  public customPunchId: number | null = null;

  /** Punch effect id: forced, or the one of the active mods, 0 for the plain fist. */
  public get punchId(): number {
    return this.customPunchId ?? this.characterStats.punchType;
  }

  /** Sends the country/name-tag state of this player and every player around. */
  public sendCountryState(): void {
    const state = (player: Player) => `${player.country}${player.level >= MAX_LEVEL ? "|maxLevel" : ""}`;

    this.variants.sendOnCountryState(this.netID, state(this));
    if (!this.world) return;
    for (const other of this.world.players) {
      if (other === this) continue;
      other.variants.sendOnCountryState(this.netID, state(this));
      this.variants.sendOnCountryState(other.netID, state(other));
    }
  }

  // ---------------------------------------------------------------------------
  // worlds
  // ---------------------------------------------------------------------------

  /**
   * Moves the player into a world, leaving the current one first.
   */
  public async enterWorld(worldName: string, x?: number, y?: number): Promise<void> {
    const world = await worldManager.get(worldName);

    const denial = world.entryDenial(this);
    if (denial) {
      this.variants.sendOnFailedToEnterWorld();
      this.variants.sendOnConsoleMessage(denial);
      this.sendTextBubble(denial, true);
      return;
    }

    if (this.world && this.world !== world) this.world.leave(this);

    await world.enter(this, x, y);
    this.sendInventory();
    this.sendCountryState();
    this.sendSfx("audio/door_open.wav");
    this.applyPlayMods();
    // the official server re-sends the feature flags once the player is in a world
    this.variants.sendOnSetFeatureEnableFlags(WORLD_FEATURE_FLAGS);

    this.lastVisitedWorlds = this.lastVisitedWorlds.filter((name) => name !== world.name);
    this.lastVisitedWorlds.push(world.name);
    if (this.lastVisitedWorlds.length > MAX_RECENT_WORLDS) this.lastVisitedWorlds.shift();
  }

  /**
   * Leaves the current world and optionally shows the world select menu.
   */
  public leaveWorld(sendMenu = true): void {
    const world = this.world;
    if (!world) return;
    world.leave(this);

    if (sendMenu) {
      this.variants.sendOnRequestWorldSelectMenu(this.lastVisitedWorlds, 500, this.homeWorld, this.playerId);
    }
  }

  /**
   * Kills the avatar and respawns it at the checkpoint, the main door, or the
   * top-left corner when the world has no main door.
   */
  public respawn(): void {
    if (this.state.isGhost || !this.world) return;

    let target: BlockPosition | undefined = this.world.mainDoor;

    if (this.lastCheckpoint) {
      const block = this.world.getTileAt(this.lastCheckpoint.x, this.lastCheckpoint.y);
      const item = block ? getItem(block.fg || block.bg) : undefined;
      if (item?.type === ActionTypes.CHECKPOINT) {
        target = this.lastCheckpoint;
      } else {
        this.lastCheckpoint = null;
        this.variants.sendVariant(Variant.from({ netID: this.netID, delay: 0 }, "SetRespawnPos", 0));
      }
    }

    const x = (target?.x ?? 0) * 32;
    const y = (target?.y ?? 0) * 32;
    this.state.x = x;
    this.state.y = y;

    this.variants.sendOnSetFreezeState(this.netID, true);
    this.variants.sendOnKilled(this.netID);
    this.variants.sendOnSetPos(this.netID, x, y, 2000);
    this.variants.sendOnSetFreezeState(this.netID, false, 2000);
    this.sendSfx("audio/teleport.wav", 2000);
  }

  /** Teleports the avatar within the current world (pixel coordinates). */
  public setPosition(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
    const packet = Variant.from({ netID: this.netID }, "OnSetPos", [x, y]).parse();
    if (this.world) this.world.broadcast(packet);
    else this.sendBuffer(packet);
  }
}
