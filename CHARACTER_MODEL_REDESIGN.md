# Character Model Redesign — From Blobby to Polished Toon

## The Problem

The current enemy models look "blobby" and deformed because of three compounding issues:

1. **Proximity-based auto-skinning** — Vertices are assigned to the 2 nearest bones by inverse distance. When a torso vertex sits between the spine and a leg bone, it gets 50/50 weighting and stretches/collapses during animation. This is the #1 cause of visual artifacts.

2. **Raw geometric primitives** — Flat-ended cylinders, hard-edged boxes, and spheres joined together read as mechanical, not organic. Cylinder-to-cylinder joints have visible seams.

3. **No visual identity per type** — From the 35-degree top-down camera, enemies are a head-blob on a body-blob with no distinguishing features. Silhouettes blur together.

---

## The Solution: Rigid Body Parts Architecture

### Why Rigid Parts?

The current system merges all geometry into a single `SkinnedMesh` and auto-computes skin weights. This is the wrong approach for a toon game viewed top-down.

**Every successful toon-style game with procedural characters uses rigid body parts**: Crossy Road, Overcooked, TABS (Totally Accurate Battle Simulator), Minecraft, early Lego games. None of them use smooth-skinned deformation. The "polished" look comes from:
- Clean geometry per part (no deformation artifacts)
- Good proportions (chibi — big head, small body)
- Strong color identity
- Expressive animation (squash-and-stretch via bone scale)

**With rigid parts**, each body part is a separate `THREE.Mesh` parented directly to its bone. When the bone rotates, the mesh follows rigidly. No `SkinnedMesh`, no skin weights, no proximity blending, no blobby artifacts. The small gaps at joints are invisible from 35-degrees top-down and actually contribute to a toy/toon charm.

### Performance

Current: 1 SkinnedMesh + 1 outline SkinnedMesh per enemy = 2 draw calls, but with expensive GPU skinning per vertex.

Proposed: ~8 body parts per enemy, each a simple Mesh. But:
- No GPU skinning overhead at all
- Geometries are simpler (fewer vertices per part)
- Parts share material instances (body parts of same type share one material)
- The outline can be a single inverted-hull pass per part OR a post-process outline on the scene

For 30 enemies on screen: ~240 draw calls (parts) vs ~60 (skinned). Still well within WebGL budget for this style of game. If it becomes an issue, parts can be merged per-character at creation time with hard bone assignments (weight=1.0) for 2 draw calls per enemy.

---

## Architecture Changes

### Before (Current Flow)
```
enemyConfig.js → SkeletonFactory → EnemyModelFactory
                                    ├── Build geometry primitives
                                    ├── mergeGeometries() into one BufferGeometry
                                    ├── _computeSkinWeights() (proximity-based)
                                    ├── new SkinnedMesh(geometry, materials)
                                    └── skeleton.bind()
```

### After (New Flow)
```
enemyConfig.js → SkeletonFactory → EnemyModelFactory
                                    ├── Build geometry parts (capsules, rounded boxes, lathe)
                                    ├── Create Mesh per part
                                    ├── Parent each Mesh to its bone
                                    ├── Add outline child to each part (or post-process)
                                    └── Return Group with bone hierarchy
```

### Interface Changes

**`createEnemyModel()` return value** changes from:
```js
{ group, skinnedMesh, skeleton, boneMap, outlineMesh, materials }
```
to:
```js
{ group, rootBone, skeleton, boneMap, parts, materials }
// parts: { torso: Mesh, head: Mesh, armL: Mesh, ... }
// No skinnedMesh — animation targets rootBone/skeleton directly
```

**`AnimationController`** changes from:
```js
constructor(skinnedMesh, enemyType)
this.mixer = new THREE.AnimationMixer(skinnedMesh)
```
to:
```js
constructor(rootBone, enemyType)
this.mixer = new THREE.AnimationMixer(rootBone)
// AnimationMixer works on any Object3D — bones are Object3D
// All existing QuaternionKeyframeTrack/VectorKeyframeTrack clips
// target bone names, which remain unchanged
```

**`EnemyPool`** — `acquire()`/`release()` updated to reference `rootBone` instead of `skinnedMesh`.

**`AnimationLibrary`** — No changes needed. Clips already target bone names (e.g., `"spine.quaternion"`, `"upperArm_L.quaternion"`). These work identically whether the bones parent a SkinnedMesh or child Meshes.

---

## Geometry Upgrades

### New Primitive Library

Replace raw `CylinderGeometry` / `BoxGeometry` with polished shapes:

