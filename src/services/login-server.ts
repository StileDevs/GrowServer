import { Hono, type Context } from "hono";
import { z } from "zod";
import { LOGIN, LOGIN_TYPE } from "../constants";
import { TextParser } from "../utils/text-parser";
import { logger } from "../utils/logger";
import { PlayerDB, AccountDB, SessionDB } from "../database/services";
import { HTML_TEMPLATES, type HtmlTemplateName } from "../resources";

/**
 * Zod validation schema for GrowID login requests.
 */
const LoginSchema = z.object({
  growId: z
    .string()
    .trim()
    .min(3, "GrowID must be at least 3 characters long")
    .max(18, "GrowID must not exceed 18 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "GrowID can only contain letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters long").max(128, "Password must not exceed 128 characters"),
  data: z.string().optional().default(""),
});

/**
 * Zod validation schema for GrowID registration requests.
 */
const RegisterSchema = z
  .object({
    growId: z
      .string()
      .trim()
      .min(3, "GrowID must be at least 3 characters long")
      .max(18, "GrowID must not exceed 18 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "GrowID can only contain letters, numbers, and underscores"),
    password: z.string().min(6, "Password must be at least 6 characters long").max(128, "Password must not exceed 128 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    data: z.string().optional().default(""),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Options for rendering HTML portal templates.
 */
interface RenderTemplateOptions {
  data?: string;
  error?: string;
  growId?: string;
  activeTab?: "login" | "register";
}

/**
 * Safely escapes HTML special characters.
 */
function escapeHtml(str: string): string {
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

/**
 * Helper to render statically embedded HTML templates with variable replacements.
 */
function renderTemplate(fileName: HtmlTemplateName, options: RenderTemplateOptions = {}): string {
  let content: string = HTML_TEMPLATES[fileName] || "";

  const data = options.data || "";
  const error = options.error || "";
  const growId = options.growId || "";
  const activeTab = options.activeTab || "login";

  const alertClass = error ? "error" : "";
  const alertStyle = error ? "display: block;" : "display: none;";

  content = content.replaceAll("{{DATA}}", escapeHtml(data));
  content = content.replaceAll("{{ERROR_MSG}}", escapeHtml(error));
  content = content.replaceAll("{{ALERT_CLASS}}", alertClass);
  content = content.replaceAll("{{ALERT_STYLE}}", alertStyle);
  content = content.replaceAll("{{GROWID}}", escapeHtml(growId));
  content = content.replaceAll("{{ACTIVE_TAB}}", activeTab);

  return content;
}

/**
 * Determines whether the incoming request expects a JSON response.
 */
function isJsonRequest(c: Context): boolean {
  const accept = c.req.header("accept") || "";
  const contentType = c.req.header("content-type") || "";
  const xRequestedWith = c.req.header("x-requested-with") || "";

  return accept.includes("application/json") || contentType.includes("application/json") || xRequestedWith.toLowerCase() === "xmlhttprequest";
}

/**
 * Resolves the appropriate HTML template based on request referer or route.
 */
function getTemplateForRequest(c: Context, defaultTemplate: HtmlTemplateName): HtmlTemplateName {
  const referer = c.req.header("referer") || "";
  if (referer.includes("/login") && !referer.includes("/dashboard")) {
    return "login.html";
  }
  if (referer.includes("/register") && !referer.includes("/dashboard")) {
    return "register.html";
  }
  return defaultTemplate;
}

/**
 * Helper to extract request body fields regardless of JSON or urlencoded form submission.
 */
async function parseRequestBody(c: Context): Promise<Record<string, unknown>> {
  const contentType = c.req.header("content-type") || "";
  let body: Record<string, unknown> = {};

  if (contentType.includes("application/json")) {
    body = await c.req.json().catch(() => ({}));
  } else {
    body = await c.req.parseBody().catch(() => ({}));
  }

  // If clientData or data is provided, parse clientData
  const clientData = (typeof body["clientData"] === "string" && body["clientData"]) || (typeof body["data"] === "string" && body["data"]) || "";

  if (clientData) {
    const textParser = new TextParser(clientData);
    if (!body["growId"] && textParser.get("tankIDName")) {
      body["growId"] = textParser.get("tankIDName");
    }
    if (!body["password"] && textParser.get("tankIDPass")) {
      body["password"] = textParser.get("tankIDPass");
    }
    body["data"] = clientData;
    body["clientData"] = clientData;
  }

  // Normalize possible alternate field names
  if (!body["growId"] && body["tankIDName"]) body["growId"] = body["tankIDName"];
  if (!body["password"] && body["tankIDPass"]) body["password"] = body["tankIDPass"];

  return body;
}

/**
 * Helper to extract client IP address.
 */
function getClientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  }
  return c.req.header("cf-connecting-ip") || "127.0.0.1";
}

/**
 * Encodes authenticated token and metadata into standard base64 Growtopia login token.
 */
export function generateLoginToken(username: string, loginData: string, type: LOGIN_TYPE): string {
  const params = new URLSearchParams({
    _token: username,
    loginData,
    type,
  });

  return Buffer.from(params.toString()).toString("base64");
}

/**
 * Encodes authenticated token and metadata into standard Growtopia login payload format.
 */
export function createLoginData(_token: string, loginData: string, type: LOGIN_TYPE): string {
  const token = generateLoginToken(_token, loginData, type);

  return JSON.stringify({
    status: "success",
    message: "Account Validated.",
    token,
    url: "",
    accountType: "growtopia",
    accountAge: 25,
  });
}

/**
 * Starts the HTTP Login web server for client webview authentication.
 */
export async function createLoginServer(): Promise<void> {
  const app = new Hono();

  app.get("/", async (c) => {
    return c.text("OK");
  });

  app.get("/favicon.ico", (c) => {
    return c.body(null, 204);
  });

  // Growtopia dashboard webview endpoint (Route 1)
  const handleDashboard = async (c: Context) => {
    let queryData = c.req.query("data") || c.req.query("clientData") || "";
    if (!queryData && c.req.method === "POST") {
      const body = await parseRequestBody(c);
      if (typeof body["clientData"] === "string" && body["clientData"]) {
        queryData = body["clientData"];
      } else if (typeof body["data"] === "string" && body["data"]) {
        queryData = body["data"];
      } else {
        queryData = await c.req.text().catch(() => "");
      }
    }

    const textParser = new TextParser(queryData);
    const prefillGrowId = textParser.get("tankIDName") || "";

    const html = renderTemplate("dashboard.html", {
      data: queryData,
      growId: prefillGrowId,
    });
    return c.html(html);
  };

  app.all("/player/login/dashboard", handleDashboard);
  app.all("/dashboard", handleDashboard);

  // Growtopia checktoken endpoint (first step in WebView2 / CEF authentication)
  const handleCheckToken = async (c: Context) => {
    const rawBody = await parseRequestBody(c);
    const queryData = c.req.query("clientData") || c.req.query("data") || "";
    const bodyData = (typeof rawBody["clientData"] === "string" && rawBody["clientData"]) || (typeof rawBody["data"] === "string" && rawBody["data"]) || "";
    let data = bodyData || queryData;

    if (!data && c.req.method === "POST") {
      data = await c.req.text().catch(() => "");
    }

    const rawToken =
      (typeof rawBody["refreshToken"] === "string" && rawBody["refreshToken"]) ||
      (typeof rawBody["token"] === "string" && rawBody["token"]) ||
      (typeof rawBody["_token"] === "string" && rawBody["_token"]) ||
      c.req.query("token") ||
      c.req.query("refreshToken") ||
      "";

    let username = typeof rawBody["growId"] === "string" ? rawBody["growId"] : "";
    let password = typeof rawBody["password"] === "string" ? rawBody["password"] : "";

    // If token exists, try to extract credentials from encoded loginData
    if (rawToken) {
      try {
        const decoded = Buffer.from(rawToken, "base64").toString("utf-8");
        const params = new URLSearchParams(decoded);
        const loginData = params.get("loginData");
        if (loginData) {
          const parser = new TextParser(loginData);
          const parsedUser = parser.get("tankIDName");
          const parsedPass = parser.get("tankIDPass");
          if (parsedUser) username = parsedUser;
          if (parsedPass) password = parsedPass;
        }
      } catch {
        // Token decode failed
      }
    }

    // If credentials are present, attempt automatic validation and redirect to validate route
    if (username && password) {
      const accountWithPlayer = await AccountDB.getWithPlayer("credential", username);
      let player = accountWithPlayer?.player;
      let storedPasswordHash = accountWithPlayer?.account.password;

      if (!player) {
        const legacyPlayer = await PlayerDB.getByName(username);
        if (legacyPlayer && legacyPlayer.password) {
          player = legacyPlayer;
          storedPasswordHash = legacyPlayer.password;

          await AccountDB.create({
            player_id: legacyPlayer.id,
            provider_id: "credential",
            account_id: legacyPlayer.name,
            password: legacyPlayer.password,
          }).catch(() => {});
        }
      }

      if (player && storedPasswordHash) {
        const match = await Bun.password.verify(password, storedPasswordHash);
        if (match) {
          const clientIp = getClientIp(c);
          const userAgent = c.req.header("user-agent") || null;

          await SessionDB.create(player.id, { ipAddress: clientIp, userAgent, ttlDays: 30 });
          await PlayerDB.updateLastSeen(player.id, clientIp);

          const textParser = new TextParser(data || "");
          textParser.set("tankIDName", player.name);
          textParser.set("tankIDPass", password);
          const updatedLoginData = textParser.toString();

          const token = generateLoginToken(player.name, updatedLoginData, LOGIN_TYPE.LOGIN);

          logger.info({ playerId: player.id, name: player.name }, "player token verified automatically");

          return c.redirect(`/player/growid/validate/checktoken/${encodeURIComponent(token)}`, 302);
        }
      }
    }

    // If token is missing, expired, or invalid, display dashboard portal
    const textParser = new TextParser(data);
    const prefillGrowId = textParser.get("tankIDName") || username || "";

    const html = await renderTemplate("dashboard.html", {
      data,
      growId: prefillGrowId,
    });
    return c.html(html);
  };

  app.all("/player/growid/checktoken", handleCheckToken);

  // Validated token response endpoint (Where CEF / WebView2 intercepts and captures the token)
  const handleValidateCheckToken = async (c: Context) => {
    let token = c.req.param("token") || c.req.query("token") || "";
    if (!token) {
      const path = c.req.path;
      const prefix = "/player/growid/validate/checktoken/";
      if (path.startsWith(prefix)) {
        token = path.slice(prefix.length);
      }
    }

    const decodedToken = decodeURIComponent(token);

    logger.info("player validate checktoken response sent");

    const payload = JSON.stringify({
      status: "success",
      message: "Account Validated.",
      token: decodedToken,
      url: "",
      accountType: "growtopia",
      accountAge: 25,
    });

    return c.html(payload);
  };

  app.all("/player/growid/validate/checktoken/:token{.*}", handleValidateCheckToken);

  // Dedicated Login routes
  const handleLoginPage = async (c: Context) => {
    const queryData = c.req.query("clientData") || c.req.query("data") || "";
    const html = await renderTemplate("login.html", { data: queryData });
    return c.html(html);
  };

  app.get("/player/growid/login/validate", handleLoginPage);
  app.get("/login", handleLoginPage);

  // Dedicated Register routes
  const handleRegisterPage = async (c: Context) => {
    const queryData = c.req.query("clientData") || c.req.query("data") || "";
    const html = await renderTemplate("register.html", { data: queryData });
    return c.html(html);
  };

  app.get("/player/growid/register/validate", handleRegisterPage);
  app.get("/register", handleRegisterPage);

  // Login POST validation handler (Redirects to /player/growid/validate/checktoken/:token)
  const handleLoginValidation = async (c: Context) => {
    const rawBody = await parseRequestBody(c);
    const parsed = LoginSchema.safeParse(rawBody);

    const isJson = isJsonRequest(c);
    const data = (typeof rawBody["clientData"] === "string" && rawBody["clientData"]) || (typeof rawBody["data"] === "string" && rawBody["data"]) || "";
    const rawGrowId = typeof rawBody["growId"] === "string" ? rawBody["growId"] : "";

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "invalid input data";
      if (isJson) {
        return c.json({ status: "error", message: firstError }, 400);
      }
      const template = getTemplateForRequest(c, "dashboard.html");
      const html = await renderTemplate(template, {
        data,
        error: firstError,
        growId: rawGrowId,
        activeTab: "login",
      });
      return c.html(html);
    }

    const { growId, password, data: parsedData } = parsed.data;

    // 1. Try to find account with player data using Better-Auth style join
    const accountWithPlayer = await AccountDB.getWithPlayer("credential", growId);

    let player = accountWithPlayer?.player;
    let storedPasswordHash = accountWithPlayer?.account.password;

    // Fallback: If not yet in accounts table, check legacy player password
    if (!player) {
      const legacyPlayer = await PlayerDB.getByName(growId);
      if (legacyPlayer && legacyPlayer.password) {
        player = legacyPlayer;
        storedPasswordHash = legacyPlayer.password;

        // Auto-create missing account record for future queries
        await AccountDB.create({
          player_id: legacyPlayer.id,
          provider_id: "credential",
          account_id: legacyPlayer.name,
          password: legacyPlayer.password,
        }).catch(() => {});
      }
    }

    if (!player || !storedPasswordHash) {
      const errorMsg = "Invalid GrowID or password.";
      if (isJson) {
        return c.json({ status: "error", message: errorMsg }, 400);
      }
      const template = getTemplateForRequest(c, "dashboard.html");
      const html = await renderTemplate(template, {
        data: parsedData || data,
        error: errorMsg,
        growId,
        activeTab: "login",
      });
      return c.html(html);
    }

    const passwordMatch = await Bun.password.verify(password, storedPasswordHash);
    if (!passwordMatch) {
      const errorMsg = "Invalid GrowID or password.";
      if (isJson) {
        return c.json({ status: "error", message: errorMsg }, 400);
      }
      const template = getTemplateForRequest(c, "dashboard.html");
      const html = await renderTemplate(template, {
        data: parsedData || data,
        error: errorMsg,
        growId,
        activeTab: "login",
      });
      return c.html(html);
    }

    const clientIp = getClientIp(c);
    const userAgent = c.req.header("user-agent") || null;

    // Create / refresh session
    await SessionDB.create(player.id, { ipAddress: clientIp, userAgent, ttlDays: 30 });
    await PlayerDB.updateLastSeen(player.id, clientIp);

    // Update metadata with authenticated player credentials
    const textParser = new TextParser(parsedData || data || "");
    textParser.set("tankIDName", player.name);
    textParser.set("tankIDPass", password);
    const updatedLoginData = textParser.toString();

    const token = generateLoginToken(player.name, updatedLoginData, LOGIN_TYPE.LOGIN);

    logger.info({ playerId: player.id, name: player.name }, "player authenticated successfully");

    return c.redirect(`/player/growid/validate/checktoken/${encodeURIComponent(token)}`, 302);
  };

  app.post("/player/growid/login/validate", handleLoginValidation);
  app.post("/login", handleLoginValidation);

  // Register POST validation handler (Redirects to /player/growid/validate/checktoken/:token)
  const handleRegisterValidation = async (c: Context) => {
    const rawBody = await parseRequestBody(c);
    const parsed = RegisterSchema.safeParse(rawBody);

    const isJson = isJsonRequest(c);
    const data = (typeof rawBody["clientData"] === "string" && rawBody["clientData"]) || (typeof rawBody["data"] === "string" && rawBody["data"]) || "";
    const rawGrowId = typeof rawBody["growId"] === "string" ? rawBody["growId"] : "";

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "invalid input data";
      if (isJson) {
        return c.json({ status: "error", message: firstError }, 400);
      }
      const template = getTemplateForRequest(c, "dashboard.html");
      const html = await renderTemplate(template, {
        data,
        error: firstError,
        growId: rawGrowId,
        activeTab: "register",
      });
      return c.html(html);
    }

    const { growId, password, data: parsedData } = parsed.data;
    const existingPlayer = await PlayerDB.exists(growId);
    const existingAccount = await AccountDB.getByProvider("credential", growId);

    if (existingPlayer || existingAccount) {
      const errorMsg = `GrowID '${growId}' is already registered.`;
      if (isJson) {
        return c.json({ status: "error", message: errorMsg }, 400);
      }
      const template = getTemplateForRequest(c, "dashboard.html");
      const html = await renderTemplate(template, {
        data: parsedData || data,
        error: errorMsg,
        growId,
        activeTab: "register",
      });
      return c.html(html);
    }

    const hashedPassword = await Bun.password.hash(password);
    const clientIp = getClientIp(c);
    const userAgent = c.req.header("user-agent") || null;

    // Parse hardware/client identifiers from game metadata
    const textParser = new TextParser(parsedData || data || "");
    const mac = textParser.get("mac") || null;
    const platformType = textParser.getInt("platformID", 0, -1);
    const hash = textParser.getInt("hash", 0, 0);

    const ridHex = textParser.get("rid") || "";
    const rid = ridHex ? Buffer.from(ridHex, "hex") : new Uint8Array(16);

    const gidHex = textParser.get("gid") || "";
    const gid = gidHex ? Buffer.from(gidHex, "hex") : new Uint8Array(16);

    const vidHex = textParser.get("vid") || "";
    const vid = vidHex ? Buffer.from(vidHex, "hex") : new Uint8Array(16);

    const sidHex = textParser.get("sid") || "";
    const sid = sidHex ? Buffer.from(sidHex, "hex") : new Uint8Array(16);

    // 1. Create player in players table
    const newPlayer = await PlayerDB.create({
      name: growId.toLowerCase(),
      display_name: growId,
      password: hashedPassword,
      mac,
      ip: clientIp,
      rid,
      gid,
      vid,
      sid,
      platform_type: platformType,
      hash,
      gems: 0,
      level: 1,
      xp: 0,
      skin_color: 0x80808080,
    });

    // 2. Create credential account in accounts table (Better-Auth pattern)
    await AccountDB.create({
      player_id: newPlayer.id,
      provider_id: "credential",
      account_id: newPlayer.name,
      password: hashedPassword,
    });

    // 3. Create active session in sessions table (Better-Auth pattern)
    await SessionDB.create(newPlayer.id, { ipAddress: clientIp, userAgent, ttlDays: 30 });

    textParser.set("tankIDName", newPlayer.name);
    textParser.set("tankIDPass", password);
    const updatedLoginData = textParser.toString();

    const token = generateLoginToken(newPlayer.name, updatedLoginData, LOGIN_TYPE.REGISTER);

    logger.info({ playerId: newPlayer.id, name: newPlayer.name }, "new player registered successfully");

    return c.redirect(`/player/growid/validate/checktoken/${encodeURIComponent(token)}`, 302);
  };

  app.post("/player/growid/register/validate", handleRegisterValidation);
  app.post("/register", handleRegisterValidation);

  Bun.serve({
    fetch: app.fetch,
    hostname: LOGIN.HOST,
    port: LOGIN.PORT,
  });

  logger.info({ host: LOGIN.HOST, port: LOGIN.PORT }, "login web server started");
}
