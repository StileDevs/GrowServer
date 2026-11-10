import { TANK_PACKET_TYPE } from "../../constants";
import { getItem } from "../item/item-utils";
import { GameUpdatePacket } from "../packets/game-packet";
import { Variant } from "../packets/variants";
import type { Player } from "../player";
import {
  CADUCEUS_ID,
  HOSPITAL_BED_ID,
  MALADIES,
  MALPRACTICE_SECONDS,
  MALPRACTICE_SUNDAY_SECONDS,
  MOD_MALPRACTICE,
  MOD_RECOVERING,
  SURGERY_LOOT_BASE,
  SURGERY_ROBOT_IDS,
  type MaladyCase,
} from "../quests/constants";
import { isSunday } from "../quests/quest-state";
import { addRoleXp } from "../quests/role-quests";
import type { World } from "../world/world";

/** Short tray labels used by the reference dialog. */
const TOOL_LABELS: Readonly<Record<number, string>> = {
  1258: "Sponge",
  1260: "Scalpel",
  1270: "Stitches",
  1266: "Antibiotics",
  1264: "Antiseptic",
  1296: "Fix it!",
  4316: "Ultrasound",
  4318: "Lab Kit",
  1262: "Anesthetic",
  1268: "Splint",
  4312: "Defibrillator",
  4308: "Pins",
  4314: "Clamp",
  4310: "Transfusion",
};

/** Item id the client draws in an empty surgery tray slot. */
const EMPTY_TRAY_ID = 4320;
/** "Fix it!" is a free action, never consumed from the backpack. */
const FIX_IT_ID = 1296;

/**
 * Surgery tray slots in the order the client draws them (v8 World.h
 * `load_surgery`). Unavailable tools keep their slot and show the empty tray
 * icon, so the tray never reflows while the surgeon works.
 */
export const SURGERY_TRAY: readonly number[] = [
  1258, // Sponge
  1260, // Scalpel
  1270, // Stitches
  1266, // Antibiotics
  1264, // Antiseptic
  1296, // Fix it!
  4316, // Ultrasound
  4318, // Lab Kit
  1262, // Anesthetic
  1268, // Splint
  4312, // Defibrillator
  4308, // Pins
  4314, // Clamp
  4310, // Transfusion
];

/** Complete surgery session state, mirroring the reference player fields. */
export interface ActiveSurgery {
  tileX: number;
  tileY: number;
  robotId: number;
  maladyName: string;
  /** Secret malady text shown once diagnosed. */
  scanText: string;
  /** Flavor line appended when the problem becomes fixable. */
  fixText: string;
  /** Flavor line on a successful cure. */
  postText: string;
  /** Diagnostic flags. */
  sounded: boolean;
  labworked: boolean;
  fixable: boolean;
  /** Whether the patient is asleep. */
  sleeping: boolean;
  /** Sleep counter; too much anesthetic kills the patient. */
  sleep: number;
  /** Vitals. */
  pulse: number;
  temp: number;
  fever: number;
  heart: number;
  /** Operation site cleanliness, 0 = clean, negative = dirty. */
  site: number;
  dirt: number;
  bleeding: number;
  incisions: number;
  incisionsNeeded: number;
  brokenBones: number;
  shatteredBones: number;
  /** Problem cured; only the incisions remain to be closed. */
  fixed: boolean;
  /** Whether antibiotics were just used this step. */
  antibs: boolean;
  /** Result of the last skill roll. */
  skillPassed: boolean;
  /** Last tool result line shown in the dialog. */
  toolText: string;
  /** "" while ongoing, "success" when cured, failure text otherwise. */
  endText: string;
}

/** Determines if a block is a surgery target (robot or hospital bed). */
export function isSurgeryTarget(blockId: number): boolean {
  return blockId === HOSPITAL_BED_ID || SURGERY_ROBOT_IDS.includes(blockId);
}

/**
 * Chance (percent) that the next tool use fails. Mirrors the reference
 * `30 - surgery_skill / 4`, so a maxed surgeon still fails 5% of the time.
 */
export function skillFailChance(skill: number): number {
  return Math.max(5, Math.floor(30 - skill / 4));
}

