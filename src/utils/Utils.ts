import { createWriteStream, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { request } from "undici";
import consola from "consola";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MKCERT_URL = "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4";

const mkcertObj: Record<string, string> = {
  "win32-x64": `${MKCERT_URL}/mkcert-v1.4.4-windows-amd64.exe`,
  "win32-arm64": `${MKCERT_URL}/mkcert-v1.4.4-windows-arm64.exe`,
  "linux-x64": `${MKCERT_URL}/mkcert-v1.4.4-linux-amd64`,
  "linux-arm": `${MKCERT_URL}/mkcert-v1.4.4-linux-arm`,
  "linux-arm64": `${MKCERT_URL}/mkcert-v1.4.4-linux-arm64`,
  "darwin-x64": `${MKCERT_URL}/mkcert-v1.4.4-darwin-amd64`,
  "darwin-arm64": `${MKCERT_URL}/mkcert-v1.4.4-darwin-arm64`
};

async function downloadFile(url: string, filePath: string) {
  try {
    const response = await request(url, {
      method: "GET",
      headers: {},
      maxRedirections: 5
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to download file: ${response.statusCode}`);
    }

    const fileStream = createWriteStream(filePath);

    response.body.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    consola.info(`File downloaded successfully to ${filePath}`);
  } catch (error) {
    consola.error("Error downloading file:", error);
  }
}

export async function downloadMkcert() {
  const checkPlatform = `${process.platform}-${process.arch}`;
  const name = process.platform === "darwin" || process.platform === "linux" ? "mkcert" : "mkcert.exe";

  if (!existsSync(join(__dirname, "..", ".cache", "bin"))) mkdirSync(join(__dirname, "..", ".cache", "bin"), { recursive: true });
  else return;

  consola.info("Downloading mkcert");
  await downloadFile(mkcertObj[checkPlatform], join(__dirname, "..", ".cache", "bin", name));
}

export async function setupMkcert() {
  const rootDir = join(__dirname, "..");
  const name = process.platform === "darwin" || process.platform === "linux" ? "mkcert" : "mkcert.exe";
  const mkcertExecuteable = join(rootDir, ".cache", "bin", name);

  if (!existsSync(join(__dirname, "..", ".cache", "ssl"))) mkdirSync(join(__dirname, "..", ".cache", "ssl"), { recursive: true });
  else return;

  consola.info("Setup mkcert certificate");
  try {
    execSync(`${mkcertExecuteable} -install && cd ${join(rootDir, ".cache", "ssl")} && ${mkcertExecuteable} *.growserver.app`, { stdio: "ignore" });
  } catch (e) {
    consola.error("Something wrong when setup mkcert", e);
  }
}

export function parseAction(chunk: Buffer): Record<string, string | number> {
  const data: Record<string, string | number> = {};
  chunk[chunk.length - 1] = 0;

  const str = chunk.toString("utf-8", 4);
  const lines = str.split("\n");

  lines.forEach((line) => {
    if (line.startsWith("|")) line = line.slice(1);
    const info = line.split("|");

    const key = info[0];
    let val = info[1];

    if (key && val) {
      if (val.endsWith("\x00")) val = val.slice(0, -1);
      data[key] = val;
    }
  });

  return data;
}
