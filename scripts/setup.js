const fs = require("fs");

if (!fs.existsSync("./data")) {
  fs.mkdirSync("./data");
}

if (!fs.existsSync("./.env")) {
  fs.writeFileSync(
    "./.env",
    "ENCRYPT_SECRET=SUPERSECRET # Default encrypt secret\nWEB_ADDRESS=127.0.0.1\nWEB_ENV=development"
  );
}
