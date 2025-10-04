import { BACKPACK_MAX_SLOTS, BACKPACK_MIN_SLOTS, BACKPACK_TIERS } from "../Constants";

export function getBackpackTierIndex(currentSlots: number): number {
  let idx = 0;
  for (let i = 0; i < BACKPACK_TIERS.length; i++) {
    if (BACKPACK_TIERS[i].slots <= currentSlots) idx = i;
  }
  return idx;
}

export function getNextBackpackUpgrade(currentSlots: number): { nextSlots: number; price: number } | null {
  if (currentSlots >= BACKPACK_MAX_SLOTS) return null;
  const currentIndex = getBackpackTierIndex(currentSlots);
  const nextIndex = Math.min(currentIndex + 1, BACKPACK_TIERS.length - 1);
  const next = BACKPACK_TIERS[nextIndex];
  if (!next || next.slots <= currentSlots) return null;
  return { nextSlots: next.slots, price: next.price };
}

export function getBackpackMaxSlots(): number {
  return BACKPACK_MAX_SLOTS;
}

export function formatNumber(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("en-US") : String(n);
}


