# Enemy Model Migration — Rigid Body Parts System

## Reference: What Makes the Polite Knocker Work

The Polite Knocker is the template for all enemy migrations. Here's every detail of what makes it work.

### Architecture (applies to ALL enemies)

**Rigid body parts** — each body part is a separate `THREE.Mesh` parented directly to its bone. No `SkinnedMesh`, no skin weights, no deformation artifacts. When a bone rotates, its child mesh follows rigidly. Small gaps at joints are invisible from the 35° top-down camera and give a charming toy/toon look.

**Key files:**
- `js/models/EnemyModelFactory.js` — `_createRigidModel()` pipeline + per-type builders
- `js/utils/characterGeometry.js` — `createCapsule()`, `createRoundedBox()`, `createOrganicTorso()`
- `js/models/EnemyMaterials.js` — `createRigidEnemyMaterials()` (no skinning flag)
- `js/animation/AnimationController.js` — accepts `Bone` or `SkinnedMesh` as mixer target
- `js/systems/EnemyPool.js` — handles both rigid and legacy models
- `js/data/enemyConfig.js` — bone positions, dimensions, animation params

**Return shape from `createEnemyModel()`:**
```js
{
    group,           // THREE.Group containing rootBone
    skinnedMesh,     // Material shim: { material: [allPartMaterials] } — backward compat
    skeleton,        // THREE.Skeleton for AnimationController rest state
    boneMap,         // { root, spine, chest, head, upperArm_L, ... }
    outlineMesh: null,
    outlineParts,    // Array of per-part outline meshes for LOD toggling
    materials,       // { body, skin, legs, outline }
    parts,           // { torso, head, armL, armR, ... } — named meshes
    animRoot,        // rootBone — AnimationMixer target
    isRigid: true,
}
```

**The `RIGID_TYPES` set** in `EnemyModelFactory.js` controls which types use the new pipeline. Add each type as you migrate it:
```js
const RIGID_TYPES = new Set(['polite', 'dancer', 'waddle', ...]);
```

### Geometry Toolkit (`characterGeometry.js`)

| Function | Use For | Notes |
|----------|---------|-------|
| `createCapsule(radius, height, radialSegs, capSegs)` | Limbs (arms, legs) | LatheGeometry with hemisphere caps. 8 radial, 4 cap segments is good. |
| `createRoundedBox(w, h, d, radius, bevelSegs)` | Torsos, shoes, boxes | ExtrudeGeometry + rounded Shape. Radius ≤ min dimension/2. |
| `createOrganicTorso(waistR, chestR, height, bulge)` | Pear/egg bodies (Waddle) | LatheGeometry with cubic interpolation profile. |
| `createFlatCap(radius, height)` | Hats, accessories | Simple CylinderGeometry. |

### Materials (no skinning)

`createRigidEnemyMaterials(enemyType, color, isDesperate)` returns `{ body, skin, legs, outline }` — same toon shader as before but with `skinning: false`. Outline is inverted-hull `BackSide` per part.

For facial features, use `new THREE.MeshBasicMaterial({ color: 0x1a1a2e })` (PALETTE.ink). The outline ShaderMaterial doesn't work for front-face features because it extrudes vertices.

### Polite Knocker Specifics — The Template

**Config (`enemyConfig.js`):**
```
size: 2.8
bones: neck, upperArms (no forearms, feet, belly)
Bone positions (compact chain to minimize torso-leg gap):
  root: y=0.65, spine: y=0.18, chest: y=0.22, neck: y=0.15, head: y=0.18
  arms: x=±0.35 (far enough out to avoid torso clipping)
  legs: x=±0.10, lowerLeg: y=-0.28
```

**Body construction pattern:**

1. **Torso** — `createRoundedBox`, parented to `spine` (NOT chest). Must be tall enough to bridge from chest bone down to where upper legs attach (root bone). Calculate: `torsoH = (spine.y + chest.y) * s * 1.15`. Position slightly above spine center.

2. **Head** — `SphereGeometry`, parented to `head` bone. Scale slightly oblate (Y=0.92). Size ≈ 0.28*s radius.

