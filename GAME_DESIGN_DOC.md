# HOLD IT IN — Game Design Document

## Elevator Pitch
A tower defense game where you defend YOUR toilet from an endless, escalating horde of desperate people who need to use it. Dead serious mechanics. Completely absurd presentation. Single lane. No downtime. Pause to build. Hold the line.

---

## 1. CORE LOOP (The 30-Second Cycle)

The wave never stops. People pour in from the top of the screen. Your toilet is at the bottom. You build defenses, they push through. You upgrade, they escalate. You pause (spacebar), plan your next move, unpause, watch it play out.

```
ENEMIES APPROACH → YOU PANIC → PAUSE → PLACE/UPGRADE TOWERS → UNPAUSE → WATCH CHAOS → REPEAT
```

**Key design rules:**
- No build phases. No downtime. The pressure is constant.
- Pausing is free and unlimited. Strategy happens in pause. Tension happens in real-time.
- Currency drops from repelled enemies (they drop coins, dignity, loose change).
- Every 5 waves, a new tower type or upgrade unlocks. You always have something new to think about.
- The toilet is your "core." If an enemy reaches it, they USE it. You lose a life (hygiene point). Lose all hygiene points, game over.

**Session length:** 15-30 minutes for a full run. Fast, replayable.

---

## 2. THE MAP / LANE LAYOUT

**Camera:** ~35 degrees top-down. Fixed angle. You see the full lane from toilet (bottom) to horizon (top). Zoom with scroll wheel for strategic overview vs. detail view.

**The lane:**
```
═══════════════════════════════════
   THE GREAT APPROACH (enemy spawn)
        ↓ ↓ ↓ ↓ ↓ ↓ ↓
   ┌─────────────────────┐
   │                     │  ← Wide open area
   │   BUILDABLE ZONE    │     (place towers here)
   │                     │
   │                     │
   │                     │
   └─────────────────────┘
        ┌───────────┐
        │ CORRIDOR  │  ← Narrows toward the bathroom
        └─────┬─────┘
              │
         ┌────┴────┐
         │ 🚽 YOUR │
         │ THRONE  │
         └─────────┘
═══════════════════════════════════
```

**Layout concept:**
- Wide at the top (enemies spread out, harder to cover)
- Narrows toward the bathroom (natural chokepoint)
- Walls of the corridor are fixed — you build towers in the open area and along the corridor
- The bathroom itself has a door. The door is your last line of defense. Upgradable.
- Side paths possible in later waves (windows, vents, back door) — enemies find new routes as you get stronger

**Buildable tiles:** Grid-based. Towers snap to grid. Clear, readable placement.

---

## 3. TOWER ROSTER

### Starting Towers (Unlocked from Wave 1)

**Wet Floor Sign** — *Slow Tower*
- Passive area slow. Enemies slip and stumble.
- Cheap. Your bread and butter early game.
- Upgrade path A: "Caution: Extremely Wet" — larger radius
- Upgrade path B: "Freshly Waxed" — enemies slide backwards

**Mop Turret** — *Basic Attack Tower*
- Swings a mop at enemies in range. Knockback on hit.
- Moderate damage, moderate speed.
- Upgrade path A: "Industrial Mop" — damage + range
- Upgrade path B: "Spin Cycle" — 360 area attack, faster

**"Out of Order" Sign** — *Misdirect Tower*
- Enemies in range get confused and path sideways or backwards briefly.
- Doesn't deal damage but buys time.
- Upgrade path A: "Condemned Notice" — enemies turn fully around
- Upgrade path B: "Biohazard Sign" — enemies avoid a huge radius

### Unlocked Wave 3-5

**Air Freshener Turret** — *Ranged Attack Tower*
- Sprays at range. Consistent DPS. Your primary damage dealer.
- Upgrade path A: "Industrial Aerosol" — pierce through multiple enemies
- Upgrade path B: "Pepper Spray" — high single-target damage + blind (slow)

**Plunger Launcher** — *Knockback Tower*
- Launches plungers that stick to enemies and knock them back hard.
- Lower DPS but massive disruption.
- Upgrade path A: "Turbo Plunger" — launches faster, further knockback
- Upgrade path B: "Plunger Mine" — plungers stick to floor, pop on contact

