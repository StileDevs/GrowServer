import { TankPacket, Variant } from "growsockets";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { World } from "../structures/World";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { ActionTypes } from "../utils/enums/Tiles";

export function handleWrench(base: BaseServer, tank: TankPacket, peer: Peer, world: World) {
  const tankData = tank.data!;
  const pos = tankData.xPunch! + tankData.yPunch! * world.data.width!;
  const block = world.data.blocks![pos];
  const itemMeta = base.items.metadata.items[block.fg || block.bg!];

  switch (itemMeta.type) {
    case ActionTypes.SIGN: {
      const dialog = new DialogBuilder()
        .defaultColor()
        .addLabelWithIcon(`\`wEdit ${itemMeta.name}\`\``, itemMeta.id!, "big")
        .addTextBox("What would you like to write on this sign?")
        .addInputBox("label", "", block.sign?.label, 100)
        .embed("tilex", block.x)
        .embed("tiley", block.y)
        .embed("itemID", itemMeta.id)
        .endDialog("sign_edit", "Cancel", "OK")
        .str();

      peer.send(Variant.from("OnDialogRequest", dialog));
    }

    case ActionTypes.PORTAL:
    case ActionTypes.DOOR: {
      const dialog = new DialogBuilder()
        .defaultColor()
        .addLabelWithIcon(`\`wEdit ${itemMeta.name}\`\``, itemMeta.id!, "big")
        .addInputBox("label", "Label", block.door?.label, 100)
        .addInputBox("target", "Destination", block.door?.destination, 24)
        .addSmallText("Enter a Destination in this format: `2WORLDNAME:ID``")
        .addSmallText(
          "Leave `2WORLDNAME`` blank (:ID) to go to the door with `2ID`` in the `2Current World``."
        )
        .addInputBox("id", "ID", block.door?.id, 11)
        .addSmallText("Set a unique `2ID`` to target this door as a Destination from another!")
        .embed("tilex", block.x)
        .embed("tiley", block.y)
        .embed("itemID", itemMeta.id)
        .endDialog("door_edit", "Cancel", "OK")
        .str();

      peer.send(Variant.from("OnDialogRequest", dialog));
    }
  }
}
