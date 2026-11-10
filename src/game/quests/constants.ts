/**
 * Data tables for the quest systems (daily quests, role quests, surgery).
 * Transcribed from the ItsKyy reference (World.h / Player.h) with the
 * GTOS-parity role xp formula (10 * (lvl^2 + 2)) requested for this port.
 */

// --- daily: crazy jim delivery ----------------------------------------------

/** First pool of deliverable items (ItsKyy World.h daily_quest list). */
export const CRAZY_JIM_ITEMS_1: readonly number[] = [
  231, 487, 483, 2019, 427, 1757, 2009, 281, 781, 329, 459, 1041, 421, 2787, 2789, 1043, 2797, 181, 613, 65, 4983, 283, 553, 425, 4635, 987, 627, 2017, 989, 61, 4639, 973, 3523, 331, 265, 859, 433, 253, 339, 1105, 439, 4567, 333, 677, 5673, 1427, 5603, 183, 10533, 5731, 7223, 10833, 6035, 6813, 1113, 1047, 653, 2811, 4703, 1429, 847, 665, 485, 1613, 833, 2025, 1775, 3931, 429, 3831, 423, 437, 1773, 4767, 1299, 361, 667, 2815, 3473, 301, 4637, 5683, 2709, 415, 955, 461, 861, 9389, 5467, 2791, 2815, 1803, 419, 2027, 685, 555, 741, 10531, 5729, 7221, 10831, 6033, 6811, 621, 6401, 1107, 359, 3471, 855, 309, 1685, 1449, 1309, 441, 1111, 221, 1431, 3065, 9307, 1257, 1501, 1109, 4641, 3587, 1103, 417, 743, 431, 3823, 2949, 1131, 3825, 727, 5379, 729, 187, 787, 5459, 4785, 3261, 3521, 2293, 2309, 2321, 2333, 5461, 3721, 327, 247, 63, 3479, 445, 4783, 299, 863, 8935, 1451, 261, 1871, 1499, 455, 9391, 683, 1159, 551, 1745, 411, 3005, 557, 687, 4799, 559, 4643, 3899, 1605, 9309, 567, 565, 1154, 3827, 1327, 1767, 993, 1157, 563, 4721, 115, 1423, 10515, 1329, 6545, 287, 669, 777, 5463, 1655, 1599, 561, 4585, 3413, 4745, 1771, 2011, 1161, 1729, 3757, 3753, 321, 3265, 3263, 623, 775, 6397, 129, 4667, 759, 3767, 1529, 6543, 4707, 3835, 1435, 651, 8929, 569, 527, 3287, 1595, 6063, 2795, 1003, 1731, 4943, 4963, 597, 4669, 1531, 1523, 625, 4297, 599, 657, 571, 873, 3755, 2969, 1725, 4603, 1447, 3267, 5375, 1683,
];

/** Second pool of deliverable items (ItsKyy World.h daily_quest list2). */
export const CRAZY_JIM_ITEMS_2: readonly number[] = [
  3567, 13, 57, 17, 381, 1139, 21, 101, 379, 117, 27, 23, 581, 195, 105, 191, 377, 1307, 697, 881, 167, 185, 1323, 165, 3783, 369, 25, 171, 53, 103, 179, 29, 249, 177, 1325, 337, 189, 169, 55, 223, 175, 885, 119, 3573, 199, 549, 681, 655, 107, 163, 31, 671, 889, 887, 193, 127, 1433, 173, 7631, 413, 3571, 3569, 2809, 9393, 225, 111, 109, 201, 59, 607, 285, 2029, 2013, 2015, 1611, 995, 997, 963, 1481, 219, 197, 2023, 2021, 9331, 1305, 823, 1039, 231, 487, 483, 2019, 427, 1757, 2009, 281, 781, 329, 459, 1041, 421, 2787, 2789, 1043, 2797, 181, 613, 65, 4983, 283, 553, 425, 4635, 987, 627, 2017, 989, 61, 4639, 973, 3523, 331, 265, 859, 433, 253, 339, 1105, 439, 4567, 333, 677, 5673, 1427, 5603, 183, 10533, 5731, 7223, 10833, 6035, 6813, 1113, 1047, 653, 2811, 4703, 1429, 847, 665,
];

/** Gem reward for completing the Crazy Jim delivery. */
export const CRAZY_JIM_GEM_REWARD = 5000;
/** Icon of the daily quest line in the goals dialog (Growtoken / Crazy Jim). */
export const CRAZY_JIM_ICON = 1486;

