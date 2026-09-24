import { NodeENetServer, Packet, PacketKind, type Peer } from "growtopia.wasm";
import EventEmitter from "events";
import dayjs from "dayjs";
import { logger } from "../../utils/logger";
import { Player, PlayerStateFlags } from "../player";
import { Collection } from "../../utils/collection";
import { serverManager } from "./server-manager";
import { ExtendBuffer } from "../../utils/extend-buffer";
import { TextParser } from "../../utils/text-parser";
import { TextColor } from "../../utils/text-color";
import { LOGON_MODE, PACKET_TYPE, TANK_PACKET_TYPE } from "../../constants";
import { GameUpdatePacket } from "../packets/game-packet";
import { PlayerDB, SessionDB } from "../../database/services";
import { GameMessageMap } from "../network/game-message-handler";

export interface GameServerEvents {
  "server:started": (data: { port: number; serverLabel: string }) => void;
  "server:stopped": (data: { port: number; serverLabel: string }) => void;
  "player:connect": (player: Player) => void;
  "player:disconnect": (player: Player) => void;
  "player:receive": (player: Player, packet: Packet, channelID: number) => void;
}

export declare interface GameServer {
  on<K extends keyof GameServerEvents>(event: K, listener: GameServerEvents[K]): this;
  off<K extends keyof GameServerEvents>(event: K, listener: GameServerEvents[K]): this;
  once<K extends keyof GameServerEvents>(event: K, listener: GameServerEvents[K]): this;
  emit<K extends keyof GameServerEvents>(event: K, ...args: Parameters<GameServerEvents[K]>): boolean;
}

export class GameServer extends EventEmitter {
  public uptime = 0;
  public host: NodeENetServer;
  public serverLabel: string;

  constructor(
    public port: number,
    serverLabel?: string,
    public maxPlayers = 1000,
  ) {
    super();
    this.serverLabel = serverLabel ?? `server-${this.port}`;
    this.host = new NodeENetServer("0.0.0.0", this.port, 1024, 2);
  }

  /** Get players connected to this game server instance from central ServerManager */
  public get players(): Collection<string, Player> {
    return serverManager.getPlayersByServer(this.serverLabel);
  }

  /** Get connected player count for this game server */
  public get playerCount(): number {
    return this.players.size;
  }

  public start(): void {
    this.uptime = dayjs().unix();
    this.host.start();
    this.host.startPolling(15);

    this.onConnect();
    this.onDisconnect();
    this.onReceive();

    this.emit("server:started", { port: this.port, serverLabel: this.serverLabel });
  }

  public stop(): void {
    for (const player of this.players.values()) {
      player.disconnect();
    }
    this.emit("server:stopped", { port: this.port, serverLabel: this.serverLabel });
  }

  /** Broadcast a packet to all connected players on this server instance */
  public broadcast(packet: Packet, ignorePlayerID?: string): void {
    for (const [id, player] of this.players) {
      if (ignorePlayerID !== undefined && id === ignorePlayerID) continue;
      player.send(packet);
    }
  }

  public onConnect(): void {
    this.host.emitter.on("connect", (peer: Peer) => {
      const player = new Player(peer, this.serverLabel, this.port);
      serverManager.registerPlayer(player);

      logger.info({ id: player.id, port: this.port, serverLabel: this.serverLabel, playerCount: this.playerCount }, "peer connected");

      const helloPayload = new Uint8Array([1, 0, 0, 0, 0]);
      const helloPacket = new Packet(helloPayload, PacketKind.Reliable);
      player.send(helloPacket);
      player.addStateStatus(PlayerStateFlags.LOGIN_REQUEST);

      this.emit("player:connect", player);
    });
  }

  public onDisconnect(): void {
    this.host.emitter.on("disconnect", (peer: Peer) => {
      const globalID = `${this.serverLabel}:${peer.id}`;
      const player = serverManager.getPlayerByID(globalID);
      if (player) {
        serverManager.unregisterPlayer(player);
        this.emit("player:disconnect", player);
      }
      logger.info({ id: globalID, port: this.port, serverLabel: this.serverLabel, playerCount: this.playerCount }, "peer disconnected");
    });
  }

