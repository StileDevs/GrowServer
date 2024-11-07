import { type NonEmptyObject, type Class } from "type-fest";
import { TankTypes } from "../../Constants.js";
import { TileChangeReq } from "./TileChangeReq.js";

export const TankMap: Record<
  number,
  Class<{
    execute: () => Promise<void>;
  }>
> = {
  [TankTypes.TILE_CHANGE_REQUEST]: TileChangeReq
};
