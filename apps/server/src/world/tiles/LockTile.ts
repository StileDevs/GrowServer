import { Variant } from "growtopia.js";
import {
  ActionTypes,
  BlockFlags,
  LockPermission,
  LOCKS,
  ROLE,
  TileExtraTypes,
  TileFlags,
} from "@growserver/const";
import type { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import type { World } from "../../core/World";
import type { TileData } from "@growserver/types";
import { Floodfill } from "../FloodFill";
import { ExtendBuffer, DialogBuilder } from "@growserver/utils";
import { Tile } from "../Tile";
import { ItemDefinition } from "grow-items";

export class LockTile extends Tile {
  public extraType = TileExtraTypes.LOCK;

  constructor(
    public base: Base,
    public world: World,
    public data: TileData,
  ) {
    super(base, world, data);
  }

  public async onPlaceForeground(
    peer: Peer,
    itemMeta: ItemDefinition,
  ): Promise<boolean> {
    if (
      await this.world.hasTilePermission(
        peer.data.userID,
        this.data,
        LockPermission.BUILD,
      )
    ) {
      const worldOwnerUID = this.world.getOwnerUID();
      const areaLocker = LOCKS.find((l) => l.id === itemMeta.id);

      if (worldOwnerUID) {
        if (
          worldOwnerUID != peer.data.userID &&
          peer.data.role != ROLE.DEVELOPER
        ) {
          await this.notifyNoLocksAllowed(peer);
          return false;
        } else if (!areaLocker) {
          this.notifyOnlyOneWorldLock(peer);
          return false;
        }
      } else if (this.data.lockedBy) {
        const owningLock =
          this.world.data.blocks[
            this.data.lockedBy.parentY * this.world.data.width +
              this.data.lockedBy.parentX
          ];
        if (owningLock.lock?.ownerUserID != peer.data.userID) {
          await this.notifyNoLocksAllowed(peer);
          return false;
        }
      }

      if (this.data.x == 0 && this.data.y == 0) {
        peer.sendTextBubble(
          "You can't use a lock here. Don't ask why. [JOURNEYS.]",
          false,
        );
        return false;
      }

      const othersAreaLock = this.world.data.blocks.find((v) => {
        return v.lock && v.lock.ownerUserID != peer.data.userID;
      });

      // if there is other people "Area Locker" ex: Small lock, Big lock, etc
      if (othersAreaLock && !areaLocker) {
        peer.sendTextBubble(
          "Your `$World Lock`` can't be placed in this world unless everyone else's locks are removed.",
          false,
        );
        return false;
      }

      await super.onPlaceForeground(peer, itemMeta);
      this.data.flags |= TileFlags.TILEEXTRA;

      if (areaLocker) {
        this.handleAreaLock(peer, areaLocker);
      } else {
        // the lock that is being placed is a world lock
        await this.handleWorldLock(peer);
      }

      this.world.every((p) =>
        p.sendOnPlayPositioned("audio/use_lock.wav", {
          netID: peer.data.netID,
        }),
      );

      return true;
    } else {
      await this.onPlaceFail(peer);
    }

    return false;
  }

  public async onDestroy(peer: Peer): Promise<void> {
    await super.onDestroy(peer);

    if (this.data.worldLockData) {
      this.notifyWorldLockRemove();

      this.world.data.worldLockIndex = undefined;
      this.data.worldLockData = undefined;
    } else {
      for (const ownedTile of this.data.lock!.ownedTiles!) {
        this.world.data.blocks[ownedTile].lockedBy = undefined;
      }
    }

    this.data.lock = undefined;
  }

  public async onWrench(peer: Peer): Promise<boolean> {
    const itemMeta = this.base.items.metadata.items.get(
      this.data.fg.toString(),
    )!;
    // the one being wrenched is the lock itself.
    if (!(await super.onWrench(peer))) {
      if (this.data.lock?.adminIDs?.includes(peer.data.userID)) {
        const dialog = new DialogBuilder();
        const worldOwnerData = await this.base.database.players.getByUID(
          this.data.lock.ownerUserID,
        );

        dialog
          .defaultColor("`o")
          .addLabelWithIcon(
            `\`wEdit ${itemMeta.name}\`\``,
            itemMeta.id as number,
            "big",
          )
          .embed("tilex", this.data.x)
          .embed("tiley", this.data.y)
          .addLabel(
            `This lock is owned by ${worldOwnerData?.display_name}, but I have access on it.`,
          )
          .endDialog("revoke_lock_access", "Cancel", "Remove My Access");

        peer.send(Variant.from("OnDialogRequest", dialog.str()));

        return true;
      }
      peer.sendTextBubble("I'm `4unable`` to pick the lock.", true);
      return false;
    }

    const dialog = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon(
        `\`wEdit ${itemMeta.name}\`\``,
        itemMeta.id as number,
        "big",
      )
      .embed("tilex", this.data.x)
      .embed("tiley", this.data.y)
      .addLabel("Access list:")
      .addSpacer("small");

    const accessList = this.data.lock?.adminIDs;

    if (accessList && accessList.length > 0) {
      for (const admin of accessList) {
        const adminInfo = await this.base.database.players.getByUID(admin);
        dialog.addCheckbox(`access_${admin}`, adminInfo!.name, "selected");
      }
    } else {
      dialog.addTextBox("Currently, you're the only one with access.");
    }

    dialog
      .addPlayerPicker("playerNetID", "`wAdd``")
      .addCheckbox(
        "allow_break_build",
        "Allow anyone to Build and Break",
        this.data.flags & TileFlags.PUBLIC ? "selected" : "not_selected",
      );
    if (!this.data.worldLockData) {
      dialog
        .addCheckbox(
          "ignore_empty",
          "Ignore empty air",
          this.data.lock?.ignoreEmptyAir ? "selected" : "not_selected",
        )
        .addButton("reapply_lock", "`wRe-apply lock``");

      // builder lock
      if (itemMeta.id === 4994) {
        dialog
          .addSmallText(
            'This lock allows Building or Breaking.<CR>(ONLY if "Allow anyone to Build or Break" is checked above)!',
          )
          .addSpacer("small")
          .addSmallText("Leaving this box unchecked only allows Breaking.")
          .addCheckbox(
            "build_only",
            "Only Allow Building!",
            this.data.lock && this.data.lock.permission & LockPermission.BUILD
              ? "selected"
              : "not_selected",
          )
          .addSmallText(
            "People with lock access can both build and break unless you check below. The lock owner can always build and break.",
          )
          .addCheckbox(
            "limit_admin",
            "Admins Are Limited",
            this.data.lock?.adminLimited ? "selected" : "not_selected",
          );
      }
    } else {
      dialog.addCheckbox(
        "disable_music",
        "Disable Custom Music Blocks (NOT IMPLEMENTED)",
        this.data.worldLockData.customMusicBlocksDisabled
          ? "selected"
          : "not_selected",
      );
      if (!this.data.worldLockData.customMusicBlocksDisabled) {
        dialog.addInputBox(
          "tempo",
          "Music BPM (NOT IMPLEMENTED)",
          this.data.worldLockData.bpm,
          3,
        );
      }
      dialog
        .addCheckbox(
          "invisible_music",
          "Make Custom Music Block Invisible (NOT IMPLEMENTED)",
          this.data.worldLockData.invisMusicBlocks
            ? "selected"
            : "not_selected",
        )
        .addCheckbox(
          "home_world",
          "Set as Home World (NOT IMPLEMENTED)",
          "not_selected",
        )
        .addInputBox(
          "minimum_level",
          "World Level: (NOT IMPLEMENTED)",
          this.data.worldLockData.minLevel,
        )
        .addSmallText("Set minimum world entry level")
        .addButton("session_length", "Set World Timer (NOT IMPLEMENTED)")
        .addButton("set_category", `Category: None (NOT IMPLEMENTED)`);
    }

    dialog.endDialog("area_lock_edit", "Cancel", "OK");

    peer.send(Variant.from("OnDialogRequest", dialog.str()));

    return true;
  }

  public async onPunchFail(peer: Peer): Promise<void> {
    await super.onPunchFail(peer);

    const itemMeta = this.base.items.metadata.items.get(
      this.data.fg.toString(),
    )!;
    const ownerData = await this.base.database.players.getByUID(
      this.data.lock!.ownerUserID,
    );

    let accessStatus = "`4No Access``";
    if (this.data.lock!.adminIDs?.includes(peer.data.userID)) {
      accessStatus = "Access Granted";

      if (this.data.worldLockData) accessStatus = "`2Access Granted``";
    } else if (this.data.flags & TileFlags.PUBLIC) {
      accessStatus = "Open To Public";
    }

    peer.sendTextBubble(
      `${ownerData?.display_name}'s \`o${itemMeta.name}\`\`. (${accessStatus})`,
      true,
    );
  }

  public async serialize(dataBuffer: ExtendBuffer): Promise<void> {
    await super.serialize(dataBuffer);

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

  private handleAreaLock(
    peer: Peer,
    lockData: {
      id: number;
      maxTiles: number;
      defaultPermission: LockPermission;
    },
  ) {
    const algo = new Floodfill({
      s_node:     { x: this.data.x, y: this.data.y },
      max:        lockData.maxTiles,
      width:      this.world.data.width,
      height:     this.world.data.height,
      blocks:     this.world.data.blocks,
      s_block:    this.data,
      base:       this.base,
      noEmptyAir: false,
    });

    algo.exec();
    algo.apply(this.world, peer);
    peer.sendTextBubble("Area Locked.", true);
  }

  private async handleWorldLock(peer: Peer) {
    // i think ownerName should store the growid instead of the formatted name.
    const playerData = await this.base.database.players.getByUID(
      peer.data.userID,
    );

    this.data.lock = {
      ownerUserID:    peer.data.userID,
      permission:     LockPermission.NONE,
      adminIDs:       [],
      adminLimited:   false,
      ignoreEmptyAir: false,
      ownedTiles:     [],
    };

    this.data.worldLockData = {
      bpm:                       100,
      customMusicBlocksDisabled: false,
      invisMusicBlocks:          false,
      minLevel:                  1,
    };

    this.world.data.worldLockIndex =
      this.data.y * this.world.data.width + this.data.x;

    // performance reason.
    this.world.every((p) => {
      p.send(
        Variant.from(
          "OnTalkBubble",
          peer.data.netID,
          `\`5[\`w${this.world.worldName} \`ohas been \`$World Locked\`\` by ${playerData?.display_name}\`5]`,
        ),
        Variant.from(
          "OnConsoleMessage",
          `\`5[\`w${this.world.worldName} has been \`$World Locked\`\` by ${playerData?.display_name}\`5]`,
        ),
        Variant.from(
          { netID: peer.data?.netID },
          "OnPlayPositioned",
          "audio/use_lock.wav",
        ),
      );
      this.tileUpdate(peer);
    });
  }

  private notifyWorldLockRemove() {
    this.world.every((p) => {
      p.sendConsoleMessage(
        `\`5[\`\`\`w${this.world.data.name}\`\` has had its \`$World Lock\`\` removed!\`5]\`\``,
      );
    });
  }

  private notifyOnlyOneWorldLock(peer: Peer) {
    peer.sendTextBubble(
      "Only one `$World Lock`` can be placed in a world, you'd have to remove the other one first.",
      false,
    );
  }

  private async notifyNoLocksAllowed(peer: Peer) {
    if (!(this.world.getOwnerUID() || this.data.lockedBy)) return;

    const ownerUserID =
      this.world.getOwnerUID() ??
      this.world.data.blocks[
        this.data.lockedBy!.parentY * this.world.data.width +
          this.data.lockedBy!.parentX
      ].lock!.ownerUserID;

    const ownerName = await this.base.database.players.getByUID(ownerUserID);

    peer.sendTextBubble(
      `\`w${ownerName?.display_name}\`\` allows public building here, but no locks.`,
      false,
    );
    this.sendLockSound(peer);
  }
}
