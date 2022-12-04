import express from "express";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { Logger } from "./Logger";
const app = express();

let options = {
  key: readFileSync("./assets/ssl/server.key"),
  cert: readFileSync("./assets/ssl/server.crt")
};

export function WebServer(log: Logger) {
  app.use("/growtopia/server_data.php", (req, res) => {
    res.send(
      "server|127.0.0.1\nport|17091\ntype|1\n#maint|Maintenance woi\nmeta|lolwhat\nRTENDMARKERBS1001"
    );
  });

  let httpServer = http.createServer(app);
  let httpsServer = https.createServer(options, app);

  httpServer.listen(80);
  httpsServer.listen(443);

  httpsServer.on("listening", function () {
    log.ready("Starting web server");
  });
}
