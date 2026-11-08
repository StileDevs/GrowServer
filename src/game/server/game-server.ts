import { NodeENetServer, Packet, PacketKind, type Peer } from "growtopia.wasm";
import EventEmitter from "events";
import dayjs from "dayjs";
import { logger } from "../../utils/logger";
import { isDevelopment } from "../../configs/server-config";
import { Player, PlayerStateFlags } from "../player";
import { Collection } from "../../utils/collection";
import { serverManager } from "./server-manager";
import { ExtendBuffer } from "../../utils/extend-buffer";
import { TextParser } from "../../utils/text-parser";
import { TextColor } from "../../utils/text-color";
import { LOGON_MODE, PACKET_TYPE } from "../../constants";
import { GameUpdatePacket } from "../packets/game-packet";
import { PlayerDB, SessionDB } from "../../database/services";
import { GameMessageMap } from "../network/game-message-handler";
import { handleTankPacket } from "../network/tank-handler";

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
        player.leaveWorld(false);
        void player.saveToDatabase();
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

      try {
        await this.handlePacket(player, data);
      } catch (err) {
        // a bad packet or a vanished peer must never take the server down
        logger.error({ err, id: player.id }, "failed to handle incoming packet");
      }

      this.emit("player:receive", player, packet, channelID);
    });
  }

  /**
   * Decodes one incoming packet and dispatches it to the text or tank handlers.
   */
  private async handlePacket(player: Player, data: Uint8Array): Promise<void> {
    {
      const buf = new ExtendBuffer(Array.from(data));
      const type = buf.readI32();
      // in-game protocol inspection during development: text packets only,
      // game packets (movement) arrive many times per second and would flood the console
      if (isDevelopment() && type !== PACKET_TYPE.GAME_PACKET) {
        const packetTypeName = PACKET_TYPE[type] ?? "UNKNOWN";
        player.variants.sendOnConsoleMessage(new TextColor().dev("[DEBUG] ").white("Packet: ").yellow(packetTypeName).lightGray(` (${type})`).str());
      }

      switch (type) {
        case PACKET_TYPE.GENERIC_TEXT:
        case PACKET_TYPE.GAME_MESSAGE:
          // the text ends at the first null terminator; the client sometimes
          // sends junk bytes after it, which must never reach the parser
          const terminator = data.indexOf(0, 4);
          const payload = Buffer.from(data.slice(4, terminator === -1 ? data.length : terminator))
            .toString("utf-8")
            // control characters and the replacement character of invalid bytes
            .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f�]/g, "");
          const text = new TextParser(payload);
          logger.debug({ netID: player.netID, action: text.get("action") || undefined, keys: text.getEntries().map(([key]) => key) }, "text packet received");

          if (text.contains("action")) {
            const action = text.get("action");

            try {
              const actionFunc = GameMessageMap[action];

              if (actionFunc) {
                await actionFunc(player, text);
              } else {
                throw new Error(`unknown action: ${action}`);
              }
            } catch (e) {
              logger.error(e, "failed to handle action");
            }
          }

          // this is how it handles server static content requests
          if (text.contains("tankIDName") && !text.contains("ltoken") && text.contains("token")) {
            // lift the GDPR chat restriction before the logon is accepted
            player.variants.sendOnOverrideGdprFromServer(Math.max(18, text.getInt("player_age", 0, 18)));
            player.variants.sendSuperMain(text.getInt("protocol", 0, 216));
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
              sessionToken,
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

            // load role, gems, level and inventory from the database
            const record = await PlayerDB.getById(player.playerId);
            if (record) {
              player.loadFromRecord(record);
            } else {
              player.loadFromRecord({ id: player.playerId, name: player.tankIDName, display_name: player.tankIDName } as Parameters<typeof player.loadFromRecord>[0]);
              logger.warn({ id: player.id, playerId: player.playerId }, "player record not found, using defaults");
            }

            // a second game connection of the same account replaces the first
            // one; the login connection that redirected us is skipped because
            // it is already closing
            const previous = serverManager.players.find((other) => other !== player && other.playerId === player.playerId && other.hasStateStatus(PlayerStateFlags.IN_GAME));
            if (previous) {
              previous.variants.sendOnConsoleMessage("`4Someone else logged into this account.``");
              previous.leaveWorld(false);
              previous.disconnectLater();
            }

            // the client treats the connection as a guest (chat disabled, no
            // profile) until it is told the GrowID it is logged in with
            const savedToken = player.auth.metadata.tankIDPass || player.auth.transferSession?.sessionToken || "";
            player.variants.sendSetHasGrowID(true, player.tankIDName, savedToken);
            player.variants.sendOnSetFeatureEnableFlags();
            logger.info({ id: player.id, playerId: player.playerId, name: player.tankIDName }, "player sub-server transfer verified successfully");
          }

          break;

        case PACKET_TYPE.GAME_PACKET:
          await handleTankPacket(player, GameUpdatePacket.fromExtendBuffer(buf));
          break;
      }

    }
  }
}
