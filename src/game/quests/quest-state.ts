import { Variant } from "../packets/variants";
import type { Player } from "../player";
import { MALADY_MOD_FORCING, ROLE_LEVELUP_GEMS, ROLE_ORDER, ROLES, roleXpRequirement, type RoleId } from "./constants";

/** Persisted role quest state: xp, level and claimed milestone levels. */
export interface RoleState {
  xp: number;
  lvl: number;
  /** Milestone levels (5, 10, ...) whose reward was already claimed. */
  claimed: number[];
}

/** The whole persisted quest blob stored in `players.quest_data`. */
export interface QuestState {
  v: number;
  /** Day (yyyymmdd) the Crazy Jim delivery was last completed. */
  dd: number;
  /** Per-role xp, level and claimed milestones. */
  roles: Record<RoleId, RoleState>;
  /** Surgery skill 0..100, raises the tool roll chance. */
  surgerySkill: number;
  /** Successful surgeries on real patients. */
  surgeryDone: number;
}

/** Transient state of a patient lying in a hospital bed. */
export interface PatientState {
  /** Whether the player is currently lying in a hospital bed. */
  lying: boolean;
  /** Malady rolled for them, -1 when not assigned yet. */
  malady: number;
  /** Bed tile they are lying in. */
  bedX: number;
  bedY: number;
}

/** Transient surgery session of the surgeon (all vitals live here). */
export interface SurgerySession {
  /** Malady id (0-30) being treated. */
  malady: number;
  /** Database player id of the patient, 0 for robot surgery. */
  patientId: number;
  /** Patient name for messages. */
  patientName: string;
  /** Colored patient name for dialogs. */
  patientDisplay: string;
  /** World the surgery started in. */
  worldName: string;
  /** Diagnosis state. */
  sounded: boolean;
  labworked: boolean;
  fixed: boolean;
  fixable: boolean;
  flu: boolean;
  /** Vitals. */
  pulse: number;
  site: number;
  sleep: number;
  dirt: number;
  broken: number;
  shattered: number;
  incisions: number;
  bleeding: number;
  incneeded: number;
  heart: number;
  temp: number;
  fever: number;
  /** Malady texts. */
  pretext: string;
  fixtext: string;
  postext: string;
  scantext: string;
  surgeryName: string;
  /** Last tool result line, may contain a raw dialog fragment (reference quirk). */
  tooltext: string;
  /** "" while ongoing, "success" when cured, failure text otherwise. */
  endtext: string;
  /** Result of the last skill roll. */
  s: boolean;
  /** Whether antibiotics were applied while the fever was negative. */
  antibs: boolean;
}

function defaultRole(): RoleState {
  return { xp: 0, lvl: 1, claimed: [] };
}

function defaultState(): QuestState {
  const roles = {} as Record<RoleId, RoleState>;
  for (const id of ROLE_ORDER) roles[id] = defaultRole();
  return { v: 1, dd: 0, roles, surgerySkill: 0, surgeryDone: 0 };
}

