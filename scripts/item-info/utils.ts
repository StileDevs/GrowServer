import { createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { request } from "undici";
import consola from "consola";


__dirname = process.cwd();

const ITEMS_DAT_URL = "https://raw.githubusercontent.com/StileDevs/itemsdat-archive/refs/heads/main";
const ITEMS_DAT_FETCH_URL = "https://raw.githubusercontent.com/StileDevs/itemsdat-archive/refs/heads/main/latest.json";


async function downloadFile(url: string, filePath: string) {
  try {
    const response = await request(url, {
      method:          "GET",
      headers:         {},
      maxRedirections: 5
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to download file: ${response.statusCode}`);
    }

    const fileStream = createWriteStream(filePath);

    response.body.pipe(fileStream);

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
    const response = await request(url, {
      method:          "GET",
      headers:         {},
      maxRedirections: 5
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to fetch JSON: ${response.statusCode}`);
    }

    const json = await response.body.json();
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


export  async function getLatestItemsDatName() {

  try {
    const itemsDat = await fetchJSON(ITEMS_DAT_FETCH_URL) as { content: string };

    return itemsDat.content
  } catch (e) {
    consola.error(`Failed to get latest CDN: ${e}`);
    return "";
  }
}