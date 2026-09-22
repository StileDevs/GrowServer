import { EventEmitter } from "events";
import type { Packet } from "growtopia.wasm";
import { GameServer } from "./game-server";
import { Player } from "../player";
import { Collection } from "../../utils/collection";
import { logger } from "../../utils/logger";

export type LoadBalanceStrategy = "least_connections" | "round_robin" | "random";

export interface ServerManagerEvents {
  "server:started": (server: GameServer, data: { port: number; serverLabel: string }) => void;
  "server:stopped": (server: GameServer, data: { port: number; serverLabel: string }) => void;
  "player:connect": (player: Player, server: GameServer) => void;
  "player:disconnect": (player: Player, server: GameServer) => void;
  "player:receive": (player: Player, packet: Packet, channelID: number, server: GameServer) => void;
}

export declare interface ServerManager {
  on<K extends keyof ServerManagerEvents>(event: K, listener: ServerManagerEvents[K]): this;
  off<K extends keyof ServerManagerEvents>(event: K, listener: ServerManagerEvents[K]): this;
  once<K extends keyof ServerManagerEvents>(event: K, listener: ServerManagerEvents[K]): this;
  emit<K extends keyof ServerManagerEvents>(event: K, ...args: Parameters<ServerManagerEvents[K]>): boolean;
}

export class ServerManager extends EventEmitter {
  private static instance: ServerManager;
  /** Collection of registered GameServer instances keyed by unique serverLabel */
  public servers: Collection<string, GameServer> = new Collection();
  /** Centralized collection of all online Player instances across all game servers */
  public players: Collection<string, Player> = new Collection();

  private roundRobinIndex = 0;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  public static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  /** Add and start a new GameServer instance with a unique serverLabel */
  public addServer(port: number, serverLabel?: string, maxPlayers = 1024): GameServer {
    const label = serverLabel ?? `server-${port}`;

    if (this.servers.has(label)) {
      logger.warn({ serverLabel: label, port }, "server label already exists in server manager");
      return this.servers.get(label)!;
    }

    const server = new GameServer(port, label, maxPlayers);
    this.servers.set(label, server);

    this.bindServerEvents(server);
    server.start();

    logger.info({ serverLabel: label, port }, "game server added and started");
    return server;
  }

  /** Relays events from an individual GameServer instance to global ServerManager listeners */
  private bindServerEvents(server: GameServer): void {
    server.on("server:started", (data) => {
      this.emit("server:started", server, data);
    });

    server.on("server:stopped", (data) => {
      this.emit("server:stopped", server, data);
    });

    server.on("player:connect", (player: Player) => {
      this.emit("player:connect", player, server);
    });

    server.on("player:disconnect", (player: Player) => {
      this.emit("player:disconnect", player, server);
    });

    server.on("player:receive", (player: Player, packet: Packet, channelID: number) => {
      this.emit("player:receive", player, packet, channelID, server);
    });
  }

  /** Stop a GameServer instance by its serverLabel or port */
  public stopServer(serverLabelOrPort: string | number): boolean {
    const label = typeof serverLabelOrPort === "number" ? `server-${serverLabelOrPort}` : serverLabelOrPort;
    const server = this.servers.get(label);
    if (!server) return false;

    server.removeAllListeners();
    server.stop();
    this.servers.delete(label);
    logger.info({ serverLabel: label }, "game server stopped");
    return true;
  }

  /** Get a GameServer instance by serverLabel */
  public getServer(serverLabel: string): GameServer | undefined {
    return this.servers.get(serverLabel);
  }

  /** Get all registered GameServer instances as an array */
  public getAllServers(): GameServer[] {
    return this.servers.toArray();
  }

  /** Register a connected player to the central players collection */
  public registerPlayer(player: Player): void {
    this.players.set(player.id, player);
    logger.info({ id: player.id, serverLabel: player.serverLabel, totalPlayers: this.players.size }, "player registered to server manager");
  }

  /** Unregister a disconnected player from the central players collection */
  public unregisterPlayer(player: Player): void {
    this.players.delete(player.id);
    logger.info({ id: player.id, serverLabel: player.serverLabel, totalPlayers: this.players.size }, "player unregistered from server manager");
  }

  /** Get all players connected to a specific game server by serverLabel */
  public getPlayersByServer(serverLabel: string): Collection<string, Player> {
    const result = new Collection<string, Player>();
    for (const [id, player] of this.players) {
      if (player.serverLabel === serverLabel) {
        result.set(id, player);
      }
    }
    return result;
  }

  /** Find an online player by tankIDName or displayName across all servers */
  public getPlayerByName(name: string): Player | undefined {
    const lowerName = name.toLowerCase();
    return this.players.find((p) => p.tankIDName.toLowerCase() === lowerName || p.displayName.toLowerCase() === lowerName);
  }

  /** Get an online player by global unique ID (e.g. "server-17091:0") */
  public getPlayerByID(id: string): Player | undefined {
    return this.players.get(id);
  }

  /** Get total online player count across all game servers */
  public getTotalPlayersCount(): number {
    return this.players.size;
  }

  /** Load balancer: Select optimal GameServer instance based on load balance strategy */
  public getOptimalServer(strategy: LoadBalanceStrategy = "least_connections"): GameServer | null {
    const availableServers = this.servers.filter((server) => server.playerCount < server.maxPlayers);

    if (availableServers.length === 0) {
      logger.error("no available game server to handle connection");
      return null;
    }

    switch (strategy) {
      case "least_connections": {
        return availableServers.reduce((prev, current) => (prev.playerCount <= current.playerCount ? prev : current));
      }

      case "round_robin": {
        const server = availableServers[this.roundRobinIndex % availableServers.length];
        this.roundRobinIndex = (this.roundRobinIndex + 1) % availableServers.length;
        return server ?? null;
      }

      case "random": {
        const randomIndex = Math.floor(Math.random() * availableServers.length);
        return availableServers[randomIndex] ?? null;
      }

      default:
        return availableServers[0] ?? null;
    }
  }

  /**
   * Super Broadcast (SB): Send a packet to ALL players across ALL active game servers.
   * Optionally ignore a specific sender by global player ID.
   */
  public broadcast(packet: Packet, ignorePlayerID?: string): void {
    for (const player of this.players.values()) {
      if (ignorePlayerID && player.id === ignorePlayerID) {
        continue;
      }
      player.send(packet);
    }
    logger.info({ totalServers: this.servers.size, totalPlayers: this.players.size }, "super broadcast packet sent across all servers");
  }

  /** Broadcast a packet to players in a specific world across all game servers */
  public broadcastToWorld(worldName: string, packet: Packet, ignorePlayerID?: string): void {
    const lowerWorld = worldName.toLowerCase();
    for (const player of this.players.values()) {
      if (player.currentWorld.toLowerCase() === lowerWorld && !(ignorePlayerID && player.id === ignorePlayerID)) {
        player.send(packet);
      }
    }
  }
}

export const serverManager = ServerManager.getInstance();
