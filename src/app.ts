import { Base } from "./core/Base";
import dotenv from "dotenv";

dotenv.config();

const server = new Base();
server.start();
