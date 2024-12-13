import { Base } from "./core/Base";
import dotenv from "dotenv";

dotenv.config();

const server = new Base();
server.start();

process.on("SIGINT", () => server.saveAll(true));
process.on("SIGQUIT", () => server.saveAll(true));
process.on("SIGTERM", () => server.saveAll(true));
