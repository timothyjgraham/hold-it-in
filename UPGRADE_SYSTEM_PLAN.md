# Upgrade System Design Plan

## Overview

After each wave, three colored drones fly in from random office windows carrying upgrade placards. The player picks one. Upgrades modify tower mechanics, create tower-tower synergies, or add weird new rules. Rarity tiers give visual spectacle that scales with power. Enough upgrades exist that no two runs play the same.

---

## Design Rules

These rules are non-negotiable and must be respected throughout implementation.

### Selection Rules
- **Never offer upgrades for towers you don't own.** If the player has zero Mop Turrets placed, don't offer Mop upgrades. Synergies require at least one of each involved tower to be placed.
- **Always offer at least one "general" option** (weird rule or economy upgrade) so the player is never stuck with three irrelevant picks.
- **No duplicate upgrades in a single offering.** Three distinct options every time.
- **Upgrades already owned cannot appear again** (unless explicitly stackable, marked with STACKS tag).

### Stacking Rules
- **Stat upgrades (Common) stack additively** unless capped. E.g., two "Reinforced Signs" = +200% sign HP.
- **Synergy upgrades (Rare) do NOT stack.** You get the combo once.
- **Weird rule upgrades (Legendary) do NOT stack** unless marked.
- **Stacking cap:** No stat can exceed 4x its base value through upgrades alone.

### Balance Philosophy
- **Upgrades should change how you play, not just add numbers.** The best upgrades make you rethink tower placement.
- **Synergies reward intentional builds.** Players who commit to a tower combo should feel clever.
- **Legendaries should make you say "oh no" or "oh YES."** They bend the rules of the game.
- **Economy upgrades exist** so coin-starved players always have a useful pick.
- **No upgrade should be an auto-pick.** If one dominates, it needs rebalancing.

### Visual Consistency
- All upgrade effects use PALETTE colors exclusively (except dynamic hit/glow effects).
- Drone models use the toon shader pipeline — same outline, same shading as everything else.
- Placard signs use the same hand-drawn aesthetic as the rest of the UI.
- Effect particles follow existing particle conventions (canvas-textured sprites, toon-shaded meshes).

---

## Rarity System

### Distribution Table

| Waves 1-5 | Waves 6-10 | Waves 11-15 | Waves 16-20 | Waves 21+ |
|---|---|---|---|---|
| 3 Common | 2C + 1R | 2C + 1R | 1C + 1R + 1L | 1C + 1R + 1L |
| 0% Rare | 30% Rare | 40% Rare | 40% Rare | 35% Rare |
| 0% Legendary | 0% Legendary | 10% Legendary | 20% Legendary | 25% Legendary |

The percentages above are per-slot after the guaranteed minimums. E.g., at wave 12, slot 1 is always Common, slot 2 is always Rare, and slot 3 rolls: 50% Common, 40% Rare, 10% Legendary.

### Rarity: COMMON (Tower Mods)

**Drone visual:** Solid matte body in a clean pastel color. Small propellers. Smooth idle bob. Thin standard outline.
**Sign visual:** Simple white placard, black text, small icon. Slight pendulum swing on chains.
**Selection effect:** Brief sparkle burst (cream/white particles), satisfying "click" sound, drone does a small nod and flies off.
**Arrival:** Flies in at normal speed, settles into position with a gentle brake.

### Rarity: RARE (Synergies)

**Drone visual:** Glossy body with a subtle pulsing glow (emissive sine wave, slow). Slightly larger than common. Double propeller blades. Faint particle trail during flight (3-4 small dots trailing behind).
**Sign visual:** Cream placard with a colored border matching the involved towers' PALETTE colors. Text has a slight emboss effect (drop shadow). Icon is animated (gentle bob or rotate).
**Selection effect:** Bigger sparkle burst with colored rays (tower colors), sign does a flip before disappearing, "cha-ching" style sound, brief camera nudge (not shake — a gentle 2px push).
**Arrival:** Flies in slightly faster, does a small flourish (banking turn) before settling. Glow pulses brighter on hover.

### Rarity: LEGENDARY (Weird Rules)

