// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Upgrade Registry                                            ║
// ║  Master list of all 44 upgrades. Pure data — no game logic here.          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// Tower type keys match Game.TOWERS: coinmagnet, wetfloor, mop, ubik, potplant

// ─── COMMON TIER — Tower Modifications (16) ─────────────────────────────────

export const COMMON_UPGRADES = [
    // Coin Magnet
    {
        id: 'C1',
        name: 'Overclocked Magnet',
        description: 'Coin Magnet collection range doubled (8 → 16 units)',
        rarity: 'common',
        icon: '🧲',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'C2',
        name: 'Double Dip',
        description: 'Coin Magnets collect coins worth 1.5× value',
        rarity: 'common',
        icon: '💰',
        towerRequirement: ['coinmagnet'],
        stackable: true,
        maxStacks: 2,  // cap 3x total (base 1x + 2 stacks × 1x)
        effectFn: null,
    },
    {
        id: 'C3',
        name: 'Magnet Durability',
        description: 'Coin Magnets gain +4 HP',
        rarity: 'common',
        icon: '🛡️',
        towerRequirement: ['coinmagnet'],
        stackable: true,
        maxStacks: 3,  // cap +12
        effectFn: null,
    },

    // Wet Floor Sign
    {
        id: 'C4',
        name: 'Reinforced Signs',
        description: 'Wet Floor Signs gain +100% HP',
        rarity: 'common',
        icon: '🔩',
        towerRequirement: ['wetfloor'],
        stackable: true,
        maxStacks: 3,  // cap +300%
        effectFn: null,
    },
    {
        id: 'C5',
        name: 'Extra Slippery',
        description: 'Wet Floor Signs slow enemies to 20% speed (from 40%)',
        rarity: 'common',
        icon: '🫠',
        towerRequirement: ['wetfloor'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'C6',
        name: 'Prickly Signs',
        description: 'Enemies take 5 damage per bash hit against Wet Floor Signs',
        rarity: 'common',
        icon: '🌵',
        towerRequirement: ['wetfloor'],
        stackable: true,
        maxStacks: 3,  // cap 15
        effectFn: null,
    },

    // Mop Turret
    {
        id: 'C7',
        name: 'Industrial Mop Head',
        description: 'Mop sweep arc 60° → 180° (hits everything in front)',
        rarity: 'common',
        icon: '🌀',
        towerRequirement: ['mop'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'C8',
        name: 'Quick Sweep',
        description: 'Mop attack cooldown reduced 30%',
        rarity: 'common',
        icon: '⚡',
        towerRequirement: ['mop'],
        stackable: true,
        maxStacks: 2,  // cap -60%
        effectFn: null,
    },
    {
        id: 'C9',
        name: 'Heavy Mop',
        description: 'Mop knockback distance +50%',
        rarity: 'common',
        icon: '💪',
        towerRequirement: ['mop'],
        stackable: true,
        maxStacks: 2,  // cap +100%
        effectFn: null,
    },
    {
        id: 'C10',
        name: 'Extra Absorbent',
        description: 'Mop Turrets gain +4 HP',
        rarity: 'common',
        icon: '🧽',
        towerRequirement: ['mop'],
        stackable: true,
        maxStacks: 3,  // cap +12
        effectFn: null,
    },

    // Ubik Spray
    {
        id: 'C11',
        name: 'Pressure Washer',
        description: 'Ubik cone halves in width, range doubles. Precision beam.',
        rarity: 'common',
        icon: '🎯',
        towerRequirement: ['ubik'],
        stackable: false,
        maxStacks: 1,
        exclusive: 'C12',  // mutually exclusive with Wide Spray
        effectFn: null,
    },
    {
        id: 'C12',
        name: 'Wide Spray',
        description: 'Ubik cone 60% wider, damage reduced 30%. Crowd control mode.',
        rarity: 'common',
        icon: '🌊',
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
        icon: '☣️',
        towerRequirement: ['ubik'],
        stackable: true,
        maxStacks: 2,  // cap +100% (2 stacks × 40% + base 40%)... actually plan says cap +100%
        effectFn: null,
    },
    {
        id: 'C14',
        name: 'Rapid Spray',
        description: 'Ubik spray cooldown reduced 25%',
        rarity: 'common',
        icon: '💨',
        towerRequirement: ['ubik'],
        stackable: true,
        maxStacks: 2,  // cap -50%
        effectFn: null,
    },

    // Pot Plant
    {
        id: 'C15',
        name: 'Spring-Loaded Pot',
        description: 'Pot Plants bounce back to original position after being kicked',
        rarity: 'common',
        icon: '🔄',
        towerRequirement: ['potplant'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'C16',
        name: 'Cactus Pot',
        description: 'Pot Plants deal 3 damage/sec to adjacent enemies',
        rarity: 'common',
        icon: '🌵',
        towerRequirement: ['potplant'],
        stackable: true,
        maxStacks: 3,  // cap 9 dps
        effectFn: null,
    },
];

// ─── RARE TIER — Synergies & Strong Effects (16) ────────────────────────────

export const RARE_UPGRADES = [
    // Tower-Tower Synergies
    {
        id: 'R1',
        name: 'Wet & Soapy',
        description: 'Enemies slowed by Wet Floor Sign take 2× damage from Ubik Spray',
        rarity: 'rare',
        icon: '🧼',
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
        icon: '💦',
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
        icon: '🧲',
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
        icon: '🛢️',
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
        icon: '💥',
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
        icon: '🏰',
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
        icon: '🪣',
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
        icon: '🪴',
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
        icon: '🫧',
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
        icon: '🔗',
        towerRequirement: ['potplant'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R11',
        name: 'Spray & Pray',
        description: 'Ubik Spray hitting 5+ enemies in a burst refunds 5 coins',
        rarity: 'rare',
        icon: '🙏',
        towerRequirement: ['ubik'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R12',
        name: 'Sentry Magnet',
        description: 'Coin Magnets pulse every 4s, revealing enemy HP bars and marking highest-HP enemy',
        rarity: 'rare',
        icon: '📡',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },

    // Economy & Utility (general — no tower requirement)
    {
        id: 'R13',
        name: 'The Tip Jar',
        description: 'Enemy kills have 20% chance to drop a golden coin worth 5×',
        rarity: 'rare',
        icon: '🏆',
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
        icon: '🏷️',
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
        icon: '📋',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'R16',
        name: 'Bathroom Panic',
        description: '12% of enemies freeze for 2s on entering, then run at 2× speed',
        rarity: 'rare',
        icon: '😱',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
];

// ─── LEGENDARY TIER — Weird Rules (12) ──────────────────────────────────────

export const LEGENDARY_UPGRADES = [
    {
        id: 'L1',
        name: 'Double Flush',
        description: 'Toilet door gains +4 max HP, healed immediately',
        rarity: 'legendary',
        icon: '🚽',
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
        icon: '🔥',
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
        icon: '🪠',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L4',
        name: 'Rush Hour Pileup',
        description: 'Enemies knocked into other enemies stun BOTH for 1.5s and deal 10 mutual damage',
        rarity: 'legendary',
        icon: '🚗',
        towerRequirement: ['mop'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L5',
        name: 'Domino Effect',
        description: 'Tripped enemies that slide into others trip them too, chaining indefinitely (-20% dmg per link)',
        rarity: 'legendary',
        icon: '🀄',
        towerRequirement: ['potplant'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L6',
        name: 'Spill Zone',
        description: 'Dead enemies leave a toxic puddle (3-unit radius) that slows 40% and deals 3 dps for 5s',
        rarity: 'legendary',
        icon: '☠️',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L7',
        name: 'Loose Change',
        description: 'Uncollected coins become trip hazards — enemies stumble (1s stun, 2 damage), coin consumed',
        rarity: 'legendary',
        icon: '🪙',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L8',
        name: 'Nuclear Mop',
        description: 'Mop knockback 4×. Enemies take 15 damage if they hit a wall or tower.',
        rarity: 'legendary',
        icon: '☢️',
        towerRequirement: ['mop'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L9',
        name: 'Ubik Flood',
        description: 'Each Ubik spray leaves a lingering 4-unit damage zone (2 dps, 8s). Max 5 per Ubik.',
        rarity: 'legendary',
        icon: '🌫️',
        towerRequirement: ['ubik'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L10',
        name: 'Golden Magnet',
        description: 'Coin Magnets passively generate 1 coin every 4 seconds',
        rarity: 'legendary',
        icon: '✨',
        towerRequirement: ['coinmagnet'],
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L11',
        name: 'False Alarm',
        description: 'Once per wave, a random Panicker\'s aura INVERTS — slows nearby enemies 30%',
        rarity: 'legendary',
        icon: '🚨',
        towerRequirement: null,  // general
        stackable: false,
        maxStacks: 1,
        effectFn: null,
    },
    {
        id: 'L12',
        name: 'Overtime',
        description: 'First 5s of each wave: all towers 3× speed, enemies 0.5× speed',
        rarity: 'legendary',
        icon: '⏰',
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