/**
 * Whether a tool is usable right now, transcribed from v8 World.h
 * `toolavailable`. A dirty operation site blindfolds the surgeon: only the
 * sponge remains available.
 */
export function toolAvailable(player: Player, s: ActiveSurgery, toolId: number): boolean {
  if (s.dirt >= 10 && toolId !== 1258) return false;
  const have = player.inventory.hasItem(toolId);

  switch (toolId) {
    case 1258: // Sponge
      return have;
    case 1266: // Antibiotics
      return have && s.labworked;
    case FIX_IT_ID: // Fix it!
      return s.fixable && !s.fixed;
    case 4316: // Ultrasound
      return have && !s.sounded;
    case 4318: // Lab Kit
      return have && !s.labworked;
    case 4312: // Defibrillator
      return have && s.heart > 0;
    case 1268: // Splint
      return have && s.brokenBones > 0;
    case 4308: // Pins
      return have && s.shatteredBones > 0 && s.incisions > 0;
    case 4314: // Clamp
      return have && s.incisions > 0 && s.bleeding > 0;
    default:
      return have;
  }
}

/**
 * Handles wrenching a robot or hospital bed to open the surgery confirm dialog.
 */
export function handleSurgeryWrench(player: Player, world: World, tileX: number, tileY: number, blockId: number): boolean {
  if (!isSurgeryTarget(blockId)) return false;

  if (player.playMods.has(MOD_MALPRACTICE)) {
    player.sendTextBubble("I'm not allowed to perform surgery while I have malpractice!", true);
    return true;
  }

  const robotName = blockId === HOSPITAL_BED_ID ? "Hospital Bed" : "Surg-E Anatomical Dummy";
  const icon = blockId === HOSPITAL_BED_ID ? HOSPITAL_BED_ID : 4296;

  player.surgery = {
    tileX,
    tileY,
    robotId: blockId,
    maladyName: "",
    scanText: "",
    fixText: "",
    postText: "",
    sounded: false,
    labworked: false,
    fixable: false,
    sleeping: false,
    sleep: 0,
    pulse: 4,
    temp: 98.6,
    fever: 0,
    heart: 0,
    site: 0,
    dirt: 0,
    bleeding: 0,
    incisions: 0,
    incisionsNeeded: 1,
    brokenBones: 0,
    shatteredBones: 0,
    fixed: false,
    antibs: false,
    skillPassed: true,
    toolText: "",
    endText: "",
  };

  // Explicit buttons: the end_dialog accept button does not reliably produce
  // a dialog_return on every client, so the confirm uses real buttons.
  const dialog =
    `set_default_color|\`o\n` +
    `add_label_with_icon|big|\`9${robotName}\`\`|left|${icon}|\n` +
    `add_spacer|small|\n` +
    `add_smalltext|Surgeon Skill: \`w${player.quests.surgerySkill}\`\`|left|\n` +
    `add_textbox|Are you sure you want to perform surgery on this robot? Whether you succeed or fail, the robot will be destroyed in the process.|left|\n` +
    `add_spacer|small|\n` +
    `add_button|surge_start|Okay!|noflags|0|0|\n` +
    `add_button|surge_cancel|Cancel|noflags|0|0|\n` +
    `end_dialog|surge|||`;

  player.variants.sendOnDialogRequest(dialog);
  return true;
}

/** Starts the surgery session after the confirm dialog. */
export function startSurgery(player: Player, world: World): void {
  const s = player.surgery;
  if (!s) return;

  const forced = player.quests.forcedMalady(player.playMods.list().map((entry) => entry.def.id));
  const malady: MaladyCase = (forced >= 0 ? MALADIES[forced] : MALADIES[Math.floor(Math.random() * MALADIES.length)]) ?? MALADIES[0]!;

  s.maladyName = malady.name;
  s.scanText = malady.scantext;
  s.fixText = malady.fixtext;
  s.postText = malady.postext;
  s.sounded = malady.sounded ?? false;
  s.labworked = false;
  s.fixable = malady.fixable ?? true;
  s.sleeping = false;
  s.sleep = 0;
  s.pulse = malady.pulse ?? 4;
  s.temp = malady.temp ?? 98.6;
  s.fever = malady.fever ?? 0.5;
  s.heart = malady.heart ?? 0;
  s.site = 0;
  s.dirt = malady.dirt ?? 0;
  s.bleeding = malady.bleeding ?? 0;
  s.incisions = 0;
  s.incisionsNeeded = malady.incneeded ?? 0;
  s.brokenBones = malady.broken ?? 0;
  s.shatteredBones = malady.shattered ?? 0;
  s.fixed = false;
  s.antibs = false;
  s.skillPassed = true;
  s.toolText = malady.pretext || "Patient is prepped for surgery.";

  const announce = `\`7[\`\`\`2${player.displayName}\`o is performing surgery!\`7]\`\``;
  for (const other of world.players) other.variants.sendOnConsoleMessage(announce);

  sendSurgeryDialog(player);
}

