import { TileData, PeerData } from "../types";
import {
  Peer as OldPeer,
  TankPacket,
  TextPacket,
  Variant,
  VariantOptions
} from "growtopia.js";

import { ItemDefinition } from "grow-items"
import { Base } from "./Base";
import { World } from "./World";
import {
  ActionTypes,
  CharacterState,
  CLOTH_MAP,
  ClothTypes,
  ModsEffects,
  NameStyles,
  PacketTypes,
  ROLE,
  TankTypes
} from "../Constants";
import { getCurrentTimeInSeconds, manageArray } from "../utils/Utils";

const PUNCH_ITEMS: Array<{ id: number; punchID: number; slot: keyof PeerData["clothing"] }> = [

  // HAIR ITEMS
  { id: 8006, punchID: 19, slot: "hair" },   //Hellfire Horns - Black
  { id: 8008, punchID: 19, slot: "hair" },   //Hellfire Horns - Blue
  { id: 8010, punchID: 19, slot: "hair" },   //Hellfire Horns - Orange
  { id: 8012, punchID: 19, slot: "hair" },   //Hellfire Horns - Ruby
  { id: 4748, punchID: 40, slot: "hair" },   //Diamond Horns
  { id: 2596, punchID: 43, slot: "hair" },   //Nacho Block
  { id: 4746, punchID: 75, slot: "hair" },   //Diamond Horn
  { id: 7216, punchID: 94, slot: "hair" },   //Mad Hatter
  { id: 9348, punchID: 119, slot: "hair" },   //Medusa's Crown
  { id: 8372, punchID: 121, slot: "hair" },   //Giant Eye Head
  { id: 10330, punchID: 178, slot: "hair" },   //Shadow Crown
  { id: 11116, punchID: 220, slot: "hair" },   //Crystal Crown
  { id: 11250, punchID: 228, slot: "hair" },   //Harvest Jade Hat
  { id: 11814, punchID: 241, slot: "hair" },   //Rabbit Top Hat

  // SHIRT ITEMS
  { id: 1780, punchID: 20, slot: "shirt" },   //Legendbot-009
  { id: 7408, punchID: 61, slot: "shirt" },   //Abominable Snowman Suit
  { id: 6892, punchID: 87, slot: "shirt" },   //Sorcerer's Tunic of Mystery
  { id: 11760, punchID: 237, slot: "shirt" },   //Growing Guardian Armor
  { id: 11548, punchID: 242, slot: "shirt" },   //Guardian Armor
  { id: 11552, punchID: 242, slot: "shirt" },   //Royal Guardian Armor

  // PANTS ITEMS
  { id: 11704, punchID: 245, slot: "pants" },   //Alpha Wolf
  { id: 11706, punchID: 245, slot: "pants" },   //Royal Alpha Wolf

  //FEET ITEMS
  { id: 2220, punchID: 34, slot: "feet" },   //Tiny Tank
  { id: 2878, punchID: 52, slot: "feet" },   //FC Cleats
  { id: 2880, punchID: 52, slot: "feet" },   //Man U Cleats
  { id: 6298, punchID: 84, slot: "feet" },   //Smoog the Great Dragon
  { id: 6966, punchID: 88, slot: "feet" },   //Riding Bull
  { id: 7384, punchID: 98, slot: "feet" },   //Go-Go-Growformer!
  { id: 7950, punchID: 113, slot: "feet" },   //Ionic Pulse Cannon Tank
  { id: 9136, punchID: 139, slot: "feet" },   //Dueling Star Fighter - Rebel Raider
  { id: 9138, punchID: 140, slot: "feet" },   //Dueling Star Fighter - Imperial Enforcer
  { id: 11308, punchID: 200, slot: "feet" },   //Royal Clam Cruiser
  { id: 10890, punchID: 202, slot: "feet" },   //Rocket Powered Pineapple Vacuum
  { id: 10990, punchID: 205, slot: "feet" },   //Alien Recon Wagon
  { id: 11140, punchID: 225, slot: "feet" },   //Legendary Destroyer

  //FACE ITEMS
  { id: 10128, punchID: 171, slot: "face" },   //Mechanical Butler
  { id: 10336, punchID: 39, slot: "face" },   //Black Burning Eyes
  { id: 11142, punchID: 223, slot: "face" },   //Legendary Owl
  { id: 11506, punchID: 245, slot: "face" },   //Mask of The Dragon
  { id: 11508, punchID: 245, slot: "face" },   //Royal Mask of The Dragon
  { id: 11562, punchID: 245, slot: "face" },   //Pet Blood Dragon
  { id: 11768, punchID: 245, slot: "face" },   //Fish Tank Head
  { id: 11882, punchID: 245, slot: "face" },   //Neurovision
  { id: 1204, punchID: 10, slot: "face" },   //Focused Eyes
  { id: 138, punchID: 1, slot: "face" },   //Cyclopean Visor
  { id: 1952, punchID: 26, slot: "face" },   //Owlbeard
  { id: 2476, punchID: 39, slot: "face" },   //Burning Eyes
  { id: 5002, punchID: 19, slot: "face" },   //Playful Fire Sprite
  { id: 5006, punchID: 56, slot: "face" },   //Playful Wood Sprite
  { id: 7402, punchID: 100, slot: "face" },   //Snowflake Eyes with Rugged Winter Beard
  { id: 7836, punchID: 112, slot: "face" },   //Morty the Gray Elephant
  { id: 7838, punchID: 112, slot: "face" },   //Morty the Orange Elephant
  { id: 7840, punchID: 112, slot: "face" },   //Morty the Pink Elephant
  { id: 7842, punchID: 112, slot: "face" },   //Morty the Diamond Elephant
  { id: 8816, punchID: 128, slot: "face" },   //Astro Shades - Red
  { id: 8818, punchID: 128, slot: "face" },   //Astro Shades - Orange
  { id: 8820, punchID: 128, slot: "face" },   //Astro Shades - Purple
  { id: 8822, punchID: 128, slot: "face" },   //Astro Shades - Green

  // HAND ITEMS
  { id: 366, punchID: 2, slot: "hand" },   //Heartbow
  { id: 1464, punchID: 2, slot: "hand" },   //Golden Heartbow
  { id: 472, punchID: 3, slot: "hand" },   //Tommygun
  { id: 594, punchID: 4, slot: "hand" },   //Elvish Longbow
  { id: 10130, punchID: 4, slot: "hand" },   //Sun Shooter Bow
  { id: 5424, punchID: 4, slot: "hand" },   //Winter Frost Bow
  { id: 5456, punchID: 4, slot: "hand" },   //Silverstar Bow
  { id: 4136, punchID: 4, slot: "hand" },   //Heatbow
  { id: 768, punchID: 5, slot: "hand" },   //Sawed-Off Shotgun
  { id: 900, punchID: 6, slot: "hand" },   //Dragon Hand
  { id: 7760, punchID: 6, slot: "hand" },   //Star Dragon Claw
  { id: 9272, punchID: 6, slot: "hand" },   //Draconic Claw
  { id: 7758, punchID: 6, slot: "hand" },   //Prehistoric Dragon Claw
  { id: 910, punchID: 7, slot: "hand" },   //Reanimator Remote
  { id: 930, punchID: 8, slot: "hand" },   //Death Ray
  { id: 1010, punchID: 8, slot: "hand" },   //Destructo Ray
  { id: 6382, punchID: 8, slot: "hand" },   //Startopian Empire - Force Shield & Phase Blaster
  { id: 1016, punchID: 9, slot: "hand" },   //Six Shooter
  { id: 1378, punchID: 11, slot: "hand" },   //Ice Dragon Hand
  { id: 1484, punchID: 13, slot: "hand" },   //Atomic Shadow Scythe
  { id: 1512, punchID: 14, slot: "hand" },   //Pet Leprechaun
  { id: 1648, punchID: 14, slot: "hand" },   //Unicorn Garland
  { id: 1542, punchID: 15, slot: "hand" },   //Battle Trout
  { id: 1576, punchID: 16, slot: "hand" },   //Fiesta Dragon
  { id: 1676, punchID: 17, slot: "hand" },   //Squirt Gun
  { id: 7504, punchID: 17, slot: "hand" },   //Super Squirt Rifle 500
  { id: 1710, punchID: 18, slot: "hand" },   //Keytar
  { id: 4644, punchID: 18, slot: "hand" },   //Saxamaphone
  { id: 1714, punchID: 18, slot: "hand" },   //Tambourine
  { id: 1712, punchID: 18, slot: "hand" },   //Bass Guitar
  { id: 6044, punchID: 18, slot: "hand" },   //Fiesta Mariachi Guitar
  { id: 1570, punchID: 18, slot: "hand" },   //Mariachi Guitar
  { id: 1748, punchID: 19, slot: "hand" },   //Flamethrower
  { id: 1782, punchID: 21, slot: "hand" },   //Dragon of Legend
  { id: 1804, punchID: 22, slot: "hand" },   //Zeus' Lightning Bolt
  { id: 1868, punchID: 23, slot: "hand" },   //Violet Protodrake Leash
  { id: 1998, punchID: 23, slot: "hand" },   //Skeletal Dragon Claw
  { id: 1874, punchID: 24, slot: "hand" },   //Ring Of Force
  { id: 1946, punchID: 25, slot: "hand" },   //Ice Calf Leash
  { id: 2800, punchID: 25, slot: "hand" },   //Penguin Leash
  { id: 2854, punchID: 26, slot: "hand" },   //Phoenix Pacifier
  { id: 1956, punchID: 27, slot: "hand" },   //Chaos Cursed Wand
  { id: 2908, punchID: 29, slot: "hand" },   //Carrot Sword
  { id: 6312, punchID: 29, slot: "hand" },   //Phoenix Sword
  { id: 8554, punchID: 29, slot: "hand" },   //Caduceaxe
  { id: 3162, punchID: 29, slot: "hand" },   //Twin Swords
  { id: 4956, punchID: 29, slot: "hand" },   //Emerald Pickaxe
  { id: 3466, punchID: 29, slot: "hand" },   //Sushi Knife
  { id: 4166, punchID: 29, slot: "hand" },   //Death's Scythe
  { id: 4506, punchID: 29, slot: "hand" },   //Butcher Knife
  { id: 2952, punchID: 29, slot: "hand" },   //Digger's Spade
  { id: 3932, punchID: 29, slot: "hand" },   //Rock Hammer
  { id: 3934, punchID: 29, slot: "hand" },   //Rock Chisel
  { id: 8732, punchID: 29, slot: "hand" },   //Bamboo Sword
  { id: 3108, punchID: 29, slot: "hand" },   //Chainsaw Hand
  { id: 1980, punchID: 30, slot: "hand" },   //Claw Glove
  { id: 2066, punchID: 31, slot: "hand" },   //Cosmic Unicorn Bracelet
  { id: 11082, punchID: 31, slot: "hand" },   //Cute Mutant Boogle
  { id: 11080, punchID: 31, slot: "hand" },   //Cute Mutant Plonky
  { id: 11078, punchID: 31, slot: "hand" },   //Cute Mutant Wonky
  { id: 2212, punchID: 32, slot: "hand" },   //Black Crystal Dragon
  { id: 2218, punchID: 33, slot: "hand" },   //Mighty Snow Rod
  { id: 2266, punchID: 35, slot: "hand" },   //Crystal Glaive
  { id: 2386, punchID: 36, slot: "hand" },   //Heavenly Scythe
  { id: 2388, punchID: 37, slot: "hand" },   //Heartbreaker Hammer
  { id: 2450, punchID: 38, slot: "hand" },   //Diamond Dragon
  { id: 2512, punchID: 41, slot: "hand" },   //Marshmallow Basket
  { id: 2572, punchID: 42, slot: "hand" },   //Flame Scythe
  { id: 2592, punchID: 43, slot: "hand" },   //Legendary Katana
  { id: 9396, punchID: 43, slot: "hand" },   //Balrog's Tail
  { id: 2720, punchID: 44, slot: "hand" },   //Electric Bow
  { id: 2752, punchID: 45, slot: "hand" },   //Pineapple Launcher
  { id: 2754, punchID: 46, slot: "hand" },   //Demonic Arm
  { id: 2756, punchID: 47, slot: "hand" },   //The Gungnir
  { id: 2802, punchID: 49, slot: "hand" },   //Poseidon's Trident
  { id: 2866, punchID: 50, slot: "hand" },   //Wizard's Staff
  { id: 2876, punchID: 51, slot: "hand" },   //BLYoshi's Free Dirt
  { id: 2906, punchID: 53, slot: "hand" },   //Tennis Racquet
  { id: 4170, punchID: 53, slot: "hand" },   //Logarithmic Wheel
  { id: 2886, punchID: 54, slot: "hand" },   //Baseball Glove
  { id: 2890, punchID: 55, slot: "hand" },   //Basketball
  { id: 2910, punchID: 56, slot: "hand" },   //Emerald Staff
  { id: 3066, punchID: 57, slot: "hand" },   //Fire Hose
  { id: 3124, punchID: 58, slot: "hand" },   //Soul Orb
  { id: 3168, punchID: 59, slot: "hand" },   //Strawberry Slime
  { id: 3214, punchID: 60, slot: "hand" },   //Axe Of Winter
  { id: 9194, punchID: 60, slot: "hand" },   //Hammer Of Winter
  { id: 3238, punchID: 61, slot: "hand" },   //Magical Carrot
  { id: 3274, punchID: 62, slot: "hand" },   //T-Shirt Cannon
  { id: 3300, punchID: 64, slot: "hand" },   //Party Blaster
  { id: 3418, punchID: 65, slot: "hand" },   //Serpent Staff
  { id: 3476, punchID: 66, slot: "hand" },   //Spring Bouquet
  { id: 3596, punchID: 67, slot: "hand" },   //Pinata Pal
  { id: 3686, punchID: 68, slot: "hand" },   //Toy Lock-Bot
  { id: 3716, punchID: 69, slot: "hand" },   //Neutron Gun
  { id: 4474, punchID: 72, slot: "hand" },   //Skull Launcher
  { id: 4464, punchID: 73, slot: "hand" },   //AK-8087
  { id: 4778, punchID: 76, slot: "hand" },   //Adventurer's Whip
  { id: 6026, punchID: 76, slot: "hand" },   //Whip of Truth
  { id: 4996, punchID: 77, slot: "hand" },   //Burning Hands
  { id: 3680, punchID: 77, slot: "hand" },   //Phlogiston
  { id: 4840, punchID: 78, slot: "hand" },   //Balloon Launcher
  { id: 5480, punchID: 80, slot: "hand" },   //Rayman's Fist
  { id: 6110, punchID: 81, slot: "hand" },   //Pineapple Spear
  { id: 6308, punchID: 82, slot: "hand" },   //Beach Ball
  { id: 6310, punchID: 83, slot: "hand" },   //Watermelon Slice
  { id: 6756, punchID: 85, slot: "hand" },   //Scepter of the Honor Guard
  { id: 7044, punchID: 86, slot: "hand" },   //Jade Crescent Axe
  { id: 7088, punchID: 89, slot: "hand" },   //Ezio's Armguards
  { id: 11020, punchID: 89, slot: "hand" },   //Dark Assassin's Armguards
  { id: 7098, punchID: 90, slot: "hand" },   //Apocalypse Scythe
  { id: 9032, punchID: 90, slot: "hand" },   //Scythe of the Underworld
  { id: 9738, punchID: 92, slot: "hand" },   //Staff of the Deep
  { id: 3166, punchID: 93, slot: "hand" },   //Pet Slime
  { id: 9340, punchID: 95, slot: "hand" },   //Datemaster's Rose
  { id: 7392, punchID: 96, slot: "hand" },   //Mage's Orb
  { id: 7414, punchID: 99, slot: "hand" },   //Chipmunk
  { id: 7424, punchID: 101, slot: "hand" },   //Snowfrost's Candy Cane Blade
  { id: 7470, punchID: 102, slot: "hand" },   //Narwhal Tusk Staff
  { id: 7488, punchID: 103, slot: "hand" },   //SLaminator's Boomerang
  { id: 7586, punchID: 104, slot: "hand" },   //Sonic Buster Sword
  { id: 7646, punchID: 104, slot: "hand" },   //Tyr's Spear
  { id: 7650, punchID: 105, slot: "hand" },   //Mjolnir
  { id: 6804, punchID: 106, slot: "hand" },   //Bubble Gun
  { id: 7568, punchID: 107, slot: "hand" },   //Hovernator Drone - White
  { id: 7570, punchID: 107, slot: "hand" },   //Hovernator Drone - Black
  { id: 7572, punchID: 107, slot: "hand" },   //Hovernator Drone - Red
  { id: 7574, punchID: 107, slot: "hand" },   //Hovernator Drone - Golden
  { id: 7668, punchID: 108, slot: "hand" },   //Air Horn
  { id: 7660, punchID: 109, slot: "hand" },   //Super Party Launcher
  { id: 9060, punchID: 109, slot: "hand" },   //Hilarious Honker
  { id: 7736, punchID: 111, slot: "hand" },   //Dragon Knight's Spear
  { id: 9116, punchID: 111, slot: "hand" },   //Red Laser Scimitar
  { id: 9118, punchID: 111, slot: "hand" },   //Green Laser Scimitar
  { id: 7826, punchID: 111, slot: "hand" },   //Heartstaff
  { id: 7828, punchID: 111, slot: "hand" },   //Golden Heartstaff
  { id: 11440, punchID: 111, slot: "hand" },   //Mystic Bow
  { id: 11442, punchID: 111, slot: "hand" },   //Royal Mystic Bow
  { id: 11312, punchID: 111, slot: "hand" },   //Spider Sniper
  { id: 7830, punchID: 111, slot: "hand" },   //Heartsword
  { id: 7832, punchID: 111, slot: "hand" },   //Golden Heartsword
  { id: 10670, punchID: 111, slot: "hand" },   //Bow of the Rainbow
  { id: 9120, punchID: 111, slot: "hand" },   //Blue Laser Scimitar
  { id: 9122, punchID: 111, slot: "hand" },   //Purple Laser Scimitar
  { id: 10680, punchID: 111, slot: "hand" },   //Finias' Red Javelin
  { id: 10626, punchID: 111, slot: "hand" },   //Rose Rifle
  { id: 10578, punchID: 111, slot: "hand" },   //Mystic Battle Lance
  { id: 10334, punchID: 111, slot: "hand" },   //Black Balrog's Tail
  { id: 11380, punchID: 111, slot: "hand" },   //Black Bow of the Rainbow
  { id: 11326, punchID: 111, slot: "hand" },   //Ferryman of the Underworld
  { id: 7912, punchID: 111, slot: "hand" },   //War Hammers of Darkness
  { id: 11298, punchID: 111, slot: "hand" },   //Sakura's Revenge
  { id: 10498, punchID: 111, slot: "hand" },   //Candy Cane Scythe
  { id: 8002, punchID: 114, slot: "hand" },   //Money Gun
  { id: 8022, punchID: 116, slot: "hand" },   //Junk Cannon
  { id: 8036, punchID: 118, slot: "hand" },   //Balloon Bunny
  { id: 8038, punchID: 120, slot: "hand" },   //Pet Egg
  { id: 8910, punchID: 129, slot: "hand" },   //Leaf Blower
  { id: 8942, punchID: 130, slot: "hand" },   //Dual Crescent Blade
  { id: 8944, punchID: 131, slot: "hand" },   //Sun Blade
  { id: 5276, punchID: 131, slot: "hand" },   //Celestial Lance
  { id: 8432, punchID: 132, slot: "hand" },   //Galactic Destructor - Green
  { id: 8434, punchID: 132, slot: "hand" },   //Galactic Destructor - Purple
  { id: 8436, punchID: 132, slot: "hand" },   //Galactic Destructor - Red
  { id: 8950, punchID: 132, slot: "hand" },   //Sniper Rifle
  { id: 8946, punchID: 133, slot: "hand" },   //Storm Breaker
  { id: 8960, punchID: 134, slot: "hand" },   //Spring-Loaded Fists
  { id: 9058, punchID: 136, slot: "hand" },   //Cursed Katana
  { id: 9082, punchID: 137, slot: "hand" },   //Rocket-Powered Warhammer
  { id: 9304, punchID: 137, slot: "hand" },   //Brutal Hand Fans
  { id: 9066, punchID: 138, slot: "hand" },   //Claw Of Growganoth
  { id: 9256, punchID: 144, slot: "hand" },   //Party Bubble Blaster
  { id: 9236, punchID: 145, slot: "hand" },   //Ancient Shards
  { id: 9342, punchID: 146, slot: "hand" },   //Datemaster's Bling
  { id: 9378, punchID: 148, slot: "hand" },   //Lightning Gauntlets
  { id: 9410, punchID: 150, slot: "hand" },   //Radiant Doom Staff
  { id: 9606, punchID: 152, slot: "hand" },   //Doomsday Warhammer
  { id: 9716, punchID: 153, slot: "hand" },   //Crystal Infused Sword
  { id: 10064, punchID: 168, slot: "hand" },   //Capuchin Leash
  { id: 10046, punchID: 169, slot: "hand" },   //Growboy
  { id: 10050, punchID: 170, slot: "hand" },   //Really Dangerous Pet Llama
  { id: 10388, punchID: 180, slot: "hand" },   //Swordfish Sword
  { id: 10442, punchID: 184, slot: "hand" },   //Winter Light Launcher
  { id: 10506, punchID: 185, slot: "hand" },   //Spruce Goose
  { id: 10652, punchID: 188, slot: "hand" },   //Love Charged Hands
  { id: 10676, punchID: 191, slot: "hand" },   //Shamrock Shuriken
  { id: 10694, punchID: 193, slot: "hand" },   //Mini Minokawa
  { id: 10714, punchID: 194, slot: "hand" },   //Steampunk Arm
  { id: 10724, punchID: 195, slot: "hand" },   //Lil Growpeep's Baaaa Blaster
  { id: 10722, punchID: 196, slot: "hand" },   //Bunny Ear Magnifying Glass
  { id: 10888, punchID: 199, slot: "hand" },   //Giant Pineapple Pizza Paddle
  { id: 10886, punchID: 200, slot: "hand" },   //Pineapple Chakram
  { id: 10922, punchID: 203, slot: "hand" },   //Pegasus Lance
  { id: 10998, punchID: 206, slot: "hand" },   //Suspicious Weather Balloon
  { id: 10952, punchID: 207, slot: "hand" },   //Space Badger
  { id: 11000, punchID: 208, slot: "hand" },   //Channel G News Van
  { id: 11006, punchID: 209, slot: "hand" },   //Soul Scythe
  { id: 11052, punchID: 211, slot: "hand" },   //Super Duper Ice Cream Scooper
  { id: 10960, punchID: 212, slot: "hand" },   //Space Rabbit
  { id: 10956, punchID: 213, slot: "hand" },   //Space Dog
  { id: 10958, punchID: 214, slot: "hand" },   //Space Pig
  { id: 10954, punchID: 215, slot: "hand" },   //Space Mouse
  { id: 11076, punchID: 216, slot: "hand" },   //Ambu-Lance
  { id: 11084, punchID: 217, slot: "hand" },   //Beowulf's Blade
  { id: 11118, punchID: 218, slot: "hand" },   //Sonic Buster Katana
  { id: 11120, punchID: 219, slot: "hand" },   //Primordial Jade Lance
  { id: 11158, punchID: 221, slot: "hand" },   //Zodiac Ring
  { id: 11162, punchID: 222, slot: "hand" },   //Finger Gun
  { id: 11248, punchID: 226, slot: "hand" },   //Staff of S'mores
  { id: 11240, punchID: 227, slot: "hand" },   //Seed Gatling Gun
  { id: 11284, punchID: 229, slot: "hand" },   //Paper Wasp Pet
  { id: 11292, punchID: 231, slot: "hand" },   //Lightning Umbrella
  { id: 11316, punchID: 234, slot: "hand" },   //Skull of Burning Horrors
  { id: 11354, punchID: 236, slot: "hand" },   //Turkey Float
  { id: 11464, punchID: 237, slot: "hand" },   //Ice Dragon Scythe
  { id: 11438, punchID: 237, slot: "hand" },   //Digital Bow
  { id: 11716, punchID: 237, slot: "hand" },   //Mallet of Sucelles
  { id: 11718, punchID: 237, slot: "hand" },   //Harp of Aibell
  { id: 11674, punchID: 237, slot: "hand" },   //Fancy Flute
  { id: 11630, punchID: 237, slot: "hand" },   //Monkey Warrior's Staff
  { id: 11786, punchID: 237, slot: "hand" },   //Soft-boiled Scepter
  { id: 11872, punchID: 237, slot: "hand" },   //Comida Crusher

  //BACK ITEMS
  { id: 1960, punchID: 28, slot: "back" },   //Ecto Pack
  { id: 5206, punchID: 79, slot: "back" },   //Cloak of Falling Waters
  { id: 7196, punchID: 95, slot: "back" },   //Monarch Butterfly Wings
  { id: 9006, punchID: 135, slot: "back" },   //Spirit of Anubis
  { id: 9172, punchID: 141, slot: "back" },   //Armored WinterBot - Back
  { id: 10210, punchID: 172, slot: "back" },   //Cloak of Equilibrium
  { id: 10754, punchID: 197, slot: "back" },   //Helping Hand
  { id: 11046, punchID: 210, slot: "back" },   //Hydro Cannon
  { id: 11314, punchID: 233, slot: "back" },   //Cauldron Cannon

  //MASK ITEMS
  { id: 1440, punchID: 12, slot: "mask" },   //Evil Space Helmet
  { id: 4208, punchID: 39, slot: "mask" },   //Demonic Horns
  { id: 9462, punchID: 151, slot: "mask" },   //Boastful Brawler Hair

  //NECKLACE ITEMS
  { id: 4150, punchID: 31, slot: "necklace" },   //Eye Of Growganoth
  { id: 4290, punchID: 71, slot: "necklace" },   //Solsascarf
  { id: 7192, punchID: 91, slot: "necklace" },   //Shadow Spirit of the Underworld
  { id: 7136, punchID: 92, slot: "necklace" },   //Ethereal Rainbow Dragon
  { id: 9254, punchID: 143, slot: "necklace" },   //Euphoric Dragon
  { id: 9376, punchID: 149, slot: "necklace" },   //Mining Mech
  { id: 11232, punchID: 224, slot: "necklace" },   //Ouroboros Charm
  { id: 11324, punchID: 235, slot: "necklace" },   //Pharaoh's Pendant
  { id: 11818, punchID: 248, slot: "necklace" },   //Equinox Scarf
  { id: 11876, punchID: 248, slot: "necklace" },   //Serpent Shoulders
];