// --- role quests -------------------------------------------------------------

/** The seven role quests (including Chef). */
export type RoleId = "surgeon" | "fishing" | "builder" | "farmer" | "provider" | "geiger" | "cook";

export interface RoleDef {
  id: RoleId;
  /** Display name used in dialogs and level-up messages. */
  name: string;
  /** Item icon shown next to the role name. */
  icon: number;
  /** Milestone reward items, one per level (level 1..10). */
  rewards: readonly number[];
  /** Stack count granted per milestone, parallel to `rewards`. */
  rewardCounts: readonly number[];
}

/**
 * Role definitions. The xp requirement is uniformly 10 * (lvl^2 + 2)
 * (GTOS parity); ItsKyy used per-role multipliers that this port replaces.
 */
export const ROLES: Readonly<Record<RoleId, RoleDef>> = {
  surgeon: {
    id: "surgeon",
    name: "Surgeon",
    icon: 7068,
    rewards: [6900, 6982, 2002, 6212, 3172, 9068, 6912, 10836, 3130, 8284],
    rewardCounts: [1, 1, 1, 50, 25, 1, 25, 100, 1, 1],
  },
  fishing: {
    id: "fishing",
    name: "Fishing",
    icon: 7072,
    rewards: [3010, 7002, 260, 3074, 5740, 3044, 1550, 3100, 5080, 3040],
    rewardCounts: [1, 5, 10, 1, 1, 1, 1, 1, 1, 1],
  },
  builder: {
    id: "builder",
    name: "Builder",
    icon: 7070,
    rewards: [6896, 5212, 6948, 1068, 1966, 1836, 5080, 10754, 1874, 6946],
    rewardCounts: [1, 1, 1, 10, 1, 1, 1, 1, 1, 1],
  },
  farmer: {
    id: "farmer",
    name: "Farmer",
    icon: 7064,
    rewards: [98, 228, 1746, 1778, 1830, 5078, 1966, 6948, 6946, 4956],
    rewardCounts: [1, 200, 200, 200, 1, 1, 1, 1, 1, 1],
  },
  provider: {
    id: "provider",
    name: "Provider",
    icon: 866,
    rewards: [1636, 954, 1486, 5136, 5082, 1008, 2410, 6860, 1486, 7558],
    rewardCounts: [1, 50, 3, 10, 1, 1, 1, 1, 10, 1],
  },
  geiger: {
    id: "geiger",
    name: "Geiger Hunting",
    icon: 2204,
    rewards: [4656, 262, 4658, 3764, 6976, 3146, 2266, 10424, 5084, 2478],
    rewardCounts: [1, 50, 10, 1, 1, 1, 1, 1, 1, 1],
  },
  cook: {
    id: "cook",
    name: "Chef",
    icon: 7076,
    rewards: [4582, 4618, 6906, 6908, 4498, 6910, 4620, 6912, 6914, 4614],
    rewardCounts: [1, 2, 10, 10, 1, 10, 1, 10, 10, 1],
  },
};

/** Every role id, in goals-dialog order. */
export const ROLE_ORDER: readonly RoleId[] = ["surgeon", "fishing", "builder", "farmer", "provider", "geiger", "cook"];

/** Gems granted when a role levels up (ItsKyy add_*_xp functions). */
export const ROLE_LEVELUP_GEMS = 500;

/** XP needed to advance from `level` (GTOS parity). */
export function roleXpRequirement(level: number, role?: RoleId): number {
  if (role === "fishing") {
    return level <= 0 ? 900 : 900 * level;
  }
  if (role === "geiger") {
    return level <= 0 ? 350 : 600 * level;
  }
  if (role === "provider") {
    return level <= 0 ? 600 : 1300 * level;
  }
  if (role === "cook") {
    return level <= 0 ? 300 : 500 * level;
  }
  return 10 * (level * level + 2);
}

/** Milestone levels with claimable rewards (levels 1..10, matching GTOS roles). */
export const ROLE_MILESTONES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// --- surgery -----------------------------------------------------------------

/** Hospital Bed block: patients lie in it to be operated on. */
export const HOSPITAL_BED_ID = 1256;
/** Practice robots a surgeon can operate on (consumed by the surgery). */
export const SURGERY_ROBOT_IDS: readonly number[] = [4296, 8558];

