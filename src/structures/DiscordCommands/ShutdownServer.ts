import { BaseServer } from "../BaseServer.js";
import { Message, type TextableChannel } from "eris";
import { handleSaveAll } from "../../utils/Utils.js";

export default async function ShutdownServer(server: BaseServer, args: string[], msg: Message<TextableChannel>) {
  if (msg.author.id !== server.config.discord.ownerId) return msg.channel.createMessage("Wait, Why would you do this?");

  server.log.action(`>> ${msg.author.username} << - executed the Shutdown command for discord bot`);
  handleSaveAll(server, true);
}