const PUNCH_ID_MAP: { [key: number]: number } = Object.fromEntries(
  PUNCH_ITEMS.map(item => [item.id, item.punchID])
);

const PUNCH_SLOT_MAP: { [key: number]: keyof PeerData["clothing"] } = Object.fromEntries(
  PUNCH_ITEMS.map(item => [item.id, item.slot])
);

export class Peer extends OldPeer<PeerData> {
  public base;
  public customPunchID?: number;

  public getPunchID(): number {
    if (typeof this.customPunchID === "number") {
      return this.customPunchID;
    }
    for (const [itemID, slot] of Object.entries(PUNCH_SLOT_MAP)) {
      if (this.data.clothing[slot as keyof typeof this.data.clothing] === Number(itemID)) {
        return PUNCH_ID_MAP[Number(itemID)];
      }
    }
    return 0; // default punch
  }

  constructor(base: Base, netID: number, channelID = 0) {
    super(base.server, netID, channelID);
    this.base = base;

    const data = this.base.cache.peers.get(netID);
    if (data)
      this.data = {
        channelID,
        x:                 data.x,
        y:                 data.y,
        world:             data.world,
        inventory:         data.inventory,
        rotatedLeft:       data.rotatedLeft,
        requestedName:     data.requestedName,
        tankIDName:        data.tankIDName,
        netID,
        country:           data.country,
        userID:            data.userID,
        role:              data.role,
        gems:              data.gems,
        growtokens:        data.growtokens,
        clothing:          data.clothing,
        exp:               data.exp,
        level:             data.level,
        lastCheckpoint:    data.lastCheckpoint,
        lastVisitedWorlds: data.lastVisitedWorlds,
        state:             data.state,
        heartMonitors:     data.heartMonitors,
      };
  }