**Drone visual:** Golden/holographic body — animated color shift cycling through warm golds (PALETTE.gold → PALETTE.glow → back). Prominent glow halo around the drone. Triple propeller blades, spinning faster. Continuous sparkle particle trail during flight (8-10 particles). Drone is 20% larger than common. Outline is thicker (1.5x OUTLINE_WIDTH).
**Sign visual:** Gold placard with animated shimmer (scrolling highlight band across surface). Text is larger and bolder. Icon pulses with a glow. Two small stars orbit the sign slowly.
**Selection effect:** Full celebration — screen-wide golden flash (0.15s), shower of gold particles from top of screen, camera does a satisfying 3px zoom-punch (quick zoom in + spring back), triumphant sound, the two rejected drones visibly react (droop/wobble) before flying off. Brief 0.5s slowmo on the moment of selection.
**Arrival:** Flies in with dramatic speed, leaves a comet trail, does a barrel roll before settling. Ambient sparkle particles while hovering. Other two drones lean slightly away from it — it's the star.

---

## Full Upgrade Catalog

### COMMON TIER — Tower Modifications (16 upgrades)

Simple stat changes or small mechanical tweaks to individual tower types.

#### Coin Magnet Upgrades
| # | Name | Effect | Stackable |
|---|---|---|---|
| C1 | Overclocked Magnet | Coin Magnet collection range doubled (8 → 16 units) | No |
| C2 | Double Dip | Coin Magnets collect coins worth 1.5x value | STACKS (cap 3x) |
| C3 | Magnet Durability | Coin Magnets gain +4 HP (doubled) | STACKS (cap +12) |

#### Wet Floor Sign Upgrades
| # | Name | Effect | Stackable |
|---|---|---|---|
| C4 | Reinforced Signs | Wet Floor Signs gain +100% HP | STACKS (cap +300%) |
| C5 | Extra Slippery | Wet Floor Signs slow enemies to 20% speed (from 40%) | No |
| C6 | Prickly Signs | Enemies take 5 damage per bash hit against Wet Floor Signs | STACKS (cap 15) |

#### Mop Turret Upgrades
| # | Name | Effect | Stackable |
|---|---|---|---|
| C7 | Industrial Mop Head | Mop sweep arc 60° → 180° (hits everything in front) | No |
| C8 | Quick Sweep | Mop attack cooldown reduced 30% (1.2s → 0.84s) | STACKS (cap -60%) |
| C9 | Heavy Mop | Mop knockback distance +50% (7.0 → 10.5 units) | STACKS (cap +100%) |
| C10 | Extra Absorbent | Mop Turrets gain +4 HP | STACKS (cap +12) |

#### Ubik Spray Upgrades
| # | Name | Effect | Stackable |
|---|---|---|---|
| C11 | Pressure Washer | Ubik cone halves in width, range doubles (18 → 36 units). Precision beam. | No |
| C12 | Wide Spray | Ubik cone 60% wider, damage reduced 30%. Crowd control mode. | No |
| C13 | Corrosive Formula | Ubik damage per tick +40% (10 → 14) | STACKS (cap +100%) |
| C14 | Rapid Spray | Ubik spray cooldown reduced 25% | STACKS (cap -50%) |

#### Pot Plant Upgrades
| # | Name | Effect | Stackable |
|---|---|---|---|
| C15 | Spring-Loaded Pot | Pot Plants bounce back to original position after being kicked | No |
| C16 | Cactus Pot | Pot Plants deal 3 damage/sec to adjacent enemies (contact aura) | STACKS (cap 9 dps) |

---

### RARE TIER — Synergies & Strong Effects (16 upgrades)

Tower-tower combos, cross-system interactions, and powerful single-tower overhauls.