### Unlocked Wave 6-10

**Overflowing Sink** — *Area Denial Tower*
- Creates a flood zone. Enemies wade through slowly, take minor damage.
- Upgrade path A: "Burst Pipe" — massive flood area
- Upgrade path B: "Scalding Water" — smaller area, serious damage over time

**Hand Dryer** — *Push Tower*
- Powerful directional blast that shoves enemies back along the lane.
- Short range but high push force.
- Upgrade path A: "Jet Engine Dryer" — extreme range push
- Upgrade path B: "Dyson Blade" — focused beam, cuts and pushes

**Toilet Paper Barricade** — *Wall Tower*
- Blocks the path. Enemies have to destroy it or path around.
- Cheap, disposable, replaceable.
- Upgrade path A: "Triple Ply" — much higher HP
- Upgrade path B: "Barbed Wire Roll" — damages enemies attacking it

### Unlocked Wave 11+

**The Janitor** — *Hero Tower* (limit 1)
- An actual janitor who patrols an area, mopping enemies and repairing nearby towers.
- Upgrade path A: "Head Janitor" — faster, stronger, repairs more
- Upgrade path B: "Janitor With Attitude" — attacks enemies aggressively, throws cleaning supplies

**Soap Dispenser Turret** — *Chain/Splash Tower*
- Squirts soap that makes enemies slip into each other, chain-reaction knockdowns.
- Upgrade path A: "Foam Cannon" — massive AoE foam
- Upgrade path B: "Soap Sniper" — long range precision shot, target slides all the way back to spawn

**Bathroom Lock** — *The Door Upgrade* (special)
- Upgrades the bathroom door itself.
- Tier 1: Flimsy lock
- Tier 2: Deadbolt
- Tier 3: Steel reinforced
- Tier 4: Bank vault door
- Each tier = more hits before an enemy can breach

---

## 4. ENEMY ROSTER

### Implemented Enemies (Skeletal Animation System)

All enemies use a custom skeletal animation system with toon shading, rim lighting, inverted-hull outlines, and expressive keyframe animations. Each type has a unique bone hierarchy (9-15 bones), dedicated walk/bash/hit/death animation clips, and shader-driven visual effects (hit flash, desperate tint, aura glow).

**The Polite Knocker** (wave 1 — baseline)
- Tan (0xd4a574), size 1.5, speed 3.0. 11 bones.
- Rounded box torso (dress shirt/slacks proportions), sphere head. Slightly hunched, arms at sides.
- Measured walking stride with restrained arm swing and subtle forward lean. Politely knocks on door.
- The tutorial enemy. Trying to be civilized about a desperate situation.

**The Pee Dancer** (wave 3 — fast swarm)
- Blue (0x3498db), size 1.0, speed 5.5. 9 bones.
- Small compact frame with knees pressed together, hunched forward. Cross-legged shuffle.
- Hopping/bouncing walk with squash-and-stretch on each landing. Desperate, can't hold it.
- Comes in groups. Low individual HP but overwhelms with speed and numbers.

**The Waddle Tank** (wave 5 — slow tank)
- Brown (0x795548), size 2.0, speed 2.0. 15 bones (includes belly jiggle bone).
- Wide rotund torso with extended belly, hand on stomach, low center of gravity.
- Slow waddle with side-to-side rocking. Belly leads motion with 0.1s delay overshoot.
- At 50% HP: panics — speed doubles, transitions to frantic sprint with pumping arms and wild belly bounce.
- Big guy who ate too much, lumbering with increasing urgency.

**The Panicker** (wave 7 — priority target)
- Bright yellow (0xf1c40f), size 1.6, speed 4.0. 13 bones.
- Tall lanky frame with elongated torso and exaggerated arm length.
- Frantic run with asymmetric arm flailing (left at 1.3x frequency, right at 1.0x), body twisting.
- Pulsing fresnel aura glow (speed buff for nearby enemies, range 8, +50% speed).
- Complete meltdown. Running around screaming. Kill them first.