  public async saveToCache() {
    this.base.cache.peers.set(this.data.netID, this.data);
    return true;
  }

  public async saveToDatabase() {
    return await this.base.database.players.save(this.data);
  }

  public get name(): string {
    switch (this.data.role) {
      default: {
        return `\`w${this.data.tankIDName}\`\``;
      }
      case ROLE.SUPPORTER: {
        return `\`e${this.data.tankIDName}\`\``;
      }
      case ROLE.DEVELOPER: {
        return `\`b@${this.data.tankIDName}\`\``;
      }
    }
  }

  public get country(): string {
    switch (this.data.role) {
      default: {
        return this.data.country;
      }
      case ROLE.DEVELOPER: {
        return "rt";
      }
    }
  }

  public countryState() {
    const country = (pe: Peer) => `${pe.country}|${pe.data.level >= 125 ? NameStyles.MAX_LEVEL : ""}`;

    this.send(Variant.from({ netID: this.data.netID }, "OnCountryState", country(this)));
    const world = this.currentWorld();
    if (world) {
      world.every((p) => {
        if (p.data.netID !== this.data.netID) {
          p.send(Variant.from({ netID: this.data.netID }, "OnCountryState", country(this)));
          this.send(Variant.from({ netID: p.data.netID }, "OnCountryState", country(p)));
        }
      })
    }
  }