#### Tower-Tower Synergies
| # | Name | Towers Involved | Effect |
|---|---|---|---|
| R1 | Wet & Soapy | Wet Floor + Ubik | Enemies slowed by Wet Floor Sign take 2x damage from Ubik Spray |
| R2 | Mop Splash | Mop + Wet Floor | Mop knockback through a Wet Floor zone stuns ALL enemies in that zone for 1.2s |
| R3 | Magnetic Mops | Magnet + Mop | Each Coin Magnet within 10 units of a Mop Turret increases its attack speed by 15%. Stacks per magnet. |
| R4 | Ubik Slick | Ubik + Pot Plant | Pot Plants kicked through Ubik-sprayed areas slide 2.5x further and deal +50% damage |
| R5 | Coin Shrapnel | Magnet + (any) | When Coin Magnet collects, 15% chance each coin bonks nearest enemy for 5 damage. Visual: coin pings off enemy head. |
| R6 | Sign Fortress | Wet Floor + Wet Floor | Adjacent Wet Floor Signs share incoming damage (distribute bash hits evenly across connected signs) |
| R7 | Mop & Bucket | Mop + Ubik | Mop Turrets that sweep through active Ubik spray gain a damage bonus: +8 damage on hits during spray overlap |
| R8 | Pot Magnet | Magnet + Pot Plant | Kicked Pot Plants are pulled toward the nearest Coin Magnet after bouncing, landing near it for reuse |

#### Powerful Single-Tower Overhauls
| # | Name | Effect |
|---|---|---|
| R9 | Sticky Mop | Mop knockback leaves a puddle at the enemy's landing point. Puddle slows enemies by 40% for 3s. Max 3 puddles per mop. |
| R10 | Chain Trip | Pot Plant trip creates a 3-unit shockwave. Nearby enemies stumble (half-duration stun, no damage). |
| R11 | Spray & Pray | Ubik Spray hitting 5+ enemies in a single burst refunds 5 coins. Visual: coin particles fly out of the spray cloud. |
| R12 | Sentry Magnet | Coin Magnets pulse every 4s, briefly revealing enemy HP bars in their range and marking the highest-HP enemy (towers prioritize marked targets). |

#### Economy & Utility
| # | Name | Effect |
|---|---|---|
| R13 | The Tip Jar | Enemy kills have 20% chance to drop a golden coin worth 5x. Visual: distinct gold coin with sparkle. |
| R14 | Clearance Sale | All tower placement costs reduced by 20% (rounded down, minimum 5). |
| R15 | Insurance Policy | When a tower is destroyed, refund 50% of its cost in coins. |
| R16 | Bathroom Panic | 12% of spawned enemies freeze for 2s upon entering (see the chaos), then run at 2x speed. Net neutral but creates tactical windows. |

---

### LEGENDARY TIER — Weird Rules (12 upgrades)

Game-warping mechanics. Every legendary should make the player reconsider their whole strategy.

| # | Name | Effect | Notes |
|---|---|---|---|
| L1 | Double Flush | Toilet door gains +4 max HP, healed immediately. | Direct survivability. Simple but impactful. |
| L2 | Desperate Measures | When door HP is below 50%, ALL towers deal 2x damage and attack 30% faster. | Risk/reward — do you let the door take hits? |
| L3 | Plunger Protocol | When the door takes a hit, ALL towers within 12 units get 3x attack speed for 3s. Rally mechanic. | Rewards clustering towers near the door. |
| L4 | Rush Hour Pileup | Enemies knocked into other enemies stun BOTH for 1.5s and deal 10 damage to each other. | Transforms Mop Turret into a bowling ball launcher. Placement becomes critical. |
| L5 | Domino Effect | Tripped enemies (from Pot Plants) that slide into other enemies trip THEM too, chaining indefinitely. Each chain link does -20% damage. | Pot Plant becomes the star. Placement in dense lanes = chain reactions. |
| L6 | Spill Zone | Dead enemies leave a toxic puddle (3-unit radius) that slows by 40% and deals 3 dps for 5s. | Kills snowball. Rewards focusing fire to create kill zones. |
| L7 | Loose Change | Uncollected coins on the ground become trip hazards. Enemies walking over them stumble (1s stun, 2 damage). Coin is consumed. | Incredible tension: collect coins for towers, or leave them as traps? Transforms coin management. |
| L8 | Nuclear Mop | Mop knockback distance 4x. Enemies take 15 damage if they hit a wall or another tower. | Mop becomes a cannon. Enemies fly across the room. |
| L9 | Ubik Flood | Each Ubik spray burst leaves a lingering damage zone on the floor (4-unit radius, 2 dps, lasts 8s). Max 5 zones per Ubik. | Area denial. Ubik becomes a zone painter. |
| L10 | Golden Magnet | Coin Magnets passively generate 1 coin every 4 seconds. | Economy engine. Makes early magnet investment pay off hugely. |
| L11 | False Alarm | Once per wave, a random Panicker enemy's speed aura INVERTS — slows nearby enemies by 30% instead of buffing them. Affected Panicker turns green. | Unreliable but hilarious. Creates chaos in enemy formations. |
| L12 | Overtime | For the first 5 seconds of each wave, all towers attack at 3x speed and enemies move at 0.5x speed. | Massive opening salvo. Rewards front-loading tower placement near spawn. |

