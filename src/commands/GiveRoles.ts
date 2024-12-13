import { Variant } from "growtopia.js";
import { Command } from "../abstracts/Command.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import type { CommandOptions } from "../types";
import { Role } from "../utils/Constants.js";
import { find } from "../utils/Utils.js";

export default class extends Command {
  public opt: CommandOptions;

  constructor(base: BaseServer) {
    super(base);
    this.opt = {
      name: "giveroles",
      description: "Give roles to someone or self",
      cooldown: 5,
      ratelimit: 5,
      category: "Developer",
      usage: "/giveroles <role_name_or_id> <to_who?>",
      example: ["/giveroles Developer", "/giveroles 1 JadlionHD", "/giveroles developer JadlionHD"],
      permission: [Role.BASIC, Role.DEVELOPER]
    };
  }

  // Give role to player, No need to re-enter the world to update the name/flags.

  private getRoleId(roleInput: string): string | null {
    const roleEntries = Object.entries(Role);
    const role = roleEntries.find(([name, id]) => 
      name.toLowerCase() === roleInput.toLowerCase() || id === roleInput
    );
    return role ? role[1] : null;
  }

  // Updates the peer role, saves changes, and refreshes their display
  private updatePeerRole(peer: Peer, roleId: string): void {
    peer.data.role = roleId;
    peer.saveToCache();
    peer.saveToDatabase();
    
    peer.countryState(); // Refresh country
    
    this.updateNameDisplay(peer);
  }

  // Updates the player name display for all peers
  private updateNameDisplay(peer: Peer): void {
    const updatedName = peer.name;
    
    peer.send(Variant.from({ netID: peer.data.netID }, "OnNameChanged", updatedName)); // Update the name
    
    peer.everyPeer((otherPeer) => {
      if (otherPeer.data.netID !== peer.data.netID && otherPeer.data.world === peer.data.world) {
        otherPeer.send(Variant.from({ netID: peer.data.netID }, "OnNameChanged", updatedName));
      }
    });
  }

  public async execute(peer: Peer, text: string, args: string[]): Promise<void> {
    if (!args[0]) return peer.send(Variant.from("OnConsoleMessage", "Role is required."));

    const roleId = this.getRoleId(args[0]);
    if (!roleId) return peer.send(Variant.from("OnConsoleMessage", "Invalid role."));

    if (args.length > 1) {
      const targetPeer = find(this.base, this.base.cache.users, (user) => (user.data?.tankIDName || "").toLowerCase().includes(args[1].toLowerCase()));
      if (!targetPeer) return peer.send(Variant.from("OnConsoleMessage", "Make sure that player is online."));

      this.updatePeerRole(targetPeer, roleId);
      peer.send(Variant.from("OnConsoleMessage", `Successfully gave the \`w${args[0]}\`\` role to ${targetPeer.name}`));
    } else {
      this.updatePeerRole(peer, roleId);
      peer.send(Variant.from("OnConsoleMessage", `Successfully received \`w${args[0]}\`\` role.`));
    }
  }
}
