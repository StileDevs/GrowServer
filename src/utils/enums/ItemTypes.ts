export enum ClothTypes {
  HAIR = 0,
  SHIRT = 1,
  PANTS = 2,
  FEET = 3,
  FACE = 4,
  HAND = 5,
  BACK = 6,
  MASK = 7,
  NECKLACE = 8,
  ANCES = 9
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
export enum RiftCapeFlags {
  CAPE_COLLAR_0 = 1 << 0,
  CAPE_COLLAR_1 = 1 << 1,
  CLOSED_CAPE_0 = 1 << 2,
  CLOSED_CAPE_1 = 1 << 3,
  OPEN_ON_MOVE_0 = 1 << 4,
  OPEN_ON_MOVE_1 = 1 << 5,
  AURA_0 = 1 << 6,
  AURA_1 = 1 << 7,
  AURA_1ST_0 = 1 << 8,
  AURA_1ST_1 = 1 << 10,
  AURA_2ND_0 = 1 << 9,
  AURA_2ND_1 = 1 << 11,
  AURA_3RD_0 = 768,
  AURA_3RD_1 = 3072,
  TIME_CHANGE = 1 << 12
}

export enum RiftWingsFlags {
  OPEN_WING_0 = 1 << 0,
  OPEN_WING_1 = 1 << 1,
  CLOSED_WING_0 = 1 << 2,
  CLOSED_WING_1 = 1 << 3,
  TRAIL_ON_0 = 1 << 4,
  TRAIL_ON_1 = 1 << 5,
  STAMP_PARTICLE_0 = 1 << 6,
  STAMP_PARTICLE_1 = 1 << 7,
  TRAIL_1ST_0 = 1 << 8,
  TRAIL_1ST_1 = 1 << 10,
  TRAIL_2ND_0 = 1 << 9,
  TRAIL_2ND_1 = 1 << 11,
  TRAIL_3RD_0 = 768,
  TRAIL_3RD_1 = 3072,
  TIME_CHANGE = 1 << 16
}