  public onReceive(): void {
    this.host.emitter.on("receive", async (peer: Peer, packet: Packet, channelID: number) => {
      const data = packet.data();
      const globalID = `${this.serverLabel}:${peer.id}`;
      const player = serverManager.getPlayerByID(globalID);
      if (!player) return;

      const buf = new ExtendBuffer(Array.from(data));
      const type = buf.readI32();
      const packetTypeName = PACKET_TYPE[type] ?? "UNKNOWN";
      player.variants.sendOnConsoleMessage(new TextColor().dev("[DEBUG] ").white("Packet: ").yellow(packetTypeName).lightGray(` (${type})`).str());

      switch (type) {
        case PACKET_TYPE.GENERIC_TEXT:
        case PACKET_TYPE.GAME_MESSAGE:
          // payload and also cleanup null terminators
          const payload = Buffer.from(data.slice(4)).toString("utf-8").replace(/\0+$/g, "");
          const text = new TextParser(payload);
          console.log({ text: text.getEntries(), netID: player.netID });

          if (text.contains("action")) {
            const action = text.get("action");

            try {
              const actionFunc = GameMessageMap[action];

              if (actionFunc) {
                actionFunc(player, text);
              } else {
                throw new Error(`unknown action: ${action}`);
              }
            } catch (e) {
              logger.error(e, "failed to handle action");
            }
          }

          // this is how it handles server static content requests
          if (text.contains("tankIDName") && !text.contains("ltoken") && text.contains("token")) {
            player.variants.sendSuperMain();
          }

          if (text.contains("ltoken")) {
            const ltoken = text.get("ltoken");
            const success = player.auth.parseLToken(ltoken);

            if (!success || !player.auth.validate()) {
              return player.variants.sendOnConsoleMessage(new TextColor().crazyRed("Invalid login metadata, try again?").str());
            }

            const sessionToken = player.auth.token;
            const session = sessionToken ? await SessionDB.getByToken(sessionToken) : undefined;
            if (!session) {
              return player.variants.sendOnConsoleMessage(new TextColor().crazyRed("Invalid or expired session token, please login again.").str());
            }

            player.tankIDName = player.auth.tankIDName;
            player.displayName = player.auth.tankIDName;
            player.playerId = session.player_id;

            player.removeStateStatus(PlayerStateFlags.LOGIN_REQUEST);
            player.addStateStatus(PlayerStateFlags.ENTERING_GAME);

            // Fetch database player record to get unique database playerId
            const dbPlayer = await PlayerDB.getByName(player.tankIDName);
            if (dbPlayer) {
              player.playerId = dbPlayer.id;
            }

            // Find optimal target game server dynamically instead of hardcoding
            const optimalServer = serverManager.getOptimalServer("least_connections");
            const targetPort = optimalServer ? optimalServer.port : this.port;
            const targetServerLabel = optimalServer ? optimalServer.serverLabel : this.serverLabel;

            // Prepare sub-server transfer token session with unique database playerId
            const transferSession = player.auth.prepareTransfer({
              playerId: player.playerId,
              sourceServer: this.serverLabel,
              targetServer: targetServerLabel,
            });

            player.variants.sendSetHasGrowID(true, player.tankIDName, sessionToken);
            // Send OnSendToServer packet (server address defaults to 127.0.0.1 in dev or configured host)
            player.sendOnSendToServer(undefined, targetPort, "", LOGON_MODE.WELCOME, transferSession.token);
            player.disconnectLater();
          }

          // Handle incoming sub-server transfer validation (after sended OnSendToServer with WELCOME)
          if (text.contains("token") && text.contains("user")) {
            player.auth.parseRaw(payload);
            const token = text.get("token");
            const user = text.get("user");

            player.addStateStatus(PlayerStateFlags.LOGIN_REQUEST);

            const isValidTransfer = player.auth.validateSubServerTransfer(token, user);
            if (!isValidTransfer) {
              player.variants.sendOnConsoleMessage(new TextColor().crazyRed("Sub-server transfer verification failed or expired.").str());
              player.disconnectLater();
              return;
            }

            player.removeStateStatus(PlayerStateFlags.LOGIN_REQUEST);

            // @TODO I'll better check this later
            player.addStateStatus(PlayerStateFlags.IN_GAME);

            const parsedPlayerId = Number(user);
            if (!Number.isNaN(parsedPlayerId) && parsedPlayerId > 0) {
              player.playerId = parsedPlayerId;
            }

            player.tankIDName = player.auth.tankIDName;
            player.displayName = player.auth.tankIDName;
            logger.info({ id: player.id, playerId: player.playerId, name: player.tankIDName }, "player sub-server transfer verified successfully");
          }

          break;

        case PACKET_TYPE.GAME_PACKET:
          const gamePacket = GameUpdatePacket.fromExtendBuffer(buf);
          if (gamePacket.data.type === TANK_PACKET_TYPE.DISCONNECT) {
            player.disconnectNow();
          }

          // console.log({ gamePacket });
          break;
      }

      if (player) {
        this.emit("player:receive", player, packet, channelID);
      }
    });
  }
}
