export const ITEMS_DAT_URL =
  "https://raw.githubusercontent.com/StileDevs/itemsdat-archive/refs/heads/main";
export const ITEMS_DAT_FETCH_URL =
  "https://raw.githubusercontent.com/StileDevs/itemsdat-archive/refs/heads/main/latest.json";

export enum PacketTypes {
  HELLO = 1,
  STR = 2,
  ACTION = 3,
  TANK = 4,
}

export const WORLD_SIZE = {
  WIDTH: 100,
  HEIGHT: 60,
};

export const STRING_CIPHER_KEY = "PBG892FXX982ABC*";
export const Y_START_DIRT = 24;
export const Y_LAVA_START = 50;
export const Y_END_DIRT = 55;

export const ROLE = {
  DEVELOPER: "1",
  BASIC: "2",
  SUPPORTER: "3",
};

export enum ClothTypes {
  HAIR = 0,
  SHIRT = 1,
  PANTS = 2,
  FEET = 3,
  FACE = 4,
  HAND = 5,
  BACK = 6,
  MASK = 7,
  NECKLACE = 8,
  ANCES = 9,
}

export enum JammerEffect {
  ZOMBIE,
  PUNCH,
  SIGNAL
}

export const CLOTH_MAP: { [key in ClothTypes]: string } = {
  [ClothTypes.ANCES]: "ances",
  [ClothTypes.BACK]: "back",
  [ClothTypes.FACE]: "face",
  [ClothTypes.FEET]: "feet",
  [ClothTypes.HAIR]: "hair",
  [ClothTypes.HAND]: "hand",
  [ClothTypes.MASK]: "mask",
  [ClothTypes.NECKLACE]: "necklace",
  [ClothTypes.PANTS]: "pants",
  [ClothTypes.SHIRT]: "shirt",
};