**The Power Walker** (wave 9 — slow immune)
- Teal (0x1abc9c), size 1.4, speed 3.5. 15 bones (full hierarchy with feet for firm planting).
- Athletic fit build, rigid determined posture, arms at 90 degrees.
- Mechanical power-walk stride with precise arm pumping. Eerily minimal vertical motion.
- Immune to slow effects (Wet Floor Signs). Walks right through them.
- Fitness person with intense, unstoppable purpose.

**The Girls** (wave 10 — cluster swarm)
- Pink (0xe91e8c), size 0.85, speed 3.0. 9 bones.
- Petite frame with ponytail sphere, slim limbs. Relaxed casual posture.
- Chatty walk with hip sway, gesturing arms, head turns. Random phase offset per instance.
- Spawn as cluster of 5-7, pick a lane (left/middle/right) and stay grouped.
- Group of friends heading to the bathroom together. Low individual HP, strength in numbers.

### Future Enemies — Early Waves (1-5)

**The Polite Knocker** — *see Implemented above*

**The Speed Walker**
- Fast. Low HP. Tries to slip past your defenses.
- Appears in groups.

**The "Just Washing My Hands" Guy**
- Medium speed, medium HP.
- Partially ignores misdirection ("I'm not even using the toilet!")

### Future Enemies — Mid Waves (6-15)

**The Desperate Jogger**
- Fast, medium HP. Comes in bursts.
- Gets faster the closer they are to the toilet.

**The Coffee Drinker**
- Slow but high HP. Tankier than they look.
- When killed (repelled), spawns 2 "Espresso Shot" mini-enemies (fast, 1 HP).

**Karen**
- Medium speed, high HP.
- Ignores the first misdirection tower she passes.
- "I NEED TO SPEAK TO THE MANAGER" — draws nearby enemies to follow her path.
- When she reaches the door, she bangs on it (double damage to door).

**The Kids** (swarm type)
- Tiny, fast, come in packs of 8-12.
- Low individual HP but overwhelming in numbers.
- Crawl under barricades (ignore TP walls).

**The Plumber**
- Slow, medium HP.
- If he reaches a tower, he "fixes" it (disables it for 5 seconds instead of heading to toilet).
- Must be killed before he reaches your defenses.

### Late Waves (16+)

**The Newspaper Reader**
- Extremely slow. Absurdly high HP.
- When he reaches the toilet... he's going to be there a WHILE.
- Costs 3 hygiene points instead of 1.

**The Party Bus**
- A literal bus arrives. Doors open. 20 enemies pour out at once.
- The bus itself slowly pushes down the lane, destroying towers it touches.

**The Health Inspector**
- Medium speed, medium HP.
- If he reaches the toilet, instead of using it, he SHUTS DOWN one of your towers permanently.
- Priority target.

**The Influencer**
- Stops periodically to take selfies (pauses).
- But every selfie "inspires" all nearby enemies to move 50% faster.
- Kill them fast or let them be — tactical choice.

**Twins**
- Always come in pairs. When one is repelled, the other gets enraged (double speed, double HP).
- Force you to kill both simultaneously.

### Boss Waves (every 10 waves)

**Wave 10: The Wedding Party**
- A bride who NEEDS the bathroom. Bridesmaids shield her. Groomsmen tank. Flower girl is fast and tiny. Ring bearer carries a buff aura.
- Kill the entourage first, then the bride.

**Wave 20: The Food Truck Festival**
- 200+ small enemies in continuous stream for 60 seconds.
- Pure stress test of your defenses. The SwarmManager moment.

**Wave 30: The Building Inspector**
- One guy. Suit. Clipboard. Walks calmly.
- Every 5 seconds he "condemns" your cheapest tower (destroys it).
- Massive HP. You have to burn him down before he dismantles your whole setup.

**Wave 40: The Flash Mob**
- They're dancing. They're unstoppable. They move in formation.
- Immune to knockback. Resistant to slow. Must be DPS'd down.
- They do a coordinated bathroom rush at 50% HP.