/** Malady case data, indexed by malady id (ItsKyy World.h setstats cases 0-30). */
export interface MaladyCase {
  fixed?: boolean;
  flu?: boolean;
  temp?: number;
  fever?: number;
  pulse?: number;
  dirt?: number;
  bleeding?: number;
  broken?: number;
  shattered?: number;
  incneeded?: number;
  sounded?: boolean;
  fixable?: boolean;
  heart?: number;
  sleep?: number;
  pretext: string;
  scantext: string;
  fixtext: string;
  postext: string;
  surgeryName: string;
  /** Short malady name shown by the Med-A-Check. */
  name: string;
}

/** The 31 surgery maladies (ItsKyy World.h cases 8938-9287). */
export const MALADIES: readonly MaladyCase[] = [
  { fixed: true, bleeding: 1, broken: 1, pretext: "Patient broke his arm.", scantext: "a broken arm! You found 1 broken bone.", fixtext: "", postext: "", surgeryName: "a broken arm.", name: "a broken arm" },
  { fixed: true, bleeding: 1, broken: 1, shattered: 1, pretext: "Patient broke his leg.", scantext: "a broken leg! You found 1 broken bone and 1 shattered bone.", fixtext: "", postext: "", surgeryName: "a broken leg.", name: "a broken leg" },
  { fixed: true, flu: true, temp: 104.6, fever: 2.5, dirt: 6, pretext: "Patient is showing signs of the bird flu.", scantext: "bird flu!", fixtext: "", postext: "", surgeryName: "a bird flu!", name: "bird flu" },
  { fixed: true, flu: true, temp: 101.6, fever: 3.6, dirt: 6, pretext: "Patient is showing signs of the turtle flu.", scantext: "turtle flu!", fixtext: "", postext: "", surgeryName: "a turtle flu!", name: "turtle flu" },
  { fixed: true, flu: true, temp: 107.6, fever: 2.4, pretext: "Patient is showing signs of the monkey flu.", scantext: "monkey flu!", fixtext: "", postext: "", surgeryName: "a monkey flu!", name: "monkey flu" },
  { sounded: true, incneeded: 1, pretext: "Patient wants a nose job.", scantext: "", fixtext: "You have cut into nasal area.", postext: "You rearranged their face!", surgeryName: "a nose job.", name: "a nose job" },
  { incneeded: 1, scantext: "a lung tumor!", pretext: "Patient has a tumor in their lung.", fixtext: "The lungs are now exposed.", postext: "You excised the tumor!", surgeryName: "a lung tumor!", name: "a lung tumor" },
  { incneeded: 2, scantext: "a heart attack!", pretext: "Patient had a heart attack.", fixtext: "The heart is now exposed for operating.", postext: "You grafted in some nice new arteries!", surgeryName: "a heart attack!", name: "a heart attack" },
  { incneeded: 5, scantext: "a brain tumor!", pretext: "Patient has a brain tumor, deep inside.", fixtext: "You've finally found the tumor!", postext: "You excised the tumor!", surgeryName: "a brain tumor!", name: "a brain tumor" },
  { incneeded: 2, temp: 104.6, fever: 0.6, pulse: 30, scantext: "a liver infection!", pretext: "Patient has a liver infection.", fixtext: "You've accessed the liver.", postext: "You treated the source of the infection!", surgeryName: "a liver infection!", name: "a liver infection" },
  { incneeded: 2, temp: 101.6, fever: 1.2, scantext: "kidney failure!", pretext: "Patient suffers from kidney failure.", fixtext: "You now have access to the bad kidney.", postext: "You popped in a fresh new kidney!", surgeryName: "kidney failure!", name: "kidney failure" },
  { incneeded: 3, temp: 104.6, fever: 1.2, pulse: 30, scantext: "appendicitis!", pretext: "Patient suffers from appendicitis.", fixtext: "You now have access to the appendix.", postext: "You yanked out the appendix!", surgeryName: "appendicitis!", name: "appendicitis" },
  { incneeded: 2, temp: 101.6, bleeding: 1, dirt: 6, scantext: "swallowed World Lock!", pretext: "Patient has swallowed a world lock.", fixtext: "You've opened the stomach.", postext: "You got the lock out!", surgeryName: "a swallowed World Lock!", name: "a swallowed World Lock" },
  { incneeded: 3, temp: 100.4, scantext: "a herniated disc!", pretext: "Patient's spine is damaged.", fixtext: "You've opened up the vertebrae.", postext: "You repaired the disc!", surgeryName: "a herniated disc!", name: "a herniated disc" },
  { incneeded: 2, temp: 100.58, dirt: 6, bleeding: 1, shattered: 4, scantext: "broken everything! You found 4 shattered bones.", pretext: "Patient was run over by a truck.", fixtext: "You've found gravel in the knees.", postext: "You removed the gravel!", surgeryName: "a broken everything!", name: "broken everything" },
  { incneeded: 1, pulse: 20, dirt: 6, bleeding: 4, scantext: "a serious head injury!", pretext: "Patient has a serious head injury.", fixtext: "You've opened the skull.", postext: "You reduced the swelling!", surgeryName: "a serious head injury!", name: "a serious head injury" },
  { incneeded: 2, pulse: 30, dirt: 10, bleeding: 3, broken: 2, shattered: 1, scantext: "serious trauma! You found 2 broken bones and 1 shattered bone.", pretext: "Patient suffered serious trauma with a punctured lung.", fixtext: "You found the lung puncture.", postext: "You repaired it.", surgeryName: "a serious trauma!", name: "serious trauma" },
  { incneeded: 3, pulse: 30, dirt: 10, bleeding: 4, broken: 2, shattered: 2, scantext: "massive trauma! You found 2 broken bones and 2 shattered bones.", pretext: "Patient suffered massive trauma with internal bleeding.", fixtext: "You found the internal bleed.", postext: "You cauterized it.", surgeryName: "a massive trauma!", name: "massive trauma" },
  { incneeded: 1, dirt: 15, scantext: "torn punching muscle!", pretext: "Patient has a torn punching muscle.", fixtext: "You've accessed the arm muscles. ", postext: "You patched the torn punching muscle! They should be back to punching in no time.", surgeryName: "a torn punching muscle!", name: "a torn punching muscle" },
  { fixable: false, incneeded: 2, temp: 98.6, dirt: 0, fever: 0, bleeding: 1, scantext: "gem cuts!", pretext: "Patient is bleeding from multiple gem-induced cuts.", fixtext: "You've examined the wounds.", postext: "You've stitches the gem cuts closed and stopped the bleeding.", surgeryName: "gem cuts!", name: "gem cuts" },
  { fixable: false, incneeded: 1, pulse: 20, temp: 104.6, shattered: 1, dirt: 5, scantext: "Grumbleteeth! You found 1 shattered bones.", pretext: "Patient's teeth are chattering They sound angry.", fixtext: "You removed grumbleteeth", postext: "You've replaced the patient's angriest teeth and quited", surgeryName: "Grumbleteeth!", name: "Grumbleteeth" },
  { fixable: false, incneeded: 2, temp: 98.6, heart: 0, fever: 1.56, dirt: 10, shattered: 2, scantext: "chicken feet! You found 2 shattered bones.", pretext: "Patient feet have turned into chicken toes.", fixtext: "You've insvestigated the feet.", postext: "You fixed the patient feet. They look like normal blocky toes again!", surgeryName: "chicken feet!", name: "chicken feet" },
  { fixable: false, incneeded: 1, shattered: 2, temp: 107.6, fever: 1.2, dirt: 2, scantext: "Broken Heart! You found 2 shattered bones.", pretext: "Patient suffered from a Broken Heart.", fixtext: "You've revealed the heart.", postext: "You've repaired the fractured in the patient's heart", surgeryName: "Broken heart!", name: "a Broken Heart" },
  { incneeded: 2, temp: 100.58, shattered: 1, fever: 0.8, dirt: 10, bleeding: 5, scantext: "brain worms! You found 1 Shattered bone.", pretext: "You've exposed the brain.", fixtext: "You made a neat incision.", postext: "You've shut down the worm party in the patient brain and cleared away their trash.", surgeryName: "brain worms!", name: "brain worms" },
  { incneeded: 0, fixable: false, temp: 98.6, dirt: 0, broken: 6, shattered: 2, bleeding: 1, scantext: "ecto bones! You found 6 Broken bones and 2 Shattered bones.", pretext: "You've exposed the ribs", fixtext: "You made an incision", postext: "You pinned down all patient major bones and dyed them back to their normal color.", surgeryName: "ecto bones!", name: "ecto bones" },
  { fixable: false, pulse: 20, temp: 104.6, fever: 1.98, shattered: 1, incneeded: 2, scantext: "Moldy Guts! You found 1 shattered bone.", pretext: "Patient suffers from Moldy Guts.", fixtext: "You've openned the abdomen.", postext: "You'e cleaned out the patient's internal organs and applied a light air freshener", surgeryName: "Moldy Guts!", name: "Moldy Guts" },
  { fixable: false, incneeded: 3, temp: 101.6, fever: 2.0, dirt: 10, bleeding: 3, scantext: "fatty liver!", pretext: "Patient suffered fatty liver.", fixtext: "Patient poor diet has led to a high degree of fat build-up in their liver", postext: "You pickup it.", surgeryName: "fatty liver!", name: "fatty liver" },
  { fixed: false, incneeded: 3, temp: 105.6, broken: 2, fever: 2.6, dirt: 10, bleeding: 3, scantext: "Chaos Infection! You found 2 Broken bones.", pretext: "Patient suffered chaos infection.", fixtext: "Patient poor diet has led to a high degree of fat build-up in their liver", postext: "You removed it.", surgeryName: "Chaos Infection!", name: "Chaos Infection" },
  { fixed: false, incneeded: 4, temp: 100.1, broken: 2, fever: 3.1, sleep: 3, shattered: 2, dirt: 10, bleeding: 3, scantext: "Lupus! You found 2 Broken bones.", pretext: "Patient suffered lupus.", fixtext: "Chance of patient tearing skin, adding one extra incision", postext: "You removed it.", surgeryName: "Lupus!", name: "Lupus" },
  { fixed: true, flu: true, temp: 107.6, fever: 2.5, dirt: 6, pretext: "Patient is showing signs of the COVID-19.", scantext: "COVID-19!", fixtext: "", postext: "", surgeryName: "a COVID-19!", name: "COVID-19" },
  { incneeded: 7, temp: 102.6, fever: 0.6, scantext: "a Ebola! Patient is having seizure.", pretext: "Patient has Ebola.", fixtext: "You've finally cured the seizure!", postext: "You made the pacient experience a seizure!", surgeryName: "a Ebola!", name: "Ebola" },
];

