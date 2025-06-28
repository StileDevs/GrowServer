import { ItemDefinition, Variant } from "growtopia.js";
import { ActionTypes, BlockFlags, LockPermission, LOCKS, TileExtraTypes, TileFlags } from "../../Constants";
import type { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import type { World } from "../../core/World";
import type { TileData } from "../../types";
import { ExtendBuffer } from "../../utils/ExtendBuffer";
import { Tile } from "../Tile";
import { Floodfill } from "../../utils/FloodFill";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";

export class LockTile extends Tile {
  public extraType = TileExtraTypes.LOCK;

  constructor(
    public base: Base,
    public world: World,
    public data: TileData
  ) {
    super(base, world, data);
  }

  public async onPlaceForeground(peer: Peer, itemMeta: ItemDefinition): Promise<void> {
    if (this.world.hasTilePermission(peer.data.userID, this.data, LockPermission.BUILD)) {
      if (this.world.data.owner && this.world.data.owner.id != peer.data.userID) {
        this.notifyNoLocksAllowed(peer);
        return;
      }
      else if (this.data.lock) {
        const owningLock = this.world.data.blocks[this.data.lock.ownerY! * this.world.data.width + this.data.lock.ownerX!];
        if (owningLock.lock?.ownerUserID != peer.data.userID) {
          this.notifyNoLocksAllowed(peer);
          return;
        }
      }
      else if (this.world.data.owner) {
        this.notifyOnlyOneWorldLock(peer);
        return;
      }

      if (this.data.x == 0 && this.data.y == 0) {
        peer.sendTextBubble("You can't use a lock here. Don't ask why. [JOURNEYS.]", false);
        return;
      }

      super.onPlaceForeground(peer, itemMeta);
      this.data.flags |= TileFlags.TILEEXTRA;

      const areaLocker = LOCKS.find((l) => l.id === itemMeta.id);

      if (areaLocker) {
        this.handleAreaLock(peer, areaLocker);
      }
      else {
        // the lock that is being placed is a world lock
        await this.handleWorldLock(peer);
      }

      this.world.every((p) => p.sendOnPlayPositioned("audio/use_lock.wav", { netID: peer.data.netID }));

      return;
    }
    else {
      this.onPlaceFail(peer);
    }
  }

  public async onDestroy(peer: Peer): Promise<void> {
    const areaLocker = LOCKS.find((l) => l.id === this.data.fg);
    super.onDestroy(peer);

    if (areaLocker) {
      for (const ownedTile of this.data.lock!.ownedTiles!) {
        this.world.data.blocks[ownedTile].lock = undefined;
      }
    }
    else {
      this.notifyWorldLockRemove();
      this.world.data.owner = undefined;
    }

    this.data.lock = undefined;
  }

  public async onWrench(peer: Peer): Promise<void> {
    const itemMeta = this.base.items.metadata.items[this.data.fg];
    // the one being wrenched is the lock itself.
    if (!this.world.hasTilePermission(peer.data.userID, this.data, LockPermission.BUILD)) {
      if (this.data.lock?.adminIDs?.includes(peer.data.userID)) {
        const dialog = new DialogBuilder();

        dialog.defaultColor("`o")
          .addLabelWithIcon(`\`wEdit ${itemMeta.name}\`\``, itemMeta.id as number, "big")
          .embed("tilex", this.data.x)
          .embed("tiley", this.data.y)
          .embed("lockID", this.data.fg)
          .addLabel(`This lock is owned by ${this.data.lock.ownerName}, but I have access on it.`)
          .endDialog("revoke_lock_access", "Cancel", "Remove My Access")

        peer.send(Variant.from("OnDialogRequest", dialog.str()));

        return;
      }
      peer.sendTextBubble("I'm `4unable`` to pick the lock.", true);
      return;
    }

    const areaLocker = LOCKS.find((v) => v.id == this.data.fg);
    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(
        `\`wEdit ${itemMeta.name}\`\``,
        itemMeta.id as number,
        "big"
      )
      .embed("lockID", itemMeta.id)
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .addLabel("Access list:")
      .addSpacer("small");

    const accessList = areaLocker ? this.data.lock?.adminIDs : this.world.data.admins;

    if (accessList && accessList.length > 0) {
      for (const admin of accessList) {
        const adminInfo = await this.base.database.players.getByUID(admin);
        dialog.addCheckbox(`access_${admin}`, adminInfo!.name, "selected");
      }
    }
    else {
      dialog.addTextBox("Currently, you're the only one with access.");
    }

    dialog.addPlayerPicker("playerNetID", "`wAdd``")
      .addCheckbox(
        "allow_break_build",
        "Allow anyone to Build and Break",
        (this.data.flags & TileFlags.PUBLIC) ? "selected" : "not_selected"
      )
    if (areaLocker) {
      dialog.addCheckbox(
        "ignore_empty",
        "Ignore empty air",
        this.data.lock?.ignoreEmptyAir ? "selected" : "not_selected"
      )
        .addButton("reapply_lock", "`wRe-apply lock``");

      // builder lock
      if (itemMeta.id === 4994) {
        dialog
          .addSmallText(
            'This lock allows Building or Breaking.<CR>(ONLY if "Allow anyone to Build or Break" is checked above)!'
          )
          .addSpacer("small")
          .addSmallText("Leaving this box unchecked only allows Breaking.")
          .addCheckbox(
            "build_only",
            "Only Allow Building!",
            (this.data.lock?.permission & LockPermission.BUILD) ? "selected" : "not_selected"
          )
          .addSmallText(
            "People with lock access can both build and break unless you check below. The lock owner can always build and break."
          )
          .addCheckbox(
            "limit_admin",
            "Admins Are Limited",
            this.data.lock?.adminLimited ? "selected" : "not_selected"
          );
      }
    }
    else {
      dialog.addCheckbox("disable_music", "Disable Custom Music Blocks (NOT IMPLEMENTED)", this.world.data.customMusicBlocksDisabled ? "selected" : "not_selected");
      if (!this.world.data.customMusicBlocksDisabled) {
        dialog.addInputBox("tempo", "Music BPM (NOT IMPLEMENTED)", this.world.data.bpm, 3);
      }
      dialog.addCheckbox("invisible_music", "Make Custom Music Block Invisible (NOT IMPLEMENTED)", this.world.data.invisMusicBlocks ? "selected" : "not_selected")
        .addCheckbox("home_world", "Set as Home World (NOT IMPLEMENTED)", "not_selected")
        .addInputBox("minimum_level", "World Level: (NOT IMPLEMENTED)", this.world.data.minLevel)
        .addSmallText("Set minimum world entry level")
        .addButton("session_length", "Set World Timer (NOT IMPLEMENTED)")
        .addButton("set_category", `Category: None (NOT IMPLEMENTED)`)
    }

    dialog.endDialog("area_lock_edit", "Cancel", "OK");

    peer.send(Variant.from("OnDialogRequest", dialog.str()));

  }

  public async onPunchFail(peer: Peer): Promise<void> {
    super.onPunchFail(peer);

    const itemMeta = this.base.items.metadata.items[this.data.fg];
    const areaLocker = LOCKS.find((l) => l.id === itemMeta.id);

    let accessStatus = "`4No Access``";
    if (this.data.lock) {
      if (this.data.lock.adminIDs?.includes(peer.data.userID)) {
        accessStatus = "Access Granted";

        if (!areaLocker) accessStatus = "`2Access Granted``";
      }
      else if (this.data.flags & TileFlags.PUBLIC) {
        accessStatus = "Open To Public";
      }
    }

    peer.sendTextBubble(`${this.data.lock?.ownerName}'s \`o${itemMeta.name}\`\`. (${accessStatus})`, true);
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    super.serialize(dataBuffer);

    dataBuffer.grow(10);
    dataBuffer.writeU8(this.extraType);
    dataBuffer.writeU8(0x0);
    dataBuffer.writeU32(this.data.lock!.ownerUserID!);
    dataBuffer.writeU32(this.data.lock!.adminIDs?.length ?? 0);

    for (const adminId of this.data.lock!.adminIDs ?? []) {
      dataBuffer.grow(4);
      dataBuffer.writeU32(adminId);
    }

    dataBuffer.grow(8);
    return;
  }

  private handleAreaLock(peer: Peer, lockData: {
    id: number;
    maxTiles: number;
    defaultPermission: LockPermission;
  }) {
    const algo = new Floodfill({
      s_node:     { x: this.data.x, y: this.data.y },
      max:        lockData.maxTiles,
      width:      this.world.data.width,
      height:     this.world.data.height,
      blocks:     this.world.data.blocks,
      s_block:    this.data,
      base:       this.base,
      noEmptyAir: false
    });

    algo.exec();
    algo.apply(this.world, peer);
    peer.sendTextBubble("Area Locked.", true);
  }

  private async handleWorldLock(peer: Peer) {
    this.world.data.owner = {
      id:          peer.data.userID,
      name:        peer.data.tankIDName,
      displayName: peer.name
    }

    // i think ownerName should store the growid instead of the formatted name.
    const playerData = await this.base.database.players.getByUID(peer.data.userID);

    this.data.lock = {
      isOwner:     true, // this is the lock itself.
      ownerName:   playerData?.name,
      ownerUserID: peer.data.userID,
      permission:  LockPermission.NONE
    }

    this.world.data.bpm = 100

    // performance reason.
    this.world.every((p) => {
      p.send(
        Variant.from(
          "OnTalkBubble",
          peer.data.netID,
          `\`5[\`w${this.world.worldName} \`ohas been \`$World Locked\`\` by ${peer.name}\`5]`
        ),
        Variant.from(
          "OnConsoleMessage",
          `\`5[\`w${this.world.worldName} has been \`$World Locked\`\` by ${peer.name}\`5]`
        ),
        Variant.from(
          { netID: peer.data?.netID },
          "OnPlayPositioned",
          "audio/use_lock.wav"
        )
      );
    })
    this.tileUpdate(peer);
  }

  private notifyWorldLockRemove() {
    this.world.every((p) => {
      p.sendConsoleMessage(`\`5[\`\`\`w${this.world.data.name}\`\` has had its \`$World Lock\`\` removed!\`5]\`\``);
    })
  }

  private notifyOnlyOneWorldLock(peer: Peer) {
    peer.sendTextBubble("Only one `$World Lock`` can be placed in a world, you'd have to remove the other one first.", false);
  }

  private notifyNoLocksAllowed(peer: Peer) {
    const owningLock = this.world.data.blocks[this.data.lock!.ownerY! * this.world.data.width + this.data.lock!.ownerX!];

    const ownerName = this.world.data.owner?.name ?? owningLock.lock?.ownerName;

    peer.sendTextBubble(`\`w${ownerName}\`\` allows public building here, but no locks.`, false);
    this.sendLockSound(peer);
  }

}