  // i kinda hate how this is called everytime just to send packets to a specific world. 
  // Perhaps, having each world storing peers would be more logical IMO.
  // - Badewen
  public every(callbackfn: (peer: Peer, netID: number) => void): void {
    this.base.cache.peers.forEach((p, k) => {
      const pp = new Peer(this.base, p.netID);
      callbackfn(pp, k);
    });
  }

  public respawn() {
    const world = this.currentWorld();
    if (!world) return;

    let mainDoor = world?.data.blocks.find((block) => block.fg === 6);

    if (this.data.lastCheckpoint) {
      const pos =
        this.data.lastCheckpoint.x +
        this.data.lastCheckpoint.y * (world?.data.width as number);
      const block = world?.data.blocks[pos];
      const itemMeta =
        this.base.items.metadata.items.get(
          ((block?.fg as number).toString || (block?.bg as number)).toString()
        );

      if (itemMeta && itemMeta.type === ActionTypes.CHECKPOINT) {
        mainDoor = this.data.lastCheckpoint as TileData; // only have x,y.
      } else {
        this.data.lastCheckpoint = undefined;
        this.send(
          Variant.from({ netID: this.data.netID, delay: 0 }, "SetRespawnPos", 0)
        );
        mainDoor = world?.data.blocks?.find((block) => block.fg === 6);
      }
    } else {
      mainDoor = world?.data.blocks.find((block) => block.fg === 6);
    }

    this.send(
      Variant.from({ netID: this.data.netID }, "OnSetFreezeState", 1),
      Variant.from({ netID: this.data.netID }, "OnKilled"),
      Variant.from({ netID: this.data.netID, delay: 2000 }, "OnSetPos", [
        (mainDoor?.x || 0 % world.data.width) * 32,
        (mainDoor?.y || 0 % world.data.width) * 32
      ]),
      Variant.from(
        { netID: this.data.netID, delay: 2000 },
        "OnSetFreezeState",
        0
      )
    );

    this.sound("audio/teleport.wav", 2000);
  }