/** Malady id forced by each malady play mod (v8 World.h form_state). */
export const MALADY_MOD_FORCING: Readonly<Record<string, number>> = {
  lupus: 28,
  moldy_guts: 25,
  ecto_bones: 24,
  chaos_infection: 27,
  fatty_liver: 26,
  brainworms: 23,
};

/** A surgery tool: button label and item id (ItsKyy tool loop order). */
export interface SurgeryTool {
  id: number;
  label: string;
}

/** The 14 surgery tools in dialog order (ItsKyy World.h tools_available). */
export const SURGERY_TOOLS: readonly SurgeryTool[] = [
  { id: 1258, label: "Sponge" },
  { id: 1260, label: "Scalpel" },
  { id: 1270, label: "Stitches" },
  { id: 1266, label: "Antibiotics" },
  { id: 1264, label: "Antiseptic" },
  { id: 1296, label: "Fix it!" },
  { id: 4316, label: "Ultrasound" },
  { id: 4318, label: "Lab Kit" },
  { id: 1262, label: "Anesthetic" },
  { id: 1268, label: "Splint" },
  { id: 4312, label: "Defibrillator" },
  { id: 4308, label: "Pins" },
  { id: 4314, label: "Clamp" },
  { id: 4310, label: "Transfusion" },
];

