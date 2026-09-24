import { DialogBuilder } from "../../utils/dialog-builder";
import { TextParser } from "../../utils/text-parser";
import { Collection } from "../../utils/collection";
import { LOGIN_TYPE, LOGON_MODE, PLATFORM_ID } from "../../constants";

/**
 * Interface representing all parsed authentication and hardware metadata from Growtopia client.
 */
export interface PlayerAuthMetadata {
  token: string;
  tankIDName: string;
  tankIDPass: string;
  requestedName: string;
  loginType: LOGIN_TYPE;
  mac: string;
  rid: string;
  gid: string;
  vid: string;
  sid: string;
  hash: number;
  hash2: number;
  fhash: number;
  platformID: PLATFORM_ID;
  deviceVersion: number;
  country: string;
  gameVersion: string;
  doorID: string;
  zf: number;
  wk: string;
  fz: number;
  lmode: LOGON_MODE | number;
  cbits: number;
  playerAge: number;
  gdpr: number;
  category: number;
  totalMs: number;
  klv: string;
  meta: string;
  user: string;
  uuid: string;
}

/**
 * Session data for validating cross-server and sub-server player transfers.
 */
export interface SubServerTransferSession {
  token: number;
  playerId: number | string;
  tankIDName: string;
  sourceServer: string;
  targetServer?: string | undefined;
  targetWorld?: string | undefined;
  targetDoor?: string | undefined;
  createdAt: number;
  expiresAt: number;
}

/**
 * Manages player authentication state, metadata parsing, ltoken decoding,
 * dialog generation, and sub-server transfer validations.
 */
export class PlayerAuth {
  /** Global in-memory transfer tokens across sub-servers */
  private static transferTokens: Collection<string, SubServerTransferSession> = new Collection();

  /** Unified client metadata object */
  public metadata: PlayerAuthMetadata;

  /** Raw metadata string representation */
  public rawMetadata = "";

  /** TextParser instance representing client parameters */
  public parser: TextParser = new TextParser();

  /** Whether the player has authenticated credentials */
  public isAuthenticated = false;

  /** Whether the current connection is an incoming sub-server transfer */
  public isSubServerTransfer = false;

  /** Active transfer session associated with this player */
  public transferSession: SubServerTransferSession | null = null;

  constructor() {
    this.metadata = PlayerAuth.createDefaultMetadata();
  }

  /**
   * Factory function returning a clean, default PlayerAuthMetadata object.
   */
  public static createDefaultMetadata(): PlayerAuthMetadata {
    return {
      token: "",
      tankIDName: "",
      tankIDPass: "",
      requestedName: "",
      loginType: LOGIN_TYPE.NONE,
      mac: "",
      rid: "",
      gid: "",
      vid: "",
      sid: "",
      hash: 0,
      hash2: 0,
      fhash: 0,
      platformID: PLATFORM_ID.UNKNOWN,
      deviceVersion: 0,
      country: "",
      gameVersion: "",
      doorID: "",
      zf: 0,
      wk: "",
      fz: 0,
      lmode: LOGON_MODE.WELCOME,
      cbits: 0,
      playerAge: 0,
      gdpr: 0,
      category: 0,
      totalMs: 0,
      klv: "",
      meta: "",
      user: "",
      uuid: "",
    };
  }

  /** Quick accessor for tankIDName */
  public get tankIDName(): string {
    return this.metadata.tankIDName;
  }

  /** Quick accessor for tankIDPass */
  public get tankIDPass(): string {
    return this.metadata.tankIDPass;
  }

  /** Quick accessor for token */
  public get token(): string {
    return this.metadata.token;
  }

  /** Quick accessor to determine if this is a sub-server transfer packet */
  public get isTransfer(): boolean {
    return this.metadata.lmode === LOGON_MODE.TRANSFER || this.isSubServerTransfer;
  }

  /**
   * Resets all authentication fields to default values.
   */
  public reset(): void {
    this.metadata = PlayerAuth.createDefaultMetadata();
    this.rawMetadata = "";
    this.parser = new TextParser();
    this.isAuthenticated = false;
    this.isSubServerTransfer = false;
    this.transferSession = null;
  }

