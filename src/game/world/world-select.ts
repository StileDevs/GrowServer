import { Collection } from "../../utils/collection";

/** One loaded world eligible to appear on the world selection screen. */
export interface WorldMenuEntry {
  name: string;
  players: number;
  signalJammed?: boolean;
  ownerPlayerId?: number | undefined;
}

export interface WorldMenuOptions {
  homeWorld?: string | null;
  playerId?: number | undefined;
  recentWorlds?: readonly string[];
  /** Random source, injectable for deterministic menu tests. */
  random?: () => number;
}

const WORLD_NAME = /^[A-Z0-9]{1,24}$/;

/**
 * Builds the server-owned section of the client's world select UI.
 * Only real currently loaded worlds are recommended; the starter world is
 * the one intentionally navigable fallback when no suggestions are available.
 * Names are validated before embedding into the client's pipe-delimited format.
 */
export function buildWorldSelectMarkup(worlds: readonly WorldMenuEntry[], options: WorldMenuOptions = {}): string {
  const loaded = worlds
    .filter((world) => WORLD_NAME.test(world.name) && !world.signalJammed)
    .sort((a, b) => b.players - a.players || a.name.localeCompare(b.name));
  const byName = new Collection<string, WorldMenuEntry>(loaded.map((world) => [world.name, world]));
  const seen = new Set<string>();
  const lines: string[] = [];

  const addSection = (title: string, names: readonly string[], color: number, allowRepeats = false): void => {
    const inSection = new Set<string>();
    const unique = names.filter((name) => {
      if (!WORLD_NAME.test(name) || inSection.has(name) || (!allowRepeats && seen.has(name))) return false;
      if (worlds.some((world) => world.name === name && world.signalJammed)) return false;
      inSection.add(name);
      return true;
    });
    if (unique.length === 0) return;
    lines.push(`add_heading|${title}|`);
    for (const name of unique) {
      lines.push(`add_floater|${name}|${byName.get(name)?.players ?? 0}|0.5|${color}`);
      if (!allowRepeats) seen.add(name);
    }
  };

  const home = (options.homeWorld ?? "").toUpperCase();
  if (home) addSection("Home World", [home], 0x91d1adff);

  const own = loaded
    .filter((world) => options.playerId && world.ownerPlayerId === options.playerId)
    .map((world) => world.name);
  addSection("My Worlds", own, 0x80d9ffff);

  addSection("Top Worlds", loaded.filter((world) => world.players > 0).slice(0, 6).map((world) => world.name), 0xd25eabff);
  const suggestions = [...new Set(loaded.map((world) => world.name))].filter((name) => !seen.has(name));
  const random = options.random ?? Math.random;
  // Fisher-Yates gives every eligible world the same chance before the limit.
  for (let i = suggestions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [suggestions[i], suggestions[j]] = [suggestions[j]!, suggestions[i]!];
  }
  // START is the stable beginner destination, not an invented populated world.
  addSection("Recommended Worlds", [...new Set([...suggestions, "START"])].slice(0, 12), 0xcbaf8bff);

  const recent = (options.recentWorlds ?? []).map((name) => name.toUpperCase()).reverse().slice(0, 12);
  // Recent history is always shown, even if a world was also listed as Home/Top.
  addSection("Recently Visited Worlds<CR>", recent, 0xcbaaf4ff, true);
  if (lines.length === 0) addSection("Recommended Worlds", ["START"], 0xcbaf8bff);
  return lines.join("\n");
}