3. **Face (Mii-style)** — All features use `MeshBasicMaterial({ color: 0x1a1a2e })`:
   - Eyes: spheres at `eyeZ = -headR * 0.90` (NEGATIVE Z = front, facing camera)
   - Scale `(1.0, 1.3, 0.5)` for tall ovals flattened into head
   - Eye spacing: `headR * 0.28`, Y position: `headR * 0.05`
   - Eyebrows: `BoxGeometry`, angled ±0.30 rad for worried `/\` expression
   - Mouth: `BoxGeometry` at `y = -headR * 0.22`

4. **Arms** — `createCapsule`, parented to `upperArm_L/R`. Long enough to reach groin from shoulder (0.50*s). Mesh offset: `-armLength * 0.42` down. Animation does the rest (moderate forward X=0.35 + inward Z=0.55 rotation → hands at crotch).

5. **Legs** — `createCapsule`, parented to `upperLeg_L/R` and `lowerLeg_L/R`. Upper: radius 0.095*s, Lower: radius 0.08*s (taper). Offset `-height * 0.3` down from bone.

6. **Shoes** — `createRoundedBox`, parented to `lowerLeg_L/R`. At bottom of lower leg, slightly forward.

7. **Accessories** — Hair tuft (squashed sphere on head), or type-specific props.

8. **Outlines** — Each part gets a cloned geometry + outline material child. Created automatically in `_createRigidModel()`.

**Critical lessons learned:**
- **Torso gap**: Parent torso to `spine` not `chest`. Chest is too high — leaves gap above legs.
- **Arm clipping**: Arms at x ≥ torsoWidth/2 + armRadius + 0.05 margin. Narrow the torso slightly if needed.
- **Face direction**: `eyeZ = NEGATIVE headR * 0.90`. Characters face -Z (toward camera/south).
- **Arm reach**: Animation X rotation swings arms. High X (>1.0) makes arms horizontal, NOT downward. Use X ≈ 0.35 for groin-reaching pose.
- **Size matters**: The `size` multiplier affects ALL geometry and bone positions equally. Original polite was 1.5, final is 2.8. Adjust per type to match the player character (size 1.8 seated).

### Animation Pattern

Existing `AnimationLibrary.js` clips work unchanged — they target bone names (`root.position`, `spine.quaternion`, `upperArm_L.quaternion`, etc.) which `AnimationMixer` resolves via `Object3D.getObjectByName()` on the root bone.

**Polite Knocker walk — "busting to pee" gait:**
- Short shuffle steps (legSwing: 0.25)
- Pigeon-toed: upper legs Y=±0.30 (knees inward), Z=±0.18 (legs angled in)
- Permanent knee bend: lower legs X=-0.35 to -0.60 (crouching)
- Hunched forward: spine lean 0.18
- Exaggerated side-to-side sway: 0.10
- Arms hanging down + inward: X=0.35, Z=±0.55 (hands at crotch)
- Fast cycle: 0.75s duration

**Look-back system (door bash):**
- Separate `look_back` animation state (looping fidget pose: spine back, head up at camera, knees together)
- Random timer per enemy in `index.html` bash loop
- 2–6s between looks, 0.8–4s stare duration
- Crossfades between `bash_door_L/R` ↔ `look_back` via `setState()`

---

## Migration Checklist

### How to migrate each enemy type:

1. Add type to `RIGID_TYPES` set in `EnemyModelFactory.js`
2. Write `_buildRigid<TypeName>()` function following the Polite Knocker pattern
3. Add to `_rigidBuilders` map
4. Adjust bone positions in `enemyConfig.js` if needed (compact chain, wider arm spacing)
5. Adjust size to match visual scale with player
6. Update animation clips if character personality needs new gait/behavior
7. Test: walk, bash door, hit react, death, pool reuse

---

## Stage 1: Office Enemies (Biped)

All office enemies are bipeds sharing the same skeleton structure. Follow the Polite Knocker template closely.

- [x] **Polite Knocker** — DONE. Worried gentleman shuffle, pigeon-toed, hands on crotch, Mii face, look-back at camera.

- [x] **Pee Dancer** — DONE. Size 2.4, no arms (torso IS silhouette), tight legs (0.07 spacing), panicked Mii face (wide eyes + pupils, open mouth, arched brows), sweat droplet above head. Existing hop_walk/bash/hit/death anims auto-adapt via config.

- [x] **Waddle Tank** — DONE. Size 3.5, pear-shaped organicTorso, belly jiggle sphere on belly bone, thick stumpy arms/forearms/legs/feet, hard hat + brim, determined Mii grimace (squinting eyes, angry brows, wide mouth). Existing waddle/panic_sprint/bash/hit/death anims auto-adapt.

- [ ] **Panicker** — Size 1.6 → scale up. Has forearms. Narrow torso. Personality: total meltdown, arms flailing wildly. Face: wide terrified eyes, open screaming mouth. Walk: fast erratic (0.5s), huge arm swing (1.2 rad), legs pumping. Asymmetric arm frequencies for chaotic feel.

- [ ] **Power Walker** — Size 1.4 → scale up. Full skeleton with feet. Personality: determined, athletic, methodical. Face: focused stern expression. Accessory: sweatband/visor. Walk: smooth efficient stride (0.7s), minimal bob (0.02), matched arm/leg swing (0.61), perfectly upright spine.

- [ ] **The Girls** — Size 0.85 → scale up. No arms (like dancer). Tiny chibi proportions. Big head relative to body. Personality: giggling, bouncy, casual. Face: happy/mischievous eyes. Accessory: ponytail (offset sphere behind head). Walk: casual sway (0.9s), hip sway (0.10), small steps.

---

## Stage 2: Forest Enemies (Quadruped)

These are four-legged animals with horizontal spine, tail chains, and completely different body construction. Needs new geometry helpers.

**Quadruped-specific geometry needed:**
- Horizontal body (cylinder or lathe, rotated 90°)
- Four legs with digitigrade option (fox)
- Tail chain (2–5 segments, each a small capsule/cylinder)
- Ears (cones or spheres)
- Snout (cylinder or capsule)
- Antlers (cone clusters for deer/moose)
- Shell/carapace (for variety)

**Quadruped-specific considerations:**
- Skeleton: root → pelvis → spine_mid → chest → neck → head
- Four legs: frontUpperLeg, frontLowerLeg, hindUpperLeg, hindLowerLeg
- Optional: scapulae, feet, tail segments
- Body oriented along Z axis (length), not Y axis (height)
- Animations: 4-beat walk gait, not 2-beat biped

- [ ] **Deer** — Size 4.5. Graceful, elegant. Long legs, thin body. Antlers (cone clusters on head). Ears (flattened cones). 4-beat walk with head bob. Tail: 2 segments, gentle wave.

- [ ] **Squirrel** — Size 3.0. Small, fast bounding. Big fluffy tail (5 segments, large radius). Oversized head (chibi). Bounding gait (front legs then hind legs together). Very fast cycle (0.35s).

- [ ] **Bear** — Size 6.6 (largest enemy). Massive, lumbering. Pear-shaped body via `createOrganicTorso()`. Shoulder hump. Belly jiggle. Thick legs. Slow heavy waddle (1.5s). Pronounced body rock.

- [ ] **Fox** — Size 4.2. Sleek, quick. Digitigrade legs (elevated hock). Big pointed ears. Long bushy tail (4 segments). Fast trot (0.5s). Lots of spine twist and tail motion.

- [ ] **Moose** — Size 5.4. Powerful, imposing. HUGE antlers (0.35 size). Dewlap under chin. Long snout. Full skeleton with feet. Smooth gait (0.75s), minimal bob.

- [ ] **Raccoon** — Size 2.55. Cute, sneaky. Mask pattern on face (dark patches around eyes). Striped tail (4 segments, alternating color). Hip sway walk. Medium speed.

---

## Stage 3: Ocean Enemies (Marine + Pirate)

Marine creatures have horizontal bodies with tail chains, flippers, and completely different locomotion (swimming/undulating). The Pirate is a biped in a rowboat.

**Marine-specific geometry needed:**
- Streamlined body (lathe for torpedo shape)
- Tail segments (capsules or tapered cylinders)
- Flukes/tail fins (flat boxes or extruded shapes)
- Dorsal fin (triangle/cone)
- Pectoral flippers (flat capsules)
- Bell shape (jellyfish — half-sphere)
- Tentacles (thin capsule chains)
- Shell (turtle — dome shape)
- Rowboat (pirate — box/lathe)

**Marine-specific considerations:**
- Skeleton: root → body_front → head, root → body_rear → tail chain
- Horizontal orientation along Z
- Swimming animation: body undulation, tail swing, flipper paddle
- Many have bob height for water surface bobbing

- [ ] **Dolphin** — Size 4.0. Torpedo body. Snout, dorsal fin, pectoral flippers. 2 tail segments + flukes. High vertical bob (0.55). Body undulation + tail swing.

- [ ] **Flying Fish** — Size 4.5. Small sleek body. Long wing-like flippers. Fast darting (0.55s). Active wing flapping. High tail swing.

- [ ] **Shark** — Size 6.0 (tank). Massive torpedo body. Large dorsal fin. Jaw. 3 tail segments + flukes. Slow menacing movement. Minimal bob. Jaw open animation.

- [ ] **Pirate** — Size 1.5. BIPED in rowboat. Use biped skeleton. Seated pose (no leg motion). Rowing arm animation. Has hat (large brim). Boat geometry parented to root.

- [ ] **Sea Turtle** — Size 5.0. Wide flat shell (dome). Four flipper limbs. Small head. Slow steady paddling. Shell geometry = dominant visual element.

- [ ] **Jellyfish** — Size 4.0. Bell (half-sphere, pulsing). 5 tentacle chains (3 segments each). Bioluminescent glow material. Pulsing bell propulsion. Tentacle sway. Floating drift.

---

## Stage 4: Airplane Enemies (Biped)

All airplane enemies are bipeds, similar to Office. Follow the same biped template with personality variations.

- [ ] **Nervous Flyer** — Size 1.5 → scale up. Basic biped, like polite knocker but with anxious personality. Face: wide worried eyes, biting lip. Walk: jittery, slightly faster than normal, fidgeting arms. Accessory: maybe a neck pillow.

- [ ] **Business Class** — Size 1.5 → scale up. Broader shoulders, very upright posture. Face: stern/entitled, one raised eyebrow. Walk: minimal dignified bob, arms close to body, head high. Accessory: briefcase or tie.

- [ ] **Turbulence Stumbler** — Size 2.0 → scale up. Tank role. Wide body with belly (like Waddle Tank but nauseous). Face: green-tinged, queasy, covering mouth. Walk: slow stumbling with pronounced body rock (0.20). Arms out for balance.

- [ ] **Flight Attendant** — Size 1.3 → scale up. Slim, professional. Face: forced smile, slightly stressed. Walk: fast efficient stride, very upright. Accessory: tray or beverage cart hint.

- [ ] **Air Marshal** — Size 1.6 → scale up. Has forearms. Solid build. Face: serious, determined. Walk: smooth tactical stride, minimal bob, compact arm swing. Accessory: badge or earpiece.

- [ ] **Unruly Passengers** — Size 0.85 → scale up. Swarm type, no arms. Chaotic body rock. Face: angry/drunk eyes, yelling mouth. Walk: fast erratic (0.5s), lots of sway.

---

## Testing Checklist (per enemy type)

For each migrated enemy, verify:

- [ ] Spawns correctly (no console errors)
- [ ] Correct size relative to player and other enemies
- [ ] No gaps between body parts (torso connects to legs)
- [ ] No arm/body clipping during walk animation
- [ ] Face visible and correct direction (-Z facing camera)
- [ ] Walk animation has correct personality feel
- [ ] Bash door animation works
- [ ] Hit react animation works (additive flash)
- [ ] Death animation works
- [ ] Pool reuse: enemy resets correctly after death
- [ ] Outline renders on all parts
- [ ] Outline LOD toggling works (hide >40 units)
- [ ] Hit flash uniform works (all parts flash white)
- [ ] Desperate tint works (all parts go red)
- [ ] Look-back at camera works (polite knocker only, others may have own behaviors)

---

## Size Reference

| Enemy | Original Size | Suggested Rigid Size | Role |
|-------|--------------|---------------------|------|
| **Player** | 1.8 (seated) | N/A | Reference point |
| **Polite Knocker** | 1.5 → **2.8** | 2.8 | Baseline |
| **Pee Dancer** | 1.25 | ~2.4 | Fast swarm |
| **Waddle Tank** | 2.0 | ~3.5 | Tank |
| **Panicker** | 1.6 | ~2.8 | Priority |
| **Power Walker** | 1.4 | ~2.6 | Slow immune |
| **The Girls** | 0.85 | ~1.8 | Mini swarm |
| **Forest/Ocean** | varies | TBD per type | Different scales |
| **Airplane** | varies | TBD per type | Similar to office |

Sizes will need tuning in-game. The original sizes were designed for the old skinned mesh system which had different effective visual scale.