**Wave 50: The Marathon**
- It just doesn't stop. Hundreds and hundreds of runners.
- The screen IS enemies. Your defenses either hold or they don't.
- If you survive this, you've beaten the "campaign." Endless continues.

---

## 5. PROGRESSION

### Within a Run
- **Currency: Coins** — dropped by repelled enemies. Spend to build/upgrade.
- **Bonus coins** for style: repelling groups simultaneously, long-range snipes, chain reactions.
- **Tower unlocks** every 3-5 waves (communicated clearly: "PLUNGER LAUNCHER NOW AVAILABLE")
- **Upgrade paths** available once a tower reaches level 3.
- **The Door** can be upgraded between bosses.

### Between Runs (Meta-progression)
- **Stars** — earned per run based on waves survived. Spend on permanent unlocks.
- **Unlockable tower skins** — golden plunger, fancy mop, etc. (visual only, no gameplay advantage)
- **New maps** — different bathroom layouts. The Office. The Airport. The Festival Porta-Potty. The Fancy Restaurant. Each has a different lane shape and unique hazard.
- **Modifiers** — unlockable challenge modes. "No Pausing." "Double Speed." "Towers cost 2x." "Infinite money but enemies have 3x HP."
- **Leaderboards** — waves survived. Score per run. Daily seeded challenge.

### Unlock Flow (First 20 Waves)
| Wave | Unlock |
|------|--------|
| 1 | Wet Floor Sign, Mop Turret |
| 3 | "Out of Order" Sign |
| 5 | Air Freshener Turret |
| 7 | Plunger Launcher |
| 10 | **BOSS: Wedding Party** + Overflowing Sink unlock |
| 12 | Hand Dryer |
| 14 | Toilet Paper Barricade |
| 16 | Soap Dispenser Turret |
| 18 | The Janitor |
| 20 | **BOSS: Food Truck Festival** + Bathroom Lock upgrades |

---

## 6. CAMERA AND VISUAL STYLE

### Camera
- Fixed ~35 degree angle, looking north (toward enemy spawn)
- Toilet/bathroom at the bottom of screen, horde approaches from top
- Scroll wheel zoom: zoomed in for detail, zoomed out for strategic overview
- Slight camera shake on big impacts (toggle-able)
- Camera can't rotate (simplicity, readability)

### Visual Style
- **Low-poly but warm and colorful** — NOT the dark/gritty Polydangerous palette
- Think Overcooked meets Crossy Road meets TABS
- Bright, saturated colors. Readable at thumbnail size.
- **Enemies are goofy skeletal-animated people** — toon-shaded with outlines, exaggerated proportions, expressive keyframe animations inspired by Disney's 12 principles (squash/stretch, anticipation, follow-through, exaggeration)
- **Towers are oversized bathroom objects** — a giant plunger, a massive mop, comically large air freshener cans
- **The toilet glows golden** — it's sacred. It's yours. Heavenly light from above.
- **The bathroom is pristine tile** — white, clean, holy ground
- **The approach is increasingly chaotic** — the further from the toilet, the messier things get

### Visual Priorities
1. **Readability** — you must instantly see: where enemies are, where your towers are, what's happening
2. **Scale** — the horde must look MASSIVE. Hundreds of visible enemies.
3. **Comedy** — ragdoll physics when enemies get knocked back. Plungers stuck to faces. Soap slides.
4. **Satisfying feedback** — every tower hit feels good. Screen fills with particles. Enemies tumble.

### Color Palette
- Bathroom area: Clean whites, light blues, chrome
- Enemy horde: Warm earth tones, varied clothing colors (readable against the white/blue)
- Towers: Bright primary colors per type (yellow signs, green mops, blue soap, red plungers)
- Effects: Bright, saturated splashes of color (soap foam = white, water = blue, air freshener = green mist)

---

## 7. AUDIO DIRECTION

- **Music:** Increasingly frantic. Starts chill (elevator music/muzak). Escalates to intense orchestral or electronic as waves get harder. The contrast between muzak and total chaos is part of the comedy.
- **SFX:** Cartoony but punchy. Squeaky mop sounds. Plunger pop sounds. Satisfying splashes. Enemy voice lines ("PLEASE!", "I CAN'T HOLD IT!", "IS THIS OCCUPIED?!", "I'LL JUST BE A MINUTE!").
- **Announcer/narrator:** Optional but powerful — a deadpan janitor voice. "Wave 30. They had curry." "The wedding party has arrived." "Your toilet remains... unoccupied."