export const PUNCH_ITEMS: Array<{
  id: number;
  punchID: number;
  slot: string;
}> = [
  // HAIR ITEMS
  { id: 8006, punchID: 19, slot: "hair" }, //Hellfire Horns - Black
  { id: 8008, punchID: 19, slot: "hair" }, //Hellfire Horns - Blue
  { id: 8010, punchID: 19, slot: "hair" }, //Hellfire Horns - Orange
  { id: 8012, punchID: 19, slot: "hair" }, //Hellfire Horns - Ruby
  { id: 4748, punchID: 40, slot: "hair" }, //Diamond Horns
  { id: 2596, punchID: 43, slot: "hair" }, //Nacho Block
  { id: 4746, punchID: 75, slot: "hair" }, //Diamond Horn
  { id: 7216, punchID: 94, slot: "hair" }, //Mad Hatter
  { id: 9348, punchID: 119, slot: "hair" }, //Medusa's Crown
  { id: 8372, punchID: 121, slot: "hair" }, //Giant Eye Head
  { id: 10330, punchID: 178, slot: "hair" }, //Shadow Crown
  { id: 11116, punchID: 220, slot: "hair" }, //Crystal Crown
  { id: 11250, punchID: 228, slot: "hair" }, //Harvest Jade Hat
  { id: 11814, punchID: 241, slot: "hair" }, //Rabbit Top Hat

  // SHIRT ITEMS
  { id: 1780, punchID: 20, slot: "shirt" }, //Legendbot-009
  { id: 7408, punchID: 61, slot: "shirt" }, //Abominable Snowman Suit
  { id: 6892, punchID: 87, slot: "shirt" }, //Sorcerer's Tunic of Mystery
  { id: 11760, punchID: 237, slot: "shirt" }, //Growing Guardian Armor
  { id: 11548, punchID: 242, slot: "shirt" }, //Guardian Armor
  { id: 11552, punchID: 242, slot: "shirt" }, //Royal Guardian Armor

  // PANTS ITEMS
  { id: 11704, punchID: 245, slot: "pants" }, //Alpha Wolf
  { id: 11706, punchID: 245, slot: "pants" }, //Royal Alpha Wolf

  //FEET ITEMS
  { id: 2220, punchID: 34, slot: "feet" }, //Tiny Tank
  { id: 2878, punchID: 52, slot: "feet" }, //FC Cleats
  { id: 2880, punchID: 52, slot: "feet" }, //Man U Cleats
  { id: 6298, punchID: 84, slot: "feet" }, //Smoog the Great Dragon
  { id: 6966, punchID: 88, slot: "feet" }, //Riding Bull
  { id: 7384, punchID: 98, slot: "feet" }, //Go-Go-Growformer!
  { id: 7950, punchID: 113, slot: "feet" }, //Ionic Pulse Cannon Tank
  { id: 9136, punchID: 139, slot: "feet" }, //Dueling Star Fighter - Rebel Raider
  { id: 9138, punchID: 140, slot: "feet" }, //Dueling Star Fighter - Imperial Enforcer
  { id: 11308, punchID: 200, slot: "feet" }, //Royal Clam Cruiser
  { id: 10890, punchID: 202, slot: "feet" }, //Rocket Powered Pineapple Vacuum
  { id: 10990, punchID: 205, slot: "feet" }, //Alien Recon Wagon
  { id: 11140, punchID: 225, slot: "feet" }, //Legendary Destroyer

  //FACE ITEMS
  { id: 10128, punchID: 171, slot: "face" }, //Mechanical Butler
  { id: 10336, punchID: 39, slot: "face" }, //Black Burning Eyes
  { id: 11142, punchID: 223, slot: "face" }, //Legendary Owl
  { id: 11506, punchID: 245, slot: "face" }, //Mask of The Dragon
  { id: 11508, punchID: 245, slot: "face" }, //Royal Mask of The Dragon
  { id: 11562, punchID: 245, slot: "face" }, //Pet Blood Dragon
  { id: 11768, punchID: 245, slot: "face" }, //Fish Tank Head
  { id: 11882, punchID: 245, slot: "face" }, //Neurovision
  { id: 1204, punchID: 10, slot: "face" }, //Focused Eyes
  { id: 138, punchID: 1, slot: "face" }, //Cyclopean Visor
  { id: 1952, punchID: 26, slot: "face" }, //Owlbeard
  { id: 2476, punchID: 39, slot: "face" }, //Burning Eyes
  { id: 5002, punchID: 19, slot: "face" }, //Playful Fire Sprite
  { id: 5006, punchID: 56, slot: "face" }, //Playful Wood Sprite
  { id: 7402, punchID: 100, slot: "face" }, //Snowflake Eyes with Rugged Winter Beard
  { id: 7836, punchID: 112, slot: "face" }, //Morty the Gray Elephant
  { id: 7838, punchID: 112, slot: "face" }, //Morty the Orange Elephant
  { id: 7840, punchID: 112, slot: "face" }, //Morty the Pink Elephant
  { id: 7842, punchID: 112, slot: "face" }, //Morty the Diamond Elephant
  { id: 8816, punchID: 128, slot: "face" }, //Astro Shades - Red
  { id: 8818, punchID: 128, slot: "face" }, //Astro Shades - Orange
  { id: 8820, punchID: 128, slot: "face" }, //Astro Shades - Purple
  { id: 8822, punchID: 128, slot: "face" }, //Astro Shades - Green

  // HAND ITEMS
  { id: 366, punchID: 2, slot: "hand" }, //Heartbow
  { id: 1464, punchID: 2, slot: "hand" }, //Golden Heartbow
  { id: 472, punchID: 3, slot: "hand" }, //Tommygun
  { id: 594, punchID: 4, slot: "hand" }, //Elvish Longbow
  { id: 10130, punchID: 4, slot: "hand" }, //Sun Shooter Bow
  { id: 5424, punchID: 4, slot: "hand" }, //Winter Frost Bow
  { id: 5456, punchID: 4, slot: "hand" }, //Silverstar Bow
  { id: 4136, punchID: 4, slot: "hand" }, //Heatbow
  { id: 768, punchID: 5, slot: "hand" }, //Sawed-Off Shotgun
  { id: 900, punchID: 6, slot: "hand" }, //Dragon Hand
  { id: 7760, punchID: 6, slot: "hand" }, //Star Dragon Claw
  { id: 9272, punchID: 6, slot: "hand" }, //Draconic Claw
  { id: 7758, punchID: 6, slot: "hand" }, //Prehistoric Dragon Claw
  { id: 910, punchID: 7, slot: "hand" }, //Reanimator Remote
  { id: 930, punchID: 8, slot: "hand" }, //Death Ray
  { id: 1010, punchID: 8, slot: "hand" }, //Destructo Ray
  { id: 6382, punchID: 8, slot: "hand" }, //Startopian Empire - Force Shield & Phase Blaster
  { id: 1016, punchID: 9, slot: "hand" }, //Six Shooter
  { id: 1378, punchID: 11, slot: "hand" }, //Ice Dragon Hand
  { id: 1484, punchID: 13, slot: "hand" }, //Atomic Shadow Scythe
  { id: 1512, punchID: 14, slot: "hand" }, //Pet Leprechaun
  { id: 1648, punchID: 14, slot: "hand" }, //Unicorn Garland
  { id: 1542, punchID: 15, slot: "hand" }, //Battle Trout
  { id: 1576, punchID: 16, slot: "hand" }, //Fiesta Dragon
  { id: 1676, punchID: 17, slot: "hand" }, //Squirt Gun
  { id: 7504, punchID: 17, slot: "hand" }, //Super Squirt Rifle 500
  { id: 1710, punchID: 18, slot: "hand" }, //Keytar
  { id: 4644, punchID: 18, slot: "hand" }, //Saxamaphone
  { id: 1714, punchID: 18, slot: "hand" }, //Tambourine
  { id: 1712, punchID: 18, slot: "hand" }, //Bass Guitar
  { id: 6044, punchID: 18, slot: "hand" }, //Fiesta Mariachi Guitar
  { id: 1570, punchID: 18, slot: "hand" }, //Mariachi Guitar
  { id: 1748, punchID: 19, slot: "hand" }, //Flamethrower
  { id: 1782, punchID: 21, slot: "hand" }, //Dragon of Legend
  { id: 1804, punchID: 22, slot: "hand" }, //Zeus' Lightning Bolt
  { id: 1868, punchID: 23, slot: "hand" }, //Violet Protodrake Leash
  { id: 1998, punchID: 23, slot: "hand" }, //Skeletal Dragon Claw
  { id: 1874, punchID: 24, slot: "hand" }, //Ring Of Force
  { id: 1946, punchID: 25, slot: "hand" }, //Ice Calf Leash
  { id: 2800, punchID: 25, slot: "hand" }, //Penguin Leash
  { id: 2854, punchID: 26, slot: "hand" }, //Phoenix Pacifier
  { id: 1956, punchID: 27, slot: "hand" }, //Chaos Cursed Wand
  { id: 2908, punchID: 29, slot: "hand" }, //Carrot Sword
  { id: 6312, punchID: 29, slot: "hand" }, //Phoenix Sword
  { id: 8554, punchID: 29, slot: "hand" }, //Caduceaxe
  { id: 3162, punchID: 29, slot: "hand" }, //Twin Swords
  { id: 4956, punchID: 29, slot: "hand" }, //Emerald Pickaxe
  { id: 3466, punchID: 29, slot: "hand" }, //Sushi Knife
  { id: 4166, punchID: 29, slot: "hand" }, //Death's Scythe
  { id: 4506, punchID: 29, slot: "hand" }, //Butcher Knife
  { id: 2952, punchID: 29, slot: "hand" }, //Digger's Spade
  { id: 3932, punchID: 29, slot: "hand" }, //Rock Hammer
  { id: 3934, punchID: 29, slot: "hand" }, //Rock Chisel
  { id: 8732, punchID: 29, slot: "hand" }, //Bamboo Sword
  { id: 3108, punchID: 29, slot: "hand" }, //Chainsaw Hand
  { id: 1980, punchID: 30, slot: "hand" }, //Claw Glove
  { id: 2066, punchID: 31, slot: "hand" }, //Cosmic Unicorn Bracelet
  { id: 11082, punchID: 31, slot: "hand" }, //Cute Mutant Boogle
  { id: 11080, punchID: 31, slot: "hand" }, //Cute Mutant Plonky
  { id: 11078, punchID: 31, slot: "hand" }, //Cute Mutant Wonky
  { id: 2212, punchID: 32, slot: "hand" }, //Black Crystal Dragon
  { id: 2218, punchID: 33, slot: "hand" }, //Mighty Snow Rod
  { id: 2266, punchID: 35, slot: "hand" }, //Crystal Glaive
  { id: 2386, punchID: 36, slot: "hand" }, //Heavenly Scythe
  { id: 2388, punchID: 37, slot: "hand" }, //Heartbreaker Hammer
  { id: 2450, punchID: 38, slot: "hand" }, //Diamond Dragon
  { id: 2512, punchID: 41, slot: "hand" }, //Marshmallow Basket
  { id: 2572, punchID: 42, slot: "hand" }, //Flame Scythe
  { id: 2592, punchID: 43, slot: "hand" }, //Legendary Katana
  { id: 9396, punchID: 43, slot: "hand" }, //Balrog's Tail
  { id: 2720, punchID: 44, slot: "hand" }, //Electric Bow
  { id: 2752, punchID: 45, slot: "hand" }, //Pineapple Launcher
  { id: 2754, punchID: 46, slot: "hand" }, //Demonic Arm
  { id: 2756, punchID: 47, slot: "hand" }, //The Gungnir
  { id: 2802, punchID: 49, slot: "hand" }, //Poseidon's Trident
  { id: 2866, punchID: 50, slot: "hand" }, //Wizard's Staff
  { id: 2876, punchID: 51, slot: "hand" }, //BLYoshi's Free Dirt
  { id: 2906, punchID: 53, slot: "hand" }, //Tennis Racquet
  { id: 4170, punchID: 53, slot: "hand" }, //Logarithmic Wheel
  { id: 2886, punchID: 54, slot: "hand" }, //Baseball Glove
  { id: 2890, punchID: 55, slot: "hand" }, //Basketball
  { id: 2910, punchID: 56, slot: "hand" }, //Emerald Staff
  { id: 3066, punchID: 57, slot: "hand" }, //Fire Hose
  { id: 3124, punchID: 58, slot: "hand" }, //Soul Orb
  { id: 3168, punchID: 59, slot: "hand" }, //Strawberry Slime
  { id: 3214, punchID: 60, slot: "hand" }, //Axe Of Winter
  { id: 9194, punchID: 60, slot: "hand" }, //Hammer Of Winter
  { id: 3238, punchID: 61, slot: "hand" }, //Magical Carrot
  { id: 3274, punchID: 62, slot: "hand" }, //T-Shirt Cannon
  { id: 3300, punchID: 64, slot: "hand" }, //Party Blaster
  { id: 3418, punchID: 65, slot: "hand" }, //Serpent Staff
  { id: 3476, punchID: 66, slot: "hand" }, //Spring Bouquet
  { id: 3596, punchID: 67, slot: "hand" }, //Pinata Pal
  { id: 3686, punchID: 68, slot: "hand" }, //Toy Lock-Bot
  { id: 3716, punchID: 69, slot: "hand" }, //Neutron Gun
  { id: 4474, punchID: 72, slot: "hand" }, //Skull Launcher
  { id: 4464, punchID: 73, slot: "hand" }, //AK-8087
  { id: 4778, punchID: 76, slot: "hand" }, //Adventurer's Whip
  { id: 6026, punchID: 76, slot: "hand" }, //Whip of Truth
  { id: 4996, punchID: 77, slot: "hand" }, //Burning Hands
  { id: 3680, punchID: 77, slot: "hand" }, //Phlogiston
  { id: 4840, punchID: 78, slot: "hand" }, //Balloon Launcher
  { id: 5480, punchID: 80, slot: "hand" }, //Rayman's Fist
  { id: 6110, punchID: 81, slot: "hand" }, //Pineapple Spear
  { id: 6308, punchID: 82, slot: "hand" }, //Beach Ball
  { id: 6310, punchID: 83, slot: "hand" }, //Watermelon Slice
  { id: 6756, punchID: 85, slot: "hand" }, //Scepter of the Honor Guard
  { id: 7044, punchID: 86, slot: "hand" }, //Jade Crescent Axe
  { id: 7088, punchID: 89, slot: "hand" }, //Ezio's Armguards
  { id: 11020, punchID: 89, slot: "hand" }, //Dark Assassin's Armguards
  { id: 7098, punchID: 90, slot: "hand" }, //Apocalypse Scythe
  { id: 9032, punchID: 90, slot: "hand" }, //Scythe of the Underworld
  { id: 9738, punchID: 92, slot: "hand" }, //Staff of the Deep
  { id: 3166, punchID: 93, slot: "hand" }, //Pet Slime
  { id: 9340, punchID: 95, slot: "hand" }, //Datemaster's Rose
  { id: 7392, punchID: 96, slot: "hand" }, //Mage's Orb
  { id: 7414, punchID: 99, slot: "hand" }, //Chipmunk
  { id: 7424, punchID: 101, slot: "hand" }, //Snowfrost's Candy Cane Blade
  { id: 7470, punchID: 102, slot: "hand" }, //Narwhal Tusk Staff
  { id: 7488, punchID: 103, slot: "hand" }, //SLaminator's Boomerang
  { id: 7586, punchID: 104, slot: "hand" }, //Sonic Buster Sword
  { id: 7646, punchID: 104, slot: "hand" }, //Tyr's Spear
  { id: 7650, punchID: 105, slot: "hand" }, //Mjolnir
  { id: 6804, punchID: 106, slot: "hand" }, //Bubble Gun
  { id: 7568, punchID: 107, slot: "hand" }, //Hovernator Drone - White
  { id: 7570, punchID: 107, slot: "hand" }, //Hovernator Drone - Black
  { id: 7572, punchID: 107, slot: "hand" }, //Hovernator Drone - Red
  { id: 7574, punchID: 107, slot: "hand" }, //Hovernator Drone - Golden
  { id: 7668, punchID: 108, slot: "hand" }, //Air Horn
  { id: 7660, punchID: 109, slot: "hand" }, //Super Party Launcher
  { id: 9060, punchID: 109, slot: "hand" }, //Hilarious Honker
  { id: 7736, punchID: 111, slot: "hand" }, //Dragon Knight's Spear
  { id: 9116, punchID: 111, slot: "hand" }, //Red Laser Scimitar
  { id: 9118, punchID: 111, slot: "hand" }, //Green Laser Scimitar
  { id: 7826, punchID: 111, slot: "hand" }, //Heartstaff
  { id: 7828, punchID: 111, slot: "hand" }, //Golden Heartstaff
  { id: 11440, punchID: 111, slot: "hand" }, //Mystic Bow
  { id: 11442, punchID: 111, slot: "hand" }, //Royal Mystic Bow
  { id: 11312, punchID: 111, slot: "hand" }, //Spider Sniper
  { id: 7830, punchID: 111, slot: "hand" }, //Heartsword
  { id: 7832, punchID: 111, slot: "hand" }, //Golden Heartsword
  { id: 10670, punchID: 111, slot: "hand" }, //Bow of the Rainbow
  { id: 9120, punchID: 111, slot: "hand" }, //Blue Laser Scimitar
  { id: 9122, punchID: 111, slot: "hand" }, //Purple Laser Scimitar
  { id: 10680, punchID: 111, slot: "hand" }, //Finias' Red Javelin
  { id: 10626, punchID: 111, slot: "hand" }, //Rose Rifle
  { id: 10578, punchID: 111, slot: "hand" }, //Mystic Battle Lance
  { id: 10334, punchID: 111, slot: "hand" }, //Black Balrog's Tail
  { id: 11380, punchID: 111, slot: "hand" }, //Black Bow of the Rainbow
  { id: 11326, punchID: 111, slot: "hand" }, //Ferryman of the Underworld
  { id: 7912, punchID: 111, slot: "hand" }, //War Hammers of Darkness
  { id: 11298, punchID: 111, slot: "hand" }, //Sakura's Revenge
  { id: 10498, punchID: 111, slot: "hand" }, //Candy Cane Scythe
  { id: 8002, punchID: 114, slot: "hand" }, //Money Gun
  { id: 8022, punchID: 116, slot: "hand" }, //Junk Cannon
  { id: 8036, punchID: 118, slot: "hand" }, //Balloon Bunny
  { id: 8038, punchID: 120, slot: "hand" }, //Pet Egg
  { id: 8910, punchID: 129, slot: "hand" }, //Leaf Blower
  { id: 8942, punchID: 130, slot: "hand" }, //Dual Crescent Blade
  { id: 8944, punchID: 131, slot: "hand" }, //Sun Blade
  { id: 5276, punchID: 131, slot: "hand" }, //Celestial Lance
  { id: 8432, punchID: 132, slot: "hand" }, //Galactic Destructor - Green
  { id: 8434, punchID: 132, slot: "hand" }, //Galactic Destructor - Purple
  { id: 8436, punchID: 132, slot: "hand" }, //Galactic Destructor - Red
  { id: 8950, punchID: 132, slot: "hand" }, //Sniper Rifle
  { id: 8946, punchID: 133, slot: "hand" }, //Storm Breaker
  { id: 8960, punchID: 134, slot: "hand" }, //Spring-Loaded Fists
  { id: 9058, punchID: 136, slot: "hand" }, //Cursed Katana
  { id: 9082, punchID: 137, slot: "hand" }, //Rocket-Powered Warhammer
  { id: 9304, punchID: 137, slot: "hand" }, //Brutal Hand Fans
  { id: 9066, punchID: 138, slot: "hand" }, //Claw Of Growganoth
  { id: 9256, punchID: 144, slot: "hand" }, //Party Bubble Blaster
  { id: 9236, punchID: 145, slot: "hand" }, //Ancient Shards
  { id: 9342, punchID: 146, slot: "hand" }, //Datemaster's Bling
  { id: 9378, punchID: 148, slot: "hand" }, //Lightning Gauntlets
  { id: 9410, punchID: 150, slot: "hand" }, //Radiant Doom Staff
  { id: 9606, punchID: 152, slot: "hand" }, //Doomsday Warhammer
  { id: 9716, punchID: 153, slot: "hand" }, //Crystal Infused Sword
  { id: 10064, punchID: 168, slot: "hand" }, //Capuchin Leash
  { id: 10046, punchID: 169, slot: "hand" }, //Growboy
  { id: 10050, punchID: 170, slot: "hand" }, //Really Dangerous Pet Llama
  { id: 10388, punchID: 180, slot: "hand" }, //Swordfish Sword
  { id: 10442, punchID: 184, slot: "hand" }, //Winter Light Launcher
  { id: 10506, punchID: 185, slot: "hand" }, //Spruce Goose
  { id: 10652, punchID: 188, slot: "hand" }, //Love Charged Hands
  { id: 10676, punchID: 191, slot: "hand" }, //Shamrock Shuriken
  { id: 10694, punchID: 193, slot: "hand" }, //Mini Minokawa
  { id: 10714, punchID: 194, slot: "hand" }, //Steampunk Arm
  { id: 10724, punchID: 195, slot: "hand" }, //Lil Growpeep's Baaaa Blaster
  { id: 10722, punchID: 196, slot: "hand" }, //Bunny Ear Magnifying Glass
  { id: 10888, punchID: 199, slot: "hand" }, //Giant Pineapple Pizza Paddle
  { id: 10886, punchID: 200, slot: "hand" }, //Pineapple Chakram
  { id: 10922, punchID: 203, slot: "hand" }, //Pegasus Lance
  { id: 10998, punchID: 206, slot: "hand" }, //Suspicious Weather Balloon
  { id: 10952, punchID: 207, slot: "hand" }, //Space Badger
  { id: 11000, punchID: 208, slot: "hand" }, //Channel G News Van
  { id: 11006, punchID: 209, slot: "hand" }, //Soul Scythe
  { id: 11052, punchID: 211, slot: "hand" }, //Super Duper Ice Cream Scooper
  { id: 10960, punchID: 212, slot: "hand" }, //Space Rabbit
  { id: 10956, punchID: 213, slot: "hand" }, //Space Dog
  { id: 10958, punchID: 214, slot: "hand" }, //Space Pig
  { id: 10954, punchID: 215, slot: "hand" }, //Space Mouse
  { id: 11076, punchID: 216, slot: "hand" }, //Ambu-Lance
  { id: 11084, punchID: 217, slot: "hand" }, //Beowulf's Blade
  { id: 11118, punchID: 218, slot: "hand" }, //Sonic Buster Katana
  { id: 11120, punchID: 219, slot: "hand" }, //Primordial Jade Lance
  { id: 11158, punchID: 221, slot: "hand" }, //Zodiac Ring
  { id: 11162, punchID: 222, slot: "hand" }, //Finger Gun
  { id: 11248, punchID: 226, slot: "hand" }, //Staff of S'mores
  { id: 11240, punchID: 227, slot: "hand" }, //Seed Gatling Gun
  { id: 11284, punchID: 229, slot: "hand" }, //Paper Wasp Pet
  { id: 11292, punchID: 231, slot: "hand" }, //Lightning Umbrella
  { id: 11316, punchID: 234, slot: "hand" }, //Skull of Burning Horrors
  { id: 11354, punchID: 236, slot: "hand" }, //Turkey Float
  { id: 11464, punchID: 237, slot: "hand" }, //Ice Dragon Scythe
  { id: 11438, punchID: 237, slot: "hand" }, //Digital Bow
  { id: 11716, punchID: 237, slot: "hand" }, //Mallet of Sucelles
  { id: 11718, punchID: 237, slot: "hand" }, //Harp of Aibell
  { id: 11674, punchID: 237, slot: "hand" }, //Fancy Flute
  { id: 11630, punchID: 237, slot: "hand" }, //Monkey Warrior's Staff
  { id: 11786, punchID: 237, slot: "hand" }, //Soft-boiled Scepter
  { id: 11872, punchID: 237, slot: "hand" }, //Comida Crusher

  //BACK ITEMS
  { id: 1960, punchID: 28, slot: "back" }, //Ecto Pack
  { id: 5206, punchID: 79, slot: "back" }, //Cloak of Falling Waters
  { id: 7196, punchID: 95, slot: "back" }, //Monarch Butterfly Wings
  { id: 9006, punchID: 135, slot: "back" }, //Spirit of Anubis
  { id: 9172, punchID: 141, slot: "back" }, //Armored WinterBot - Back
  { id: 10210, punchID: 172, slot: "back" }, //Cloak of Equilibrium
  { id: 10754, punchID: 197, slot: "back" }, //Helping Hand
  { id: 11046, punchID: 210, slot: "back" }, //Hydro Cannon
  { id: 11314, punchID: 233, slot: "back" }, //Cauldron Cannon

  //MASK ITEMS
  { id: 1440, punchID: 12, slot: "mask" }, //Evil Space Helmet
  { id: 4208, punchID: 39, slot: "mask" }, //Demonic Horns
  { id: 9462, punchID: 151, slot: "mask" }, //Boastful Brawler Hair

  //NECKLACE ITEMS
  { id: 4150, punchID: 31, slot: "necklace" }, //Eye Of Growganoth
  { id: 4290, punchID: 71, slot: "necklace" }, //Solsascarf
  { id: 7192, punchID: 91, slot: "necklace" }, //Shadow Spirit of the Underworld
  { id: 7136, punchID: 92, slot: "necklace" }, //Ethereal Rainbow Dragon
  { id: 9254, punchID: 143, slot: "necklace" }, //Euphoric Dragon
  { id: 9376, punchID: 149, slot: "necklace" }, //Mining Mech
  { id: 11232, punchID: 224, slot: "necklace" }, //Ouroboros Charm
  { id: 11324, punchID: 235, slot: "necklace" }, //Pharaoh's Pendant
  { id: 11818, punchID: 248, slot: "necklace" }, //Equinox Scarf
  { id: 11876, punchID: 248, slot: "necklace" }, //Serpent Shoulders
];

