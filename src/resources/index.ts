import path from "path";
import fs from "fs/promises";
import dashboardHtml from "./web/dashboard.html" with { type: "text" };
import loginHtml from "./web/login.html" with { type: "text" };
import registerHtml from "./web/register.html" with { type: "text" };
import caddyfileDev from "./caddy/Caddyfile.dev" with { type: "text" };
import caddyfile from "./caddy/Caddyfile" with { type: "text" };
import bannerConf from "./custom-items/growserver/interface/banner/conf.toml" with { type: "text" };
import bannerPngPath from "./custom-items/growserver/interface/banner/banner.png";
import { logger } from "../utils/logger";

/**
 * Statically bundled HTML templates for single-executable binary and bun build compatibility.
 */
export const HTML_TEMPLATES = {
  "dashboard.html": dashboardHtml as unknown as string,
  "login.html": loginHtml as unknown as string,
  "register.html": registerHtml as unknown as string,
} as const;

/**
 * Statically bundled Caddy configuration templates.
 * Can be overwritten at runtime if local Caddyfiles exist on the filesystem.
 */
export const EMBEDDED_CONFIGS: Record<"Caddyfile.dev" | "Caddyfile", string> = {
  "Caddyfile.dev": caddyfileDev,
  "Caddyfile": caddyfile,
};

export interface EmbeddedCustomItemFile {
  relativePath: string;
  content: string | (() => Promise<Uint8Array>);
}

/**
 * Statically bundled custom item template assets.
 */
export const EMBEDDED_CUSTOM_ITEMS: EmbeddedCustomItemFile[] = [
  {
    relativePath: "growserver/interface/banner/conf.toml",
    content: bannerConf,
  },
  {
    relativePath: "growserver/interface/banner/banner.png",
    content: () => Bun.file(bannerPngPath).bytes(),
  },
];

/**
 * Auto-generates default custom item templates in resources/custom-items/ if they do not exist.
 */
export async function autoGenerateCustomItems(
  targetDir: string = path.resolve(process.cwd(), "resources", "custom-items")
): Promise<void> {
  let generatedAny = false;
  for (const item of EMBEDDED_CUSTOM_ITEMS) {
    const filePath = path.resolve(targetDir, item.relativePath);
    try {
      await fs.access(filePath);
    } catch {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      if (typeof item.content === "string") {
        await fs.writeFile(filePath, item.content, "utf-8");
      } else {
        const bytes = await item.content();
        await fs.writeFile(filePath, bytes);
      }
      generatedAny = true;
    }
  }

  if (generatedAny) {
    logger.info({ path: targetDir }, "auto-generated default custom items template");
  }
}

export type HtmlTemplateName = keyof typeof HTML_TEMPLATES;
export type EmbeddedConfigName = keyof typeof EMBEDDED_CONFIGS;
