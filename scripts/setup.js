"use strict";

import fs from "fs";

function init() {
  setupEnv();
}

function setupEnv() {
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }

  if (!fs.existsSync("./.env")) {
    fs.writeFileSync("./.env", "JWT_SECRET=SuperSecretDoNotShareToAnyoneElse\nDISCORD_BOT_TOKEN=Tokxxxxxxxen");
  }
}

init();