export const PUNCH_ID_MAP: { [key: number]: number } = Object.fromEntries(
  PUNCH_ITEMS.map((item) => [item.id, item.punchID]),
);

export const PUNCH_SLOT_MAP: { [key: number]: string } =
  Object.fromEntries(PUNCH_ITEMS.map((item) => [item.id, item.slot]));


export enum TankTypes {
  STATE = 0,
  CALL_FUNCTION = 1,
  UPDATE_STATUS = 2,
  TILE_CHANGE_REQUEST = 3,
  SEND_MAP_DATA = 4,
  SEND_TILE_UPDATE_DATA = 5,
  SEND_TILE_UPDATE_DATA_MULTIPLE = 6,
  TILE_ACTIVATE_REQUEST = 7,
  TILE_APPLY_DAMAGE = 8,
  SEND_INVENTORY_STATE = 9,
  ITEM_ACTIVATE_REQUEST = 10,
  ITEM_ACTIVATE_OBJECT_REQUEST = 11,
  SEND_TILE_TREE_STATE = 12,
  MODIFY_ITEM_INVENTORY = 13,
  ITEM_CHANGE_OBJECT = 14,
  SEND_LOCK = 15,
  SEND_ITEM_DATABASE_DATA = 16,
  SEND_PARTICLE_EFFECT = 17,
  SET_ICON_STATE = 18,
  ITEM_EFFECT = 19,
  SET_CHARACTER_STATE = 20,
  PING_REPLY = 21,
  PING_REQUEST = 22,
  GOT_PUNCHED = 23,
  APP_CHECK_RESPONSE = 24,
  APP_INTEGRITY_FAIL = 25,
  DISCONNECT = 26,
  BATTLE_JOIN = 27,
  BATTLE_EVEN = 28,
  USE_DOOR = 29,
  SEND_PARENTAL = 30,
  GONE_FISHIN = 31,
  STEAM = 32,
  PET_BATTLE = 33,
  NPC = 34,
  SPECIAL = 35,
  SEND_PARTICLE_EFFECT_V2 = 36,
  ACTIVE_ARROW_TO_ITEM = 37,
  SELECT_TILE_INDEX = 38,
  SEND_PLAYER_TRIBUTE_DATA = 39,
}

