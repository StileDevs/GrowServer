import { ClothTypes } from "./enums/ItemTypes.js";

export const WORLD_SIZE = {
  WIDTH: 100,
  HEIGHT: 60
};

export const STRING_CIPHER_KEY = "PBG892FXX982ABC*";
export const Y_START_DIRT = 24;
export const Y_LAVA_START = 50;
export const Y_END_DIRT = 55;

export const Role = {
  DEVELOPER: "1",
  BASIC: "2",
  SUPPORTER: "3"
};

export const CLOTH_MAP: { [key in ClothTypes]: string } = {
  [ClothTypes.ANCES]: "ances",
  [ClothTypes.BACK]: "back",
  [ClothTypes.FACE]: "face",
  [ClothTypes.FEET]: "feet",
  [ClothTypes.HAIR]: "hair",
  [ClothTypes.HAND]: "hand",
  [ClothTypes.MASK]: "mask",
  [ClothTypes.NECKLACE]: "necklace",
  [ClothTypes.PANTS]: "pants",
  [ClothTypes.SHIRT]: "shirt"
};
