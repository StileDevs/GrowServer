import {
  SURGERY_LOOT_BASE, SURGERY_LOOT_COUNT_5, SURGERY_LOOT_COUNT_10,
  SURGERY_LOOT_JACKPOT, SURGERY_LOOT_RARE_ADD, SURGERY_LOOT_RARE_REPLACE,
  SURGERY_LOOT_SUNDAY, SURGERY_LOOT_VACCINE_MALADIES,
  SURGERY_LOOT_MALADY_EXTRA, SURGERY_LOOT_MALADY_EXTRA2,
} from "../quests/constants";

/** Rolls surgery prizes from the configured tables, including disease and Sunday bonuses. */
export function rollSurgeryPrizes(malady: number, sunday: boolean, random = Math.random): { id: number; amount: number }[] {
  const pick = (table: readonly number[]): number => table[Math.floor(random() * table.length)]!;
  const base = [...SURGERY_LOOT_BASE];
  if (SURGERY_LOOT_VACCINE_MALADIES.has(malady)) base.push(8534);
  let prize = pick(base);
  if (sunday && random() < 1 / 250) prize = pick(SURGERY_LOOT_SUNDAY);
  if (random() < 1 / 450) prize = pick(SURGERY_LOOT_RARE_REPLACE);
  if (random() < 1 / 5000) prize = pick(SURGERY_LOOT_JACKPOT);
  const ids = [prize];
  if (random() < 1 / 200) ids.push(pick(SURGERY_LOOT_RARE_ADD));
  const extra = SURGERY_LOOT_MALADY_EXTRA[malady];
  if (extra !== undefined && random() < 0.5) ids.push(extra);
  const extra2 = SURGERY_LOOT_MALADY_EXTRA2[malady];
  if (extra2 && random() < 1 / (malady === 28 ? 10 : 3)) ids.push(pick(extra2));
  return ids.map((id) => ({
    id, amount: SURGERY_LOOT_COUNT_10.has(id) ? 10 : SURGERY_LOOT_COUNT_5.has(id) ? 5 : 1,
  }));
}
