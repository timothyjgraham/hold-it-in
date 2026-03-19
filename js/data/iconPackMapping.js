// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Icon Pack Model Mapping                                     ║
// ║  Maps upgrade IDs → GLB model names from the 3D icon pack.               ║
// ║  Each entry includes toon colors from PALETTE for unique identity.        ║
// ║  Upgrades NOT listed here use procedural fallback icons.                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// Model names correspond to children in public/models/icons/icon-pack.glb
// Each entry: upgradeId → { model, scale?, color (largest mesh), accent? (detail meshes) }
//
// Color assignment:
//   color  → applied to the LARGEST mesh (body, container, handle — whatever is biggest)
//   accent → applied to SMALLER meshes (emblem, gem, coins, cork, blade head, etc.)
//            If omitted, auto-derived by blending color 55% toward PALETTE.cream
//
// Design principles:
//   - Think about what each mesh physically IS: wood handles get brown, metal gets gold/silver,
//     leather bags get brown, corks get wood, glass flasks get the thematic color, etc.
//   - Tower-specific upgrades use tower color where it makes sense for the material
//   - Similar models (shields, bombs, etc.) get distinct color combos to tell apart
//   - Economy items: bags/pouches = brown leather, coins/gems = gold/colored

import { PALETTE } from './palette.js';

