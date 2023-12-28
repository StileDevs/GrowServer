export enum ClothTypes {
  HAIR,
  SHIRT,
  PANTS,
  FEET,
  FACE,
  HAND,
  BACK,
  MASK,
  NECKLACE,
  ANCES
}

export enum BlockFlags {
  MULTI_FACING = 1 << 0,
  WRENCHABLE = 1 << 1,
  PERMANENT = 1 << 2, // SEEDLESS / NO_SEED
  DROPLESS = 1 << 3, // PERMANENT
  NO_SEED = 1 << 4, // DROPLESS
  NO_SELF = 1 << 5,
  NO_SHADOW = 1 << 6,
  WORLD_LOCK = 1 << 7
}