  public drop(id: number, amount: number) {
    if (this.data.world === "EXIT") return;

    const world = this.currentWorld();
    // world.getFromCache();

    const extra = Math.random() * 6;

    const x =
      (this.data.x as number) + (this.data.rotatedLeft ? -25 : +25) + extra;
    const y =
      (this.data.y as number) +
      extra -
      Math.floor(Math.random() * (3 - -1) + -3);

    world?.drop(this, x, y, id, amount);
  }

  public inventory() {
    const inventory = this.data.inventory;

    this.send(
      TankPacket.from({
        type: TankTypes.SEND_INVENTORY_STATE,
        data: () => {
          const buffer = Buffer.alloc(7 + inventory.items.length * 4);

          buffer.writeUInt8(0x1); // type?
          buffer.writeUInt32LE(inventory.max, 1);
          buffer.writeUInt16LE(inventory.items.length, 5);

          let offset = 7;

          inventory.items.forEach((item) => {
            buffer.writeUInt16LE(item.id, offset);
            buffer.writeUInt16LE(item.amount, offset + 2); // use bitwise OR (1 << 8) if item is equipped. could be wrong

            offset += 4;
          });

          return buffer;
        }
      })
    );
  }
  public sound(file: string, delay = 100) {
    this.send(
      TextPacket.from(
        PacketTypes.ACTION,
        "action|play_sfx",
        `file|${file}`,
        `delayMS|${delay}`
      )
    );
  }

