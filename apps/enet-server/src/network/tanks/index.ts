import { type Class } from "type-fest";
import { TankTypes } from "../../Constants";
import { TileChangeReq } from "./TileChangeReq";
import { Disconnect } from "./Disconnect";
import { SetIconState } from "./SetIconState";
import { State } from "./State";
import { ItemActiveObjectReq } from "./ItemActiveObjectReq";
import { TileActiveReq } from "./TileActiveReq";
import { ItemActiveReq } from "./ItemActiveReq";
import { AppCheckResponsePack } from "./AppCheckResponsePack";

export const TankMap: Record<
  number,
  Class<{
    execute: () => Promise<void>;
  }>
> = {
  [TankTypes.TILE_CHANGE_REQUEST]:          TileChangeReq,
  [TankTypes.DISCONNECT]:                   Disconnect,
  [TankTypes.SET_ICON_STATE]:               SetIconState,
  [TankTypes.STATE]:                        State,
  [TankTypes.ITEM_ACTIVATE_OBJECT_REQUEST]: ItemActiveObjectReq,
  [TankTypes.ITEM_ACTIVATE_REQUEST]:        ItemActiveReq,
  [TankTypes.TILE_ACTIVATE_REQUEST]:        TileActiveReq,
  [TankTypes.APP_CHECK_RESPONSE]:           AppCheckResponsePack
};