/**
 * Builds and sends the surgery dialog. The tool tray keeps its 14 slots;
 * unusable tools render the empty tray icon instead of disappearing, so the
 * layout stays stable and the surgeon sees what is still missing.
 */
export function sendSurgeryDialog(player: Player): void {
  const s = player.surgery;
  if (!s) return;

  const pulse =
    s.pulse >= 4 ? "`2Strong" : s.pulse >= 3 ? "`3Normal" : s.pulse >= 2 ? "`4Weak" : s.pulse === 1 ? "`4Extremely Weak" : "`4Stopped!";
  const status = s.sleeping ? "`2Asleep" : "`4Awake";
  const tempColor = s.temp >= 106 ? "`4" : s.temp >= 102 ? "`e" : "`2";
  const site = s.site < -10 ? "`4Very dirty" : s.site < 0 ? "`eDirty" : "`2Sanitized";
  const diagnosed = s.sounded || s.labworked ? `\`2${s.maladyName}\`\`` : "`4Not diagnosed yet";

  let lines = "";
  if (s.dirt > 0) lines += `\nadd_smalltext|\`4The patient is covered in muck (${s.dirt}/10).\`\`|left|`;
  if (s.bleeding > 0) lines += `\nadd_smalltext|\`4Patient is losing blood: ${s.bleeding}\`\`|left|`;
  if (s.brokenBones > 0) lines += `\nadd_smalltext|\`eBroken bones: ${s.brokenBones}\`\`|left|`;
  if (s.shatteredBones > 0) lines += `\nadd_smalltext|\`eShattered bones: ${s.shatteredBones}\`\`|left|`;
  if (s.heart > 0) lines += `\nadd_spacer|small|\nadd_smalltext|\`4The patient's heart has stopped! Use the Defibrillator!\`\`|left|`;
  else if (s.incisions > 0 && !s.sleeping) lines += `\nadd_spacer|small|\nadd_smalltext|\`4The patient screams and flails!\`\`|left|`;

  let tray = "";
  for (const toolId of SURGERY_TRAY) {
    if (!toolAvailable(player, s, toolId)) {
      tray += `\nadd_button_with_icon|tool0||noflags|${EMPTY_TRAY_ID}||`;
      continue;
    }
    const name = TOOL_LABELS[toolId] ?? getItem(toolId)?.name ?? String(toolId);
    const count = toolId === FIX_IT_ID ? 1 : player.inventory.getAmount(toolId);
    tray += `\nadd_button_with_icon|tool${toolId}|\`$${name}\`\`|noflags|${toolId}|${count}|`;
  }

  const dialog =
    `set_default_color|\`o\n` +
    `add_label_with_icon|big|\`wSurg-E\`\`|left|18|\n` +
    `add_smalltext|${diagnosed}|left|\n` +
    `add_smalltext|Pulse: ${pulse}\`\`    Status: ${status}\`\`|left|\n` +
    `add_smalltext|Temp: ${tempColor}${s.temp.toFixed(1)}\u00b0F\`\`    Site: ${site}\`\`|left|\n` +
    `add_smalltext|Incisions: \`w${s.incisions}\`\`/\`w${s.incisionsNeeded}\`\`|left|` +
    lines +
    `\nadd_spacer|small|\n` +
    (s.toolText ? `add_smalltext|${s.toolText}|left|\n` : "") +
    `text_scaling_string|Defibrillator|` +
    tray +
    `\nadd_button_with_icon||END_LIST|noflags|0||\n` +
    `add_button|tool999|Give up!|noflags|0|0|\n` +
    `end_dialog|surgery|||`;

  player.variants.sendOnDialogRequest(dialog);
}