  public currentWorld() {
    if (!this.data.world || this.data.world === "EXIT") return undefined;
    const world = this.base.cache.worlds.get(this.data.world);

    if (world) return new World(this.base, world.name);
    else return new World(this.base, this.data.world);
  }

  public leaveWorld() {
    if (!this.data.world) return;
    const world = this.currentWorld();
    world?.leave(this);
  }

  public async enterWorld(worldName: string, x?: number, y?: number) {
    this.data.world = worldName;

    const world = this.currentWorld();

    const mainDoor = world?.data.blocks?.find((block) => block.fg === 6);

    const xDoor = x ? x : (mainDoor?.x as number);
    const yDoor = y ? y : (mainDoor?.y as number);

    await world?.enter(this, xDoor, yDoor);
    this.inventory();
    this.countryState();
    this.sound("audio/door_open.wav");
    this.formPlayMods();

    this.data.lastVisitedWorlds = manageArray(
      this.data.lastVisitedWorlds!,
      6,
      worldName
    );
  }

  /**
   * Used to make a visual modifying inventory
   */
  public modifyInventory(id: number, amount: number = 1) {
    if (amount > 200 || id <= 0 || id === 112) return;

    if (this.data.inventory?.items.find((i) => i.id === id)?.amount !== 0) {
      const tank = TankPacket.from({
        packetType: 4,
        type:       TankTypes.MODIFY_ITEM_INVENTORY,
        info:       id,
        buildRange: amount < 0 ? amount * -1 : undefined,
        punchRange: amount < 0 ? undefined : amount
      }).parse() as Buffer;

      this.send(tank);
    }

    this.saveToCache();
    return 0;
  }

