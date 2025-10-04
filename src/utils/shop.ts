export interface ShopItemLike {
  name?: string;
  title?: string;
  description?: string;
  dialogCmd?: string | null;
}

export function isBackpackUpgradeItem(item: ShopItemLike | undefined | null): boolean {
  if (!item) return false;
  const n = (item.name ?? "").toLowerCase();
  const t = (item.title ?? "").toLowerCase();
  const d = (item.description ?? "").toLowerCase();
  const c = (item.dialogCmd ?? "").toLowerCase();
  const hasBackpack = (s: string) => s.includes("backpack");
  const hasUpgrade = (s: string) => s.includes("upgrade") || s.includes("slots");
  return (
    (hasBackpack(n) && hasUpgrade(n)) ||
    (hasBackpack(t) && hasUpgrade(t)) ||
    (hasBackpack(d) && hasUpgrade(d)) ||
    (hasBackpack(c) && hasUpgrade(c)) ||
    c === "backpack_upgrade"
  );
}


