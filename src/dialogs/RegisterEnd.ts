import { TankPacket, TextPacket, Variant } from "growtopia.js";
import { Dialog } from "../abstracts/Dialog";
import { BaseServer } from "../structures/BaseServer";
import { Peer } from "../structures/Peer";
import { DialogReturnType } from "../types/dialog";
import { DialogBuilder } from "../utils/builders/DialogBuilder";

export default class extends Dialog {
  constructor() {
    super();
    this.config = {
      dialogName: "register_end"
    };
  }

  public async handle(
    base: BaseServer,
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      username: string;
      password: string;
    }>
  ): Promise<void> {
    let dialog = new DialogBuilder()
      .defaultColor()
      .addTextBox("Register account")
      .addInputBox("username", "Username", action.username || "", 20)
      .raw(`\nadd_text_input_password|password|Password|${action.password || ""}|20|`)
      .addInputBox("password", "Password", "", 20)
      .endDialog("register_end", "", "Create")
      .addSpacer("big");

    if (!action.username) {
      dialog.addTextBox("`4ERROR:`` please input a username");
      return peer.send(Variant.from("OnDialogRequest", dialog.str()));
    }
    if (!action.password) {
      dialog.addTextBox("`4ERROR:`` please input a password");
      return peer.send(Variant.from("OnDialogRequest", dialog.str()));
    }

    const username: string = action.username.toLowerCase();

    const isValid = (str: string) => /^[a-zA-Z0-9\-]+$/.test(str);

    if (!isValid(username)) {
      dialog.addTextBox("`4ERROR:`` username has special character");
      return peer.send(Variant.from("OnDialogRequest", dialog.str()));
    }
    if (username.length < 5) {
      dialog.addTextBox("`4ERROR:`` username must had minimum 5 characters");
      return peer.send(Variant.from("OnDialogRequest", dialog.str()));
    }

    const ifUserExist = await base.database.getUser(username);
    let userExist = ifUserExist?.name.toLowerCase();

    if (username === userExist) {
      dialog.addTextBox("`4ERROR:`` user already exist");
      return peer.send(Variant.from("OnDialogRequest", dialog.str()));
    }

    let result = await base.database.createUser(action.username, action.password);
    if (result) {
      peer.send(Variant.from("OnConsoleMessage", "`2SUCCESS:`` Account has been created"));
      return peer.disconnect();
    } else {
      dialog.addTextBox("Error, failed to create account");
      peer.send(Variant.from("OnDialogRequest", dialog.str()));
      return peer.disconnect();
    }
  }
}