  public addItemInven(id: number, amount = 1, drop: boolean = false) {
    const item = this.data.inventory.items.find((i) => i.id === id);

    if (!item) {
      this.data.inventory.items.push({ id, amount });
      if (!drop) this.modifyInventory(id, amount);
    } else if (item.amount < 200) {
      if (item.amount + amount > 200) item.amount = 200;
      else item.amount += amount;
      if (!drop) this.modifyInventory(id, amount);
    }

    // this.inventory();
    this.saveToCache();
  }

  public removeItemInven(id: number, amount = 1) {
    if (id === 0 || id === -1 || id === 32 || id === 18) {
      return;
    }
    const item = this.data.inventory.items.find((i) => i.id === id);

    if (item) {
      item.amount -= amount;
      if (item.amount < 1) {
        this.data.inventory.items = this.data.inventory.items.filter(
          (i) => i.id !== id
        );
        if (this.base.items.metadata.items.get(id.toString())!.type === ActionTypes.CLOTHES) {
          this.unequipClothes(id);
        }
      }
    }

    this.modifyInventory(id, -amount);

    // this.inventory();
    this.saveToCache();
  }

  public searchItem(id: number) {
    return this.data.inventory?.items.find((i) => i.id === id);
  }

  public sendClothes() {
    const world = this.currentWorld();
    if (world) {
      world.every((p) => {
        p.send(
          Variant.from(
            {
              netID: this.data.netID
            },
            "OnSetClothing",
            [
              this.data.clothing.hair,
              this.data.clothing.shirt,
              this.data.clothing.pants
            ],
            [
              this.data.clothing.feet,
              this.data.clothing.face,
              this.data.clothing.hand
            ],
            [
              this.data.clothing.back,
              this.data.clothing.mask,
              this.data.clothing.necklace
            ],
            0x8295c3ff,
            [this.data.clothing.ances, 0.0, 0.0]
          )
        );
      })
    }
  }


  // Check every clothes playmods & apply it
  public formPlayMods() {
    let charActive = 0;
    const modActive = 0;

    Object.keys(this.data.clothing).forEach((k) => {
      const itemInfo = this.base.items.wiki.find((i) => i.id === this.data.clothing[k]);
      const playMods = itemInfo?.playMods || [];

      for (const mod of playMods) {
        const name = mod.toLowerCase();
        if (name.includes("double jump")) charActive |= CharacterState.DOUBLE_JUMP;
      }
    });

    this.data.state.mod = charActive;
    this.data.state.modsEffect = modActive;

    this.sendState();
  }

  public equipClothes(itemID: number) {
    if (!this.searchItem(itemID)) return;

    const isAnces = (item: ItemDefinition): boolean => {
      if (item?.type === ActionTypes.ANCES) {
        this.data.clothing.ances = itemID;
        return true;
      }
      return false;
    };

    if (Object.values(this.data.clothing).includes(itemID))
      this.unequipClothes(itemID);
    else {
      const item = this.base.items.metadata.items.get(itemID.toString())!;
      if (!isAnces(item)) {
        const clothKey = CLOTH_MAP[item?.bodyPartType as ClothTypes];

        if (clothKey) {
          this.data.clothing[clothKey] = itemID;
        }
      }
      const itemInfo = this.base.items.wiki.find((i) => i.id === itemID);

      // eslint-disable-next-line no-extra-boolean-cast
      if (!!itemInfo?.func?.add) {
        this.send(Variant.from("OnConsoleMessage", itemInfo.func.add));
      }
      this.formPlayMods();
      this.sendClothes();
      this.send(
        TextPacket.from(
          PacketTypes.ACTION,
          "action|play_sfx",
          "file|audio/change_clothes.wav",
          "delayMS|0"
        )
      );
    }
  }

  public unequipClothes(itemID: number) {
    const item = this.base.items.metadata.items.get(itemID.toString())!;

    let unequiped: boolean = false;

    const isAnces = (item: ItemDefinition): boolean => {
      if (item?.type === ActionTypes.ANCES) {
        if (this.data.clothing.ances === itemID) {
          this.data.clothing.ances = 0;
          unequiped = true;
          return true;
        }
      }
      return false;
    };

    if (!isAnces(item)) {
      const clothKey = CLOTH_MAP[item?.bodyPartType as ClothTypes];

      if (clothKey) {
        this.data.clothing[clothKey] = 0;
        unequiped = true;
      }
    }

    if (unequiped) {
      this.formPlayMods();
      this.sendClothes();
      this.send(
        TextPacket.from(
          PacketTypes.ACTION,
          "action|play_sfx",
          "file|audio/change_clothes.wav",
          "delayMS|0"
        )
      );
    }
    const itemInfo = this.base.items.wiki.find((i) => i.id === itemID);
    // eslint-disable-next-line no-extra-boolean-cast
    if (!!itemInfo?.func?.rem) {
      this.send(Variant.from("OnConsoleMessage", itemInfo.func.rem));
    }
  }

  public isValid(): boolean {
    return this.data && this.data.netID !== undefined;
  }

  public sendEffect(eff: number, ...args: Variant[]) {
    const world = this.currentWorld();
    if (world) {
      world.every((p) => {
        p.send(Variant.from("OnParticleEffect", eff, [(this.data.x as number) + 10, (this.data.y as number) + 16]), ...args);
      });
    };
  }

