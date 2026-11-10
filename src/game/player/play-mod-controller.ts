import { Collection } from "../../utils/collection";
import type { Player } from "./index";
import { BASE_STATS, computeStats, formatDuration, PLAY_MODS, WEARABLE_MODS, type ActivePlayMod, type CharacterStats, type PlayModDef } from "./play-mods";

/**
 * The play mods applied to one player: wearable mods follow the worn
 * clothes, timed mods come from consumables and expire on their own. The
 * combined `stats` feed SET_CHARACTER_STATE and the skin tint.
 */
export class PlayModController {
  /** Active mods keyed by mod id. */
  public active: Collection<string, ActivePlayMod> = new Collection();
  public stats: CharacterStats = { ...BASE_STATS };

  constructor(private player: Player) {}

  public has(id: string): boolean {
    return this.active.has(id);
  }

  /** Mods as shown in the profile: definition plus seconds left (0 = permanent). */
  public list(): Array<{ def: PlayModDef; secondsLeft: number }> {
    const now = Date.now();
    const result: Array<{ def: PlayModDef; secondsLeft: number }> = [];
    for (const entry of this.active.values()) {
      const def = PLAY_MODS.get(entry.id);
      if (!def) continue;
      result.push({ def, secondsLeft: entry.expiresAt ? Math.max(0, Math.ceil((entry.expiresAt - now) / 1000)) : 0 });
    }
    return result;
  }

  /**
   * Adds a mod (or restarts its timer) and tells the player, like the real
   * game: "`oName (`$message `omod added, `$1h 2m `oleft)".
   */
  public add(id: string, durationSeconds?: number): boolean {
    const def = PLAY_MODS.get(id);
    if (!def) return false;

    let duration = durationSeconds ?? def.duration;
    if (duration > 0 && def.name.startsWith("Food:") && id !== "gluttons_gazpacho" && this.has("gluttons_gazpacho")) {
      duration = Math.round(duration * 1.3);
    }
    const expiresAt = duration > 0 ? Date.now() + duration * 1000 : 0;
    const existed = this.active.has(id);
    this.active.set(id, { id, expiresAt });

    if (!existed && def.addMessage) {
      const left = duration > 0 ? `, \`$${formatDuration(duration)} \`oleft` : "";
      this.player.variants.sendOnConsoleMessage(`\`o${def.name} (\`$${def.addMessage} \`omod added${left})`);
      if (def.sound) this.player.sendSfx(def.sound);
    }

    this.refresh();
    return true;
  }

  public remove(id: string): boolean {
    const def = PLAY_MODS.get(id);
    if (!this.active.delete(id)) return false;
    if (def?.removeMessage) this.player.variants.sendOnConsoleMessage(`\`o${def.name} (\`$${def.removeMessage} \`omod removed)`);
    this.refresh();
    return true;
  }

  /**
   * Makes the wearable mods match the worn clothes.
   * @param announce whether add/remove messages are sent (not on login).
   */
  public syncWearables(announce: boolean): void {
    const wanted = new Set<string>();
    for (const itemId of Object.values(this.player.inventory.clothes)) {
      if (!itemId) continue;
      const def = WEARABLE_MODS.get(itemId);
      if (def) wanted.add(def.id);
    }

    let changed = false;
    for (const entry of [...this.active.values()]) {
      const def = PLAY_MODS.get(entry.id);
      if (!def || entry.expiresAt !== 0 || def.items.length === 0 || wanted.has(entry.id)) continue;
      if (announce) this.remove(entry.id);
      else this.active.delete(entry.id);
      changed = true;
    }
    for (const id of wanted) {
      if (this.active.has(id)) continue;
      if (announce) this.add(id);
      else this.active.set(id, { id, expiresAt: 0 });
      changed = true;
    }

    if (changed || !announce) this.refresh();
  }

  /** Drops expired mods; called every second by the game loop. */
  public tick(): void {
    const now = Date.now();
    for (const entry of [...this.active.values()]) {
      if (entry.expiresAt && entry.expiresAt <= now) this.remove(entry.id);
    }
  }

  /** Recomputes the stats and sends them (with the skin tint) to the world. */
  public refresh(): void {
    const before = this.stats;
    this.stats = computeStats(this.active.values());
    if (this.player.netID === 0) return;

    this.player.sendCharacterState();
    if (before.skinTint?.join() !== this.stats.skinTint?.join()) this.player.sendClothesToWorld();
  }

  /** The timed mods as stored in the database. */
  public serialize(): string | null {
    const timed = [...this.active.values()].filter((entry) => entry.expiresAt > 0);
    return timed.length > 0 ? JSON.stringify(timed) : null;
  }

  /** Restores the timed mods saved by `serialize()`, dropping expired ones. */
  public load(raw: string | null | undefined): void {
    this.active.clear();
    this.stats = { ...BASE_STATS };
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ActivePlayMod[];
      const now = Date.now();
      for (const entry of parsed) {
        if (typeof entry?.id !== "string" || typeof entry.expiresAt !== "number") continue;
        if (!PLAY_MODS.has(entry.id) || entry.expiresAt <= now) continue;
        this.active.set(entry.id, { id: entry.id, expiresAt: entry.expiresAt });
      }
    } catch {
      // a broken blob only loses the timed mods
    }
    this.stats = computeStats(this.active.values());
  }
}