/** Resolves the tray slot a button belongs to; null when the slot is empty. */
export function toolFromButton(button: string): number | null {
  if (!button.startsWith("tool")) return null;
  const id = Number.parseInt(button.slice(4), 10);
  return Number.isInteger(id) && SURGERY_TRAY.includes(id) ? id : null;
}

/** Handles a tool click or the give-up button from the surgery dialog. */
export function handleSurgeryAction(player: Player, world: World, button: string): void {
  const s = player.surgery;
  if (!s) return;

  if (button === "tool999" || button === "cancel") {
    s.endText = "You gave up on the patient!";
    finishSurgery(player, world);
    return;
  }

  const toolId = toolFromButton(button);
  if (toolId === null) return;

  // Clicking an empty tray slot explains why the tool is missing.
  if (!toolAvailable(player, s, toolId)) {
    player.sendTextBubble(emptySlotReason(player, s, toolId), true);
    sendSurgeryDialog(player);
    return;
  }

  const name = TOOL_LABELS[toolId] ?? getItem(toolId)?.name ?? `item ${toolId}`;
  if (toolId !== FIX_IT_ID) player.removeItemInven(toolId, 1, true);

  // Skill roll: the reference fails `30 - skill/4` percent of the time.
  const baseFailChance = skillFailChance(player.quests.surgerySkill);
  const failChance = player.playMods.has("spicey_skills") ? Math.floor(baseFailChance / 2) : baseFailChance;
  s.skillPassed = Math.random() * 100 >= failChance;
  s.antibs = false;

  const message = s.skillPassed ? applyToolSuccess(player, s, toolId) : applyToolFailure(s, toolId);

  // Tool result line, colored like the reference: failures keep the orange
  // skill-fail banner so the surgeon always sees what went wrong.
  s.toolText = s.skillPassed ? `\`3${message}\`\`` : `\`3[\`\`\`4Skill Fail (${failChance}%)\`\`\`3] \`6${message}\`\``;

  tickVitals(s);

  if (s.endText === "") {
    const win =
      s.incisions === 0 &&
      s.brokenBones === 0 &&
      s.shatteredBones === 0 &&
      s.fixed &&
      s.bleeding === 0 &&
      s.temp < 101;
    if (win) s.endText = "success";
  }

  // Sponge-only rule: a mucky patient announces the cleanup requirement.
  if (s.dirt >= 10 && !s.skillPassed) player.sendTextBubble("The operation site is too dirty to see!", true);

  if (s.endText !== "") {
    finishSurgery(player, world);
    return;
  }

  if (!s.skillPassed) player.variants.sendOnConsoleMessage(`\`3[\`\`\`4Skill Fail (${failChance}%)\`\`\`3] \`6${message}\`\``);
  player.variants.sendOnConsoleMessage(`\`o${name}: ${s.toolText}`);
  sendSurgeryDialog(player);
}

/** Why a tray slot is empty, for the tooltip bubble. */
function emptySlotReason(player: Player, s: ActiveSurgery, toolId: number): string {
  if (s.dirt >= 10 && toolId !== 1258) return "The site is too dirty, use the Sponge first!";
  if (!player.inventory.hasItem(toolId)) return `You don't have a ${getItem(toolId)?.name ?? "tool"}!`;
  switch (toolId) {
    case 1266:
      return "Run the Lab Kit before using antibiotics.";
    case 4316:
      return "You already diagnosed the patient.";
    case 4318:
      return "You already ran the lab work.";
    case 4312:
      return "The patient's heart is still beating.";
    case 1268:
      return "There are no broken bones to splint.";
    case 4308:
      return "No shattered bones reachable yet.";
    case 4314:
      return "Nothing is bleeding.";
    default:
      return "That tool can't be used right now.";
  }
}

