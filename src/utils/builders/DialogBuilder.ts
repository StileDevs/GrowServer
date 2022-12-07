export class DialogBuilder {
  #str = "";
  constructor() {}

  /**
   * Sets the default color of the dialog
   * @param {string} color
   * @returns {this}
   */

  public defaultColor(color?: string): this {
    this.#str += `set_default_color|${color || "`o"}\n`;
    return this;
  }

  /**
   * Adds a spacer for the dialog
   * @param {string} type Spacer type, 'big' or 'small'
   * @returns {this}
   */

  public addSpacer(type: string): this {
    switch (type.toUpperCase()) {
      case "BIG":
        this.#str += "add_spacer|big|\n";
        break;

      case "SMALL":
        this.#str += "add_spacer|small|\n";
        break;
    }

    return this;
  }

  /**
   * Adds a label with an icon
   * @param {string} text Title of the label
   * @param {string} titleid The icon to add to the label
   * @param {string | number} type The type of the label, 'big' or 'small'
   * @returns {this}
   */

  public addLabelWithIcon(text: string, titleid: string, type: string): this {
    switch (type.toUpperCase()) {
      case "BIG":
        this.#str += `add_label_with_icon|big|${text}|left|${titleid}|\n`;
        break;

      case "SMALL":
        this.#str += `add_label_with_icon|small|${text}|left|${titleid}|\n`;
        break;
    }

    return this;
  }

  public embed<K, V>(key: K, val: V): this {
    this.#str += `embed_data|${key}|${val}\n`;
    return this;
  }

  /**
   * Adds a button
   * @param {string} name The name of the button
   * @param {string} text The text in the button
   * @returns {this}
   */

  public addButton(name: string, text: string): this {
    this.#str += `add_button|${name}|${text}|noflags|0|0|\n`;
    return this;
  }

  /**
   * Adds a button with icon.
   * @param {string | number} name The name of the button
   * @param {string | number} itemID The button icon using itemID
   * @param {string} text The text in the button
   */

  public addButtonWithIcon(name: string | number, itemID: string | number, text: string) {
    this.#str += `add_button_with_icon|${name}|${text}|left|${itemID}|\n`;
  }

  /**
   * Adds a checkbox
   * @param {string} name The name of the checkbox
   * @param {string} string The text in the checkbox
   * @param {string} type The type of the checkbox 'select' or 'not_selected'
   * @returns {this}
   */

  public addCheckbox(name: string, string: string, type: string): this {
    switch (type.toUpperCase()) {
      case "SELECTED":
        this.#str += `add_checkbox|${name}|${string}|1|\n`;
        break;

      case "NOT_SELECTED":
        this.#str += `add_checkbox|${name}|${string}|0|\n`;
        break;
    }

    return this;
  }

  /**
   * Adds a text box
   * @param {string} str The str to add
   * @returns {this}
   */

  public addTextBox(str: string): this {
    this.#str += `add_textbox|${str}|left|\n`;
    return this;
  }

  /**
   * Adds a small text
   * @param {string} str The text to add
   * @returns {this}
   */

  public addSmallText(str: string): this {
    this.#str += `add_smalltext|${str}|\n`;
    return this;
  }

  /**
   * Adds an input box
   * @param {string} name The id of the input box
   * @param {string} text The text beside it
   * @param {string} cont Default content?
   * @param {string | number} size The max size of the box
   * @returns {this}
   */

  public addInputBox(
    name: string = "",
    text: string = "",
    cont: string = "",
    size: string | number = 0
  ): this {
    this.#str += `add_text_input|${name}|${text}|${cont}|${size}|\n`;
    return this;
  }

  /**
   * Adds quick exit button
   * @returns {this}
   */

  public addQuickExit(): this {
    this.#str += "add_quick_exit|\n";
    return this;
  }

  /**
   * Adds buttons at the end of the dialog
   * @param {string} name The id of the dialog
   * @param {string} nvm The value of the button when you want it closed/cancelled.
   * @param {string} accept The value of the button when you want it to add a value to the 'dialog_return' packet
   * @returns {this}
   */

  public endDialog(name: string, nvm: string, accept: string): this {
    this.#str += `end_dialog|${name || ""}|${nvm || ""}|${accept || ""}|\n`;
    return this;
  }

  /**
   * Adds a raw dialog, useful if the function for that specific dialog would not be here
   * @param {string} str The dialog to add
   * @return {this}
   */

  public raw(str: string): this {
    this.#str += `${str}`;
    return this;
  }

  /**
   * Returns the created string
   * @returns {string}
   */

  public str(): string {
    return this.#str;
  }

  /**
   * Removes the value of the str to return
   * @return {this}
   */

  public reconstruct(): this {
    this.#str = "";
    return this;
  }
}
