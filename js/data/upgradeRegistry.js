// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Upgrade Registry                                            ║
// ║  Master list of all 70 upgrades. Pure data — no game logic here.          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// Tower type keys match Game.TOWERS: coinmagnet, wetfloor, mop, ubik, potplant

// ─── COMMON TIER — Tower Modifications & Tradeoffs (20) ─────────────────────

export const COMMON_UPGRADES = [
    // Coin Magnet
    {
        id: 'C1',
        name: 'Overclocked Magnet',
        description: 'Coin Shockwave: each coin collected pulses AoE damage (3 + 1.5 per magnet upgrade) to nearby enemies. +12 range, +2 HP.',
        rarity: 'common',
        icon: 'magnet',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        exclusive: 'C20',  // mutually exclusive with Static Charge
        effectFn: null,
    },
    {
        id: 'C2',
        name: 'Double Dip',
        description: 'Coin Magnets collect coins worth 1.5× value',
        rarity: 'common',
        icon: 'coin',
        towerRequirement: ['coinmagnet'],
        stackable: true,
        maxStacks: 1,  // cap 1.5x total (base 1x + 1 stack × 0.5x)
        effectFn: null,
    },
    {
        id: 'C3',
        name: 'Magnet Durability',
        description: 'Coin Resonance: each coin collected permanently increases shockwave damage by (0.5 + 0.25 per stack)%. +5 HP, +10% pull speed per stack.',
        rarity: 'common',
        icon: 'magnet',
        towerRequirement: ['coinmagnet'],
        stackable: true,
        maxStacks: 3,
        effectFn: null,
    },

    // Wet Floor Sign
    {
        id: 'C4',
        name: 'Reinforced Signs',
        description: 'Wet Floor Signs gain +120% HP',
        rarity: 'common',
        icon: 'sign',
        towerRequirement: ['wetfloor'],
        stackable: true,
        maxStacks: 3,  // cap +300%
        effectFn: null,
    },
    {
        id: 'C5',
        name: 'Extra Slippery',
        description: 'Wet Floor Signs slow to 15% speed, linger 1s. If 2+ sign upgrades: signs deal (2 + 1.5 per sign upgrade) DPS to enemies in slow zone.',
        rarity: 'common',
        icon: 'sign',
        towerRequirement: ['wetfloor'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'C6',
        name: 'Prickly Signs',
        description: 'Enemies take 10 damage per bash hit against Wet Floor Signs',
        rarity: 'common',
        icon: 'sign',
        towerRequirement: ['wetfloor'],
        stackable: true,
        maxStacks: 3,  // cap 15
        effectFn: null,
    },

    // Mop Turret
    {
        id: 'C7',
        name: 'Industrial Mop Head',
        description: 'Mop sweep arc 60° → 180° (hits everything in front) and +15% mop damage',
        rarity: 'common',
        icon: 'mop',
        towerRequirement: ['mop'],
        stackable: false,
        maxStacks: 1,
        exclusive: 'C9',  // mutually exclusive with Heavy Mop
        effectFn: null,
    },
    {
        id: 'C8',
        name: 'Quick Sweep',
        description: 'Mop attack cooldown reduced 30%',
        rarity: 'common',
        icon: 'mop',
        towerRequirement: ['mop'],
        stackable: true,
        maxStacks: 2,  // cap -60%
        effectFn: null,
    },
    {
        id: 'C9',
        name: 'Heavy Mop',
        description: 'Mop knockback +75%. If 2+ mop upgrades: mop retriggers on knocked enemies (50% bonus mop hit).',
        rarity: 'common',
        icon: 'mop',
        towerRequirement: ['mop'],
        stackable: true,
        maxStacks: 2,
        exclusive: 'C7',  // mutually exclusive with Industrial Mop Head
        effectFn: null,
    },
    {
        id: 'C10',
        name: 'Extra Absorbent',
        description: 'Mop Turrets gain +4 HP',
        rarity: 'common',
        icon: 'mop',
        towerRequirement: ['mop'],
        stackable: true,
        maxStacks: 3,  // cap +12
        effectFn: null,
    },

    // Ubik Spray
    {
        id: 'C11',
        name: 'Pressure Washer',
        description: 'Ubik cone halves in width, range doubles, +35% damage. Precision beam.',
        rarity: 'common',
        icon: 'spray',
        towerRequirement: ['ubik'],
        stackable: false,
        maxStacks: 1,
        exclusive: 'C12',  // mutually exclusive with Wide Spray
        effectFn: null,
    },
    {
        id: 'C12',
        name: 'Wide Spray',
        description: 'Ubik cone 80% wider. Crowd control mode.',
        rarity: 'common',
        icon: 'spray',
        towerRequirement: ['ubik'],
        stackable: false,
        maxStacks: 1,
        exclusive: 'C11',  // mutually exclusive with Pressure Washer
        effectFn: null,
    },
    {
        id: 'C13',
        name: 'Corrosive Formula',
        description: 'Ubik damage per tick +40%',
        rarity: 'common',
        icon: 'spray',
        towerRequirement: ['ubik'],
        stackable: true,
        maxStacks: 2,
        exclusive: 'C14',  // mutually exclusive with Rapid Spray
        effectFn: null,
    },
    {
        id: 'C14',
        name: 'Rapid Spray',
        description: 'Ubik spray cooldown reduced 25%',
        rarity: 'common',
        icon: 'spray',
        towerRequirement: ['ubik'],
        stackable: true,
        maxStacks: 2,
        exclusive: 'C13',  // mutually exclusive with Corrosive Formula
        effectFn: null,
    },

    // Pot Plant
    {
        id: 'C15',
        name: 'Spring-Loaded Pot',
        description: 'Pot Plants bounce back to original position after being kicked and stun +0.5s longer',
        rarity: 'common',
        icon: 'pot',
        towerRequirement: ['potplant'],
        stackable: false,
        maxStacks: 1,
        exclusive: 'C16',  // mutually exclusive with Cactus Pot
        effectFn: null,
    },
    {
        id: 'C16',
        name: 'Cactus Pot',
        description: 'Pot Plants deal (3 + 2.5 per pot upgrade) DPS to adjacent enemies, 15% slow. If 2+ pot upgrades: Punctured enemies are retriggered by thorns (60% bonus trip damage).',
        rarity: 'common',
        icon: 'pot',
        towerRequirement: ['potplant'],
        stackable: false,
        maxStacks: 1,
        exclusive: 'C15',  // mutually exclusive with Spring-Loaded Pot
        effectFn: null,
    },

    // Tradeoff Upgrades — meaningful build decisions
    {
        id: 'C17',
        name: 'Glass Cannon',
        description: 'All towers deal +50% damage but lose 50% max HP',
        rarity: 'common',
        icon: 'star',
        towerRequirement: null,
        stackable: false,
        maxStacks: 1,
        exclusive: 'C18',  // mutually exclusive with Slow and Steady
        effectFn: null,
    },
    {
        id: 'C18',
        name: 'Slow and Steady',
        description: 'All towers attack 40% slower but deal +70% damage per hit',
        rarity: 'common',
        icon: 'star',
        towerRequirement: null,
        stackable: false,
        maxStacks: 1,
        exclusive: 'C17',  // mutually exclusive with Glass Cannon
        effectFn: null,
    },
    {
        id: 'C19',
        name: 'Bargain Bin',
        description: 'Pot Plants cost 0 coins but start with only 2 HP',
        rarity: 'common',
        icon: 'pot',
        towerRequirement: ['potplant'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'C20',
        name: 'Static Charge',
        description: 'Coin collect zaps nearest enemy for (8 + 3 per magnet upgrade) damage and Shocks them for 3s (+35% damage from all sources, +8% per magnet upgrade).',
        rarity: 'common',
        icon: 'magnet',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        exclusive: 'C1',  // mutually exclusive with Overclocked Magnet
        effectFn: null,
    },
];

// ─── RARE TIER — Synergies & Strong Effects (32) ────────────────────────────

export const RARE_UPGRADES = [
    // Tower-Tower Synergies
    {
        id: 'R1',
        name: 'Wet & Soapy',
        description: 'Enemies slowed by Wet Floor Sign take 2× damage from Ubik Spray',
        rarity: 'rare',
        icon: 'chain',
        towerRequirement: ['wetfloor', 'ubik'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R2',
        name: 'Mop Splash',
        description: 'Mop knockback through a Wet Floor zone stuns ALL enemies in that zone for 1.2s',
        rarity: 'rare',
        icon: 'chain',
        towerRequirement: ['mop', 'wetfloor'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R3',
        name: 'Magnetic Mops',
        description: 'Each Coin Magnet within 10 units of a Mop increases its attack speed by 15%',
        rarity: 'rare',
        icon: 'chain',
        towerRequirement: ['coinmagnet', 'mop'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R4',
        name: 'Ubik Slick',
        description: 'Pot Plants kicked through Ubik spray slide 2.5× further and deal +50% damage',
        rarity: 'rare',
        icon: 'chain',
        towerRequirement: ['ubik', 'potplant'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R5',
        name: 'Coin Shrapnel',
        description: '15% chance each collected coin bonks nearest enemy for 5 damage',
        rarity: 'rare',
        icon: 'coin',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R6',
        name: 'Sign Fortress',
        description: 'Adjacent Wet Floor Signs share incoming damage evenly',
        rarity: 'rare',
        icon: 'sign',
        towerRequirement: ['wetfloor'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R7',
        name: 'Mop & Bucket',
        description: 'Mop sweeps through active Ubik spray gain +8 damage',
        rarity: 'rare',
        icon: 'chain',
        towerRequirement: ['mop', 'ubik'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R8',
        name: 'Pot Magnet',
        description: 'Kicked Pot Plants are pulled toward nearest Coin Magnet after bouncing',
        rarity: 'rare',
        icon: 'chain',
        towerRequirement: ['coinmagnet', 'potplant'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },

    // Powerful Single-Tower Overhauls
    {
        id: 'R9',
        name: 'Sticky Mop',
        description: 'Mop knockback leaves a puddle that slows enemies 40% for 3s. Max 3 per mop.',
        rarity: 'rare',
        icon: 'mop',
        towerRequirement: ['mop'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R10',
        name: 'Chain Trip',
        description: 'Pot Plant trips create a 3-unit shockwave that stumbles nearby enemies',
        rarity: 'rare',
        icon: 'pot',
        towerRequirement: ['potplant'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R11',
        name: 'Spray & Pray',
        description: 'Ubik Spray hitting 5+ enemies in a single burst awards a 5-coin bonus',
        rarity: 'rare',
        icon: 'spray',
        towerRequirement: ['ubik'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R12',
        name: 'Payday',
        description: 'Enemies killed within Coin Magnet range drop 1.5× coins',
        rarity: 'rare',
        icon: 'magnet',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },

    // Economy & Utility (general — no tower requirement)
    {
        id: 'R13',
        name: 'The Tip Jar',
        description: 'Enemy kills have 15% chance to drop a big shiny coin worth 3×',
        rarity: 'rare',
        icon: 'coin',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R14',
        name: 'Clearance Sale',
        description: 'All tower placement costs reduced by 20%',
        rarity: 'rare',
        icon: 'coin',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R15',
        name: 'Insurance Policy',
        description: 'When a tower is destroyed, refund 50% of its cost',
        rarity: 'rare',
        icon: 'coin',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R16',
        name: 'Crossfire',
        description: 'Enemies hit by 2+ different tower types within 1s take 40% bonus damage',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },

    // Build-enabling synergies
    {
        id: 'R17',
        name: 'Marked for Death',
        description: 'Slowed enemies take +40% damage from ALL sources',
        rarity: 'rare',
        icon: 'sign',
        towerRequirement: ['wetfloor'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R18',
        name: 'Crowd Surfing',
        description: 'Enemies within 3 units of 2+ other enemies take +30% damage from all towers',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R19',
        name: 'Overkill Bonus',
        description: 'Excess damage on a kill converts to coins (1 coin per 5 overkill damage)',
        rarity: 'rare',
        icon: 'coin',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R20',
        name: 'Aftershock',
        description: 'Pot Plant trips create an 8-damage shockwave in a 3-unit radius',
        rarity: 'rare',
        icon: 'pot',
        towerRequirement: ['potplant'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R21',
        name: 'Specialist',
        description: 'For each tower type you DON\'T own, all towers deal +15% damage',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R22',
        name: 'Recycler',
        description: 'Selling a tower refunds 100% of cost and permanently buffs adjacent towers +10% damage',
        rarity: 'rare',
        icon: 'coin',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },

    // ── Build-Defining Upgrades — Balatro-style "this IS my run now" ──────

    {
        id: 'R23',
        name: 'Devotion',
        description: 'Choose 2 tower types. All other towers are destroyed (full refund). Chosen types deal +60% damage and cost 30% less.',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        effectFn: null,
    },
    {
        id: 'R24',
        name: 'Skeleton Crew',
        description: 'Max 6 towers on the field. Each empty slot gives all towers +25% damage.',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        exclusive: 'L13',  // mutually exclusive with Minimalist
        effectFn: null,
    },
    {
        id: 'R25',
        name: 'Compound Interest',
        description: 'End of each wave: gain 5% of your coins as bonus.',
        rarity: 'rare',
        icon: 'coin',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        effectFn: null,
    },
    {
        id: 'R26',
        name: 'Controlled Demolition',
        description: 'Selling a tower detonates it for 20 damage (5-unit blast) and permanently gives all towers +8% damage.',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        effectFn: null,
    },
    {
        id: 'R27',
        name: 'Double Shift',
        description: 'All towers attack 40% faster, but take 2 self-damage per attack.',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        effectFn: null,
    },
    {
        id: 'R28',
        name: 'Danger Pay',
        description: 'Towers in the front 3 rows deal +50% damage. Towers in the back rows deal −30%.',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        effectFn: null,
    },
    {
        id: 'R29',
        name: 'Contagion',
        description: 'Slow effects spread to enemies within 4 units of a slowed enemy (50% effectiveness).',
        rarity: 'rare',
        icon: 'sign',
        towerRequirement: ['wetfloor'],
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        effectFn: null,
    },
    {
        id: 'R30',
        name: 'Sympathetic Damage',
        description: 'When an enemy takes damage, all enemies within 4 units take 8% of that damage.',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        effectFn: null,
    },
    {
        id: 'R31',
        name: 'Rush Defense',
        description: 'First 3s of each wave: all towers deal 2.5× damage. After that: −25% for the rest.',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        exclusive: 'R32',  // mutually exclusive with Attrition
        effectFn: null,
    },
    {
        id: 'R32',
        name: 'Attrition',
        description: 'Towers gain +4% damage per second enemies are alive (caps at +50%). Resets each wave.',
        rarity: 'rare',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        exclusive: 'R31',  // mutually exclusive with Rush Defense
        effectFn: null,
    },

    // ── Chase Cards — Specialist Upgrades (dormant → active at threshold) ──────

    {
        id: 'R33',
        name: "Plumber's Union",
        description: 'Mop hits soak enemies — soaked enemies take ×1.5 damage from all sources (4s). Per mop upgrade owned: +0.1× (caps at ×2.5).',
        rarity: 'rare',
        icon: 'mop',
        towerRequirement: null,  // Balatro-style: offered ungated, you build around it
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        effectFn: null,
    },
    {
        id: 'R34',
        name: 'Terracotta Army',
        description: 'Tripped enemies are Cracked — taking ×1.4 damage from ALL sources for 3s. Per pot upgrade owned: +0.15× mult. Destroyed pots shatter into 3 damaging shards.',
        rarity: 'rare',
        icon: 'pot',
        towerRequirement: null,  // Balatro-style: offered ungated, you build around it
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        effectFn: null,
    },
    {
        id: 'R35',
        name: 'Money Printer',
        description: 'Each coin collected buffs all tower damage +1% for 4s (stacks to +30%). Per magnet upgrade owned: +5% stack cap. Coins collected also grant +0.5% attack speed (stacks to +15%).',
        rarity: 'rare',
        icon: 'magnet',
        towerRequirement: null,  // Balatro-style: offered ungated, you build around it
        stackable: false,
        maxStacks: 1,
        buildDefining: true,
        effectFn: null,
    },
];

// ─── LEGENDARY TIER — Weird Rules & Build Definers (18) ─────────────────────

export const LEGENDARY_UPGRADES = [
    {
        id: 'L1',
        name: 'Double Flush',
        description: 'Toilet door fully healed and max HP permanently increased by 4',
        rarity: 'legendary',
        icon: 'door',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L2',
        name: 'Desperate Measures',
        description: 'When door HP is below 50%, ALL towers deal 2× damage and attack 30% faster',
        rarity: 'legendary',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L3',
        name: 'Plunger Protocol',
        description: 'Door hit → ALL towers within 12 units get 3× attack speed for 3s',
        rarity: 'legendary',
        icon: 'door',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L4',
        name: 'Rush Hour Pileup',
        description: 'Enemy-on-enemy collision stuns both for 0.8s, dealing 4 damage. Per mop upgrade: +0.2s stun, +2 damage.',
        rarity: 'legendary',
        icon: 'star',
        towerRequirement: ['mop'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L5',
        name: 'Domino Effect',
        description: 'Trip chains: enemies slide into others, tripping them. Chain damage scales with pot upgrades, decay reduces per pot upgrade.',
        rarity: 'legendary',
        icon: 'pot',
        towerRequirement: ['potplant'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L6',
        name: 'Spill Zone',
        description: 'KO\'d enemies leave a puddle (3-unit, 25% slow, 2 dps, 4s). Per sign upgrade: +5% slow, +1 dps, +1s.',
        rarity: 'legendary',
        icon: 'sign',
        towerRequirement: ['wetfloor'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L7',
        name: 'Loose Change',
        description: 'Uncollected coins trip enemies (0.5s stun, 1 damage). Per magnet upgrade: +0.15s stun, +1 damage.',
        rarity: 'legendary',
        icon: 'coin',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L8',
        name: 'Nuclear Mop',
        description: 'Mop knockback 3×. Wall/tower collision deals (4 + 3 per mop upgrade) damage.',
        rarity: 'legendary',
        icon: 'mop',
        towerRequirement: ['mop'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L9',
        name: 'Ubik Flood',
        description: 'Each spray leaves a lingering 4-unit zone (8s). Zone DPS = (1 + 1 per ubik upgrade). Max 5 per Ubik.',
        rarity: 'legendary',
        icon: 'spray',
        towerRequirement: ['ubik'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L10',
        name: 'Golden Magnet',
        description: 'Coin Magnets generate 1 coin per (5 - 0.5 per magnet upgrade) seconds. Min 2s.',
        rarity: 'legendary',
        icon: 'magnet',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L11',
        name: 'Bladder Burst',
        description: 'KO\'d enemies build pressure for 2s then BURST — 25% max HP splash damage in 5 units, chains',
        rarity: 'legendary',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L12',
        name: 'Overtime',
        description: 'First 3s of each wave: all towers 2× speed, enemies 0.5× speed. Per sign upgrade: +0.8s duration.',
        rarity: 'legendary',
        icon: 'sign',
        towerRequirement: ['wetfloor'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },

    // Build-defining game-changers
    {
        id: 'L13',
        name: 'Minimalist',
        description: 'If you have 4 or fewer towers, each deals 2× damage',
        rarity: 'legendary',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        exclusive: 'R24',  // mutually exclusive with Skeleton Crew
        effectFn: null,
    },
    {
        id: 'L14',
        name: 'Hoarder',
        description: 'Per (50 - 4 per magnet upgrade, min 25) unspent coins: all towers +10% damage. Max +80%.',
        rarity: 'legendary',
        icon: 'coin',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L15',
        name: 'Chain Reaction',
        description: 'When a tower kills an enemy, the nearest tower within 12 units fires immediately (2s cooldown per tower)',
        rarity: 'legendary',
        icon: 'chain',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L16',
        name: 'Loan Shark',
        description: 'Gain 60 coins immediately, but wave bonuses are halved for the rest of the run',
        rarity: 'legendary',
        icon: 'coin',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L17',
        name: 'Assembly Line',
        description: 'Towers in a straight row get +20% damage per adjacent tower in the line',
        rarity: 'legendary',
        icon: 'star',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L18',
        name: 'Last Stand',
        description: 'Towers at 1 HP deal 3× damage and attack 50% faster',
        rarity: 'legendary',
        icon: 'door',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
];

// ─── ALL UPGRADES (flat list + lookup map) ──────────────────────────────────

export const ALL_UPGRADES = [...COMMON_UPGRADES, ...RARE_UPGRADES, ...LEGENDARY_UPGRADES];

export const UPGRADE_MAP = {};
for (const u of ALL_UPGRADES) {
    UPGRADE_MAP[u.id] = u;
}

// ─── GENERAL UPGRADES (no tower requirement) ────────────────────────────────
// Used by the "at least one general option" guarantee rule

export const GENERAL_UPGRADES = ALL_UPGRADES.filter(u => u.towerRequirement === null);
