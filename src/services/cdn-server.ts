import { Hono } from "hono";
import { readFile, stat } from "fs/promises";
import { join, extname, dirname, resolve } from "path";
import { CDN } from "../constants";
import { logger } from "../utils/logger";
import { serverConfig } from "../configs/server-config";

/**
 * Maps file extension to common MIME Content-Type.
 */
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".rttex":
      return "application/octet-stream";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".ogg":
      return "audio/ogg";
    case ".json":
      return "application/json";
    case ".txt":
      return "text/plain";
    case ".xml":
      return "application/xml";
    default:
      return "application/octet-stream";
  }
}

/**
 * Checks if a given file path exists and is a regular file.
 */
async function isRegularFile(filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

/**
 * Creates and starts the CDN HTTP server for serving game assets with upstream fallback.
 */
export async function createCdnServer(): Promise<void> {
  const app = new Hono();

  app.get("/", (c) => {
    return c.text("GrowServer CDN Asset Server");
  });

  // Catch-all route for static assets
  app.get("/*", async (c) => {
    const reqPath = c.req.path;
    if (reqPath.includes("..")) {
      return c.text("Forbidden", 403);
    }

    const defaultCdnServer = serverConfig?.game?.default_cdn_server || "growserver-cache.netlify.app";

    // Candidate 1: relative to cdn-static directly (e.g. /growserver/interface/banner.rttex)
    // Candidate 2: stripped /growtopia/ prefix (e.g. /growtopia/growserver/... -> growserver/...)
    const strippedPath = reqPath.replace(/^\/growtopia\//, "");
    const relativePaths = [
      strippedPath,
      reqPath.startsWith("/") ? reqPath.slice(1) : reqPath,
    ];

    const possibleBaseDirs = [
      join(process.cwd(), "resources", "cdn-static"),
      join(dirname(process.execPath), "resources", "cdn-static"),
    ];

    for (const baseDir of possibleBaseDirs) {
      const resolvedBase = resolve(baseDir);
      for (const rel of relativePaths) {
        const filePath = resolve(baseDir, rel);
        if (!filePath.startsWith(resolvedBase)) {
          continue;
        }

        if (await isRegularFile(filePath)) {
          try {
            const fileBuffer = await readFile(filePath);
            const mimeType = getMimeType(filePath);

            return c.body(fileBuffer, 200, {
              "Content-Type": mimeType,
              "Cache-Control": "public, max-age=86400",
              "Access-Control-Allow-Origin": "*",
            });
          } catch (err) {
            logger.error({ err, filePath }, "failed to read static cdn asset");
          }
        }
      }
    }

    // 404: Fallback redirect to upstream CDN (e.g. growserver-cache.netlify.app)
    const fallbackUrl = `https://${defaultCdnServer}${reqPath.startsWith("/") ? reqPath : `/${reqPath}`}`;
    logger.debug({ path: reqPath, fallbackUrl }, "cdn asset not found in local cache, redirecting to upstream");

    return c.redirect(fallbackUrl, 302);
  });

  Bun.serve({
    fetch: app.fetch,
    hostname: CDN.HOST,
    port: CDN.PORT,
  });

  logger.info({ host: CDN.HOST, port: CDN.PORT }, "cdn asset server started");
}
