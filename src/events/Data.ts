import { Variant, TankPacket, TextPacket } from "growsockets";
import { Listener } from "../abstracts/Listener";
import { ActionType } from "../types/action";
import { BaseServer } from "../structures/BaseServer";
import { DataTypes } from "../utils/enums/DataTypes";
import { parseAction } from "../utils/Utils";
import { Peer } from "../structures/Peer";
import { TankTypes } from "../utils/enums/TankTypes";
import { WORLD_SIZE } from "../utils/Constants";
import { ActionTypes } from "../utils/enums/Tiles";

export default class extends Listener<"data"> {
  constructor() {
    super();
    this.name = "data";
  }

  private failGuest(peer: Peer) {
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
    // prettier-ignore
    const peer = base.cache.users.has(netID) ? base.cache.users.get(netID)! : new Peer(base.server, netID, base);
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

            let inventory = {
              max: 32,
              items: [
                {
                  id: 18, // Fist
                  amount: 1
                },
                {
                  id: 32, // Wrench
                  amount: 1
                },
                {
                  id: 2, // Dirt
                  amount: 10
                },
                {
                  id: 1000, // Public Lava
                  amount: 200
                },
                {
                  id: 14, // Cave Background
                  amount: 200
                },
                {
                  id: 156, // Fairy wing
                  amount: 1
                }
              ]
            };

            peer.data.tankIDName = parsed.tankIDName;
            peer.data.requestedName = parsed.requestedName as string;
            peer.data.country = parsed.country as string;
            peer.data.inventory = inventory;
            peer.saveToCache();
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
            action?.handle(base, peer.getSelfCache()!, parsed as ActionType<unknown>);
          } catch (err) {
            console.log(err);
          }
        }
        break;
      }

      case DataTypes.TANK: {
        if (data.length < 60) {
          peer.send(Variant.from("OnConsoleMessage", "Received invalid tank packet."));
          return peer.disconnect();
        }
        const tank = TankPacket.fromBuffer(data);

        // Place/Punch
        if (tank.data?.type === 3) {
          const world = peer.hasWorld(peer.data.world!);
          const pos = tank.data.xPunch! + tank.data.yPunch! * world.data.width!;
          const block = world.data.blocks![pos];
          const item = (await base.items.metadata).items;

          // prettier-ignore
          const isBg = item[tank.data.info!].type === ActionTypes.BACKGROUND || item[tank.data.info!].type === ActionTypes.SHEET_MUSIC;

          console.log({ block, pos, isBg });
          console.log(tank);
          // TODO: Handle if block was break/placed, then save it to world cache

          switch (tank.data.info) {
            // Fist
            case 18: {
              // if (!block.fg || !block.bg) return;
              const packet = TankPacket.from({
                type: TankTypes.TILE_PUNCH,
                netID: peer.data.netID,
                state: 0x8, // bitwise 0x10 if rotated left
                info: tank.data?.info,
                xPunch: tank.data?.xPunch,
                yPunch: tank.data?.yPunch
              });
              peer.send(packet.parse());

              if (isBg) {
                world.data.blocks![pos].bg = 0;
                world.saveToCache();
              } else {
                world.data.blocks![pos].fg = 0;
                world.saveToCache();
              }
            }

            // Others
            default: {
              // ignore fist & wrench
              if (tank.data.info === 18 || tank.data.info === 32) return;
              const packet = TankPacket.from({
                type: TankTypes.TILE_PUNCH,
                netID: peer.data.netID,
                state: 0x8, // bitwise 0x10 if rotated left
                info: tank.data?.info,
                xPunch: tank.data?.xPunch,
                yPunch: tank.data?.yPunch
              });

              peer.send(packet.parse());

              if (isBg) {
                world.data.blocks![pos].bg = tank.data.info;
                world.saveToCache();
              } else {
                world.data.blocks![pos].fg = tank.data.info;
                world.saveToCache();
              }
              // prettier-ignore
              let item = peer.data.inventory?.items.find((item) => item.id === tank.data?.info)!;
              let items = peer.data.inventory?.items;
              item.amount = item.amount! - 1;

              // prettier-ignore
              if (item.amount === 0) {
                peer.data.inventory!.items! = peer.data.inventory?.items.filter((i) => i.amount !== 0)!;
              }
              return peer.saveToCache();
            }
          }
        } // Movement
        else if (tank.data?.type === 0) {
          peer.data.x = tank.data.xPos;
          peer.data.y = tank.data.yPos;
          peer.saveToCache();
          // TODO: update movement to every peer if they in same world
        }

        break;
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