export enum TileFlags {
  TILEEXTRA = 0x0001,
  LOCKED = 0x0002,
  WAS_SPLICED = 0x0004,
  WILL_SPAWN_SEEDS_TOO = 0x0008,
  SEED = 0x0010,
  TREE = 0x0019,
  FLIPPED = 0x0020,
  ROTATED_LEFT = 0x0030,
  OPEN = 0x0040,
  PUBLIC = 0x0080,
  SILENCED = 0x0200,
  WATER = 0x0400,
  FIRE = 0x1000,
  RED = 0x2000,
  BLUE = 0x8000,
  GREEN = 0x4000,
  YELLOW = 0x6000,
  PURPLE = 0xa000,
}

export enum TileExtraTypes {
  NONE = 0,
  DOOR = 1,
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  MAIN_DOOR = 1,
  SIGN = 2,
  LOCK = 3,
  SEED = 4,
  MAILBOX = 6,
  BULLETIN = 7,
  DICE = 8,
  PROVIDER = 9,
  ACHIEVEMENT = 10,
  HEART_MONITOR = 11,
  DONATION_BLOCK = 12,
  TOYBOX = 13,
  MANNEQUIN = 14,
  MAGIC_EGG = 15,
  GAME_RESOURCES = 16,
  GAME_GENERATOR = 17,
  XENONITE = 18,
  DESSUP = 19,
  CRYSTAL = 20,
  BURGLAR = 21,
  SPOTLIGHT = 22,
  DISPLAY_BLOCK = 23,
  VENDING_MACHINE = 24,
  FISHTANK = 25,
  SOLAR = 26,
  FORGE = 27,
  GIVING_TREE = 28,
  GIVING_TREE_STUMP = 29,
  STEAM_ORGAN = 30,
  TAMAGOTCHI = 31,
  SWING = 32,
  FLAG = 33,
  LOBSTER_TRAP = 34,
  ART_CANVAS = 35,
  BATTLE_CAGE = 36,
  PET_TRAINER = 37,
  STEAM_ENGINE = 38,
  LOCKBOT = 39,
  WEATHER_SPECIAL = 40,
  SPIRIT_STORAGE = 41,
  UNKNOWN_1 = 42,
  DISPLAY_SHELF = 43,
  VIP_ENTRANCE = 44,
  CHALLENGE_TIMER = 45,
  CHALLENGE_FLAG = 46,
  FISH_MOUNT = 47,
  PORTRAIT = 48,
  WEATHER_SPECIAL2 = 49,
  FOSSIL_PREP = 50,
  DNA_MACHINE = 51,

