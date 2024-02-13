import { Variant, TankPacket, TextPacket } from "growtopia.js";
import { Listener } from "../abstracts/Listener";
import { ActionType } from "../types/action";
import { BaseServer } from "../structures/BaseServer";
import { DataTypes } from "../utils/enums/DataTypes";
import { decrypt, find, parseAction } from "../utils/Utils";
import { Peer } from "../structures/Peer";
import { TankTypes } from "../utils/enums/TankTypes";
import { ActionTypes } from "../utils/enums/Tiles";
import { ClothTypes } from "../utils/enums/ItemTypes";
import { DialogBuilder } from "../utils/builders/DialogBuilder";
import { World } from "../structures/World";
import { DroppedItem } from "../types/world";
import { Place } from "../tanks/Place";
import { Punch } from "../tanks/Punch";
import { Player } from "../tanks/Player";

export default class extends Listener<"raw"> {
  constructor(base: BaseServer) {
    super(base);
    this.name = "raw";
  }

  private sendGuest(peer: Peer, requestedName: string) {
    const dialog = new DialogBuilder().defaultColor().addTextBox("Register account").addInputBox("username", "Username", requestedName, 20).raw("\nadd_text_input_password|password|Password||20|").addInputBox("password", "Password", "", 20).endDialog("register_end", "", "Create").str();

    peer.send(Variant.from("OnDialogRequest", dialog));
  }

