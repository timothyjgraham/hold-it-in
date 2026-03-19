// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Icon Pack Model Mapping                                     ║
// ║  Maps upgrade IDs → GLB model names from the 3D icon pack.               ║
// ║  Upgrades NOT listed here use procedural fallback icons.                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// Model names correspond to children in public/models/icons/icon-pack.glb
// Each entry: upgradeId → { model, scale? (optional multiplier) }

export const ICON_PACK_MAP = {
    // ── COMMON ────────────────────────────────────────────────────────────────
    C1:  { model: 'Energy_Yellow' },        // Overclocked Magnet — yellow energy bolt
    C2:  { model: 'Coin_Gold' },            // Double Dip — gold coin
    C3:  { model: 'Shield01' },             // Magnet Durability — shield
    C4:  { model: 'Shield02' },             // Reinforced Signs — reinforced shield
    C5:  { model: 'Potion01_Blue' },        // Extra Slippery — blue liquid
    C6:  { model: 'Tooth_Poison' },         // Prickly Signs — poison tooth/spike
    C7:  { model: 'Axe01' },               // Industrial Mop Head — big chopping tool
    C8:  { model: 'Stopwatch' },            // Quick Sweep — speed timer
    C9:  { model: 'Hammer01' },             // Heavy Mop — heavy hammer
    C10: { model: 'Heart' },                // Extra Absorbent — HP/health
    C11: { model: 'Arrows' },              // Pressure Washer — focused beam/arrows
    C12: { model: 'Megaphone_Yellow' },     // Wide Spray — wide spread
    C13: { model: 'Skull' },                // Corrosive Formula — toxic/deadly
    C14: { model: 'Energy_Red' },           // Rapid Spray — red energy/speed
    C15: { model: 'Mushroom_Brown' },       // Spring-Loaded Pot — bouncy mushroom
    C16: { model: 'Tooth_Red' },            // Cactus Pot — red thorn/spike
    C17: { model: 'Bomb' },                 // Glass Cannon — explosive
    C18: { model: 'Shield03' },             // Slow and Steady — turtle shell/shield
    C19: { model: 'Ticket_Yellow' },        // Bargain Bin — sale ticket
    C20: { model: 'Energy_Blue' },          // Static Charge — blue electricity

    // ── RARE ──────────────────────────────────────────────────────────────────
    R1:  { model: 'Potion03_Blue' },        // Wet & Soapy — blue liquid
    R2:  { model: 'Potion02_Blue' },        // Mop Splash — water splash
    R3:  { model: 'Ring01' },               // Magnetic Mops — magnetic ring
    R4:  { model: 'Lucky_Green' },          // Ubik Slick — green luck/slippery
    R5:  { model: 'Coin' },                 // Coin Shrapnel — base coin
    R6:  { model: 'Castle' },               // Sign Fortress — fortress!
    R7:  { model: 'Potion04_Blue' },        // Mop & Bucket — bucket of liquid
    R8:  { model: 'Ring02' },               // Pot Magnet — magnetic ring (different)
    R9:  { model: 'Potion03_Green' },       // Sticky Mop — green goo
    R10: { model: 'Necklace' },             // Chain Trip — chain/necklace
    R11: { model: 'Potion04_Green' },       // Spray & Pray — green spray
    R12: { model: 'Moneybag' },             // Payday — money bag
    R13: { model: 'Pouch' },                // The Tip Jar — coin pouch
    R14: { model: 'Ticket_Red' },           // Clearance Sale — red sale tag
    R15: { model: 'Shield01', scale: 1.1 }, // Insurance Policy — protection shield
    R16: { model: 'Battle' },               // Crossfire — crossed swords
    R17: { model: 'Skull' },                // Marked for Death — skull
    R18: { model: 'Megaphone_Blue' },       // Crowd Surfing — crowd noise
    R19: { model: 'Sword' },                // Overkill Bonus — big sword
    R20: { model: 'Rune' },                 // Aftershock — magical rune
    R21: { model: 'Medal_Gold' },           // Specialist — gold medal
    R22: { model: 'Energy_Green' },         // Recycler — green energy/renewal
    R23: { model: 'Heart' },                // Devotion — heart
    R24: { model: 'Flag_Skull' },           // Skeleton Crew — skull flag
    R25: { model: 'Coin_Gold', scale: 1.2 },// Compound Interest — stacking gold
    R26: { model: 'Bomb' },                 // Controlled Demolition — bomb
    R27: { model: 'Hourglass01' },          // Double Shift — hourglass
    R28: { model: 'Coin_Bronze' },          // Danger Pay — bronze coin
    R29: { model: 'Mushroom_Red' },         // Contagion — toxic red mushroom
    R30: { model: 'Gemstone_Red' },         // Sympathetic Damage — red gemstone
    R31: { model: 'Stopwatch' },            // Rush Defense — stopwatch
    R32: { model: 'Hourglass02' },          // Attrition — hourglass (different style)
    R33: { model: 'Hammer02' },             // Plumber's Union — plumber hammer
    R34: { model: 'Helmet01' },             // Terracotta Army — warrior helmet
    R35: { model: 'Chest_Gold_Yellow' },    // Money Printer — gold chest

    // ── LEGENDARY ─────────────────────────────────────────────────────────────
    L1:  { model: 'Key_Gold' },             // Double Flush — gold key (unlock)
    L2:  { model: 'Potion01_Red' },         // Desperate Measures — red potion (emergency)
    L3:  { model: 'Hammer01', scale: 1.2 }, // Plunger Protocol — heavy tool
    L4:  { model: 'Axe02' },               // Rush Hour Pileup — battle axe (collision)
    L5:  { model: 'Stone' },                // Domino Effect — falling stone
    L6:  { model: 'Potion05_Green' },       // Spill Zone — spilled green potion
    L7:  { model: 'Coin_Silver' },          // Loose Change — silver coins
    L8:  { model: 'Potion01_Purple' },      // Nuclear Mop — purple potion (toxic)
    L9:  { model: 'Potion06_Green' },       // Ubik Flood — green flood
    L10: { model: 'Crown' },                // Golden Magnet — golden crown
    L11: { model: 'Bomb' },                 // Bladder Burst — bomb
    L12: { model: 'Calendar_Red' },         // Overtime — red calendar (time)
    L13: { model: 'Gem_Yellow' },           // Minimalist — single precious gem
    L14: { model: 'Chest_Gem_Blue' },       // Hoarder — gem chest
    L15: { model: 'Energy_Purple' },        // Chain Reaction — purple energy chain
    L16: { model: 'Tooth_Dragon' },         // Loan Shark — dragon tooth (shark)
    L17: { model: 'Anvil' },                // Assembly Line — anvil (manufacturing)
    L18: { model: 'Sword', scale: 1.2 },    // Last Stand — planted sword
};