export const ICON_PACK_MAP = {
    // ── COMMON ────────────────────────────────────────────────────────────────

    // Coin Magnet upgrades — amber/orange family
    C1:  { model: 'Energy_Yellow', color: PALETTE.magnet, accent: PALETTE.gold },         // Overclocked Magnet — amber bolt, gold core
    C2:  { model: 'Coin_Gold', color: PALETTE.gold, accent: PALETTE.wood },               // Double Dip — gold disc, brown rim
    C3:  { model: 'Shield01', color: PALETTE.magnet, accent: PALETTE.gold },              // Magnet Durability — amber shield body, gold emblem
    C20: { model: 'Energy_Blue', color: 0x59c3e8, accent: PALETTE.white },               // Static Charge — electric blue bolt, white spark

    // Wet Floor Sign upgrades — yellow family
    C4:  { model: 'Shield02', color: PALETTE.sign, accent: PALETTE.cream },               // Reinforced Signs — yellow shield body, cream emblem
    C5:  { model: 'Potion01_Blue', color: 0x59c3e8, accent: PALETTE.wood },              // Extra Slippery — blue flask, wood cork
    C6:  { model: 'Tooth_Poison', color: PALETTE.sign, accent: PALETTE.ubik },            // Prickly Signs — yellow tooth, green poison tip

    // Mop Turret upgrades — purple family
    C7:  { model: 'Axe01', color: PALETTE.mop, accent: PALETTE.wood },                   // Industrial Mop Head — purple blade, wood handle
    C8:  { model: 'Stopwatch', color: PALETTE.mop, accent: PALETTE.cream },              // Quick Sweep — purple body, cream clock face
    C9:  { model: 'Hammer01', color: PALETTE.wood, accent: PALETTE.mop },                // Heavy Mop — wood handle (largest), purple head
    C10: { model: 'Heart', color: PALETTE.danger, accent: PALETTE.girls },               // Extra Absorbent — red heart, pink highlight

    // Ubik Spray upgrades — green family
    C11: { model: 'Arrows', color: PALETTE.ubik, accent: PALETTE.cream },                // Pressure Washer — green arrows, cream shaft
    C12: { model: 'Megaphone_Yellow', color: PALETTE.ubik, accent: PALETTE.cream },      // Wide Spray — green megaphone, cream horn
    C13: { model: 'Skull', color: PALETTE.ubik, accent: PALETTE.cream },                 // Corrosive Formula — green skull, cream bone detail
    C14: { model: 'Energy_Red', color: PALETTE.ubik, accent: PALETTE.gold },             // Rapid Spray — green energy bolt, gold sparks

    // Pot Plant upgrades — terracotta family
    C15: { model: 'Mushroom_Brown', color: PALETTE.potplant, accent: PALETTE.cream },    // Spring-Loaded Pot — terracotta cap, cream stem
    C16: { model: 'Tooth_Red', color: PALETTE.potplant, accent: PALETTE.cream },         // Cactus Pot — terracotta tooth, cream root

    // General / Tradeoff upgrades
    C17: { model: 'Bomb', color: PALETTE.danger, accent: PALETTE.charcoal },             // Glass Cannon — red bomb body, dark fuse
    C18: { model: 'Shield03', color: PALETTE.wall, accent: PALETTE.cream },              // Slow and Steady — blue-gray shield, cream emblem
    C19: { model: 'Ticket_Yellow', color: PALETTE.gold, accent: PALETTE.danger },        // Bargain Bin — gold ticket, red sale price

    // ── RARE ──────────────────────────────────────────────────────────────────

    // Tower-tower synergies
    R1:  { model: 'Potion03_Blue', color: 0x59c3e8, accent: PALETTE.wood },              // Wet & Soapy — blue flask, wood cork
    R2:  { model: 'Potion02_Blue', color: PALETTE.mop, accent: PALETTE.wood },           // Mop Splash — purple flask, wood cork
    R3:  { model: 'Ring01', color: PALETTE.magnet, accent: PALETTE.mop },                // Magnetic Mops — amber ring band, purple gem
    R4:  { model: 'Lucky_Green', color: PALETTE.ubik, accent: PALETTE.potplant },        // Ubik Slick — green clover, terracotta detail
    R5:  { model: 'Coin', color: PALETTE.magnet, accent: PALETTE.gold },                 // Coin Shrapnel — amber coin, gold edge
    R6:  { model: 'Castle', color: PALETTE.sign, accent: PALETTE.cream },                // Sign Fortress — yellow fortress, cream walls
    R7:  { model: 'Potion04_Blue', color: PALETTE.mop, accent: PALETTE.wood },           // Mop & Bucket — purple flask, wood cork
    R8:  { model: 'Ring02', color: PALETTE.potplant, accent: PALETTE.magnet },           // Pot Magnet — terracotta ring, amber gem

    // Single-tower overhauls
    R9:  { model: 'Potion03_Green', color: PALETTE.mop, accent: PALETTE.wood },          // Sticky Mop — purple flask, wood cork
    R10: { model: 'Necklace', color: PALETTE.gold, accent: PALETTE.potplant },           // Chain Trip — gold chain, terracotta pendant
    R11: { model: 'Potion04_Green', color: PALETTE.ubik, accent: PALETTE.wood },         // Spray & Pray — green flask, wood cork
    R12: { model: 'Moneybag', color: PALETTE.wood, accent: PALETTE.gold },               // Payday — brown leather bag, gold coins
    R13: { model: 'Pouch', color: PALETTE.wood, accent: PALETTE.gold },                  // The Tip Jar — brown leather pouch, gold tie

    // Economy & utility
    R14: { model: 'Ticket_Red', color: PALETTE.cream, accent: PALETTE.danger },          // Clearance Sale — cream ticket, red sale mark
    R15: { model: 'Shield01', scale: 1.1, color: PALETTE.success, accent: PALETTE.cream }, // Insurance Policy — green shield, cream emblem
    R16: { model: 'Battle', color: PALETTE.danger, accent: PALETTE.wood },               // Crossfire — red blades, wood handles
    R17: { model: 'Skull', color: PALETTE.danger, accent: PALETTE.cream },               // Marked for Death — red skull, cream bone
    R18: { model: 'Megaphone_Blue', color: 0x59c3e8, accent: PALETTE.cream },            // Crowd Surfing — blue megaphone, cream horn
    R19: { model: 'Sword', color: PALETTE.danger, accent: PALETTE.wood },                // Overkill Bonus — red blade, wood handle
    R20: { model: 'Rune', color: PALETTE.potplant, accent: PALETTE.gold },               // Aftershock — terracotta rune, gold glyph
    R21: { model: 'Medal_Gold', color: PALETTE.gold, accent: PALETTE.danger },           // Specialist — gold medal, red ribbon
    R22: { model: 'Energy_Green', color: PALETTE.success, accent: PALETTE.cream },       // Recycler — green energy, cream core

    // Build-defining
    R23: { model: 'Heart', color: PALETTE.girls, accent: PALETTE.cream },                // Devotion — pink heart, cream highlight
    R24: { model: 'Flag_Skull', color: PALETTE.cream, accent: PALETTE.charcoal },        // Skeleton Crew — cream flag cloth, dark skull & crossbones
    R25: { model: 'Coin_Gold', scale: 1.2, color: PALETTE.gold, accent: PALETTE.wood },  // Compound Interest — gold coin, brown rim
    R26: { model: 'Bomb', color: PALETTE.wood, accent: PALETTE.charcoal },               // Controlled Demolition — brown bomb body, dark fuse
    R27: { model: 'Hourglass01', color: PALETTE.mop, accent: PALETTE.cream },            // Double Shift — purple frame, cream sand
    R28: { model: 'Coin_Bronze', color: PALETTE.polite, accent: PALETTE.wood },          // Danger Pay — tan bronze, brown rim
    R29: { model: 'Mushroom_Red', color: PALETTE.danger, accent: PALETTE.cream },        // Contagion — red cap, cream stem/spots
    R30: { model: 'Gemstone_Red', color: PALETTE.danger, accent: PALETTE.gold },         // Sympathetic Damage — red gem, gold setting
    R31: { model: 'Stopwatch', color: PALETTE.danger, accent: PALETTE.cream },           // Rush Defense — red body, cream clock face
    R32: { model: 'Hourglass02', color: PALETTE.sign, accent: PALETTE.wood },            // Attrition — yellow frame, brown sand
    R33: { model: 'Hammer02', color: PALETTE.wood, accent: PALETTE.mop },                // Plumber's Union — wood handle, purple head
    R34: { model: 'Helmet01', color: PALETTE.potplant, accent: PALETTE.cream },          // Terracotta Army — terracotta helmet, cream interior
    R35: { model: 'Chest_Gold_Yellow', color: PALETTE.wood, accent: PALETTE.gold },      // Money Printer — wood chest, gold coins

    // ── LEGENDARY ─────────────────────────────────────────────────────────────
    L1:  { model: 'Key_Gold', color: PALETTE.gold, accent: PALETTE.wood },               // Double Flush — gold key body, brown handle
    L2:  { model: 'Potion01_Red', color: PALETTE.danger, accent: PALETTE.wood },         // Desperate Measures — red flask, wood cork
    L3:  { model: 'Hammer01', scale: 1.2, color: PALETTE.wood, accent: PALETTE.gold },   // Plunger Protocol — wood handle, gold head
    L4:  { model: 'Axe02', color: PALETTE.mop, accent: PALETTE.wood },                   // Rush Hour Pileup — purple blade, wood handle
    L5:  { model: 'Stone', color: PALETTE.potplant, accent: PALETTE.cream },             // Domino Effect — terracotta stone, cream vein
    L6:  { model: 'Potion05_Green', color: PALETTE.sign, accent: PALETTE.wood },         // Spill Zone — yellow flask, wood cork
    L7:  { model: 'Coin_Silver', color: PALETTE.fixture, accent: PALETTE.wall },         // Loose Change — silver coin, gray rim
    L8:  { model: 'Potion01_Purple', color: PALETTE.mop, accent: PALETTE.wood },         // Nuclear Mop — purple flask, wood cork
    L9:  { model: 'Potion06_Green', color: PALETTE.ubik, accent: PALETTE.wood },         // Ubik Flood — green flask, wood cork
    L10: { model: 'Crown', color: PALETTE.gold, accent: PALETTE.danger },                // Golden Magnet — gold crown, red gems
    L11: { model: 'Bomb', color: PALETTE.panicker, accent: PALETTE.charcoal },           // Bladder Burst — yellow bomb, dark fuse
    L12: { model: 'Calendar_Red', color: PALETTE.cream, accent: PALETTE.danger },        // Overtime — cream calendar page, red date mark
    L13: { model: 'Gem_Yellow', color: PALETTE.gold, accent: PALETTE.cream },            // Minimalist — gold gem, cream facets
    L14: { model: 'Chest_Gem_Blue', color: PALETTE.wood, accent: 0x59c3e8 },            // Hoarder — wood chest, blue gem
    L15: { model: 'Energy_Purple', color: PALETTE.mop, accent: PALETTE.cream },          // Chain Reaction — purple energy, cream core
    L16: { model: 'Tooth_Dragon', color: PALETTE.gold, accent: PALETTE.cream },          // Loan Shark — gold tooth, cream root
    L17: { model: 'Anvil', color: PALETTE.fixture, accent: PALETTE.charcoal },           // Assembly Line — gray anvil, dark base
    L18: { model: 'Sword', scale: 1.2, color: PALETTE.gold, accent: PALETTE.wood },      // Last Stand — gold blade, wood handle
};