  /**
   * Parses credentials and hardware metadata from a parsed TextParser instance.
   *
   * @param parser - The parsed TextParser containing client parameters.
   */
  public parseMetadata(parser: TextParser): void {
    this.parser = parser;
    this.rawMetadata = parser.toString();

    const lmode = parser.getInt("lmode", 0, LOGON_MODE.WELCOME);

    this.metadata = {
      token: parser.get("token"),
      tankIDName: parser.get("tankIDName"),
      tankIDPass: parser.get("tankIDPass"),
      requestedName: parser.get("requestedName"),
      loginType: (parser.get("type") as LOGIN_TYPE) || LOGIN_TYPE.NONE,
      mac: parser.get("mac"),
      rid: parser.get("rid"),
      gid: parser.get("gid"),
      vid: parser.get("vid"),
      sid: parser.get("sid"),
      hash: parser.getInt("hash", 0, 0),
      hash2: parser.getInt("hash2", 0, 0),
      fhash: parser.getInt("fhash", 0, 0),
      platformID: parser.getInt("platformID", 0, PLATFORM_ID.UNKNOWN) as PLATFORM_ID,
      deviceVersion: parser.getInt("deviceVersion", 0, 0),
      country: parser.get("country"),
      gameVersion: parser.get("game_version"),
      doorID: parser.get("doorID"),
      zf: parser.getInt("zf", 0, 0),
      wk: parser.get("wk"),
      fz: parser.getInt("fz", 0, 0),
      lmode,
      cbits: parser.getInt("cbits", 0, 0),
      playerAge: parser.getInt("player_age", 0, 0),
      gdpr: parser.getInt("GDPR", 0, 0),
      category: parser.getInt("category", 0, 0),
      totalMs: parser.getInt("totalMs", 0, 0),
      klv: parser.get("klv"),
      meta: parser.get("meta"),
      user: parser.get("user"),
      uuid: parser.get("UUID"),
    };

    if (lmode === LOGON_MODE.TRANSFER || (this.metadata.user.length > 0 && this.metadata.token.length > 0)) {
      this.isSubServerTransfer = true;
    }

    if (this.metadata.tankIDName.length > 0) {
      this.isAuthenticated = true;
    }
  }

  /**
   * Parses raw client packet login text payload.
   *
   * @param payload - Raw text string from client packet.
   * @returns true if parsed successfully, false otherwise.
   */
  public parseRaw(payload: string): boolean {
    try {
      const parser = new TextParser(payload);
      this.parseMetadata(parser);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Decodes and parses base64-encoded Growtopia ltoken payload.
   *
   * @param ltoken - The base64-encoded login token received from client.
   * @returns true if successfully decoded and parsed, false otherwise.
   */
  public parseLToken(ltoken: string): boolean {
    try {
      const decodedStr = Buffer.from(ltoken, "base64").toString("utf-8");
      const params = new URLSearchParams(decodedStr);

      const tokenParam = params.get("_token") || params.get("token") || "";
      const loginDataParam = params.get("loginData") || "";
      const typeParam = params.get("type");
      const usernameParam = params.get("username") || "";

      if (loginDataParam) {
        const metadataParser = new TextParser(loginDataParam);
        this.parseMetadata(metadataParser);
      }

      this.metadata.token = tokenParam;
      if (usernameParam && !this.metadata.tankIDName) {
        this.metadata.tankIDName = usernameParam;
      }
      if (typeParam !== null) {
        this.metadata.loginType = typeParam as LOGIN_TYPE;
      }

      if (this.metadata.tankIDName.length > 0) {
        this.isAuthenticated = true;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates if the player has valid authenticated credentials.
   *
   * @returns true if authenticated with non-empty tankIDName.
   */
  public validate(): boolean {
    return this.isAuthenticated && this.metadata.tankIDName.trim().length > 0;
  }

  /**
   * Prepares a sub-server transfer token and registers the transfer session.
   *
   * @param options - Target server and world details for the transfer.
   * @returns Generated SubServerTransferSession.
   */
  public prepareTransfer(options: {
    playerId: number | string;
    sourceServer: string;
    targetServer?: string | undefined;
    targetWorld?: string | undefined;
    targetDoor?: string | undefined;
    ttlSeconds?: number | undefined;
  }): SubServerTransferSession {
    const token = Math.floor(100000 + Math.random() * 900000);
    const ttlSeconds = options.ttlSeconds ?? 60;
    const now = Date.now();

    const session: SubServerTransferSession = {
      token,
      playerId: options.playerId,
      tankIDName: this.metadata.tankIDName,
      sourceServer: options.sourceServer,
      targetServer: options.targetServer,
      targetWorld: options.targetWorld,
      targetDoor: options.targetDoor,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    };

    PlayerAuth.transferTokens.set(String(token), session);
    this.transferSession = session;
    return session;
  }

  /**
   * Validates an incoming sub-server transfer token.
   *
   * @param token - Token passed by the client upon connecting to the sub-server.
   * @param expectedPlayerId - Optional player identifier to match against.
   * @returns true if the transfer token is valid and unexpired.
   */
  public validateSubServerTransfer(token?: string | number, expectedPlayerId?: string | number): boolean {
    const checkToken = String(token ?? this.metadata.token);
    const checkPlayerId = expectedPlayerId ?? this.metadata.user;

    const session = PlayerAuth.transferTokens.get(checkToken);
    if (!session) return false;

    if (Date.now() > session.expiresAt) {
      PlayerAuth.transferTokens.delete(checkToken);
      return false;
    }

    if (checkPlayerId && String(session.playerId) !== String(checkPlayerId)) {
      return false;
    }

    // Successfully verified, consume single-use transfer token
    PlayerAuth.transferTokens.delete(checkToken);
    this.transferSession = session;
    this.isAuthenticated = true;
    if (session.tankIDName && !this.metadata.tankIDName) {
      this.metadata.tankIDName = session.tankIDName;
    }

    return true;
  }

  /**
   * Cleans up expired sub-server transfer tokens.
   */
  public static cleanExpiredTransfers(): void {
    const now = Date.now();
    for (const [token, session] of PlayerAuth.transferTokens) {
      if (now > session.expiresAt) {
        PlayerAuth.transferTokens.delete(token);
      }
    }
  }
}
