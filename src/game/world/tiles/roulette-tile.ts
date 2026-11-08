import type { Player } from "../../player";
import { Tile } from "../tile";
import { LockPermission, TileFlags } from "../constants";

/** Item ids of the two blocks that spin: the roulette wheel and the slot machine. */
const ROULETTE_WHEEL = 758;
const SLOT_MACHINE = 756;
/** The wheel has 37 slots (0..36); the slot machine has ten outcomes. */
const ROULETTE_SLOTS = 37;
const SLOT_OUTCOMES = 10;
/** Wheel numbers drawn in red; 0 is green and everything else is blue. */
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

/**
 * Roulette Wheel and Slot Machine (`SFX_FOREGROUND` blocks, no extra data).
 *
 * Punching spins the block and announces the result to the world, as in the
 * legacy server: the wheel rolls 0..36, the slot machine wins on a single
 * outcome out of ten.
 */
export class RouletteTile extends Tile {
  private get spinsWheel(): boolean {
    return this.data.fg === ROULETTE_WHEEL || this.data.bg === ROULETTE_WHEEL;
  }

  public override async onPunch(player: Player): Promise<boolean> {
    const permitted = await this.world.hasTilePermission(player, this.data, LockPermission.BREAK);

    if (!permitted) {
      await this.onPunchFail(player);
      if (!(this.data.flags & TileFlags.PUBLIC)) return false;
      this.spin(player);
      return true;
    }

    this.spin(player);
    return super.onPunch(player);
  }

  /** Rolls the block and announces the number to everyone in the world. */
  private spin(player: Player): void {
    const wheel = this.spinsWheel;
    const roll = Math.floor(Math.random() * (wheel ? ROULETTE_SLOTS : SLOT_OUTCOMES));
    const name = `${player.formattedName}\`\``;
    let message: string;

    if (wheel) {
      const color = roll === 0 ? "`2" : RED_NUMBERS.has(roll) ? "`4" : "`b";
      message = `\`7[\`\`${name} spun the wheel and got ${color}${roll}\`\`!\`7]\`\``;
    } else {
      message = `\`7[\`\`${name} ${roll === 1 ? "`2wins at slots!`" : "`4loses at slots.`"}\`7]\`\``;
    }

    for (const other of this.world.players) {
      other.variants.sendOnTalkBubble(player.netID, message, false);
      other.variants.sendOnConsoleMessage(message);
    }
    this.world.playPositioned(wheel ? "audio/wheel.wav" : roll === 1 ? "audio/slot_win.wav" : "audio/slot_lose.wav", player.netID);
  }
}
