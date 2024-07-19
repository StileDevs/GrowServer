"use strict";

import fs from "fs";

if (!fs.existsSync("./data")) {
  fs.mkdirSync("./data");
}

if (!fs.existsSync("./.env")) {
  fs.writeFileSync("./.env", "ENCRYPT_SECRET=SUPERSECRET # Default encrypt secret\nDISCORD_BOT_TOKEN=Tokxxxxxxxen");
}
