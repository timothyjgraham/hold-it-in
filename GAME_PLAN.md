# HOLD IT IN — Game Plan

## Core Concept
A tower defense game where you defend YOUR toilet from increasingly absurd threats. Dead serious mechanics, completely absurd presentation. Four scenarios, each with unique environments, enemies, and defenses.

## Game Modes

### Campaign Mode
- 4 scenarios, each with 20 waves
- Beat all 20 waves to "complete" the scenario
- Completing a scenario unlocks Endless Mode for that scenario
- Scenarios unlock sequentially (beat Office → unlock Forest, etc.)

### Endless Mode
- Unlocked per-scenario after completing its 20-wave campaign
- Waves continue indefinitely with escalating difficulty
- Tracks best wave reached and high score per scenario

---

## Scenarios

### 1. THE OFFICE (Demo Scenario) — IMPLEMENTED
- **Setting:** Corporate office bathroom
- **Vibe:** Relatable workplace comedy
- **Enemies:** Polite knockers, dancers, waddlers, panickers, power walkers, girl groups
- **Defenses:** Coin magnets, wet floor signs, mop turrets, Ubik spray, pot plants
- **Upgrades:** 44 upgrades across common/rare/legendary
- **Environment:** Tile floor, cubicle walls, office fixtures
- **Music:** Elevator music / corporate hold music

### 2. THE FOREST
- **Setting:** Wooden outhouse in the wilderness
- **Vibe:** Camping trip gone wrong
- **Enemies:**
  - Bears (heavy, slow, high HP — equivalent to waddlers)
  - Raccoons (fast, sneaky, come in packs — like girl groups)
  - Deer (curious, gentle but persistent — like polite knockers)
  - Woodpeckers (ranged, peck at the door from distance)
  - Skunks (area denial — spray zone that disables nearby towers)
  - Moose (boss-tier, huge, charges straight through)
- **Defenses:** TBD — nature-themed (campfires, bear traps, bird feeders as decoys, ranger stations)
- **Environment:** Dirt path, trees, bushes, creek
- **Unique mechanic:** Day/night cycle — nocturnal enemies only appear at night

### 3. THE OCEAN
- **Setting:** Toilet bolted to a boat deck, bobbing on open water
- **Vibe:** Absurdist nautical chaos
- **Enemies:**
  - Seagulls (fast flying swarm, low HP)
  - Crabs (slow sideways movement, tough shells)
  - Curious dolphins (jump out of water, arc over defenses)
  - Jellyfish (float in, leave stinging puddles like slow zones)
  - People on jet skis (fast, splash water that temporarily disables towers)
  - Whale (boss-tier, bumps the boat — shifts all tower positions)
- **Defenses:** TBD — nautical themed (anchors, fishing nets, flare guns, depth charges)
- **Environment:** Boat deck, ocean waves, distant islands
- **Unique mechanic:** Boat rocking — lanes shift periodically, towers slide

### 4. THE AIRPLANE
- **Setting:** Airplane bathroom, 30,000 feet up
- **Vibe:** Escalating social anxiety at altitude
- **Enemies:**
  - Passengers (basic, polite at first — "excuse me, is anyone in there?")
  - Impatient business travelers (faster, louder)
  - Flight attendants (organized, come in pairs, try to "assist")
  - Children (small, fast, unpredictable movement patterns)
  - Air marshals (tough, determined, hard to stop)
  - Pilots (boss-tier — "Sir, we need you to return to your seat")
- **Defenses:** TBD — airplane themed (drink carts as barriers, oxygen masks, turbulence generator, fasten seatbelt sign)
- **Environment:** Narrow airplane aisle, overhead bins, tiny bathroom door
- **Unique mechanic:** Turbulence events — random shaking that affects enemy movement and tower accuracy

---

## Menu Structure

```
TITLE SCREEN
├── CAMPAIGN
│   ├── The Office      [Play / Best Wave / High Score]
│   ├── The Forest      [Locked / Coming Soon]
│   ├── The Ocean       [Locked / Coming Soon]
│   └── The Airplane    [Locked / Coming Soon]
├── ENDLESS MODE
│   ├── The Office      [Locked until campaign complete]
│   ├── The Forest      [Locked]
│   ├── The Ocean       [Locked]
│   └── The Airplane    [Locked]
├── SETTINGS
│   ├── Music Volume
│   ├── SFX Volume
│   └── Screen Shake
└── CREDITS
```

---

## Implementation Priority

### Phase 1: Demo Release (Current Focus)
- [x] Office scenario core gameplay
- [x] Enemy types and AI
- [x] Tower system
- [x] Upgrade system (Stages 1-4)
- [ ] Title menu with campaign/endless/settings/credits
- [ ] Scenario select screen (office playable, others "coming soon")
- [ ] Campaign mode: 20-wave win condition
- [ ] Game stats tracking (best wave, high score per scenario)
- [ ] Settings screen (volume, etc.)
- [ ] Credits screen
- [ ] Polish office scenario (balance, juice, upgrade effects)

### Phase 2: Forest Scenario
- [ ] Refactor office code into scenario interface
- [ ] Forest environment and outhouse model
- [ ] Forest enemy set
- [ ] Forest defense set
- [ ] Day/night cycle mechanic

### Phase 3: Ocean Scenario
- [ ] Boat environment and ocean effects
- [ ] Ocean enemy set
- [ ] Ocean defense set
- [ ] Boat rocking mechanic

### Phase 4: Airplane Scenario
- [ ] Airplane interior environment
- [ ] Airplane enemy set
- [ ] Airplane defense set
- [ ] Turbulence mechanic
