import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { DialogBuilder } from "../../utils/builders/DialogBuilder";
import { Variant } from "growtopia.js";
import { CharacterState, ROLE } from "../../Constants";

export class DebugAction {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<Record<string, string>>
  ) { }

  public async execute(): Promise<void> {
    if (![ROLE.DEVELOPER].includes(this.peer.data.role)) {
      this.peer.send(Variant.from("OnConsoleMessage", "⚠️ You do not have permission to use /debug."));
      return;
    }

    const state = this.peer.data.state.mod || 0; // Ensure state is valid

    const dialog = new DialogBuilder()
      .defaultColor()
      .addQuickExit()
      .addLabelWithIcon("Debug Tools", 32, "big")
      .addTextBox("Toggle your playmods. Only visible to developers/admins.")
      .addLabel("Mod States")
      .addSpacer("small")
      .addCheckbox("mod_select_all", "Enable All Mods", "NOT_SELECTED")
      .addCheckbox("mod_reset_all", "Reset All Mods", "NOT_SELECTED")
      .addSpacer("small")
      .addLabel("Individual Mods")
      .addCheckbox("mod_walk_in_blocks", "Walk in Blocks", (state & CharacterState.WALK_IN_BLOCKS) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_double_jump", "Double Jump", (state & CharacterState.DOUBLE_JUMP) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_is_invisible", "Invisible", (state & CharacterState.IS_INVISIBLE) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_no_hands", "No Hands", (state & CharacterState.NO_HANDS) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_no_eyes", "No Eyes", (state & CharacterState.NO_EYES) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_no_body", "No Body", (state & CharacterState.NO_BODY) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_devil_horns", "Devil Horns", (state & CharacterState.DEVIL_HORNS) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_golden_halo", "Golden Halo", (state & CharacterState.GOLDEN_HALO) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_is_frozen", "Frozen", (state & CharacterState.IS_FROZEN) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_is_cursed", "Cursed", (state & CharacterState.IS_CURSED) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_is_ductaped", "Duct Taped", (state & CharacterState.IS_DUCTAPED) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_have_cigar", "Have Cigar", (state & CharacterState.HAVE_CIGAR) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_is_shining", "Shining", (state & CharacterState.IS_SHINING) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_is_zombie", "Zombie", (state & CharacterState.IS_ZOMBIE) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_hit_by_lava", "Hit by Lava", (state & CharacterState.IS_HIT_BY_LAVA) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_haunted_shadows", "Haunted Shadows", (state & CharacterState.HAVE_HAUNTED_SHADOWS) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_geiger", "Geiger Radiation", (state & CharacterState.HAVE_GEIGER_RADIATION) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_reflector", "Reflector", (state & CharacterState.HAVE_REFLECTOR) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_egged", "Egged", (state & CharacterState.IS_EGGED) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_pineapple_float", "Pineapple Float", (state & CharacterState.HAVE_PINEAPPLE_FLOAT) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_flying_pineapple", "Flying Pineapple", (state & CharacterState.HAVE_FLYING_PINEAPPLE) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_supporter_name", "Supporter Name", (state & CharacterState.HAVE_SUPER_SUPPORTER_NAME) ? "SELECTED" : "NOT_SELECTED")
      .addCheckbox("mod_super_pineapple", "Super Pineapple", (state & CharacterState.HAVE_SUPER_PINEAPPLE) ? "SELECTED" : "NOT_SELECTED")
      .endDialog("debug_confirm", "Close", "Apply")
      .str();

    console.log("Generated Dialog:", dialog); // Debug log
    this.peer.send(Variant.from("OnDialogRequest", dialog));
  }
}

export { DebugAction as DebugActionCommand };