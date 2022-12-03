import { Peer, TankPacket, Variant } from "growsockets";
import { Action } from "../abstracts/Action";
import { BaseServer } from "../structures/BaseServer";
import { World } from "../structures/World";
import { ActionType } from "../types/action";
import { PeerDataType } from "../types/peer";

export default class extends Action {
  constructor() {
    super();
    this.config = {
      eventName: "join_request"
    };
  }

  public async handle(
    base: BaseServer,
    peer: Peer<PeerDataType>,
    action: ActionType<{ name: string }>
  ): Promise<void> {
    const worldName: string = action.name || "";
    if (worldName.length <= 0) {
      peer.send(Variant.from("OnFailedToEnterWorld", 1));
      return peer.send(Variant.from("OnConsoleMessage", "That world name is uhh `9empty``"));
    }
    if (worldName.match(/\W+|_|EXIT/gi)) {
      peer.send(Variant.from("OnFailedToEnterWorld", 1));
      return peer.send(
        Variant.from("OnConsoleMessage", "That world name is too `9special`` to be entered.")
      );
    }

    if (base.cache.worlds.has(worldName)) {
      const world = base.cache.worlds.get(worldName)!;
      const mainDoor = world.data.blocks?.find((block) => 6);

      await world.enter(peer, { x: mainDoor?.x, y: mainDoor?.y });
    } else {
      const world = new World(base, worldName);
      const mainDoor = world.data.blocks?.find((block) => 6);

      await world.enter(peer, { x: mainDoor?.x, y: mainDoor?.y });
    }
  }
}