  MAGPLANT = 0x3e,
  GROWSCAN = 66,
  TESSERACT_MANIPULATOR = 0x45,
  GAIA_HEART = 0x46,
  TECHNO_ORGANIC_ENGINE = 0x47,
  KRANKEN_GALACTIC = 0x50,
  WEATHER_INFINITY = 0x4d,
}

export enum TileCollisionTypes {
  NONE = 0,
  NORMAL = 1,
  JUMP_THROUGH = 2,
  GATEWAY = 3,
  IF_OFF = 4,
  ONE_WAY = 5,
  VIP = 6,
  WATERFALL = 7,
  ADVENTURE = 8,
  IF_ON = 9,
  TEAM_ENTRANCE = 10,
  GUILD = 11,
  CLOUD = 12,
  FRIEND_ENTRANCE = 13,
}

export enum ActionTypes {
  FIST = 0,
  WRENCH = 1,
  DOOR = 2,
  LOCK = 3,
  GEMS = 4,
  TREASURE = 5,
  DEADLY_BLOCK = 6,
  TRAMPOLINE = 7,
  CONSUMABLE = 8,
  GATEWAY = 9,
  SIGN = 10,
  SFX_WITH_EXTRA_FRAME = 11,
  BOOMBOX = 12,
  MAIN_DOOR = 13,
  PLATFORM = 14,
  BEDROCK = 15,
  LAVA = 16,
  FOREGROUND = 17,
  BACKGROUND = 18,
  SEED = 19,
  CLOTHES = 20,
  FOREGROUND_WITH_EXTRA_FRAME = 21,
  BACKGD_SFX_EXTRA_FRAME = 22,
  BACK_BOOMBOX = 23,
  BOUNCY = 24,
  POINTY = 25,
  PORTAL = 26,
  CHECKPOINT = 27,
  SHEET_MUSIC = 28,
  ICE = 29,
  SWITCHEROO = 31,
  CHEST = 32,
  MAILBOX = 33,
  BULLETIN = 34,
  PINATA = 35,
  DICE = 36,
  CHEMICAL = 37,
  PROVIDER = 38,
  LAB = 39,
  ACHIEVEMENT = 40,
  WEATHER_MACHINE = 41,
  SCORE_BOARD = 42,
  SUNGATE = 43,
  PROFILE = 44,
  DEADLY_IF_ON = 45,
  HEART_MONITOR = 46,
  DONATION_BOX = 47,
  TOYBOX = 48,
  MANNEQUIN = 49,
  SECURITY_CAMERA = 50,
  MAGIC_EGG = 51,
  GAME_RESOURCES = 52,
  GAME_GENERATOR = 53,
  XENONITE = 54,
  DRESSUP = 55,
  CRYSTAL = 56,
  BURGLAR = 57,
  COMPACTOR = 58,
  SPOTLIGHT = 59,
  WIND = 60,
  DISPLAY_BLOCK = 61,
  VENDING_MACHINE = 62,
  FISHTANK = 63,
  PETFISH = 64,
  SOLAR = 65,
  FORGE = 66,
  GIVING_TREE = 67,
  GIVING_TREE_STUMP = 68,
  STEAMPUNK = 69,
  STEAM_LAVA_IF_ON = 70,
  STEAM_ORGAN = 71,
  TAMAGOTCHI = 72,
  SWING = 73,
  FLAG = 74,
  LOBSTER_TRAP = 75,
  ART_CANVAS = 76,
  BATTLE_CAGE = 77,
  PET_TRAINER = 78,
  STEAM_ENGINE = 79,
  LOCKBOT = 80,
  WEATHER_SPECIAL = 81,
  SPIRIT_STORAGE = 82,
  DISPLAY_SHELF = 83,
  VIP_ENTRANCE = 84,
  CHALLENGE_TIMER = 85,
  CHALLENGE_FLAG = 86,
  FISH_MOUNT = 87,
  PORTRAIT = 88,
  WEATHER_SPECIAL2 = 89,
  FOSSIL = 90,
  FOSSIL_PREP = 91,
  DNA_MACHINE = 92,
  BLASTER = 93,
  VALHOWLA = 94,
  CHEMSYNTH = 95,
  CHEMTANK = 96,
  STORAGE = 97,
  OVEN = 98,
  SUPER_MUSIC = 99,
  GEIGER_CHARGER = 100,
  ADVENTURE_RESET = 101,
  TOMB_ROBBER = 102,
  FACTION = 103,
  RED_FACTION = 104,
  GREEN_FACTION = 105,
  BLUE_FACTION = 106,
  ANCES = 107,
  FISHGOTCHI_TANK = 109,
  FISHING_BLOCK = 110,
  ITEM_SUCKER = 111,
  ITEM_PLANTER = 112,
  ROBOT = 113,
  COMMAND = 114,
  TICKET = 115,
  STATS_BLOCK = 116,
  FIELD_NODE = 117,
  OUIJA_BOARD = 118,
  ARCHITECT_MACHINE = 119,
  STARSHIP = 120,
  AUTODELETE = 121,
  GREEN_FOUNTAIN = 122,
  AUTO_ACTION_BREAK = 123,
  AUTO_ACTION_HARVEST = 124,
  AUTO_ACTION_HARVEST_SUCK = 125,
  LIGHTNING_IF_ON = 126,
  PHASED_BLOCK = 127,
  MUD = 128,
  ROOT_CUTTING = 129,
  PASSWORD_STORAGE = 130,
  PHASED_BLOCK_2 = 131,
  BOMB = 132,
  WEATHER_INFINITY = 134,
  SLIME = 135,
  UNK1 = 136,
  COMPLETIONIST = 137,
  UNK3 = 138,
  FEEDING_BLOCK = 140,
  KRANKENS_BLOCK = 141,
  FRIENDS_ENTRANCE = 142,
}
// allowed actions from the lock
export enum LockPermission {
  NONE = 0, // those who dont have any access, will not be allowed to do anything
  BUILD = 1 << 0, // BUILD, means they can place item AND configure them with wrench
  BREAK = 1 << 1,
  FULL = BUILD | BREAK,
}

