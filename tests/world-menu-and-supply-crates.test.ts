import { describe, expect, test } from "bun:test";
import { buildWorldSelectMarkup } from "../src/game/world/world-select";
import { getSupplyCrateManifest, isSupplyCrate } from "../src/game/item/supply-crates";

describe("world selection and home world", () => {
  test("randomizes recommendations before limiting them and excludes duplicate or jammed worlds", () => {
    const candidates = Array.from({ length: 20 }, (_, i) => ({ name: `WORLD${i}`, players: 0 }));
    candidates.push({ name: "WORLD0", players: 0 });
    const source = [...candidates, { name: "HIDDEN", players: 0, signalJammed: true }];
    const first = buildWorldSelectMarkup(source, { random: () => 0 });
    const second = buildWorldSelectMarkup(source, { random: () => 0.999 });
    expect(first).not.toBe(second);
    expect(first).not.toContain("HIDDEN");
    const names = [...first.matchAll(/add_floater\|([^|]+)\|/g)].map((match) => match[1]);
    expect(names).toHaveLength(12);
    expect(new Set(names).size).toBe(12);
    expect(source[0]!.name).toBe("WORLD0");
  });

  const worlds = [
    { name: "HOME123", players: 1, ownerPlayerId: 9 },
    { name: "TRADE", players: 10, ownerPlayerId: 2 },
    { name: "PARK", players: 0 },
    { name: "SECRET", players: 3, signalJammed: true },
    { name: "BAD|INJECT", players: 12 },
  ];

  test("lists a player's home world without requiring it to be loaded", () => {
    const menu = buildWorldSelectMarkup(worlds, { homeWorld: "NOTLOADED", playerId: 9 });
    expect(menu).toContain("add_heading|Home World|");
    expect(menu).toContain("add_floater|NOTLOADED|0|");
    expect(menu).toContain("add_heading|My Worlds|");
    expect(menu).toContain("add_floater|HOME123|1|");
    expect(menu).not.toContain("BAD|INJECT");
  });

  test("does not show jammed worlds or invent populated recommendation names", () => {
    const menu = buildWorldSelectMarkup(worlds, { recentWorlds: ["SECRET", "PARK", "TRADE"] });
    expect(menu).not.toContain("add_floater|SECRET|");
    expect(menu).toContain("add_heading|Recommended Worlds|");
    expect(menu).toContain("add_floater|START|0|");
    expect(menu).not.toContain("START1");
  });

  test("keeps recently visited worlds even when they also appear in Top Worlds", () => {
    const menu = buildWorldSelectMarkup(worlds, { recentWorlds: ["TRADE", "TRADE", "PARK"] });
    const recent = menu.split("add_heading|Recently Visited Worlds<CR>|")[1];
    expect(recent).toBeDefined();
    expect(recent).toContain("add_floater|TRADE|10|");
    expect(recent?.match(/add_floater\|TRADE\|/g)).toHaveLength(1);
  });

  test("has a safe starter world fallback", () => {
    const menu = buildWorldSelectMarkup([]);
    expect(menu).toContain("add_heading|Recommended Worlds|");
    expect(menu).toContain("add_floater|START|0|");
  });
});

describe("role supply crates", () => {
  const expected: Record<number, { entries: number; totalItems: number }> = {
    10834: { entries: 12, totalItems: 24 }, // Startopia
    10836: { entries: 14, totalItems: 66 }, // Surgery (13 tools x 5 + Surg-E)
    10838: { entries: 6, totalItems: 58 },  // Fishing
    10840: { entries: 23, totalItems: 23 }, // Cooking
    10842: { entries: 21, totalItems: 21 }, // Superhero
  };
  test("includes every item at the correct post-2022 count", () => {
    for (const [id, expectedDrop] of Object.entries(expected)) {
      const manifest = getSupplyCrateManifest(Number(id));
      expect(isSupplyCrate(Number(id))).toBe(true);
      expect(manifest).toHaveLength(expectedDrop.entries);
      expect(manifest.reduce((sum, [, amount]) => sum + amount, 0)).toBe(expectedDrop.totalItems);
    }
  });

  test("supports Voucher Dayz variants with the same contents", () => {
    for (const [alias, base] of [[10884, 10836], [10916, 10834], [10918, 10840], [10920, 10842]]) {
      expect(isSupplyCrate(alias)).toBe(true);
      expect(getSupplyCrateManifest(alias)).toEqual(getSupplyCrateManifest(base));
    }
  });

  test("does not interpret unrelated block IDs as crates", () => {
    expect(isSupplyCrate(10835)).toBe(false);
    expect(isSupplyCrate(10841)).toBe(false);
    expect(getSupplyCrateManifest(0)).toEqual([]);
  });
});
