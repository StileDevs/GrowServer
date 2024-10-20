import { TextPacket, Variant } from "growtopia.js";
import { Base } from "../core/Base.js";
import { Peer } from "../core/Peer.js";
import { parseAction } from "../utils/Utils.js";
import { PacketType } from "../Constants.js";
import consola from "consola";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { type JsonObject } from "type-fest";
import { customAlphabet } from "nanoid";

export class StrPacket {
  public obj: Record<string, string | number>;

  constructor(public base: Base, public peer: Peer, public chunk: Buffer) {
    this.obj = parseAction(chunk);
  }

  public async execute() {
    consola.debug("STR", this.obj);

    await this.checkVersion();
    await this.validateLtoken();
  }

  private async checkVersion() {
    if (this.obj.game_version && this.obj.game_version !== this.base.cdn.version && !this.base.config.server.bypassVersionCheck)
      return this.peer.send(
        TextPacket.from(PacketType.ACTION, "action|log", `msg|\`4UPDATE REQUIRED!\`\` : The \`$V${this.base.cdn.version}\`\` update is now available for your device.  Go get it!  You'll need to install it before you can play online.`),
        TextPacket.from(PacketType.ACTION, "action|set_url", `url|https://ubistatic-a.akamaihd.net/${this.base.cdn.uri}/GrowtopiaInstaller.exe`, "label|Download Latest Version")
      );
  }

  private async invalidInfoResponse() {
    this.peer.send(Variant.from("OnConsoleMessage", "`4Failed`` logging in to that account. Please make sure you've provided the correct info."));
    this.peer.send(TextPacket.from(PacketType.ACTION, "action|set_url", "url||http://127.0.0.1/recover", "label|`$Recover your Password``"));
    this.peer.disconnect();
  }

  private async validateLtoken() {
    if (this.obj.ltoken) {
      const ltoken = this.obj.ltoken as string;

      try {
        const data = jwt.verify(ltoken, process.env.JWT_SECRET as string) as JsonObject;

        const growID = data.growID as string;
        const password = data.password as string;

        const player = await this.base.database.players.get(growID.toLowerCase());
        if (!player) throw new Error("Player not found");

        const isValid = await bcrypt.compare(password, player.password);
        if (!isValid) throw new Error("Password are invalid");

        const targetPeerId = this.base.cache.peers.find((v) => v.id_user === player.id);
        if (targetPeerId) {
          const targetPeer = new Peer(this.base, targetPeerId.netID);
          this.peer.send(Variant.from("OnConsoleMessage", "`4Already Logged In?`` It seems that this account already logged in by somebody else."));

          // targetPeer.leaveWorld();
          targetPeer.disconnect();
        }

        const conf = this.base.config.web;
        const randPort = conf.ports[Math.floor(Math.random() * conf.ports.length)];
        this.peer.send(Variant.from("SetHasGrowID", 1, player.display_name, password), Variant.from("OnSendToServer", randPort, Math.random() * (1000000 - 10000) + 10000, player.id, `${conf.address}|0|${customAlphabet("0123456789ABCDEF", 32)()}`, 1, player.display_name));
      } catch (e) {
        return await this.invalidInfoResponse();
      }
    }
  }
}
