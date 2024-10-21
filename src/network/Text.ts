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

export class ITextPacket {
  public obj: Record<string, string | number>;

  constructor(public base: Base, public peer: Peer, public chunk: Buffer) {
    this.obj = parseAction(chunk);
  }

  public async execute() {
    if (this.obj.action) return;

    consola.debug("[DEBUG] Receive text packet:\n", this.obj);

    await this.checkVersion();
    if (this.obj.ltoken) await this.validateLtoken();

    if (this.obj.tankIDName && this.obj.tankIDPass) {
      await this.validateRefreshToken();
    }
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

  private async sendSuperMain() {
    return this.peer.send(
      Variant.from(
        "OnSuperMainStartAcceptLogonHrdxs47254722215a",
        this.base.items.hash,
        "www.growtopia1.com",
        "growtopia/cache/",
        "cc.cz.madkite.freedom org.aqua.gg idv.aqua.bulldog com.cih.gamecih2 com.cih.gamecih com.cih.game_cih cn.maocai.gamekiller com.gmd.speedtime org.dax.attack com.x0.strai.frep com.x0.strai.free org.cheatengine.cegui org.sbtools.gamehack com.skgames.traffikrider org.sbtoods.gamehaca com.skype.ralder org.cheatengine.cegui.xx.multi1458919170111 com.prohiro.macro me.autotouch.autotouch com.cygery.repetitouch.free com.cygery.repetitouch.pro com.proziro.zacro com.slash.gamebuster",
        "proto=209|choosemusic=audio/mp3/about_theme.mp3|active_holiday=6|wing_week_day=0|ubi_week_day=0|server_tick=638729041|clash_active=0|drop_lavacheck_faster=1|isPayingUser=0|usingStoreNavigation=1|enableInventoryTab=1|bigBackpack=1|"
      )
    );
  }

  private async validateLtoken() {
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
      consola.error(e);
      return await this.invalidInfoResponse();
    }
  }

  private async validateRefreshToken() {
    try {
      const growID = this.obj.tankIDName as string;
      const password = this.obj.tankIDPass as string;

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
      this.sendSuperMain();
      this.peer.send(Variant.from("SetHasGrowID", 1, player.display_name, password));
    } catch (e) {
      consola.error(e);
      return await this.invalidInfoResponse();
    }
  }
}
