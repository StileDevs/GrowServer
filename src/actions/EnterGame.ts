import { Peer, Variant } from "growsockets";
import { Action } from "../abstracts/Action";
import { BaseServer } from "../structures/BaseServer";
import { DialogBuilder } from "../utils/builders/DialogBuilder";

export default class extends Action {
  constructor() {
    super();
    this.config = {
      eventName: "enter_game"
    };
  }

  public async handle(base: BaseServer, peer: Peer<{ netID: number }>): Promise<void> {
    const peerData = await peer.getDataFromCache();
    // console.log(peerData);
    //console.log(base.items.metadata);
    // base.items.metadata.then((data) => {
    //   let lol = data.items.find((v) => v.name === "Dirt");
    //   console.log(lol);
    // });

    //console.log(base.cache.users.get(`${peer.data.netID}`));
    const tes = new DialogBuilder()
      .defaultColor()
      .addLabelWithIcon("rtaa", "1000", "big")
      .addSpacer("small")
      .addTextBox("Welcome to aaaaa")
      .addQuickExit()
      .str();
    peer.send(
      Variant.from("OnRequestWorldSelectMenu"),
      Variant.from(
        "OnConsoleMessage",
        `Welcome \`1${
          base.cache.users.get(peer.data.netID)?.data.tankIDName
        }\`\`. Where would you like to go?`
      ),
      Variant.from({ delay: 100 }, "OnDialogRequest", tes)
    );
  }
}