---

## 8. MINIMUM VIABLE PROTOTYPE (MVP)

The first playable build needs:
1. The 35-degree camera looking at a lane
2. A golden toilet at the bottom
3. 3 tower types (Wet Floor Sign, Mop Turret, Air Freshener)
4. 3 enemy types (Polite Knocker, Speed Walker, Coffee Drinker)
5. Pause to build
6. Basic currency (coins drop from repelled enemies)
7. 10 waves of escalation
8. Game over when toilet is breached X times
9. A wave counter and score

That's it. If that's fun, everything else layers on top.

---

## 9. SOCIAL MEDIA / MARKETING HOOKS

- **The escalation clip:** Side-by-side of wave 1 vs wave 50. Goes viral.
- **The toilet glow:** The sacred golden toilet is an iconic, meme-able image.
- **Enemy voice lines:** Shareable audio moments. "I JUST NEED TO WASH MY HANDS"
- **The name itself:** "Hold It In" — people will share it just because of the name.
- **Dev logs as comedy:** "Today I added Karen. She ignores your Out of Order signs."
- **Daily challenge leaderboards:** Competitive, shareable, recurring.
- **Absurd tower combinations:** "I built 30 plunger launchers and nothing can get through" — emergent comedy content.

---

## 10. LEVELS / BIOMES

The toilet is ALWAYS the same toilet. YOUR toilet. Gleaming porcelain, golden glow, heavenly light. It never changes. It's the one constant. The world around it shifts completely.

Each level is a different setting with its own visual identity, lane layout, environmental hazards, and unique enemy variants. The core towers are always available — but some levels introduce setting-specific tower variants or hazards.

### Level 1: THE OFFICE
*"Someone left the lid up in the third floor restroom."*

