import { Peer, Variant, TankPacket, TextPacket } from "growsockets";
import { Listener } from "../abstracts/Listener";
import { ActionType } from "../types/action";
import { BaseServer } from "../structures/BaseServer";
import { DataTypes } from "../utils/enums/DataTypes";
import { parseAction } from "../utils/Utils";

export default class extends Listener<"data"> {
  constructor() {
    super();
    this.name = "data";
  }

  private failGuest(peer: Peer<{ netID: number }>) {
    peer.send(
      Variant.from(
        "OnConsoleMessage",
        "`4Unable to logon:`` Seems like you're on a guest account. Please register an account first from our website."
      ),
      TextPacket.from(
        DataTypes.ACTION,
        "action|set_url",
        `url|https://127.0.0.1/register`,
        "label|`$Create `9new`` Account``"
      )
    );
    peer.disconnect();
  }

  public async run(base: BaseServer, netID: number, data: Buffer): Promise<void> {
    const peer = Peer.new(base.server, netID) as Peer<any>;
    const dataType = data.readInt32LE();

    switch (dataType) {
      case DataTypes.STR:
      case DataTypes.ACTION: {
        let parsed = parseAction(data);

        console.log({ parsed, dataType });

        // Guest
        if (parsed?.requestedName && !parsed?.tankIDName && !parsed?.tankIDPass)
          return this.failGuest(peer);

        // Using login & password
        if (parsed?.requestedName && parsed?.tankIDName && parsed?.tankIDPass) {
          if (parsed.tankIDName === "tes" && parsed.tankIDPass === "123") {
            peer.send(
              Variant.from(
                "OnSuperMainStartAcceptLogonHrdxs47254722215a",
                base.items.hash,
                "ubistatic-a.akamaihd.net",
                "0098/654975/cache/",
                "cc.cz.madkite.freedom org.aqua.gg idv.aqua.bulldog com.cih.gamecih2 com.cih.gamecih com.cih.game_cih cn.maocai.gamekiller com.gmd.speedtime org.dax.attack com.x0.strai.frep com.x0.strai.free org.cheatengine.cegui org.sbtools.gamehack com.skgames.traffikrider org.sbtoods.gamehaca com.skype.ralder org.cheatengine.cegui.xx.multi1458919170111 com.prohiro.macro me.autotouch.autotouch com.cygery.repetitouch.free com.cygery.repetitouch.pro com.proziro.zacro com.slash.gamebuster",
                "proto=179|choosemusic=audio/mp3/jazz_loop.mp3|active_holiday=0|wing_week_day=0|ubi_week_day=0|server_tick=76098085|clash_active=0|drop_lavacheck_faster=1|isPayingUser=0|usingStoreNavigation=1|enableInventoryTab=1|bigBackpack=1|proto=179|choosemusic=audio/mp3/jazz_loop.mp3|active_holiday=17|wing_week_day=0|ubi_week_day=0|server_tick=3021347|clash_active=1|drop_lavacheck_faster=1|isPayingUser=0|usingStoreNavigation=1|enableInventoryTab=1|bigBackpack=1|"
              ),
              Variant.from("SetHasGrowID", 1, parsed.tankIDName, parsed.tankIDPass)
            );

            peer.data.tankIDName = parsed.tankIDName;
            peer.data.requestedName = parsed.requestedName;
            base.saveUser(peer.data.netID, peer);
          } else {
            peer.send(
              Variant.from(
                "OnConsoleMessage",
                "`4Failed`` logging in to that account. Please make sure you've provided the correct info."
              )
            );
            peer.send(
              TextPacket.from(
                DataTypes.ACTION,
                "action|set_url",
                `url||https://127.0.0.1/recover`,
                "label|`$Recover your Password``"
              )
            );
            return peer.disconnect();
          }
        }

        // Handle actions
        if (parsed?.action) {
          try {
            const action = base.action.get(parsed.action as string);
            action?.handle(base, peer, parsed as ActionType<unknown>);
          } catch (err) {
            console.log(err);
          }
        }
      }
    }
  }
}

/*
[0] OnSuperMainStartAcceptLogonHrdxs47254722215a
[1] 1743231928
[2] ubistatic-a.akamaihd.net
[3] 0098/654975/cache/
[4] cc.cz.madkite.freedom org.aqua.gg idv.aqua.bulldog com.cih.gamecih2 com.cih.gamecih com.cih.game_cih cn.maocai.gamekiller com.gmd.speedtime org.dax.attack com.x0.strai.frep com.x0.strai.free org.cheatengine.cegui org.sbtools.gamehack com.skgames.traffikrider org.sbtoods.gamehaca com.skype.ralder org.cheatengine.cegui.xx.multi1458919170111 com.prohiro.macro me.autotouch.autotouch com.cygery.repetitouch.free com.cygery.repetitouch.pro com.proziro.zacro com.slash.gamebuster
[5] proto=179|choosemusic=audio/mp3/theme3.mp3|active_holiday=17|wing_week_day=0|ubi_week_day=0|server_tick=3021347|clash_active=1|drop_lavacheck_faster=1|isPayingUser=0|usingStoreNavigation=1|enableInventoryTab=1|bigBackpack=1|
[6] 370236174
*/
