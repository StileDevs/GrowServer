import { Variant } from "growtopia.js";
import { Dialog } from "../abstracts/Dialog.js";
import { BaseServer } from "../structures/BaseServer.js";
import { Peer } from "../structures/Peer.js";
import type { DialogReturnType } from "../types";
import { DialogBuilder } from "../utils/builders/DialogBuilder.js";

export default class extends Dialog {
  constructor(base: BaseServer) {
    super(base);
    this.config = {
      dialogName: "register_end"
    };
  }

  public async handle(
    peer: Peer,
    action: DialogReturnType<{
      action: string;
      dialog_name: string;
      username: string;
      password: string;
    }>
  ): Promise<void> {
    const dialog = new DialogBuilder()
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

    const ifUserExist = await this.base.database.getUser(username);
    const userExist = ifUserExist?.name.toLowerCase();

    if (username === userExist) {
      dialog.addTextBox("`4ERROR:`` user already exist");
      return peer.send(Variant.from("OnDialogRequest", dialog.str()));
    }

    const result = await this.base.database.createUser(action.username, action.password);
    if (result) {
      peer.send(Variant.from("OnConsoleMessage", "`2SUCCESS:`` Account has been created"));
      return peer.disconnect();
    }

    dialog.addTextBox("`4ERROR:`` failed to create account");
    peer.send(Variant.from("OnDialogRequest", dialog.str()));
    return peer.disconnect();
  }
}
