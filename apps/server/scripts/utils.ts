import { createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import ky from "ky";
import consola from "consola";
import { execSync } from "child_process";


__dirname = process.cwd();

const MKCERT_URL =
"https://github.com/FiloSottile/mkcert/releases/download/v1.4.4";
const ITEMS_DAT_URL = "https://raw.githubusercontent.com/StileDevs/itemsdat-archive/refs/heads/main";
const ITEMS_DAT_FETCH_URL = "https://raw.githubusercontent.com/StileDevs/itemsdat-archive/refs/heads/main/latest.json";

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
  else return consola.ready("certificates already installed");

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


export  async function getLatestItemsDatName() {

  try {
    const itemsDat = await fetchJSON(ITEMS_DAT_FETCH_URL) as { content: string };

    return itemsDat.content
  } catch (e) {
    consola.error(`Failed to get latest CDN: ${e}`);
    return "";
  }
}
