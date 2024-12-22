import { createWriteStream, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { request } from "undici";
import consola from "consola";
import { execSync } from "child_process";
import net from "net";
import decompress from "decompress";

__dirname = process.cwd();
const MKCERT_URL = "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4";
const WEBSITE_BUILD_URL = "https://github.com/StileDevs/growserver-frontend/releases/latest/download/build.zip";

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

  if (!existsSync(join(__dirname, ".cache", "bin"))) mkdirSync(join(__dirname, ".cache", "bin"), { recursive: true });
  else return;

  consola.info("Downloading mkcert");
  await downloadFile(mkcertObj[checkPlatform], join(__dirname, ".cache", "bin", name));
}

export async function setupMkcert() {
  const name = process.platform === "darwin" || process.platform === "linux" ? "mkcert" : "mkcert.exe";
  const mkcertExecuteable = join(__dirname, ".cache", "bin", name);

  if (!existsSync(join(__dirname, ".cache", "ssl"))) mkdirSync(join(__dirname, ".cache", "ssl"), { recursive: true });
  else return;

  consola.info("Setup mkcert certificate");
  try {
    execSync(`${mkcertExecuteable} -install && cd ${join(__dirname, ".cache", "ssl")} && ${mkcertExecuteable} *.growserver.app`, { stdio: "ignore" });
  } catch (e) {
    consola.error("Something wrong when setup mkcert", e);
  }
}

export async function downloadWebsite() {
  if (!existsSync(join(__dirname, ".cache", "compressed"))) mkdirSync(join(__dirname, ".cache", "compressed"), { recursive: true });
  else return;

  consola.info("Downloading compiled website assets");
  await downloadFile(WEBSITE_BUILD_URL, join(__dirname, ".cache", "compressed", "build.zip"));
}

export async function setupWebsite() {
  if (!existsSync(join(__dirname, ".cache", "website"))) mkdirSync(join(__dirname, ".cache", "website"), { recursive: true });
  else return;

  consola.info("Setup website assets");
  try {
    decompress(join(__dirname, ".cache", "compressed", "build.zip"), join(__dirname, ".cache"));
  } catch (e) {
    consola.error("Something wrong when setup website", e);
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

export function hashItemsDat(file: Buffer) {
  let hash = 0x55555555;
  file.forEach((x) => (hash = (hash >>> 27) + (hash << 5) + x));
  return hash;
}

export function manageArray(arr: string[], length: number, newItem: string): string[] {
  if (arr.length > length) {
    arr.shift();
  }

  const existingIndex = arr.indexOf(newItem);
  if (existingIndex !== -1) {
    arr.splice(existingIndex, 1);
  }

  arr.push(newItem);

  return arr;
}

export const checkPortInUse = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net
      .createServer()
      .once("error", () => resolve(true))
      .once("listening", () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
};