/** Applies a successful tool use and returns the message for the dialog. */
function applyToolSuccess(player: Player, s: ActiveSurgery, toolId: number): string {
  switch (toolId) {
    case 1258:
      s.dirt = Math.max(0, s.dirt - 3);
      s.site = Math.min(0, s.site + 2);
      if (s.bleeding > 0) s.bleeding = Math.max(0, s.bleeding - 1);
      return s.dirt > 0 ? `You mopped up the operating site. (${s.dirt}/10 muck left)` : "You mopped up the operating site.";

    case 1260:
      s.incisions++;
      if (!s.sleeping) s.bleeding++;
      if (s.fixable || s.incisions >= s.incisionsNeeded) return "You've made a neat incision.";
      return "This will leave a nasty scar, but you managed to cut the right place.";

    case 1270:
      if (s.incisions > 0) {
        s.incisions--;
        return "You stitched up an incision.";
      }
      return "You bandaged some injuries.";

    case 1266:
      s.antibs = true;
      s.fever = Math.min(s.fever, 0.06);
      return "You used antibiotics to reduce the patient's infection.";

    case 1264:
      s.site = 0;
      s.dirt = Math.max(0, s.dirt - 2);
      return "You disinfected the operation site.";

    case FIX_IT_ID:
      s.fixed = true;
      return s.postText || "You fixed the problem!";

    case 4316:
      s.sounded = true;
      return s.scanText
        ? `You scanned the patient with ultrasound, discovering they are suffering from \`2${s.maladyName}\`\`.`
        : "You scanned the patient, but didn't find any abnormal masses.";

    case 4318:
      s.labworked = true;
      s.sounded = true;
      return `You performed lab work on the patient, and discovered they are suffering from \`2${s.maladyName}\`\`.`;

    case 1262:
      s.sleeping = true;
      s.sleep = 10;
      return "The patient falls into a deep sleep.";

    case 1268:
      if (s.brokenBones > 0) {
        s.brokenBones--;
        return "You splinted a broken bone.";
      }
      return "There was nothing to splint.";

    case 4312:
      s.heart = 0;
      s.pulse = Math.max(2, s.pulse);
      return "You shocked the patient back to life!";

    case 4308:
      if (s.shatteredBones > 0) {
        s.shatteredBones--;
        return "You pinned a shattered bone together. Don't forget to splint it!";
      }
      return "Nothing to pin.";

    case 4314:
      s.bleeding = Math.max(0, s.bleeding - 2);
      return "You clamped up some blood vessels.";

    case 4310:
      s.pulse = Math.min(4, s.pulse + 1);
      s.bleeding = Math.max(0, s.bleeding - 1);
      return "You transfused several pints of blood into your patient.";

    default:
      return "The tool did its job.";
  }
}

/** Applies a failed tool use; every failure makes the patient worse. */
function applyToolFailure(s: ActiveSurgery, toolId: number): string {
  switch (toolId) {
    case 1258:
      return "You somehow managed to eat the sponge.";
    case 1260:
      s.incisions++;
      s.bleeding++;
      return "You stabbed the patient in a vital organ!";
    case 1270:
      s.bleeding++;
      return "You tried to stitch your patient's mouth shut!";
    case 1264:
      return "You spilled antiseptic on your shoes. They are very clean now.";
    case 1266:
      s.fever = Math.max(s.fever, 0.4);
      return "This is the wrong medication! The bacteria like it.";
    case 1268:
      return "You ate a splint, good job!";
    case 1262:
      s.sleep += 5;
      return "You end up inhaling all the anesthetic yourself. You feel woozy.";
    case 4316:
      return "You scanned the nurse with your ultrasound!";
    case 4318:
      return "You contaminated the sample.";
    case 4308:
      s.bleeding++;
      return "You jabbed the pin through the artery!";
    case 4312:
      s.heart++;
      return "You electrocuted yourself!";
    case 4310:
      return "You spilled all of it! Kind of gross.";
    case 4314:
      return "The clamp fell out of your hand, oh well.";
    case FIX_IT_ID:
      s.bleeding++;
      return "You screwed it up! Try again.";
    default:
      return "Your tool slipped and made things worse!";
  }
}

/**
 * Per-step vitals drift, transcribed from v8 World.h: dirt and incisions
 * dirty the site, an awake patient bleeds, infection raises the fever and
 * the pulse falls until the patient dies.
 */