  public sendState(punchID?: number, everyPeer = true) {
    // Use punchID if provided, otherwise use getPunchID()
    const punch = punchID !== undefined ? punchID : this.getPunchID();
    const tank = TankPacket.from({
      type:   TankTypes.SET_CHARACTER_STATE,
      netID:  this.data.netID,
      info:   this.data.state.mod,
      xPos:   1200,
      yPos:   200,
      xSpeed: 300,
      ySpeed: 600,
      xPunch: 0,
      yPunch: 0,
      state:  0
    }).parse() as Buffer;

    tank.writeUint8(punch, 5);
    tank.writeUint8(0x80, 6);
    tank.writeUint8(0x80, 7);
    tank.writeFloatLE(125.0, 20);

    this.send(tank);
    if (everyPeer) {
      const world = this.currentWorld();
      if (world) {
        world.every((p) => {
          if (p.data.netID !== this.data.netID) {
            p.send(tank);
          }
        })
      }
    }
  }


  // Xp formulas sources: https://www.growtopiagame.com/forums/forum/general/guidebook/7120124-level-125-xp-calculator-and-data-updated-calculator
  // https://growtopia.fandom.com/wiki/Leveling
  // https://growtopia.fandom.com/wiki/User_blog:LightningWizardz/GROWTOPIA_FORMULA_(Rough_Calculation_Mode)
  public addXp(amount: number, bonus: boolean) {
    const playerLvl = this.data.level;
    const requiredXp = this.calculateRequiredLevelXp(playerLvl);

    // Max level is 125
    if (this.data.level >= 125) {
      this.data.exp = 0;
      return;
    }

    // check playmods
    // check bonuses
    this.data.exp += amount;
    if (this.data.exp >= requiredXp) {
      this.data.level++;
      this.data.exp = 0;
      this.sendEffect(46);
      const world = this.currentWorld();
      if (world) {
        world.every((p) => {
          p.send(Variant.from("OnTalkBubble", this.data.netID, `${this.name} is now level ${this.data.level}!`), Variant.from("OnConsoleMessage", `${this.name} is now level ${this.data.level}!`));
        })
      }
    }
    this.countryState();
    this.saveToCache();
  }

  public calculateRequiredLevelXp(lvl: number): number {
    const requiredXp = 50 * ((lvl * lvl) + 2);
    return requiredXp;
  }


  /**
   * Send OnTextBubble variant
   * 
   * @param message The message to send 
   * @param stacked If true, it will override the current OnTextBubble that is being displayed on the client
   * @param netID what netid the OnTalkBubble is for.
   */

  public sendTextBubble(message: string, stacked: boolean, netID?: number) {
    this.send(
      Variant.from(
        "OnTalkBubble",
        netID ?? this.data.netID,
        message,
        0,
        stacked ? 1 : 0
      )
    )
  }

  /**
   * Send `action|play_sfx` to the client
   * @param file the file that will be played
   * @param delay the delay in milliseconds
   */
  public sendSFX(file: string, delayMs: number) {
    this.send(
      TextPacket.from(
        PacketTypes.ACTION,
        "action|play_sfx",
        `file|${file}`,
        `delayMS|${delayMs}`
      )
    );
  }

  /**
   * Send `OnPlayPositioned` variant
   * @param file the file that will be played
   * @param opts the Variant options. Set delay and or netID
   */
  public sendOnPlayPositioned(file: string, opts?: VariantOptions) {
    this.send(
      Variant.from(
        opts,
        "OnPlayPositioned",
        file
      )
    )
  }

  /**
   * Send `OnConsoleMessage` variant
   * @param message the message that is going to be sent
   */
  public sendConsoleMessage(message: string, opts?: VariantOptions) {
    this.send(Variant.from(
      opts,
      "OnConsoleMessage",
      message
    ))
  }


  /**
   * Check if an item can fit into the user inventory
   * @param itemID Item id to check
   * @param amount amount of item to be addedd
   * @returns Status if the item can fit in the user inventory
   */
  public canAddItemToInv(itemID: number, amount: number = 1): boolean {
    const inventoryItem = this.data.inventory.items.find((invItem) => invItem.id == itemID);
    const itemMeta = this.base.items.metadata.items.get(itemID.toString())!;

    if ((inventoryItem && inventoryItem.amount >= itemMeta!.maxAmount!) ||
      (!inventoryItem && this.data.inventory.items.length >= this.data.inventory.max)
    ) {
      return false;
    }
    return true;
  }

  /**
   * Updates the current peer's gem (bux) amount and update the timestamp chat.
   *
   * This method sends a Variant packet to the client to update the displayed gem count,
   * control animation, and optionally indicate supporter status (maybe). It also updates the
   * timestamp used for console chat.
   *
   * @param amount - The new gem (bux) amount to set for the player.
   * @param skip_animation - Whether to skip the gem animation (0 = show animation, 1 = skip animation). Default is 0.
   *
   * ### OnSetBux Packet Structure:
   * - Param 1: `number` — The gem (bux) amount.
   * - Param 2: `number` — Animation flag.
   * - Param 3: `number` — Supporter status.
   * - Param 4: `number[]` — Additional data array:
   *   - `[0]`: `number` (float) — Current timestamp in seconds (used for console chat).
   *   - `[1]`: `number` (float) — Reserved, typically 0.00.
   *   - `[2]`: `number` (float) — Reserved, typically 0.00.
   *
   * @example
   * // Set gems to 1000, show animation
   * peer.setGems(1000);
   *
   * // Set gems to 500 and skip animation
   * peer.setGems(500, 1);
   */
  public setGems(amount: number, skip_animation: number = 0) {
    this.send(Variant.from("OnSetBux", amount, skip_animation, 0, [getCurrentTimeInSeconds(), 0.00, 0.00])); // Param 2 maybe for supporter status?
  }

  public setGrowtokens(amount: number) {
    // There is no known explicit variant for tokens in this codebase; use console update for now
    this.send(Variant.from("OnConsoleMessage", `Growtokens: ${amount}`));
  }
}