/** Today as a yyyymmdd integer, the identity of a "daily" quest. */
export function todayNumber(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

/** Whether today is Sunday (reduced malpractice, rarer surgery loot). */
export function isSunday(): boolean {
  return new Date().getDay() === 0;
}

/**
 * Quest state of one player: the persisted blob (daily delivery, role
 * levels, surgery skill). Transient patient and surgery sessions live
 * directly on the Player class.
 */
export class QuestController {
  private state: QuestState = defaultState();

  constructor(private player: Player) {}

  /** Restores the persisted blob; invalid data keeps the defaults. */
  public load(raw: string | null | undefined): void {
    this.state = defaultState();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<QuestState>;
      if (typeof parsed.dd === "number") this.state.dd = parsed.dd;
      if (typeof parsed.surgerySkill === "number") this.state.surgerySkill = Math.min(Math.max(0, Math.floor(parsed.surgerySkill)), 100);
      if (typeof parsed.surgeryDone === "number") this.state.surgeryDone = Math.max(0, Math.floor(parsed.surgeryDone));
      if (parsed.roles && typeof parsed.roles === "object") {
        for (const id of ROLE_ORDER) {
          const role = parsed.roles[id];
          if (!role || typeof role !== "object") continue;
          const current = this.state.roles[id];
          if (typeof role.xp === "number") current.xp = Math.max(0, Math.floor(role.xp));
          if (typeof role.lvl === "number") current.lvl = Math.max(1, Math.floor(role.lvl));
          if (Array.isArray(role.claimed)) current.claimed = role.claimed.filter((level) => Number.isInteger(level) && level > 0);
        }
      }
    } catch {
      // a broken blob only loses the quest progress
    }
  }

  /** The persisted blob, null when everything is still default. */
  public serialize(): string | null {
    const fresh = defaultState();
    if (JSON.stringify(this.state) === JSON.stringify(fresh)) return null;
    return JSON.stringify(this.state);
  }

  /** Day (yyyymmdd) the Crazy Jim delivery was last completed. */
  public get lastDeliveryDay(): number {
    return this.state.dd;
  }

  /** Marks the Crazy Jim delivery as completed today. */
  public markDailyDelivered(): void {
    this.state.dd = todayNumber();
    this.player.scheduleInventorySave();
  }

  /** Surgeon skill 0..100, part of the surgery tool roll. */
  public get surgerySkill(): number {
    return this.state.surgerySkill;
  }

  public set surgerySkill(value: number) {
    this.state.surgerySkill = Math.min(100, Math.max(0, Math.floor(value)));
    this.player.scheduleInventorySave();
  }

  /** Completed surgeries on real patients. */
  public get surgeryDone(): number {
    return this.state.surgeryDone;
  }

  public incrementSurgeryDone(): void {
    this.state.surgeryDone++;
    this.player.scheduleInventorySave();
  }

  /** Role state of one role. */
  public role(id: RoleId): RoleState {
    return this.state.roles[id];
  }

  /**
   * Grants role xp and handles level ups: +500 gems, a talk bubble, a
   * console line and the level-up particle, like the reference servers.
   */
  public addRoleXp(id: RoleId, amount: number): void {
    if (amount <= 0) return;
    const role = this.state.roles[id];
    role.xp += amount;

    let required = roleXpRequirement(role.lvl, id);
    while (role.xp >= required && role.lvl < 10) {
      role.xp -= required;
      role.lvl++;
      required = roleXpRequirement(role.lvl, id);
      this.announceRoleLevel(id);
    }
    this.player.scheduleInventorySave();
  }

  /** Marks a milestone level as claimed. */
  public claimMilestone(id: RoleId, level: number): void {
    const role = this.state.roles[id];
    if (!role.claimed.includes(level)) role.claimed.push(level);
    this.player.scheduleInventorySave();
  }

  /** Malady play mods force the malady of the next surgery (v8 form_state). */
  public forcedMalady(mods: Iterable<string>): number {
    for (const mod of mods) {
      const forced = MALADY_MOD_FORCING[mod];
      if (forced !== undefined) return forced;
    }
    return -1;
  }

  private announceRoleLevel(id: RoleId): void {
    const def = ROLES[id];
    const level = this.state.roles[id].lvl;
    const message = `${this.player.formattedName} ${def.name} is now level ${level}!`;
    const world = this.player.world;
    if (world) {
      world.broadcastVariant(Variant.from("OnParticleEffect", 46, [this.player.state.x + 10, this.player.state.y + 16]));
      world.broadcastVariant(Variant.from("OnTalkBubble", this.player.netID, message, 0, 0));
      world.broadcastVariant(Variant.from("OnConsoleMessage", message));
    } else {
      this.player.variants.sendOnConsoleMessage(message);
    }
    this.player.addGems(ROLE_LEVELUP_GEMS);
  }
}
