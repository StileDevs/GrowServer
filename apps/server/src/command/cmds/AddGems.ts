import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "@growserver/const";
import { Variant } from "growtopia.js";
import { parseUserTarget } from "@growserver/utils";
import { eq } from "drizzle-orm";
import { players, Players } from "@growserver/db";

export default class AddGems extends Command {
  constructor(
    public base: Base,
    public peer: Peer,
    public text: string,
    public args: string[],
  ) {
    super(base, peer, text, args);
    this.opt = {
      command: ["addgems"],
      description:
        "Add gems to a user. Use /username for exact name or #id for user ID.",
      cooldown:   5,
      ratelimit:  1,
      category:   "`oBasic",
      usage:      "/addgems <target> <amount>",
      example:    ["/addgems /testuser1 10000", "/addgems #172 10000"],
      permission: [ROLE.DEVELOPER],
    };
  }

  public async execute(): Promise<void> {
    if (this.args.length < 2) {
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`4Usage: /addgems <target> <amount>`o\n" +
            "Target can be:\n" +
            "  `/username` - Find user by exact username\n" +
            "  `#id` - Find user by user ID\n" +
            "Example: `/addgems /testuser1 10000` or `/addgems #172 10000`",
        ),
      );
      return;
    }

    const targetArg = this.args[0];
    const amount = parseInt(this.args[1]);

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`4Invalid amount. Please provide a positive number.``",
        ),
      );
      return;
    }

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

    // Add gems to the target user
    if (targetPeer) {
      // User is online
      const oldGems = targetPeer.data.gems;
      targetPeer.data.gems += amount;
      targetPeer.setGems(targetPeer.data.gems);
      await targetPeer.saveToDatabase();

      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`2Successfully added `o" +
            amount +
            "`2 gems to `o" +
            targetPeer.data.name +
            "`2.``\n" +
            "`oOld: " +
            oldGems +
            " | New: " +
            targetPeer.data.gems +
            "``",
        ),
      );

      targetPeer.send(
        Variant.from(
          "OnConsoleMessage",
          "`2You have received `o" +
            amount +
            "`2 gems from an administrator!``",
        ),
      );
    } else if (targetData) {
      // User is offline - update database directly
      const oldGems = targetData.gems ?? 0;
      const newGems = oldGems + amount;

      // Update gems in database
      await this.base.database.db
        .update(players)
        .set({ gems: newGems })
        .where(eq(players.id, targetData.id));

      this.peer.send(
        Variant.from(
          "OnConsoleMessage",
          "`2Successfully added `o" +
            amount +
            "`2 gems to `o" +
            targetData.name +
            "`2 (offline).``\n" +
            "`oOld: " +
            oldGems +
            " | New: " +
            newGems +
            "``",
        ),
      );
    }
  }
}