---

## Total Upgrade Count

| Tier | Count | Notes |
|---|---|---|
| Common | 16 | Reliable, always useful, many stackable |
| Rare | 16 | Build-defining, synergy-driven |
| Legendary | 12 | Game-warping, run-defining |
| **Total** | **44** | With 1 pick per wave and ~20+ waves per run, players see ~60 options and pick ~20. With 44 in the pool, combination space is enormous. |

---

## Drone Presentation System

### Scene Layout
- Three drones hover in a horizontal row, centered in front of the camera
- Spacing: ~6 units apart horizontally
- Height: ~2 units above eye level (player looks slightly up — aspirational framing)
- Signs dangle ~1.5 units below each drone on two thin chain segments (rigid body pendulum)
- Background: game world visible but dimmed (0.4 opacity overlay or reduced ambient)
- Enemies/towers frozen during selection (time stops)

### Entrance Sequence (~2.5s)
1. Wave clear celebration finishes (coins awarded, UI flash)
2. Brief 0.8s pause — anticipation beat
3. Three windows chosen at random from office wall window set
4. Drones emerge one at a time with 0.3s stagger (left, center, right — randomized)
5. Each flies a unique CatmullRomCurve3 path (same system as tower delivery drones)
6. Signs swing realistically during flight (momentum-based pendulum)
7. Drones brake into hover position with a satisfying deceleration wobble
8. Signs settle with a pendulum dampen (~1s swing decay)
9. Once all three settled: signs "activate" — text/icon fades in, rarity glow kicks in