/** Icon shown for a tool the surgeon does not own (ItsKyy uses 4320). */
export const EMPTY_SURGERY_TRAY_ID = 4320;
/** Caduceus granted per successful surgery. */
export const CADUCEUS_ID = 4298;
/** Golden Caduceus: 200 Caducei convert into 2 of these. */
export const GOLDEN_CADUCEUS_ID = 4300;
/** Caduceus count that triggers the golden conversion. */
export const CADUCEUS_CONVERSION_COUNT = 200;

/** Base surgery loot table (ItsKyy World.h success list). */
export const SURGERY_LOOT_BASE: readonly number[] = [
  1258, 1268, 1264, 1266, 1262, 1260, 1270, 4318, 4314, 4308, 4310, 4316, 4312, 1242, 1244, 1246, 1248, 1282, 1284, 1286, 1290, 1292, 1288, 1294, 1256,
  1258, 1268, 1264, 1266, 1262, 1260, 1270, 4318, 4314, 4308, 4310, 4316, 4312, 1242, 1244, 1246, 1248, 1282, 1284, 1286, 1290, 1292, 1288, 1294, 1256,
  2586, 782, 3536, 764, 4176,
];
/** Maladies that add the Vaccine Drop (8534) to the loot table. */
export const SURGERY_LOOT_VACCINE_MALADIES: ReadonlySet<number> = new Set([27, 21, 22, 19, 18, 28, 23, 26, 24, 25]);
/** Sunday rare loot table (1/250 replacement). */
export const SURGERY_LOOT_SUNDAY: readonly number[] = [4334, 4330, 4326, 4328, 4324, 10570];
/** 1/200 additions. */
export const SURGERY_LOOT_RARE_ADD: readonly number[] = [3172, 4322, 10774, 11770];
/** 1/450 replacement table. */
export const SURGERY_LOOT_RARE_REPLACE: readonly number[] = [4322, 2976, 4080, 11872, 3790, 4990, 8954, 1506, 1274, 1252, 2992, 3172, 10092, 11224, 9000, 10112, 10094];
/** 1/5000 replacement table (Thingamabob). */
export const SURGERY_LOOT_JACKPOT: readonly number[] = [8284];

