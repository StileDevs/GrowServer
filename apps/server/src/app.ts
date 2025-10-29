import { Base } from "./core/Base";
import dotenv from "dotenv";

dotenv.config();

const server = new Base();
server.start();

process.on("SIGINT", () => server.shutdown());
process.on("SIGQUIT", () => server.shutdown());
process.on("SIGTERM", () => server.shutdown());
