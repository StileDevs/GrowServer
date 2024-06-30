"use strict";

import fs from "fs";

if (!fs.existsSync("./data")) {
  fs.mkdirSync("./data");
}

if (!fs.existsSync("./.env")) {
  fs.writeFileSync("./.env", "ENCRYPT_SECRET=SUPERSECRET # Default encrypt secret\nWEB_ADDRESS=127.0.0.1\nWEB_ENV=development\nDEBUG_MODE=false\nDISCORD_BOT_TOKEN=Tokxxxxxxxen\nDISCORD_BOT_CLIENTID=123xxxxx\nDISCORD_BOT_OWNERID=123xxxxx");
}