// NOTE: defaultPermission here means what action is allowed for those who has access.
// For example, Small lock allows the ones with access to do anything (Break & Build),
//  and by default, doesnt allow the ones without access to do anything to it, unless
//  if the TileFlags.PUBLIC is set.
export const LOCKS = [
  {
    id: 202, // Small Lock
    maxTiles: 10,
    defaultPermission: LockPermission.FULL,
  },
  {
    id: 204, // Big Lock
    maxTiles: 48,
    defaultPermission: LockPermission.FULL,
  },
  {
    id: 206, // Huge Lock
    maxTiles: 200,
    defaultPermission: LockPermission.FULL,
  },
  {
    id: 4994, // Builder's Lock
    maxTiles: 200,
    defaultPermission: LockPermission.BREAK,
  },
];

export const TileIgnore = {
  blockIDsToIgnoreByLock: [6, 8],
  blockActionTypesToIgnore: [
    ActionTypes.LOCK,
    ActionTypes.MAIN_DOOR,
    ActionTypes.BEDROCK,
  ],
};

export enum BlockFlags {
  MULTI_FACING = 1 << 0,
  WRENCHABLE = 1 << 1,
  SEEDLESS = 1 << 2, // This item never drops any seeds.
  PERMANENT = 1 << 3, // This item is permanent.
  DROPLESS = 1 << 4, // DROPLESS
  NO_SELF = 1 << 5, // This item can't be used on yourself.
  NO_SHADOW = 1 << 6, // This item has no shadow.
  WORLD_LOCKED = 1 << 7, // This item can only be used in World-Locked worlds.
  BETA = 1 << 8, // This item is a beta item.
  AUTO_PICKUP = 1 << 9, // This item can't be destroyed - smashing it will return it to your backpack if you have room!
  MOD = 1 << 10, // This item is a mod item. Apparently, it was only used on unbreakable blocks and any illegal item that cant be obtained by players.
  RANDOM_GROW = 1 << 11, // A tree of this type can bear surprising fruit!
  PUBLIC = 1 << 12, // This item is PUBLIC: Even if it's locked, anyone can smash it.
  FOREGROUND = 1 << 13, // This item is a foreground item.
  HOLIDAY = 1 << 14, // This item can only be created during WinterFest!
  UNTRADEABLE = 1 << 15, // This item can't be dropped or traded.
}