/** Malady -> extra loot item added on a 50% roll (ItsKyy started_type additions). */
export const SURGERY_LOOT_MALADY_EXTRA: Readonly<Record<number, number>> = {
  27: 8442,
  21: 8482,
  22: 8486,
  19: 8480,
  18: 8478,
  28: 8466,
  23: 8444,
  26: 88430,
  24: 8450,
  25: 8550,
};
/** Second roll (1/3, or 1/10 for malady 28) adding more malady loot. */
export const SURGERY_LOOT_MALADY_EXTRA2: Readonly<Record<number, readonly number[]>> = {
  18: [8488, 8452, 8454],
  28: [8468, 8494],
  23: [8492],
  26: [8474, 8476, 8498],
  24: [8470, 8472, 8496],
  25: [8458, 8456, 8490],
};

/** Loot items granted in stacks of 10 (ItsKyy: only the Hospital Curtain). */
export const SURGERY_LOOT_COUNT_10: ReadonlySet<number> = new Set([1290]);
/** Loot items granted in stacks of 5 (tools and hospital set). */
export const SURGERY_LOOT_COUNT_5: ReadonlySet<number> = new Set([
  1294, 1288, 1292, 1258, 1268, 1264, 1266, 1262, 1260, 1270, 4318, 4314, 4308, 4310, 4316, 4312,
]);

/** Surgeon clothes that matter for the skill roll (items.dat ids). */
export const SURGERY_HAND_BONE_SAW = 6252;
export const SURGERY_HAND_NURSE_BOT = 9068;
export const SURGERY_NECKLACE_STETHOSCOPE = 3130;
export const SURGERY_NECKLACE_HEALING_TOME = 8954;
export const SURGERY_PANTS_LEGAL_BRIEFS = 3172;
export const SURGERY_HAND_UV_VACCINE = 8536;

/** Malady ids whose tool rolls always succeed (ItsKyy World.h load_surgery). */
export const SURGERY_GUARANTEED_MALADIES: ReadonlySet<number> = new Set([21, 22, 19, 18, 28, 23, 26, 24, 25]);

/** Base skill bonus every surgeon gets (ItsKyy: surgery_skill + 7). */
export const SURGERY_SKILL_BONUS = 7;
/** Gems granted per tool use during an Ebola (malady 30) surgery. */
export const SURGERY_EBOLA_GEMS = 500;
/** Gems granted to the patient on a successful surgery. */
export const SURGERY_PATIENT_GEMS = 100;
/** Malpractice duration in seconds (ItsKyy playmod 88). */
export const MALPRACTICE_SECONDS = 3600;
/** Malpractice duration on Sundays (task spec: 15 minutes). */
export const MALPRACTICE_SUNDAY_SECONDS = 900;
/** Recovery duration in seconds for the patient (ItsKyy playmod 89). */
export const RECOVERY_SECONDS = 3600;

/** Play mod ids used by the quest systems. */
export const MOD_MALPRACTICE = "malpractice";
export const MOD_RECOVERING = "recovering";
export const MOD_CALM_NERVES = "calm_nerves";
export const MOD_SPICEY_SKILLS = "spicey_skills";