- **Aesthetic:** Sterile white tile, fluorescent lighting, cubicle walls, water cooler in the corner. Painfully corporate.
- **Lane:** Straight corridor. Office hallway → bathroom door. Simple, clean, readable. The tutorial level.
- **Colors:** White, grey, blue-grey. Fluorescent green tint. Your toilet's golden glow is the only warmth.
- **Environmental props:** Cubicle dividers (partial cover), water cooler (decoration), motivational posters on walls.
- **Unique enemies:** The Intern (fast, low HP, comes in groups), The Middle Manager (buffs nearby enemies' speed), The IT Guy (slowly disables one tower if not stopped).
- **Vibe:** Mundane. Oppressively normal. The comedy comes from the contrast between the sterile setting and the escalating chaos.

### Level 2: THE FOREST
*"You brought it camping. They found you."*

- **Aesthetic:** Your toilet sits in a forest clearing. Pine trees, fallen logs, dappled sunlight, campfire nearby. Beautiful nature — ruined by the horde.
- **Lane:** Winding dirt path through trees. Natural chokepoints at tree clusters. Wider clearings for building.
- **Colors:** Greens, browns, warm golden sunlight filtering through canopy. Autumn leaves.
- **Environmental hazards:** Mud patches (natural slow zones), fallen logs (natural barriers enemies climb over slowly), rain events (all enemies get speed boost — they're MORE desperate).
- **Unique enemies:** The Hiker (fast, ignores terrain slow), The Bear (massive HP, slow, scares other enemies into running faster), The Camper Family (group of 5, kids run ahead).
- **Vibe:** Peaceful nature corrupted by desperate humans. Birds chirping while 200 people sprint through a forest.

### Level 3: THE MUSIC FESTIVAL
*"One toilet. 50,000 attendees. The porta-potties are full."*

- **Aesthetic:** Mud everywhere. Neon lights. A distant stage with lights flashing. Tents and trash scattered. Your pristine toilet sits behind a chain-link fence, glowing.
- **Lane:** Wide and chaotic. Multiple entry points. The widest, most overwhelming map.
- **Colors:** Mud brown, neon pink/purple/green. Glowsticks. Stage lights sweep across.
- **Environmental hazards:** Mud (massive slow), crowd surges (random bursts of speed for all enemies), bass drops (screen shake, towers briefly stunned by vibration).
- **Unique enemies:** The Wasted Guy (zig-zag pathing, hard to hit), The Couple Arguing (two enemies tethered — must kill both), The VIP (walks straight through your defenses toward a "VIP entrance" side path).
- **Vibe:** Absolute sensory overload. Neon chaos. The most visually intense level.

### Level 4: THE AIRPLANE
*"The seatbelt sign is on. The lavatory is occupied. By you."*

- **Aesthetic:** Narrow airplane aisle. Overhead bins. Tiny windows with clouds outside. Your toilet is the airplane bathroom at the back.
- **Lane:** Very narrow. Long. Almost single-file. Extremely high density — enemies stack up.
- **Colors:** Blue-grey seats, beige walls, warm cabin lighting. Claustrophobic.
- **Environmental hazards:** Turbulence (everything shifts sideways periodically), drink cart (mobile barrier that slowly moves up and down the aisle, blocking enemies AND your tower shots).
- **Unique enemies:** The Frequent Flyer (pushes past other enemies), The Anxious Flyer (runs fast, vomit trail slows other enemies behind them), The Flight Attendant (removes one of your towers politely — "Sir, you can't have that here").
- **Vibe:** Claustrophobic tension. The narrowness makes everything intense. Enemies are RIGHT THERE.

### Level 5: THE BEACH
*"The nearest public restroom is 2 miles away. Yours isn't."*

- **Aesthetic:** Sandy beach, ocean waves, umbrellas, sand castles. Your toilet sits on the sand near the waterline, radiant.
- **Lane:** Wide beach approach from the boardwalk, sand dunes create natural chokepoints.
- **Colors:** Bright sunny yellows, ocean blues, sand tones. Colorful towels and umbrellas.
- **Environmental hazards:** Tide comes in periodically (floods lower portions of the lane — towers on wet sand get temporarily disabled), sandstorms (reduce visibility, harder to click/target).
- **Unique enemies:** The Sunburnt Dad (slow, tanky, "I'm not waiting in that line"), The Kids in Swimsuits (tiny, fast, swarm), The Lifeguard (high HP, clears a path for others), The Ice Cream Vendor (enemies follow him, changes their pathing).
- **Vibe:** Sunny, cheerful paradise descending into bathroom-seeking madness.

### Level 6: THE RED CARPET (Unlockable)
*"The afterparty. The champagne. The single toilet backstage."*

- **Aesthetic:** Hollywood premiere. Red carpet, velvet ropes, paparazzi flashes, spotlights. Your toilet is backstage behind a curtain, golden as ever.
- **Lane:** The red carpet itself — long, narrow, roped off. Enemies approach down the carpet like celebrities.
- **Colors:** Deep reds, golds, black, camera flash whites. Glamorous.
- **Environmental hazards:** Paparazzi flashes (stun YOUR targeting briefly), velvet ropes (natural barriers that break after enough enemies push through).
- **Unique enemies:** The Celebrity (entourage shields them), The Paparazzo (doesn't head for toilet — instead disables towers by "photographing" them), The Publicist (redirects enemies around your defenses).
- **Vibe:** Glamour meets desperation. The funniest visual contrast.

### Level Unlock Flow
| Level | Unlock Condition |
|-------|-----------------|
| The Office | Available from start |
| The Forest | Survive wave 20 on The Office |
| The Music Festival | Survive wave 20 on The Forest |
| The Airplane | Survive wave 20 on The Music Festival |
| The Beach | Survive wave 20 on The Airplane |
| The Red Carpet | Survive wave 30 on any level |

### Universal Constant
Every level, no matter the setting: YOUR TOILET is the same. Same porcelain. Same golden glow. Same heavenly choir sting when the camera first reveals it. It doesn't belong in any of these places. That's the joke. That's the heart of the game.

---

*This document is a living design. Iterate as we build.*