export enum BlockFlags2 {
  ROBOT_DEADLY = 1 << 1,
  ROBOT_SHOOT_LEFT = 1 << 2,
  ROBOT_SHOOT_RIGHT = 1 << 3,
  ROBOT_SHOOT_DOWN = 1 << 4,
  ROBOT_SHOOT_UP = 1 << 5,
  ROBOT_CAN_SHOOT = 1 << 6,
  ROBOT_LAVA = 1 << 7,
  ROBOT_POINTY = 1 << 8,
  ROBOT_SHOOT_DEADLY = 1 << 9,
  GUILD_ITEM = 1 << 10,
  GUILD_FLAG = 1 << 11,
  STARSHIP_HELM = 1 << 12,
  STARSHIP_REACTOR = 1 << 13,
  STARSHIP_VIEW_SCREEN = 1 << 14,
  SUPER_MOD = 1 << 15,
  TILE_DEADLY_IF_ON = 1 << 16,
  LONG_HAND_ITEM64X32 = 1 << 17,
  GEMLESS = 1 << 18,
  TRANSMUTABLE = 1 << 19,
  DUNGEON_ITEM = 1 << 20,
  PVE_MELEE = 1 << 21,
  PVE_RANGED = 1 << 22,
  PVE_AUTO_AIM = 1 << 23,
  ONE_IN_WORLD = 1 << 24,
  ONLY_FOR_WORLD_OWNER = 1 << 25,
  NO_UPGRADE = 1 << 26,
  EXTINGUISH_FIRE = 1 << 27,
  EXTINGUISH_FIRE_NO_DAMAGE = 1 << 28,
  NEED_RECEPTION_DESK = 1 << 29,
  USE_PAINT = 1 << 30,
}

