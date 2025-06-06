import { Variant } from "growtopia.js";
import { Peer } from "../core/Peer";
import { safeWrapper } from "../utils/Utils";

/**
 * VariantList class is a centeralize all packet variant type
 */
export class VariantList {
  private peer: Peer
  private stackVariant: Variant[] = [];

  constructor(peer: Peer) {
    this.peer = peer;
  }

  /**
   * Sends a variant to the peer.
   * This is a method to send variants to the peer and also clear the variant stack.
   * 
   * @param variant - The variant to send
   */
  public send = safeWrapper(
    () => {
      if (this.stackVariant.length > 0) {
        this.peer.send(...this.stackVariant);
      }

      this.stackVariant = [];
    }
  ) as () => void;

  /**
   * Returns the stack of variants.
   */
  public get variants() {
    return this.stackVariant;
  }

  public OnSetPos(netID: number, x: number, y: number, delay: number = 0): VariantList {
    this.stackVariant.push(
      Variant.from({ netID, delay }, "OnSetPos", [ x, y ])
    );

    return this;
  };

  public OnKilled(netID: number): VariantList {
    this.stackVariant.push(
      Variant.from({ netID }, "OnKilled")
    );
    return this;
  }

  public OnSetFreezeState(netID: number, state: number = 0, delay: number = 0): VariantList {
    this.stackVariant.push(
      Variant.from({ netID, delay }, "OnSetFreezeState", state)
    );
    return this;
  }

  public SetRespawnPos(netID: number, status: number = 0, delay: number = 0): VariantList {
    this.stackVariant.push(
      Variant.from({ netID, delay }, "SetRespawnPos", status)
    );
    return this;
  }

  public OnCountryState(netID: number, state: string): VariantList {
    this.stackVariant.push(
      Variant.from({ netID }, "OnCountryState", state)
    );
    return this;
  };

  /**
   * Sends a dialog request to display a custom dialog box to the player.
   * This is used for creating interactive menus, forms, and other UI elements.
   * 
   * @param dialog - The dialog content in Growtopia's dialog format
   * @param delay - (Optional) delay in milliseconds before showing the dialog
   * 
   * @example
   * // Basic dialog
   * this.peer.varlist.OnDialogRequest(
   *   "set_default_color|`o\n" +
   *   "add_label_with_icon|big|Welcome to Server!|left|1366|\n" +
   *   "add_spacer|small|\n" +
   *   "add_textbox|Welcome to our Growtopia server!|left|\n" +
   *   "end_dialog|welcome_dialog|Close||"
   * );
   * 
   * @example
   * // Dialog with delay
   * this.peer.varlist.OnDialogRequest(
   *   "set_default_color|`o\n" +
   *   "add_label_with_icon|big|Loading...|left|758|\n" +
   *   "end_dialog|loading_dialog|Cancel||",
   *   1000 // Shows after 1 second
   * );
   * 
   * @example
   * // Interactive dialog with buttons
   * this.peer.varlist.OnDialogRequest(
   *   "set_default_color|`o\n" +
   *   "add_label_with_icon|big|Shop|left|242|\n" +
   *   "add_spacer|small|\n" +
   *   "add_button|buy_item|Buy Item|noflags|0|0|\n" +
   *   "add_button|sell_item|Sell Item|noflags|0|0|\n" +
   *   "end_dialog|shop_dialog|Close|OK|"
   * );
   */
  public OnDialogRequest(dialog: string, delay: number = 0): VariantList {
    this.stackVariant.push(
      Variant.from({ delay }, "OnDialogRequest", dialog)
    );

    return this;
  }

  /**
   * Sends a message that will be displayed in the player's console chat.
   * This is commonly used for system messages, notifications, and general communication.
   * 
   * @param message - The text message to display in the player's console
   * 
   * @example
   * // Basic usage
   * this.peer.varlist.OnConsoleMessage("Welcome to the server!");
   * 
   * @example
   * // With color formatting
   * this.peer.varlist.OnConsoleMessage("`2Success: `wItem added to inventory!");
   * 
   * @example
   * // With dynamic content
   * const playerName = "Bob";
   * const gems = 1000;
   * this.peer.varlist.OnConsoleMessage(`\`9${playerName}\`w received \`$${gems}\`w gems!`);
   */
  public OnConsoleMessage(message: string): VariantList {
    this.stackVariant.push(
      Variant.from("OnConsoleMessage", message)
    );
    return this;
  }
}