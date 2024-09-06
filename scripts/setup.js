"use strict";

import fs from "fs";
import axios from "axios";
import readline from "readline";
import decompress from "decompress";

const WEBSITE_BUILD_URL = "https://github.com/JadlionHD/growserver-frontend/releases/latest/download/build.zip";

function init() {
  setupEnv();
  downloadWebsiteBuild();
}

function setupEnv() {
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }

  if (!fs.existsSync("./.env")) {
    fs.writeFileSync("./.env", "ENCRYPT_SECRET=SUPERSECRET # Default encrypt secret\nDISCORD_BOT_TOKEN=Tokxxxxxxxen");
  }
}

// Downloading compiled website build.zip
async function downloadWebsiteBuild() {
  try {
    const writer = fs.createWriteStream("assets/build.zip");

    let downloadLen = 0;

    const result = await axios.get(WEBSITE_BUILD_URL, {
      responseType: "stream"
    });
    const totalLen = parseInt(result.headers["content-length"], 10);

    result.data.pipe(writer);

    result.data.on("data", (chunk) => {
      downloadLen += chunk.length;
      renderProgressBar(downloadLen, totalLen, "build.zip");
    });

    writer.on("finish", () => {
      console.log("\nDownload build.zip completed!");
      extractWebsiteBuild();
    });

    writer.on("error", (err) => {
      throw err;
    });
  } catch (e) {
    console.error("Error when fetching WEBSITE_BUILD_URL", e);
    return false;
  }
  return true;
}

// Extracting compiled website build.zip
async function extractWebsiteBuild() {
  try {
    console.log("Extracting build.zip...");
    await decompress("assets/build.zip", "assets");
    console.log("Extracting Completed");
  } catch (e) {
    console.error("Error when extracting", e);
  }
}

function renderProgressBar(downloaded, total, name) {
  const percentage = (downloaded / total) * 100;
  const progress = Math.floor(percentage / 2);
  const bar = "#".repeat(progress) + ".".repeat(50 - progress);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(`Downloading ${name} [${bar}] ${percentage.toFixed(2)}% (${downloaded}/${total} bytes)`);
}

init();