### Hover State (player choosing)
- Drones bob gently (sine wave, offset phase per drone so they don't sync)
- Signs sway very slightly (ambient pendulum, ±3 degrees)
- Rarity effects active (glow, particles, shimmer per tier)
- Player can hover/mouse over a drone — it rises slightly (+0.3 units) and its sign tilts toward camera
- Tooltip or expanded description appears below the hovered sign (or on the sign itself expanding)
- Non-hovered drones dim slightly (0.7 brightness)

### Selection Sequence (~1.5s)
1. Player clicks a drone
2. **Common:** Drone nods (quick dip + rise), brief sparkle pop, sign flashes white then fades
3. **Rare:** Drone does a small victory spin (360° yaw), colored particle burst matching tower colors, sign flips once, camera nudges 2px toward it
4. **Legendary:** Screen flash (gold, 0.15s), drone does a barrel roll, gold particle shower from above, camera zoom-punch (3px in + spring back), 0.3s slowmo, rejected drones droop and wobble
5. Rejected drones peel off toward random windows (staggered 0.2s, slightly sad flight path — lower arc)
6. Selected drone's upgrade icon floats toward the UI bar (if showing active upgrades) and slots in
7. Game resumes — time unfreezes, next wave timer begins

### Drone Models
- **Body:** Rounded box or capsule shape (pill-shaped, friendly). Toon-shaded with outline.
- **Propellers:** 4x small discs on arms, spinning (rotation speed varies by rarity). Mesh or flat planes.
- **Color:** Unique per slot (not per rarity) — three drone colors from a new PALETTE.drones category so each drone in a trio is visually distinct. Rarity is communicated through glow/effects, not base color.
- **Sign attachment:** Two thin cylinder "chains" from drone underside to sign top corners.
- **Sign:** Flat box (0.05 thick), front face has canvas texture with text + icon. Back face blank or has a small "UPGRADE" watermark.
- Scale: roughly 1.2x player head size for common, 1.35x for rare, 1.5x for legendary.

---

## Implementation Stages

### Stage 1: Data Layer & Core System
> Upgrade registry, rarity tables, selection logic, state management

- [x] Create `js/data/upgradeRegistry.js` — master list of all 44 upgrades as data objects
  - Each upgrade: `{ id, name, description, rarity, icon, towerRequirement, stackable, maxStacks, effectFn }`
  - Export by tier: `COMMON_UPGRADES`, `RARE_UPGRADES`, `LEGENDARY_UPGRADES`
- [x] Create `js/systems/UpgradeManager.js` — runtime upgrade state
  - Tracks owned upgrades and stack counts
  - `rollUpgrades(wave, ownedTowers)` — returns 3 upgrade options respecting all selection rules
  - `applyUpgrade(upgradeId)` — activates the upgrade, updates internal state
  - `hasUpgrade(id)` / `getStacks(id)` — query helpers for game logic
  - `getModifier(stat)` — returns cumulative modifier for a stat (e.g., `mopKnockback` returns 1.5 if Heavy Mop owned)
- [x] Add rarity distribution logic matching the wave-based table above
- [x] Add tower ownership check: scan `Game.towers[]` for placed tower types before rolling
- [x] Add "at least one general option" guarantee rule
- [x] Wire `UpgradeManager` into `Game` object — initialize on game start, reset on game over

### Stage 2: Drone Presentation — Models & Flight
> Build the drones, fly them in, make them hover

- [x] Add `PALETTE.drones` colors (3 distinct pastels) to `js/data/palette.js`
- [x] Create `js/models/UpgradeDroneModel.js` — drone mesh factory
  - Pill-shaped body (capsule geometry or rounded box)
  - 4 propeller arms + spinning disc props
  - Toon-shaded with outline (using existing toon shader)
  - Scale variants for common/rare/legendary
  - Sign attachment: two thin chain cylinders + flat placard box
- [x] Create placard sign with canvas texture
  - Render upgrade name + icon to canvas
  - Apply as texture on sign front face
  - Rarity-appropriate border/background color
- [x] Implement pendulum physics for sign swing (simple damped oscillation)
- [x] Reuse existing CatmullRomCurve3 flight path system (from tower drone delivery)
  - Randomize source window per drone
  - Define target hover positions (3-point row in front of camera)
  - Add deceleration wobble at end of path
- [x] Implement staggered entrance (0.3s per drone)
- [x] Implement idle hover (sine bob, offset phases)

### Stage 3: Drone Presentation — Interaction & Selection
> Player input, hover feedback, selection ceremony, exit

- [x] Add hover detection (raycasting on drone/sign meshes)
- [x] Hover feedback: raise drone, tilt sign, dim others
- [x] Show upgrade description on hover (expanded sign or floating text)
- [x] Click handler: determine which drone was selected
- [x] Trigger selection animation per rarity (nod / spin / barrel roll)
- [x] Common selection VFX: white sparkle burst
- [x] Rare selection VFX: colored ray burst, camera nudge, sign flip
- [x] Legendary selection VFX: gold screen flash, particle shower, zoom-punch, slowmo
- [x] Rejected drone exit animations (sad peel-off to windows)
- [x] Wire selection to `UpgradeManager.applyUpgrade()`
- [x] Unfreeze game state and start next wave timer

### Stage 4: Game State Integration
> Wire the upgrade selection phase into the wave flow

- [x] Add new game phase: `upgradeSelection` (between `waveActive = false` and next wave timer)
- [x] Freeze game world during selection (stop enemy/tower updates, keep rendering)
- [x] Dim background (reduce ambient light or add overlay)
- [x] After selection completes: restore lighting, start inter-wave timer
- [x] Handle edge case: wave 1 has no upgrade phase (first upgrades after wave 1 clear)
- [x] Add active upgrade display to HUD (small icons, bottom of screen or sidebar)
- [x] Show upgrade name briefly on HUD when acquired (toast notification style)

### Stage 5: Implement Common Upgrades (16)
> Stat modifications — the simplest to wire in

- [x] C1: Overclocked Magnet — modify magnet range constant
- [x] C2: Double Dip — modify coin value multiplier in magnetCollect()
- [x] C3: Magnet Durability — modify magnet HP on creation
- [x] C4: Reinforced Signs — modify barrier HP on creation
- [x] C5: Extra Slippery — modify slow multiplier constant (+ added base slow zone mechanic)
- [x] C6: Prickly Signs — add damage-on-bash in barrier bash handler
- [x] C7: Industrial Mop Head — modify mop sweep arc angle
- [x] C8: Quick Sweep — modify mop cooldown
- [x] C9: Heavy Mop — modify mop knockback force
- [x] C10: Extra Absorbent — modify mop HP on creation
- [x] C11: Pressure Washer — modify Ubik cone width + range (mutually exclusive with C12)
- [x] C12: Wide Spray — modify Ubik cone width + damage (mutually exclusive with C11)
- [x] C13: Corrosive Formula — modify Ubik damage per tick
- [x] C14: Rapid Spray — modify Ubik cooldown
- [x] C15: Spring-Loaded Pot — add return-to-origin logic after pot kick resolves
- [x] C16: Cactus Pot — add proximity damage aura tick to pot plant update
- [ ] Test all common upgrades individually
- [ ] Test stacking behavior and caps

### Stage 6: Implement Rare Upgrades (16)
> Synergies and cross-system interactions — more complex wiring

- [x] R1: Wet & Soapy — check slow status in Ubik damage calc, apply 2x multiplier
- [x] R2: Mop Splash — detect mop knockback path crossing barrier zone, trigger zone stun
- [x] R3: Magnetic Mops — scan for magnets near mops, apply attack speed bonus
- [x] R4: Ubik Slick — track sprayed floor areas, boost pot slide distance + damage when kicked through
- [x] R5: Coin Shrapnel — add damage roll in magnetCollect(), spawn bonk VFX
- [x] R6: Sign Fortress — on barrier bash, distribute damage to connected adjacent barriers
- [x] R7: Mop & Bucket — detect mop sweep overlapping active spray, add damage bonus
- [x] R8: Pot Magnet — after pot bounce, apply gentle velocity toward nearest magnet
- [x] R9: Sticky Mop — spawn puddle mesh at knockback landing point, add slow zone logic
- [x] R10: Chain Trip — on pot trip, AoE query nearby enemies, apply half-stun
- [x] R11: Spray & Pray — count enemies hit per Ubik burst, refund coins if 5+, spawn coin VFX
- [x] R12: Sentry Magnet — add pulse timer to magnets, show HP bars in range, set target priority
- [x] R13: The Tip Jar — add golden coin roll on enemy death, distinct visual
- [x] R14: Clearance Sale — modify tower costs in build system
- [x] R15: Insurance Policy — trigger coin refund on tower destruction
- [x] R16: Bathroom Panic — modify enemy spawn to roll freeze chance, add 2s stun then 2x speed
- [ ] Test all rare upgrades individually
- [ ] Test synergy combinations (especially multi-synergy stacking)

### Stage 7: Implement Legendary Upgrades (12)
> Game-warping effects — careful testing needed

- [x] L1: Double Flush — increase door maxHP and currentHP
- [x] L2: Desperate Measures — check door HP ratio each frame, apply global tower damage/speed buff
- [x] L3: Plunger Protocol — on door damage event, trigger timed buff on nearby towers
- [x] L4: Rush Hour Pileup — in knockback collision detection, check enemy-enemy overlap, apply mutual stun + damage
- [x] L5: Domino Effect — on pot trip slide, check collision with other enemies, trigger chain trip with diminishing damage
- [x] L6: Spill Zone — on enemy death, spawn toxic puddle mesh with slow aura + dps, timed despawn
- [x] L7: Loose Change — add coin-as-trap logic: uncollected coins get collision check vs enemies, trigger mini-stun, consume coin
- [x] L8: Nuclear Mop — 4x knockback, add wall/tower collision damage check at end of knockback
- [x] L9: Ubik Flood — on spray end, spawn lingering damage zone mesh, track per-Ubik zone count, timed despawn
- [x] L10: Golden Magnet — add passive coin generation timer to magnets
- [x] L11: False Alarm — per wave, pick one panicker, invert aura to slow, change tint to green
- [x] L12: Overtime — at wave start, apply 5s global buff (3x tower speed, 0.5x enemy speed), visual countdown
- [ ] Test all legendary upgrades individually
- [ ] Test legendary + rare combo interactions (e.g., Domino Effect + Chain Trip)
- [ ] Test legendary + legendary combos (e.g., Spill Zone + Rush Hour Pileup)

### Stage 8: Upgrade HUD & Feedback
> Make owned upgrades visible and legible during gameplay

- [x] Active upgrade icon bar (bottom-left, vertical columns)
  - 72×72 icons (same size as tower build buttons), toon-outlined, rarity-colored borders
  - Vertical column-reverse layout, stacks in columns of 6 (wraps right)
  - Hover shows tooltip to the right with name + description
  - Pop-in scale animation on card arrival
  - Stack count badges for stackable upgrades — TODO
  - ~~Hover/click to see description (pause menu?)~~ Tooltip on hover implemented
- [x] Acquisition card drop: chosen drone presents close-up, then card drops/flies juicily to HUD
  - Replaces old toast system. After selection ceremony, rejected drones scram, chosen drone flies to close-up (9 units from camera), waits 1.5s, then card detaches as floating DOM element and arcs via cubic bezier to the HUD position with wobble/scale animation.
- [x] Drone hover positions moved much closer to camera (Y=20, Z=-2) for readability
- [ ] Upgrade effect visibility during gameplay
  - Sticky Mop puddles: visible toon-shaded floor decals
  - Spill Zone puddles: green-tinted floor effect
  - Ubik Flood zones: purple-tinted floor glow
  - Sentry Magnet pulse: visible ring expanding from magnet
  - Overtime opening: brief golden tint on all towers + slow-mo visual on enemies
  - False Alarm panicker: green tint + confused particle swirls
- [ ] Tower info enhancement: when hovering a tower during build phase, show which upgrades affect it

### Stage 9: Polish & Balance
> Tuning pass after all upgrades are playable

- [ ] Playtest each upgrade in isolation — does it feel good? Is it noticeable?
- [ ] Playtest synergy combos — are they satisfying? Too strong? Too weak?
- [ ] Playtest full legendary runs — does any single legendary dominate every run?
- [ ] Adjust rarity distribution if needed (too many/few of a tier showing up)
- [ ] Tune stack caps if any stat goes degenerate
- [ ] Ensure no upgrade makes any enemy type completely trivial
- [ ] Verify tower requirement check doesn't create dead-end builds (e.g., player with only magnets and signs should still get interesting picks)
- [ ] Add upgrade-related stats to game over screen (upgrades collected, rarity breakdown)
- [ ] Sound design pass: unique sound per rarity tier (selection, acquisition, effect activation)
- [ ] Performance check: ensure puddle/zone/particle effects from upgrades don't tank framerate at wave 30+

---

## File Structure (New Files)

```
js/
  data/
    upgradeRegistry.js      — All 44 upgrade definitions
  systems/
    UpgradeManager.js        — Runtime state, rolling, applying
  models/
    UpgradeDroneModel.js     — Drone mesh factory + sign placard
  ui/
    UpgradeSelectionUI.js    — Orchestrates the full drone presentation sequence
```

## Palette Additions (for palette.js)

```
DRONES: {
  alpha:   0x__,   // Drone A body color (pastel, TBD)
  beta:    0x__,   // Drone B body color (pastel, TBD)
  gamma:   0x__,   // Drone C body color (pastel, TBD)
},
RARITY: {
  common:     0x__,   // Clean white/cream for common glow
  rare:       0x__,   // Cool blue-purple for rare glow
  legendary:  0x__,   // Rich gold for legendary glow
}
```

Exact hex values TBD — will be chosen to contrast with existing PALETTE categories while maintaining the toon aesthetic.