#### 1. Capsule Geometry (for limbs)
Rounded ends instead of flat cylinder caps. Built via `LatheGeometry` (CapsuleGeometry isn't available in r128):

```
Profile:  ╭──╮
          │  │  ← cylinder body
          ╰──╯  ← hemisphere caps
```
- Arms: capsule(radius=0.06*s, height=0.4*s, radialSegs=8, capSegs=4)
- Legs: capsule(radius=0.07*s, height=0.35*s, radialSegs=8, capSegs=4)
- Smooth from every angle, no flat ends visible at joints

#### 2. Rounded Box (for torsos)
`ExtrudeGeometry` with rounded-rect `Shape` + bevel:

```
Profile:  ╭────────╮
          │        │  ← soft edges, no hard corners
          ╰────────╯
```
- Polite Knocker: roundedBox(0.5*s, 0.4*s, 0.3*s, radius=0.06*s)
- Waddle Tank: roundedBox(0.7*s, 0.5*s, 0.5*s, radius=0.1*s) — wider, deeper
- All torsos get soft edges → reads as "shirt/jacket" not "cardboard box"

#### 3. Lathe Geometry (for organic body shapes)
For Waddle Tank's pear-shaped belly, and any character that needs an egg/bowling-pin silhouette:

```
Profile:  ╭╮
         ╱  ╲   ← wide belly
        │    │
         ╲  ╱   ← narrower waist
          ╰╯
```

#### 4. Sphere (for heads — keep, but refine)
- Keep `SphereGeometry` but reduce to 10x8 segments (toon shading hides polygon edges)
- Slightly oblate: `scale.y = 0.92` for friendlier proportions
- Consider slight scale.x variation per type (wider face = friendlier, narrower = more nervous)

#### 5. Simple Props (for identity — see below)
Flat cylinders, cones, torus segments — cheap geometry for hats, hair, accessories.

---

## Per-Type Character Design

### Design Principles
From the 35-degree top-down camera:
1. **Head is the character** — it's the largest visible element from above
2. **Color is the #1 differentiator** — PALETTE already handles this well
3. **Silhouette width is #2** — body proportions visible from above
4. **Head accessory is #3** — the one element that makes each type instantly recognizable
5. **Animation is #4** — motion patterns visible even from above

### Polite Knocker (Wave 1 — Baseline)
**Personality**: Nervous but polite, knocking tentatively
**Palette**: `PALETTE.polite` (#d4a574 — warm tan)
**Proportions**: Medium build, slightly hunched forward
```
Parts:
  Head:     sphere(0.22*s)  — slightly oblate (scaleY 0.92)
  Torso:    roundedBox(0.5, 0.38, 0.3)
  ArmL/R:   capsule(0.06, 0.4) — one arm raised for knocking pose
  UpperLegL/R: capsule(0.065, 0.3)
  LowerLegL/R: capsule(0.055, 0.3)
Accessory:  Flat cap — flatCylinder on head (radius 0.18*s, height 0.04*s)
            Reads from top-down as a distinct circle larger than the head
```

### Pee Dancer (Wave 3 — Fast Swarm)
**Personality**: Desperate, fidgeting, legs crossed, doing the "pee dance"
**Palette**: `PALETTE.dancer` (#59c3e8 — light blue)
**Proportions**: Slim, compact, legs close together
```
Parts:
  Head:     sphere(0.2*s)  — standard
  Torso:    roundedBox(0.4, 0.32, 0.25) — narrower
  UpperLegL/R: capsule(0.06, 0.28) — close together (legSpacing 0.06)
  LowerLegL/R: capsule(0.05, 0.28)
  NO ARMS — arms "baked in" to torso silhouette (pressed to body)
Accessory:  Sweat droplet — small sphere(0.04*s) floating above head
            with a tiny cone(0.02*s) point, offset slightly to one side
            Animated: bobs up/down in sync with dance
```

### Waddle Tank (Wave 5 — Slow Tank)
**Personality**: Massive, lumbering, unstoppable, gut leading the way
**Palette**: `PALETTE.waddle` (#8b5e3c — dark brown)
**Proportions**: Wide, heavy, belly protruding, short legs relative to body
```
Parts:
  Head:     sphere(0.25*s)  — slightly smaller relative to body
  Torso:    lathe(pear shape) — widest at belly, narrower at chest
            waistRadius 0.35*s, chestRadius 0.25*s, height 0.55*s
  Belly:    (integrated into lathe torso, no separate part)
  ArmL/R:   capsule(0.08, 0.38) — thick
  ForearmL/R: capsule(0.07, 0.3) — beefy
  UpperLegL/R: capsule(0.09, 0.25) — short, thick
  LowerLegL/R: capsule(0.08, 0.25) — stumpy
  FootL/R:  roundedBox(0.12, 0.04, 0.15) — visible flat feet
Accessory:  Hard hat — flatCylinder(0.2*s, 0.06*s) + small dome on top
            Communicates "heavy duty" from above
```

### Panicker (Wave 7 — Erratic)
**Personality**: Total meltdown, arms flailing wildly, running erratically
**Palette**: `PALETTE.panicker` (#f5c842 — bright yellow)
**Proportions**: Wiry, arms visible and flailing wide
```
Parts:
  Head:     sphere(0.21*s)  — slightly elongated (scaleY 1.05) for "stressed" look
  Torso:    roundedBox(0.45, 0.36, 0.28)
  ArmL/R:   capsule(0.055, 0.42) — longer arms for visible flailing
  ForearmL/R: capsule(0.05, 0.35) — long reach
  UpperLegL/R: capsule(0.06, 0.3)
  LowerLegL/R: capsule(0.05, 0.3)
Accessory:  Spiky hair — cluster of 3-4 small cones(0.03*s base, 0.08*s height)
            on top of head, pointing outward
            Reads from top-down as a jagged starburst — "alarm!"
```

### Power Walker (Wave 10 — Speed + HP)
**Personality**: Determined, athletic, power-walking with purpose
**Palette**: `PALETTE.power` (#20b89a — teal green)
**Proportions**: Athletic, arms pumping, confident posture
```
Parts:
  Head:     sphere(0.2*s)  — standard
  Torso:    roundedBox(0.48, 0.4, 0.3) — broad shoulders
  ArmL/R:   capsule(0.06, 0.38) — bent at elbow in power-walk pose
  ForearmL/R: capsule(0.055, 0.3)
  UpperLegL/R: capsule(0.065, 0.32)
  LowerLegL/R: capsule(0.055, 0.32)
Accessory:  Sweatband/visor — torus(0.17*s, 0.02*s) around head
            Reads from top-down as a ring around the head — "athlete"
```

### Girls' Group (Wave 12 — Mini Swarm)
**Personality**: Small, fast, travel in packs, giggling
**Palette**: `PALETTE.girls` (#e84888 — hot pink)
**Proportions**: Chibi — oversized head relative to tiny body (smallest enemy)
```
Parts:
  Head:     sphere(0.18*s)  — large relative to body (chibi ratio)
  Torso:    roundedBox(0.3, 0.25, 0.2) — tiny
  ArmL/R:   capsule(0.04, 0.22) — small
  UpperLegL/R: capsule(0.045, 0.2)
  LowerLegL/R: capsule(0.04, 0.2)
Accessory:  Ponytail/bun — small sphere(0.06*s) offset behind+above head
            Reads from top-down as asymmetric head shape — instantly identifiable
```

---

## Animation Enhancements

### Squash-and-Stretch (NEW — Key Toon Principle)

With rigid body parts, bone `scale` directly scales child meshes. This enables the most important toon animation principle: **squash and stretch**.

Volume-preserving formula: when `scaleY = f`, set `scaleX = scaleZ = 1/sqrt(f)`.

#### Where to Apply:
| Moment | Bone | Effect | Duration |
|--------|------|--------|----------|
| Walk cycle landing | root | squash (0.92) → spring back (1.02) → settle (1.0) | 0.15s |
| Hit reaction | spine | squash (0.8) → overshoot (1.1) → settle (1.0) | 0.3s |
| Death | spine | squash (0.7) → hold | 0.5s |
| Pee dance rhythm | spine | oscillate (0.95 ↔ 1.05) | continuous |
| Panicker stress | head | rapid oscillate (0.97 ↔ 1.03) | continuous |
| Waddle landing | root | heavy squash (0.85) → slow spring (1.05) → settle | 0.4s |

#### Implementation:
Add `VectorKeyframeTrack` entries for `.scale` to existing clips in `AnimationLibrary.js`:

```js
// Example: walk cycle squash on root bone
new THREE.VectorKeyframeTrack(
    'root.scale',
    [0, 0.25, 0.5, 0.75, 1.0],           // times
    [1,1,1, 0.92,1.04,0.92, 1,1,1, 0.92,1.04,0.92, 1,1,1]  // scale xyz
)
```

### Accessory Animations
Head accessories parented to the head bone automatically follow head animation. Additionally:
- **Panicker spiky hair**: individual cones get slight independent wobble (secondary motion)
- **Dancer sweat drop**: bobs up/down opposite to body bob (countermotion)
- **Girls' ponytail**: slight delay/drag behind head rotation (follow-through)

These are cheap — just add scale or position tracks to the accessory meshes.

### Anticipation and Follow-Through
- **Before bash_door**: brief pull-back (spine leans back 0.1s before forward strike)
- **After hit_react**: slight overshoot past rest pose before settling
- **Walk cycle arms**: arms swing slightly past peak, then reverse (ease-out, ease-in)

These are already partially in `AnimationLibrary.js` but can be exaggerated now that deformation artifacts won't muddy them.

---

## Outline Strategy

### Option A: Per-Part Inverted Hull (Recommended)
Each body part gets a thin outline child mesh using the existing `toonShader.js` outline pass:
- Clone geometry, flip normals, expand vertices along normals by `OUTLINE_WIDTH`
- Material: `PALETTE.ink` with `side: THREE.BackSide`
- Parented to the same bone as the body part → moves identically

**Pros**: Works with existing shader system, consistent line width, no post-processing.
**Cons**: More draw calls (~8 extra per enemy).

### Option B: Post-Process Outline
Single full-screen outline pass using depth/normal edge detection.

**Pros**: One draw call for all outlines, consistent screen-space width.
**Cons**: Requires render target setup, may outline things you don't want.

**Recommendation**: Start with Option A (simpler, matches existing system). Switch to B if draw calls become a concern.

---

## Implementation Plan

### Stage 1: Geometry Library (New File)
Create `js/utils/characterGeometry.js`:
- `createCapsule(radius, height, radialSegs, capSegs)` — LatheGeometry polyfill
- `createRoundedBox(w, h, d, radius, segs)` — ExtrudeGeometry + rounded Shape
- `createOrganicTorso(waistR, chestR, height, segs)` — LatheGeometry pear/egg shapes
- `createFlatCap(radius, height)` — for hats/accessories
- `createSpikyHair(count, coneRadius, coneHeight)` — merged cone cluster
- `createSweatDrop(radius)` — sphere + tiny cone point

### Stage 2: Refactor EnemyModelFactory
Replace the merge+autoskin pipeline:
1. Build skeleton (keep `SkeletonFactory` as-is)
2. For each body part: create Mesh with appropriate geometry + material
3. Parent each Mesh to its bone: `boneMap.spine.add(torsoMesh)`
4. Add outline child to each part
5. Return `{ group, rootBone, skeleton, boneMap, parts, materials }`
6. Remove `_computeSkinWeights()`, `mergeGeometries()` calls, material groups

### Stage 3: Update AnimationController
- Change constructor to accept `rootBone` instead of `skinnedMesh`
- `AnimationMixer(rootBone)` — works identically for bone animation
- Bone rest state capture still works (bones are still bones)
- Hit flash: iterate `parts` object to set material uniforms instead of single mesh

### Stage 4: Update EnemyPool
- Update `acquire()`/`release()` to use new return shape
- Reset logic: iterate parts to reset visibility/material state
- Pre-allocation unchanged

### Stage 5: Update Game Integration (index.html)
- Any code referencing `enemy.model.skinnedMesh` updates to use `parts` or `rootBone`
- Hit flash/damage effects update to iterate parts
- Desperate tint updates to iterate part materials

### Stage 6: Animation Polish
- Add squash-and-stretch scale tracks to all clips in `AnimationLibrary.js`
- Add anticipation/follow-through keyframes
- Add accessory animation tracks
- Tune timing — exaggerate motions for top-down readability

### Stage 7: Per-Type Accessories
- Add head accessories per the character designs above
- Parent to head bone, with optional secondary animation

---

## What Stays The Same
- `enemyConfig.js` structure (bone positions, body dimensions, colors, animation params)
- `SkeletonFactory.js` (bone hierarchy creation)
- `AnimationLibrary.js` clip format (bone name targeting)
- `EnemyMaterials.js` (toon material creation)
- `toonShader.js` (used for outlines)
- `PALETTE` system (all colors)
- `EnemyPool` concept (just interface update)

## What Gets Replaced
- `_computeSkinWeights()` — deleted entirely
- `mergeGeometries()` usage in EnemyModelFactory — no longer needed
- `SkinnedMesh` for enemies — replaced by bone-parented Meshes
- Material groups (0/1/2) — each part has its own material
- `_roundifyBox()` — replaced by proper rounded geometry

---

## Visual Style Reference

The target aesthetic is closest to **Overcooked** meets **Crossy Road**:
- Rigid body parts with visible gaps at joints (charming, not broken)
- Rounded, soft geometry (capsules, beveled boxes)
- Strong color blocking per character type
- Exaggerated proportions (big heads, stubby limbs)
- Expressive animation through squash-and-stretch, not through mesh deformation
- Crisp ink outlines maintaining the toon feel
- Immediately readable from any camera angle, especially top-down