  public async run(netID: number, data: Buffer): Promise<void> {
    const peer = this.base.cache.users.has(netID) ? this.base.cache.users.getSelf(netID) : new Peer(this.base, netID);
    const dataType = data.readInt32LE();

    switch (dataType) {
      case DataTypes.STR:
      case DataTypes.ACTION: {
        const parsed = parseAction(data);

        this.base.log.debug({ parsed, dataType });

        // Guest
        if (parsed?.requestedName && !parsed?.tankIDName && !parsed?.tankIDPass) return this.sendGuest(peer, (parsed?.requestedName as string) || "");

        // Using login & password
        if (parsed?.requestedName && parsed?.tankIDName && parsed?.tankIDPass) {
          const username = parsed.tankIDName as string;
          const password = parsed.tankIDPass as string;
          this.base.database.getUser(username).then((user) => {
            if (!user || password !== decrypt(user?.password)) {
              peer.send(Variant.from("OnConsoleMessage", "`4Failed`` logging in to that account. Please make sure you've provided the correct info."));
              peer.send(TextPacket.from(DataTypes.ACTION, "action|set_url", "url||https://127.0.0.1/recover", "label|`$Recover your Password``"));
              return peer.disconnect();
            }

            // Check if there's same account is logged in
            const targetPeer = find(this.base, this.base.cache.users, (v) => v.data?.id_user === user.id_user);
            if (targetPeer) {
              peer.send(Variant.from("OnConsoleMessage", "`4Already Logged In?`` It seems that this account already logged in by somebody else."));

              targetPeer.leaveWorld();
              targetPeer.disconnect();
            }
            peer.send(
              Variant.from(
                "OnSuperMainStartAcceptLogonHrdxs47254722215a",
                this.base.items.hash,
                "www.growtopia1.com",
                "growtopia/cache/",
                "cc.cz.madkite.freedom org.aqua.gg idv.aqua.bulldog com.cih.gamecih2 com.cih.gamecih com.cih.game_cih cn.maocai.gamekiller com.gmd.speedtime org.dax.attack com.x0.strai.frep com.x0.strai.free org.cheatengine.cegui org.sbtools.gamehack com.skgames.traffikrider org.sbtoods.gamehaca com.skype.ralder org.cheatengine.cegui.xx.multi1458919170111 com.prohiro.macro me.autotouch.autotouch com.cygery.repetitouch.free com.cygery.repetitouch.pro com.proziro.zacro com.slash.gamebuster",
                "proto=204|choosemusic=audio/mp3/about_theme.mp3|active_holiday=6|wing_week_day=0|ubi_week_day=0|server_tick=638729041|clash_active=0|drop_lavacheck_faster=1|isPayingUser=0|usingStoreNavigation=1|enableInventoryTab=1|bigBackpack=1|"
              ),
              Variant.from("SetHasGrowID", 1, user.name, decrypt(user.password)),
              Variant.from("SetHasAccountSecured", 1)
            );

            const defaultInventory = {
              max: 32,
              items: [
                {
                  id: 18, // Fist
                  amount: 1
                },
                {
                  id: 32, // Wrench
                  amount: 1
                }
              ]
            };

            const defaultClothing = {
              hair: 0,
              shirt: 0,
              pants: 0,
              feet: 0,
              face: 0,
              hand: 0,
              back: 0,
              mask: 0,
              necklace: 0,
              ances: 0
            };

            peer.data.tankIDName = user.name;
            peer.data.rotatedLeft = false;
            // peer.data.requestedName = parsed.requestedName as string;
            peer.data.country = parsed?.country as string;
            peer.data.id_user = user.id_user;
            peer.data.role = user.role;
            peer.data.inventory = user.inventory?.length ? JSON.parse(user.inventory.toString()) : defaultInventory;
            peer.data.clothing = user.clothing?.length ? JSON.parse(user.clothing.toString()) : defaultClothing;
            peer.data.gems = user.gems ? user.gems : 0;
            peer.data.world = "EXIT";
            peer.data.level = user.level ? user.level : 0;
            peer.data.exp = user.exp ? user.exp : 0;

            // Load Gems
            peer.send(Variant.from("OnSetBux", peer.data.gems));

            peer.saveToCache();
            peer.saveToDatabase();
          });
        }

        // Handle actions
        if (parsed?.action) {
          try {
            const action = this.base.action.get(parsed.action as string);
            action?.handle(peer.getSelfCache(), parsed as ActionType<unknown>);
          } catch (err) {
            this.base.log.error(err);
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
        switch (tank.data?.type) {
          default: {
            this.base.log.debug("Unknown tank", tank);
            break;
          }
          case TankTypes.PEER_ICON: {
            tank.data.state = peer.data?.rotatedLeft ? 16 : 0;

            peer.everyPeer((p) => {
              if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
                p.send(tank);
              }
            });
            break;
          }

          case TankTypes.PEER_CLOTH: {
            tank.data.state = peer.data?.rotatedLeft ? 16 : 0;
            const item = this.base.items.metadata.items.find((v) => v.id === tank.data?.info);

            const isAnces = (): boolean => {
              if (item?.type === ActionTypes.ANCES) {
                if (peer.data.clothing.ances === tank.data?.info) peer.data.clothing.ances = 0;
                else peer.data.clothing.ances = tank.data?.info || 0;
                return true;
              }
              return false;
            };

            switch (item?.bodyPartType) {
              case ClothTypes.HAIR: {
                if (isAnces()) break;

                if (peer.data.clothing.hair === tank.data.info) peer.data.clothing.hair = 0;
                else peer.data.clothing.hair = tank.data.info || 0;

                break;
              }
              case ClothTypes.SHIRT: {
                if (isAnces()) break;

                if (peer.data.clothing.shirt === tank.data.info) peer.data.clothing.shirt = 0;
                else peer.data.clothing.shirt = tank.data.info || 0;

                break;
              }
              case ClothTypes.PANTS: {
                if (isAnces()) break;

                if (peer.data?.clothing.pants === tank.data.info) peer.data.clothing.pants = 0;
                else peer.data.clothing.pants = tank.data.info || 0;

                break;
              }
              case ClothTypes.FEET: {
                if (isAnces()) break;

                if (peer.data.clothing.feet === tank.data.info) peer.data.clothing.feet = 0;
                else peer.data.clothing.feet = tank.data.info || 0;

                break;
              }
              case ClothTypes.FACE: {
                if (isAnces()) break;

                if (peer.data.clothing.face === tank.data.info) peer.data.clothing.face = 0;
                else peer.data.clothing.face = tank.data.info || 0;

                break;
              }
              case ClothTypes.HAND: {
                if (isAnces()) break;
                const handItem = this.base.items.metadata.items.find((item) => item.id === tank.data?.info);

                if (peer.data.clothing.hand === tank.data.info) peer.data.clothing.hand = 0;
                else peer.data.clothing.hand = tank.data.info || 0;

                break;
              }
              case ClothTypes.BACK: {
                if (isAnces()) break;

                if (peer.data.clothing.back === tank.data.info) peer.data.clothing.back = 0;
                else peer.data.clothing.back = tank.data.info || 0;

                break;
              }
              case ClothTypes.MASK: {
                if (isAnces()) break;

                if (peer.data.clothing.mask === tank.data.info) peer.data.clothing.mask = 0;
                else peer.data.clothing.mask = tank.data.info || 0;

                break;
              }
              case ClothTypes.NECKLACE: {
                if (isAnces()) break;

                if (peer.data?.clothing.necklace === tank.data.info) peer.data.clothing.necklace = 0;
                else peer.data.clothing.necklace = tank.data.info || 0;

                break;
              }
              case ClothTypes.ANCES: {
                if (isAnces()) break;

                if (peer.data.clothing.ances === tank.data.info) peer.data.clothing.ances = 0;
                else peer.data.clothing.ances = tank.data.info || 0;

                break;
              }
            }

            peer.saveToCache();
            peer.saveToDatabase();
            peer.sendClothes();
            break;
          }

          case TankTypes.PEER_MOVE: {
            if (peer.data?.world === "EXIT") break;
            const world = peer.hasWorld(peer.data.world) as World;
            tank.data.netID = peer.data?.netID;

            peer.data.x = tank.data.xPos;
            peer.data.y = tank.data.yPos;
            peer.data.rotatedLeft = Boolean((tank.data.state as number) & 0x10);

            peer.saveToCache();
            peer.everyPeer((p) => {
              if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
                p.send(tank);
              }
            });
            
            const player = new Player(this.base, peer, tank, world);
            player.onPlayerMove();
            break;
          }
          case TankTypes.TILE_PUNCH: {
            const world = peer.hasWorld(peer.data.world) as World;
            tank.data.netID = peer.data?.netID;

            // Fist
            if (tank.data.info === 18) {
              const punch = new Punch(this.base, peer, tank, world);
              punch.onPunch();
            } else if (tank.data.info === 32) {
              const player = new Player(this.base, peer, tank, world);
              player.onTileWrench();
            }
            // Others
            else {
              const place = new Place(this.base, peer, tank, world);
              place.onPlace();
            }

            break;
          }

          case TankTypes.PEER_COLLECT: {
            const world = peer.hasWorld(peer.data.world);
            const dropped = world?.data.dropped?.items.find((i) => i.uid === tank.data?.info) as DroppedItem;

            world?.collect(peer, dropped.uid);
            break;
          }

          case TankTypes.PEER_ENTER_DOOR: {
            if (peer.data?.world === "EXIT") return;

            const world = peer.hasWorld(peer.data.world);
            const pos = (tank.data.xPunch || 0) + (tank.data.yPunch || 0) * (world?.data.width || 100);
            const block = world?.data.blocks[pos];

            if (!block || !block.door) return;
            if (block.fg === 6) return peer.leaveWorld();

            const worldDes = block.door?.destination?.split(":") as string[];
            if (!worldDes[0]) worldDes[0] = peer.data.world;

            const worldName = worldDes[0];
            const id = worldDes[1];

            if (worldName === peer.data?.world) {
              let door = world?.data.blocks?.find((b) => b.door && b.door.id === id);

              if (!door) door = world?.data.blocks?.find((b) => b.fg === 6);

              const doorX = (door?.x || 0) * 32;
              const doorY = (door?.y || 0) * 32;

              peer.data.x = doorX;
              peer.data.y = doorY;

              peer.send(Variant.from("OnZoomCamera", [10000], 1000));

              peer.everyPeer((p) => {
                if (p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
                  p.send(
                    Variant.from({ netID: peer.data?.netID }, "OnSetFreezeState", 0),
                    Variant.from(
                      {
                        netID: peer.data?.netID
                      },
                      "OnSetPos",
                      [doorX, doorY]
                    ),
                    Variant.from(
                      {
                        netID: peer.data?.netID
                      },
                      "OnPlayPositioned",
                      "audio/door_open.wav"
                    )
                  );
                }
              });
            } else {
              if (worldName === "EXIT") return peer.leaveWorld();
              const wrld = peer.hasWorld(worldName);

              let door = wrld?.data.blocks?.find((b) => b.door && b.door.id === id);
              if (!door) door = wrld?.data.blocks?.find((b) => b.fg === 6);

              world.data.playerCount ? world.data.playerCount-- : 0;
              peer.everyPeer((p) => {
                if (p.data?.netID !== peer.data?.netID && p.data?.world === peer.data?.world && p.data?.world !== "EXIT") {
                  p.send(
                    Variant.from("OnRemove", `netID|${peer.data?.netID}`),
                    Variant.from("OnConsoleMessage", `\`5<${peer.name}\`\` left, \`w${world?.data.playerCount}\`\` others here\`5>\`\``),
                    Variant.from("OnTalkBubble", peer.data.netID, `\`5<${peer.name}\`\` left, \`w${world?.data.playerCount}\`\` others here\`5>\`\``),
                    TextPacket.from(DataTypes.ACTION, "action|play_sfx", "file|audio/door_shut.wav", "delayMS|0")
                  );
                }
              });
              peer.enterWorld(worldName, door?.x, door?.y);
            }
            break;
          }
        }
        break;
      }
    }
  }
}