export enum NameStyles {
  // Titles
  MAX_LEVEL = "maxLevel",
  DOCTOR = "doctor",
  MENTOR = "3",
  GROW4GOOD = "grow4good",
  THANKSGIVING = "thanksgiving",
  YOUTUBE = "youtube",
  TIKTOK = "tiktok",
  MASTER = "master",
  DONOR = "donor",
  EUPHORIA = "euphoria",
  SHOW_GUILD = "showGuild",

  // Special assignment method
  LEGENDARY = " of Legend``",

  // Colors!
  DEVELOPER = "`b",
  MOD = "`5",
  OWNER = "`2",
  ACCESS = "`^",
  GAME = "`a",
}

export enum CharacterState {
  WALK_IN_BLOCKS = 1 << 0,
  DOUBLE_JUMP = 1 << 1,
  IS_INVISIBLE = 1 << 2,
  NO_HANDS = 1 << 3,
  NO_EYES = 1 << 4,
  NO_BODY = 1 << 5,
  DEVIL_HORNS = 1 << 6,
  GOLDEN_HALO = 1 << 7,
  IS_FROZEN = 1 << 11,
  IS_CURSED = 1 << 12,
  IS_DUCTAPED = 1 << 13,
  HAVE_CIGAR = 1 << 14,
  IS_SHINING = 1 << 15,
  IS_ZOMBIE = 1 << 16,
  IS_HIT_BY_LAVA = 1 << 17,
  HAVE_HAUNTED_SHADOWS = 1 << 18,
  HAVE_GEIGER_RADIATION = 1 << 19,
  HAVE_REFLECTOR = 1 << 20,
  IS_EGGED = 1 << 21,
  HAVE_PINEAPPLE_FLOAT = 1 << 22,
  HAVE_FLYING_PINEAPPLE = 1 << 23,
  HAVE_SUPER_SUPPORTER_NAME = 1 << 24,
  HAVE_SUPER_PINEAPPLE = 1 << 25,
}

export enum ModsEffects {
  HARVESTER = 1 << 0,
  PUNCH_DAMAGE = 1 << 1,
}

export enum StateFlags {
  NONE = 0,
  UNK = 1 << 1,
  RESET_VISUAL_STATE = 1 << 2,
  EXTENDED = 1 << 3,
  ROTATE_LEFT = 1 << 4,
  ON_SOLID = 1 << 5,
  ON_FIRE_DAMAGE = 1 << 6,
  ON_JUMP = 1 << 7,
  ON_KILLED = 1 << 8,
  ON_PUNCHED = 1 << 9,
  ON_PLACED = 1 << 10,
  ON_TILE_ACTION = 1 << 11,
  ON_GOT_PUNCHED = 1 << 12,
  ON_RESPAWNED = 1 << 13,
  ON_COLLECT_OBJECT = 1 << 14,
  ON_TRAMPOLINE = 1 << 15,
  ON_DAMAGE = 1 << 16,
  ON_SLIDE = 1 << 17,
  ON_WALL_HANG = 1 << 21,
  ON_ACID_DAMAGE = 1 << 26,
  // MAX = 31
}

// Item IDs
export const ITEM_RAYMANS_FIST = 5480; // Rayman's Fist hand item
