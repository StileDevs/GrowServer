import { type NonEmptyObject } from "type-fest";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { CharacterState, ROLE } from "../../Constants";
import { Variant } from "growtopia.js";

export class DebugConfirm {
  constructor(
    public base: Base,
    public peer: Peer,
    public action: NonEmptyObject<Record<string, string>>
  ) { }

  public async execute(): Promise<void> {
    if (this.peer.data.role !== ROLE.DEVELOPER) {
      this.peer.send(Variant.from("OnConsoleMessage", "`4You are not authorized."));
      return;
    }

    if (this.action.mod_reset_all === "1") {
      this.peer.data.state.mod = 0;
      this.peer.send(Variant.from("OnConsoleMessage", "`4All mods reset."));
      this.peer.sendState();
      return;
    }

    if (this.action.mod_select_all === "1") {
      let all = 0;
      for (const value of Object.values(CharacterState)) {
        if (typeof value === "number") all |= value;
      }
      this.peer.data.state.mod = all;
      this.peer.send(Variant.from("OnConsoleMessage", "`2All mods enabled."));
      this.peer.sendState();
      return;
    }

    const stateToggles: Record<string, number> = {
      mod_walk_in_blocks: CharacterState.WALK_IN_BLOCKS,
      mod_double_jump: CharacterState.DOUBLE_JUMP,
      mod_is_invisible: CharacterState.IS_INVISIBLE,
      mod_no_hands: CharacterState.NO_HANDS,
      mod_no_eyes: CharacterState.NO_EYES,
      mod_no_body: CharacterState.NO_BODY,
      mod_devil_horns: CharacterState.DEVIL_HORNS,
      mod_golden_halo: CharacterState.GOLDEN_HALO,
      mod_is_frozen: CharacterState.IS_FROZEN,
      mod_is_cursed: CharacterState.IS_CURSED,
      mod_is_ductaped: CharacterState.IS_DUCTAPED,
      mod_have_cigar: CharacterState.HAVE_CIGAR,
      mod_is_shining: CharacterState.IS_SHINING,
      mod_is_zombie: CharacterState.IS_ZOMBIE,
      mod_hit_by_lava: CharacterState.IS_HIT_BY_LAVA,
      mod_haunted_shadows: CharacterState.HAVE_HAUNTED_SHADOWS,
      mod_geiger: CharacterState.HAVE_GEIGER_RADIATION,
      mod_reflector: CharacterState.HAVE_REFLECTOR,
      mod_egged: CharacterState.IS_EGGED,
      mod_pineapple_float: CharacterState.HAVE_PINEAPPLE_FLOAT,
      mod_flying_pineapple: CharacterState.HAVE_FLYING_PINEAPPLE,
      mod_supporter_name: CharacterState.HAVE_SUPER_SUPPORTER_NAME,
      mod_super_pineapple: CharacterState.HAVE_SUPER_PINEAPPLE,
    };

    for (const [key, flag] of Object.entries(stateToggles)) {
      if (this.action[key] === "SELECTED") {
        this.peer.data.state.mod |= flag;
      } else {
        this.peer.data.state.mod &= ~flag;
      }
    }

    this.peer.sendState();
    this.peer.send(Variant.from("OnConsoleMessage", "`2Player states updated."));
  }
}

export { DebugConfirm as DebugConfirmCommand };
