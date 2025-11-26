import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "@growserver/const";
import { Variant } from "growtopia.js";
import { parseUserTarget } from "@growserver/utils";
import { eq } from "drizzle-orm";
import { players, Players } from "@growserver/db";

export default class GiveRole extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[],
  ) {
    super(base, peer, text, args);
    this.opt = {
      command: ["giverole"],
      description:
        "Change a user's role. Use /username for exact name or #id for user ID.",
      cooldown:   5,
      ratelimit:  1,
      category:   "`oBasic",
      usage:      "/giverole <target> <flag>",
      example:    ["/giverole /testuser1 0", "/giverole #172 2"],
      permission: [ROLE.DEVELOPER],
    };
  }

  public async execute(): Promise<void> {
    if (this.args.length < 2) {
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`4Usage: /giverole <target> <flag>`o\n" +
            "Target can be:\n" +
            "  `/username` - Find user by exact username\n" +
            "  `#id` - Find user by user ID\n" +
            "Flags:\n" +
            "  `00` - Basic (default role)\n" +
            "  `01` - Supporter\n" +
            "  `02` - Developer\n" +
            "Example: `/giverole /testuser1 0` or `/giverole #172 2`",
        ),
      );
      return;
    }

    const targetArg = this.args[0];
    const roleFlag = parseInt(this.args[1]);

    // Validate role flag
    if (isNaN(roleFlag) || roleFlag < 0 || roleFlag > 2) {
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`4Invalid role flag. Use 0 (Basic), 1 (Supporter), or 2 (Developer).``",
        ),
      );
      return;
    }

    // Map flag to role
    const roleMap: { [key: number]: string } = {
      0: ROLE.BASIC,
      1: ROLE.SUPPORTER,
      2: ROLE.DEVELOPER,
    };

    const roleNameMap: { [key: number]: string } = {
      0: "Basic",
      1: "Supporter",
      2: "Developer",
    };

    const newRole = roleMap[roleFlag];
    const roleName = roleNameMap[roleFlag];

    // Parse user target
    const parsedTarget = parseUserTarget(targetArg);
    if (!parsedTarget) {
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`4Invalid target format. Use `/username` or `#id`.``",
        ),
      );
      return;
    }

    let targetPeer: Peer | undefined;
    let targetData: Players | undefined;

    // Find the target user
    if (parsedTarget.type === "name") {
      // Check if user is online in cache
      const targetPeerData = this.base.cache.peers.find(
        (p) =>
          p.name.toLowerCase() === (parsedTarget.value as string).toLowerCase(),
      );

      if (targetPeerData) {
        targetPeer = new Peer(this.base, targetPeerData.netID);
      } else {
        // If not online, check database
        targetData = await this.base.database.players.get(
          parsedTarget.value as string,
        );
        if (!targetData) {
          this.peer.send(
            Variant.from(
              "OnConsoleMessage",
              "`4User with name `o" + parsedTarget.value + "`4 not found.``",
            ),
          );
          return;
        }
      }
    } else if (parsedTarget.type === "id") {
      // Check if user is online in cache by ID
      const targetPeerData = this.base.cache.peers.find(
        (p) => p.userID === parsedTarget.value,
      );

      if (targetPeerData) {
        targetPeer = new Peer(this.base, targetPeerData.netID);
      } else {
        // If not online, check database by ID
        targetData = await this.base.database.players.getByUID(
          parsedTarget.value as number,
        );
        if (!targetData) {
          this.peer.send(
            Variant.from(
              "OnConsoleMessage",
              "`4User with ID `o" + parsedTarget.value + "`4 not found.``",
            ),
          );
          return;
        }
      }
    }

    // Change role for the target user
    if (targetPeer) {
      // User is online
      const oldRole = targetPeer.data.role;
      targetPeer.data.role = newRole;
      await targetPeer.updateDisplayName();

      const currentWorld = targetPeer.currentWorld();
      if (currentWorld) {
        await currentWorld.every((p) => {
          p.send(
            Variant.from(
              { netID: targetPeer.data.netID },
              "OnNameChanged",
              targetPeer.data.displayName,
            ),
          );
        });
      }

      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`2Successfully changed role of `o" +
            targetPeer.data.name +
            "`2 to `o" +
            roleName +
            "`2.``",
        ),
      );

      targetPeer.send(
        Variant.from(
          "OnConsoleMessage",
          "`2Your role has been changed to `o" +
            roleName +
            "`2 by an administrator!``",
        ),
      );
    } else if (targetData) {
      // User is offline - update database directly
      const oldRole = targetData.role;

      // Update role and display name in database
      await this.base.database.db
        .update(players)
        .set({
          role:         newRole,
          display_name: this.getDisplayNameForRole(targetData.name, newRole),
        })
        .where(eq(players.id, targetData.id));

      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`2Successfully changed role of `o" +
            targetData.name +
            "`2 to `o" +
            roleName +
            "`2 (offline).``",
        ),
      );
    }
  }

  private getDisplayNameForRole(name: string, role: string): string {
    switch (role) {
      default:
      case ROLE.BASIC: {
        return `\`w${name}\`\``;
      }
      case ROLE.SUPPORTER: {
        return `\`e${name}\`\``;
      }
      case ROLE.DEVELOPER: {
        return `\`b@${name}\`\``;
      }
    }
  }
}