function tickVitals(s: ActiveSurgery): void {
  s.dirt = Math.min(10, s.dirt + s.bleeding + s.incisions);
  s.site -= Math.floor(s.dirt / 3);
  s.site = Math.max(-25, s.site);
  if (!s.sleeping && s.incisions > 0) s.bleeding++;
  s.bleeding = Math.min(4, s.bleeding);

  if (s.fever < 0) {
    if (s.fever > -0.06) s.fever = 0;
    else if (!s.antibs) s.fever = (s.fever - 3) / 2;
  } else if ((s.site <= 2 && s.bleeding > 0) || (s.site <= 4 && s.incisions > 0)) {
    s.fever += 0.06;
  }
  s.temp = Math.max(98.6, Math.round((s.temp + s.fever) * 100) / 100);

  if ((s.sleep > 0 && Math.random() * 100 < 5) || s.heart > 0) s.heart++;
  else s.sleep = Math.max(0, s.sleep - 1);

  s.pulse -= s.bleeding + Math.min(s.incisions, 1);

  if (s.endText !== "") return;
  if (s.pulse < 1) s.endText = "Your patient bled out!";
  else if (s.temp >= 111) s.endText = "Your patient succumbed to infection!";
  else if (s.heart >= 3) s.endText = "You failed to resuscitate your patient in time!";
  else if (s.sleep > 15) s.endText = "You put your patient to sleep. Permanently!";
}

/** Removes the operated block and broadcasts the change. */
function destroyTarget(player: Player, world: World, s: ActiveSurgery): void {
  const block = world.getTileAt(s.tileX, s.tileY);
  if (!block || !isSurgeryTarget(block.fg)) return;
  block.fg = 0;
  block.damage = 0;
  world.broadcast(
    GameUpdatePacket.create({
      type: TANK_PACKET_TYPE.TILE_CHANGE_REQUEST,
      netID: player.netID,
      itemID: 0,
      tileX: s.tileX,
      tileY: s.tileY,
    }).parse()!,
  );
}

/** Ends the session as a success or a failure. */
function finishSurgery(player: Player, world: World): void {
  const s = player.surgery;
  if (!s) return;

  const success = s.endText === "success";

  if (success) {
    for (const id of [CADUCEUS_ID, SURGERY_LOOT_BASE[Math.floor(Math.random() * SURGERY_LOOT_BASE.length)] ?? 1258]) {
      const added = player.addItemInven(id, 1);
      if (added <= 0) world.drop(player, player.state.x, player.state.y + 16, id, 1);
    }
    player.quests.surgerySkill = Math.min(100, player.quests.surgerySkill + 1);
    player.quests.incrementSurgeryDone();
    addRoleXp(player, "surgeon", 10);

    let surgXp = 100;
    if (player.playMods.has("deep_fried_ice_cream")) surgXp = Math.round(surgXp * 1.5);
    else if (player.playMods.has("guac_perfecto")) surgXp = Math.round(surgXp * 1.35);
    else if (player.playMods.has("berry_crepes")) surgXp = Math.round(surgXp * 1.3);
    else if (player.playMods.has("guac_sabroso")) surgXp = Math.round(surgXp * 1.2);
    else if (player.playMods.has("guac_bueno")) surgXp = Math.round(surgXp * 1.1);
    player.addXp(surgXp);

    if (player.playMods.has("gemonade")) {
      player.addGems(250);
      player.variants.sendOnConsoleMessage("`2Gemonade bonus: +250 Gems for completing surgery!``");
    }

    player.playMods.add(MOD_RECOVERING, 1200);
    world.playPositioned("audio/double_chance.wav", player.netID);
    player.variants.sendOnConsoleMessage("`2Congratulations on your successful surgery!``");
    player.sendTextBubble("`2Success! You saved the patient!``", true);
  } else {
    const duration = isSunday() ? MALPRACTICE_SUNDAY_SECONDS : MALPRACTICE_SECONDS;
    player.playMods.add(MOD_MALPRACTICE, duration);
    world.playPositioned("audio/metal_destroy.wav", player.netID);
    player.variants.sendOnConsoleMessage(`\`4[Surgery Failed]: ${s.endText}\`\``);
    player.sendTextBubble(`\`4${s.endText}\`\``, true);
  }

  destroyTarget(player, world, s);
  world.broadcastVariant(Variant.from("OnParticleEffect", 57, [s.tileX * 32 + 16, s.tileY * 32 + 16]));

  player.surgery = null;
}
