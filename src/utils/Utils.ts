import { createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import consola from "consola";
import { execSync } from "child_process";
import net from "net";
import ky from "ky";
import decompress from "decompress";
import { ITEMS_DAT_URL, weatherIdMap } from "../Constants";

__dirname = process.cwd();



const MKCERT_URL =
  "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4";
const WEBSITE_BUILD_URL =
  "https://github.com/StileDevs/growserver-frontend/releases/latest/download/build.zip";

const mkcertObj: Record<string, string> = {
  "win32-x64":    `${MKCERT_URL}/mkcert-v1.4.4-windows-amd64.exe`,
  "win32-arm64":  `${MKCERT_URL}/mkcert-v1.4.4-windows-arm64.exe`,
  "linux-x64":    `${MKCERT_URL}/mkcert-v1.4.4-linux-amd64`,
  "linux-arm":    `${MKCERT_URL}/mkcert-v1.4.4-linux-arm`,
  "linux-arm64":  `${MKCERT_URL}/mkcert-v1.4.4-linux-arm64`,
  "darwin-x64":   `${MKCERT_URL}/mkcert-v1.4.4-darwin-amd64`,
  "darwin-arm64": `${MKCERT_URL}/mkcert-v1.4.4-darwin-arm64`
};

async function downloadFile(url: string, filePath: string) {
  try {
    const response = await ky.get(url, {
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    const fileStream = createWriteStream(filePath);
    
    for await (const chunk of response.body!) {
      fileStream.write(chunk);
    }
    fileStream.end();

    await new Promise<void>((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    consola.info(`File downloaded successfully to ${filePath}`);
  } catch (error) {
    consola.error("Error downloading file:", error);
  }
}

export async function fetchJSON(url: string) {
  try {
    const response = await ky.get(url, {
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.status}`);
    }

    const json = await response.json();
    return json;
  } catch (error) {
    consola.error("Error fetching JSON:", error);
  }
}

export async function downloadItemsDat(itemsDatName: string) {
  const datDir = join(__dirname, ".cache", "growtopia", "dat");

  
  if (!existsSync(datDir)) {
    mkdirSync(datDir, { recursive: true });
  }
  
  const currentVersion = itemsDatName.match(/items-v(\d+\.\d+)\.dat/)?.[1];
  
  if (!currentVersion) {
    consola.error("Invalid items.dat filename format");
    return;
  }

  const existingFiles = readdirSync(datDir);
  const versionRegex = /items-v(\d+\.\d+)\.dat/;
  
  for (const file of existingFiles) {
    const match = file.match(versionRegex);
    if (match) {
      const existingVersion = match[1];
      
      if (parseFloat(currentVersion) > parseFloat(existingVersion)) {
        unlinkSync(join(datDir, file));
        consola.info(`Removed older version: ${file}`);
      } else if (currentVersion === existingVersion) {
        consola.info(`items.dat version ${currentVersion} already exists`);
        return;
      }
    }
  }

  consola.info(`Downloading items.dat version ${currentVersion}`);
  await downloadFile(`${ITEMS_DAT_URL}/${itemsDatName}`, join(__dirname, ".cache", "growtopia", "dat", itemsDatName));
}

export async function downloadMkcert() {
  const checkPlatform = `${process.platform}-${process.arch}`;
  const name =
    process.platform === "darwin" || process.platform === "linux"
      ? "mkcert"
      : "mkcert.exe";

  if (!existsSync(join(__dirname, ".cache", "bin")))
    mkdirSync(join(__dirname, ".cache", "bin"), { recursive: true });
  else return;

  consola.info("Downloading mkcert");
  await downloadFile(
    mkcertObj[checkPlatform],
    join(__dirname, ".cache", "bin", name)
  );
}

export async function setupMkcert() {
  const name =
    process.platform === "darwin" || process.platform === "linux"
      ? "mkcert"
      : "mkcert.exe";
  const mkcertExecuteable = join(__dirname, ".cache", "bin", name);
  const sslDir = join(__dirname, ".cache", "ssl");


  if (!existsSync(sslDir))
    mkdirSync(sslDir, { recursive: true });
  else return;

  consola.info("Setup mkcert certificate");
  try {
    execSync(
      `${mkcertExecuteable} -install && cd ${join(__dirname, ".cache", "ssl")} && ${mkcertExecuteable} *.growserver.app`,
      { stdio: "inherit" }
    );
  } catch (e) {
    consola.error("Something wrong when setup mkcert", e);
  }
}

export async function downloadWebsite() {
  if (!existsSync(join(__dirname, ".cache", "compressed")))
    mkdirSync(join(__dirname, ".cache", "compressed"), { recursive: true });
  else return;

  consola.info("Downloading compiled website assets");
  await downloadFile(
    WEBSITE_BUILD_URL,
    join(__dirname, ".cache", "compressed", "build.zip")
  );
}

export async function setupWebsite() {
  if (!existsSync(join(__dirname, ".cache", "website")))
    mkdirSync(join(__dirname, ".cache", "website"), { recursive: true });
  else return;

  consola.info("Setup website assets");
  try {
    decompress(
      join(__dirname, ".cache", "compressed", "build.zip"),
      join(__dirname, ".cache")
    );
  } catch (e) {
    consola.error("Something wrong when setup website", e);
  }
}

export function parseAction(chunk: Buffer): Record<string, string> {
  const data: Record<string, string> = {};
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

export function manageArray(
  arr: string[],
  length: number,
  newItem: string
): string[] {
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


export function getWeatherId(blockId: number): number {
  return weatherIdMap[blockId] || 0;
}

// Return the current time in seconds (today)
export function getCurrentTimeInSeconds(): number {
  const now = new Date();
  const today_begin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const ms = now.getTime() - today_begin.getTime();
  const sec = Math.floor(ms / 1000);
  return sec;
}