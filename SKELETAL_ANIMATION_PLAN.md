# Skeletal Animation System — Implementation Plan

> **Goal**: Replace the current primitive-geometry enemies with AAA-quality skeletal characters featuring toon shading, rim lighting, outlines, and expressive keyframe animations rooted in Disney's 12 principles.

---

## Table of Contents

1. [Research Reference](#research-reference)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Foundation](#phase-1-foundation)
4. [Phase 2: Mesh Construction](#phase-2-mesh-construction)
5. [Phase 3: Animation Clips](#phase-3-animation-clips)
6. [Phase 4: Animation Controller](#phase-4-animation-controller)
7. [Phase 5: Game Integration](#phase-5-game-integration)
8. [Phase 6: Polish & Performance](#phase-6-polish--performance)
9. [Phase 7: Cleanup](#phase-7-cleanup)
10. [Character Reference Sheets](#character-reference-sheets)
11. [Technical Reference](#technical-reference)

---

## Research Reference

### AAA Animation Principles Applied

**Overwatch (Blizzard — GDC talks by David Gibson & Jesse Davis)**:
- Idle poses define personality — each character's stance is unique and readable
- "Noodle bones" for secondary motion (belly jiggle, cloth follow-through)
- Smear frames sell speed in fast actions
- Asymmetric arm timing prevents robotic stiffness
- Key insight: *overshoot extreme poses and hold key poses longer than natural*

**Fortnite / Plants vs Zombies**:
- Simple bone setups + strong poses = massive character appeal
- PvZ chose plants specifically because you can "give them a lot more character"
- Visual clarity of mechanics matters more than realism
- Bright colors + exaggerated animation = accessibility

**Disney's 12 Principles (most relevant)**:
1. **Squash & Stretch** — compress on landing, elongate during lunges (sells weight/elasticity)
2. **Anticipation** — wind-back before bash, crouch before hop (prevents jarring motions)
3. **Follow-through & Overlapping Action** — arms swing past body, belly wobbles after stop (organic feel)
4. **Exaggeration** — push poses beyond realism for readability at steep camera angle
5. **Appeal** — even enemies should be fun to watch die

### Three.js Skeletal Architecture

- `THREE.Bone` → hierarchical tree (hip → spine → chest → arms/head), each an Object3D
- `THREE.Skeleton` → manages bone array, computes bone matrices for GPU upload
- `THREE.SkinnedMesh` → mesh with `skinIndex`/`skinWeight` buffer attributes that deform with bones
- `THREE.AnimationMixer` → per-instance playback controller, manages multiple actions
- `THREE.QuaternionKeyframeTrack` → SLERP-interpolated rotations (no gimbal lock)
- `THREE.VectorKeyframeTrack` → position/scale keyframes (for squash/stretch, root bob)
- `AnimationAction.crossFadeTo()` → smooth blends between animation states
- `THREE.AdditiveAnimationBlendMode` → layer one-shots (hit react) over base animations
- Skinning in r128: `ShaderMaterial` with `skinning: true` injects `#include <skinning_pars_vertex>` / `#include <skinning_vertex>` chunks

### Shader Techniques

- **3-tone toon ramp**: `smoothstep` thresholds on `dot(normal, lightDir)` for shadow/mid/light bands
- **Rim lighting (fresnel)**: `pow(1.0 - dot(viewDir, normal), rimPower)` for silhouette pop at 58° camera
- **Inverted hull outlines**: duplicate mesh, scale along normals, render back-faces only with solid color
- **Uniform-driven effects**: hit flash (`uHitFlash`), desperate tint (`uDesperateTint`), speed aura glow (`uAuraGlow`)
- **Gradient mapping**: `DataTexture` with discrete brightness steps + `NearestFilter` for hard bands

### Performance Research

- Animation throttling (distance-based update frequency) gets 500+ skinned meshes at 60fps
- Shared skeleton bone calculations reported 1000 animated meshes at 60fps
- 8-15 bones per character is practical for browser (AAA mobile uses 30-150)
- Each `SkinnedMesh` = 1 draw call + 1 for outline = manageable at 50 enemies (100 calls)
- `AnimationClip` is read-only data — safe to share across all instances of same type

---

## Architecture Overview

### New File Structure

```
js/
  data/
    enemyConfig.js            ← Visual/animation params per type (pure data)
  shaders/
    toonShader.js              ← Toon vertex+fragment shaders, outline shader
  animation/
    SkeletonFactory.js         ← Builds bone hierarchies per type (9-15 bones)
    AnimationLibrary.js        ← 24+ keyframe clips (walk/bash/hit/death × 6 types)
    AnimationController.js     ← Per-enemy state machine + LOD throttling
  models/
    EnemyMaterials.js          ← Toon materials, gradient maps, outline materials
    EnemyModelFactory.js       ← SkinnedMesh builder (geometry merge + skinning)
```

### Modified Files

- `js/main.js` — add imports for all new modules, expose via `window.*`
- `index.html` — replace `_createEnemy`, animation update loop, hit flash, bash, death, panic transition, last straw, restart cleanup

### Standard Bone Hierarchy (12-15 bones)

```
root (hips)
  ├── spine
  │     ├── chest
  │     │     ├── neck → head
  │     │     ├── shoulder_L → upperArm_L → forearm_L
  │     │     └── shoulder_R → upperArm_R → forearm_R
  │     └── belly (Waddle Tank only — jiggle bone)
  ├── upperLeg_L → lowerLeg_L → foot_L
  └── upperLeg_R → lowerLeg_R → foot_R
```

| Type | Bones | Notes |
|------|-------|-------|
| Polite Knocker | 11 | Skip forearms, feet |
| Pee Dancer | 9 | Skip shoulders, forearms, feet |
| Waddle Tank | 15 | Full hierarchy + belly jiggle bone |
| Panicker | 13 | Skip feet, has forearms for flailing |
| Power Walker | 15 | Full hierarchy including feet (for firm planting) |
| The Girls | 9 | Skip shoulders, forearms, feet (petite) |

---

## Phase 1: Foundation

> No game integration. Testable in isolation. Pure infrastructure.

### 1A — Enemy Config Data
- [x] Create `js/data/enemyConfig.js`
- [x] Define `ENEMY_VISUAL_CONFIG` object with per-type entries:
  - [x] Bone positions relative to `size` (rest pose joint positions)
  - [x] Body part dimensions (torso width/height/depth, head radius, limb thickness)
  - [x] Material colors (body, skin, legs, outline)
  - [x] Animation timing parameters (walk cycle duration, bob height, swing angles)
  - [x] Which optional bones are enabled per type (belly, forearms, feet, shoulders)
- [x] Export as ES6 module

### 1B — Toon Shader
- [x] Create `js/shaders/` directory
- [x] Create `js/shaders/toonShader.js`
- [x] Write toon vertex shader:
  - [x] Include Three.js skinning chunks (`#include <skinning_pars_vertex>`, `#include <skinning_vertex>`)
  - [x] Pass world normal and view direction to fragment shader via varyings
  - [x] Pass world position for rim lighting calculation
- [x] Write toon fragment shader:
  - [x] 3-tone ramp: shadow (`dot < 0.3` → base×0.4), mid (base), light (`dot > 0.7` → base×1.2)
  - [x] Rim lighting: `pow(1.0 - dot(viewDir, normal), rimPower) * rimIntensity`
  - [x] `uHitFlash` uniform: when > 0, lerp entire output toward white
  - [x] `uDesperateTint` uniform: when > 0, shift color toward red
  - [x] `uAuraGlow` uniform: pulsing emissive for Panicker speed aura
  - [x] `uBaseColor` uniform: per-instance base color (vec3)
- [x] Write outline vertex shader:
  - [x] Include skinning chunks (outline must deform with skeleton)
  - [x] Extrude position along normal by `uOutlineWidth`
- [x] Write outline fragment shader:
  - [x] Solid `uOutlineColor` output
- [x] Export shader strings and default uniform definitions

### 1C — Skeleton Factory
- [x] Create `js/animation/` directory
- [x] Create `js/animation/SkeletonFactory.js`
- [x] Implement `createSkeleton(enemyType, size)` function:
  - [x] Read bone config from `ENEMY_VISUAL_CONFIG`
  - [x] Create `THREE.Bone` instances for each enabled bone
  - [x] Build parent-child hierarchy via `.add()`
  - [x] Set rest positions relative to `size` (e.g., spine.position.y = size * 0.5)
  - [x] Return `{ bones: Bone[], rootBone: Bone, boneMap: {name: Bone} }`
- [x] Implement type-specific rest poses:
  - [x] Polite Knocker: relaxed standing, slight forward lean
  - [x] Pee Dancer: knees together, bent forward
  - [x] Waddle Tank: wide stance, forward lean, belly extended
  - [x] Panicker: upright, arms raised
  - [x] Power Walker: athletic stance, arms at 90°
  - [x] The Girls: relaxed, slight hip cock
- [x] Test: create a test page that renders `THREE.SkeletonHelper` for each type to verify proportions

### 1D — Geometry Merge Utility
- [x] Write a `mergeGeometries(geometries, transforms)` utility function (~40-60 lines):
  - [x] Accept array of `THREE.BufferGeometry` + corresponding `THREE.Matrix4` transforms
  - [x] Merge position, normal, and index attributes into a single `BufferGeometry`
  - [x] Handle index buffer re-offsetting when merging indexed geometries
  - [x] Place in `EnemyModelFactory.js` as a private helper or in a shared `js/utils/` file

---

## Phase 2: Mesh Construction

> Build the visual models. Still no animation — static posed meshes.

### 2A — Enemy Materials
- [ ] Create `js/models/EnemyMaterials.js`
- [ ] Implement `createEnemyMaterials(enemyType, baseColor, isDesperate)`:
  - [ ] `body`: `THREE.ShaderMaterial` using toon shader, `skinning: true`
    - [ ] Set `uBaseColor` from `baseColor` param
    - [ ] Set `uDesperateTint` if `isDesperate`
    - [ ] Configure roughness/metalness-equivalent uniforms
  - [ ] `skin`: Flesh-tone toon material (0xffccaa), `skinning: true`
  - [ ] `legs`: Dark toon material (0x333333), `skinning: true`
  - [ ] `outline`: Outline `ShaderMaterial`, `side: THREE.BackSide`, `skinning: true`
  - [ ] Return material object
- [ ] Implement material template caching:
  - [ ] Store one template per type, clone for each instance
  - [ ] Each instance gets unique uniforms (hit flash state differs per enemy)
- [ ] Handle desperate color tinting:
  - [ ] Boost red channel, reduce green/blue (matching current: +80/-40/-40 on RGB)

### 2B — Enemy Model Factory
- [ ] Create `js/models/EnemyModelFactory.js`
- [ ] Implement `createEnemyModel(enemyType, color, isDesperate, size)`:
  - [ ] Call `createSkeleton()` to get bone hierarchy
  - [ ] Build body part geometries per type (see character sheets below)
  - [ ] Apply transforms (position, rotation) to each part geometry
  - [ ] Merge all parts into single `BufferGeometry` using merge utility
  - [ ] Compute `skinIndex` and `skinWeight` attributes:
    - [ ] For each vertex, find nearest 1-2 bones by distance
    - [ ] Weight by inverse distance, normalize to sum to 1.0
    - [ ] Override explicit regions (belly vertices → belly bone 100%)
  - [ ] Create `THREE.SkinnedMesh(mergedGeometry, bodyMaterial)`
  - [ ] Add root bone as child of skinned mesh
  - [ ] Call `mesh.bind(skeleton)` and `mesh.normalizeSkinWeights()`
  - [ ] Create outline mesh (clone geometry, apply outline material)
  - [ ] Wrap in `THREE.Group`
  - [ ] Return `{ group, skinnedMesh, skeleton, boneMap, outlineMesh }`
- [ ] Implement per-type geometry builders:
  - [ ] `_buildPoliteKnockerGeometry(size)` — rounded box torso, sphere head, cylinder limbs
  - [ ] `_buildPeeDancerGeometry(size)` — compact torso, close-set legs, hunched posture
  - [ ] `_buildWaddleTankGeometry(size)` — wide rounded torso, extended belly sphere, wide-set thick legs
  - [ ] `_buildPanickerGeometry(size)` — elongated thin torso, long arms, narrow legs
  - [ ] `_buildPowerWalkerGeometry(size)` — athletic torso, defined arms, strong legs
  - [ ] `_buildGirlsGeometry(size)` — petite torso, ponytail sphere on head, slim limbs
- [ ] Ensure sufficient vertex subdivisions at joints (2+ segments along limb length) for smooth deformation

### 2C — Visual Validation
- [ ] Spawn one of each enemy type in a test scene
- [ ] Verify mesh deforms correctly when bones are manually rotated
- [ ] Verify toon shading looks correct under game lighting
- [ ] Verify rim lighting provides silhouette pop at the 58° camera angle
- [ ] Verify outlines render correctly and follow bone deformation
- [ ] Verify hit flash uniform works (set `uHitFlash` to 1.0, check white flash)
- [ ] Verify desperate tint works
- [ ] Compare silhouettes — each type must be instantly recognizable as a solid black fill

---

## Phase 3: Animation Clips

> Define all keyframe animations. 24+ clips total.

### 3A — Animation Library Infrastructure
- [ ] Create `js/animation/AnimationLibrary.js`
- [ ] Implement clip caching: `Map<string, THREE.AnimationClip>` keyed by `type_state`
- [ ] Implement `getAnimationClip(enemyType, stateName)`:
  - [ ] Check cache first
  - [ ] Build clip on first request, store in cache
  - [ ] Return shared clip instance
- [ ] Write quaternion helper: `quatFromAxisAngle(axis, angle)` → returns flat [x,y,z,w] array
- [ ] Write keyframe helper: `buildRotationTrack(boneName, times, angles, axis)` → `QuaternionKeyframeTrack`

### 3B — Polite Knocker Animations
- [ ] `walk` (1.0s, loop):
  - [ ] Root: vertical bob — subtle rise at mid-stride, dip at extremes
  - [ ] Spine: 5° forward lean constant, slight twist with stride
  - [ ] Head: counter-rotates spine tilt (stays level — eyes on target)
  - [ ] Legs: alternating 30° swing (hip flexion/extension)
  - [ ] Arms: opposite to legs, 20° swing, slight delay (follow-through)
- [ ] `bash_door` (0.8s, loop):
  - [ ] 0.0-0.2s: anticipation — weight shifts back, spine leans away
  - [ ] 0.2-0.35s: lunge forward — root drives forward, arms reach
  - [ ] 0.35-0.45s: hold on contact — brief freeze (hitstop feel)
  - [ ] 0.45-0.8s: recovery — pulls back to neutral
- [ ] `hit_react` (0.3s, one-shot, additive):
  - [ ] Root jerks backward, spine compresses, quick recovery
- [ ] `death` (0.6s, one-shot):
  - [ ] Root drops, spine goes limp forward, legs buckle, scale to 0 over final 0.2s

### 3C — Pee Dancer Animations
- [ ] `hop_walk` (0.4s, loop):
  - [ ] Root: high bounce — squash at bottom (scaleY 0.85, scaleXZ 1.1), stretch at apex (scaleY 1.1, scaleXZ 0.95)
  - [ ] Legs: stay close together, knees bent, tiny alternating micro-steps
  - [ ] Body: rocks side to side 15°, hunched forward
  - [ ] Arms: pressed against sides, fists clenched (no arm bones needed — baked into mesh)
  - [ ] Head: bobs with body, slight anticipation dip before each hop
- [ ] `bash_door` (0.6s, loop):
  - [ ] Frantic small knocking, high frequency, body still bouncing
- [ ] `hit_react` (0.25s, one-shot, additive):
  - [ ] Quick flinch, minimal — doesn't break hop rhythm
- [ ] `death` (0.5s, one-shot):
  - [ ] Collapses into a heap, legs cross, final squash

### 3D — Waddle Tank Animations
- [ ] `waddle` (1.4s, loop):
  - [ ] Root: lateral rock — hips sway 10° left/right on Z-axis, minimal vertical bob
  - [ ] Spine: leans opposite to hip sway (counterbalance), 5° forward lean
  - [ ] Belly bone: follows spine with 0.1s delay + 20% overshoot (secondary motion)
  - [ ] Legs: short steps, wide stance maintained, one lifts while body leans opposite
  - [ ] Arms: one hand on stomach (baked), other arm hangs with slight swing
  - [ ] Head: stays relatively stable (counter-rotates body sway)
- [ ] `panic_sprint` (0.5s, loop):
  - [ ] Root: uprights from forward lean, higher vertical bob
  - [ ] Legs: dramatically wider swing (50° vs 15°), frantic
  - [ ] Belly bone: high-frequency independent bounce (2x body frequency)
  - [ ] Arms: both pump wildly, stomach hand released
  - [ ] Head: bobs freely (no counter-rotation — loss of composure)
- [ ] `bash_door` (1.0s, loop):
  - [ ] Full body slam — winds up by leaning far back, crashes forward with belly leading
  - [ ] Belly compresses on impact (squash), bounces back (stretch)
- [ ] `hit_react` (0.35s, one-shot, additive):
  - [ ] Belly absorbs hit (jiggle), root slides back
- [ ] `death` (0.8s, one-shot):
  - [ ] Slow topple sideways, belly drags, exaggerated weight

### 3E — Panicker Animations
- [ ] `panic_run` (0.5s, loop):
  - [ ] Root: moderate vertical bob, slight forward lean
  - [ ] Legs: fast pump, 40° swing, slightly asymmetric timing
  - [ ] Arms: flail overhead — **asymmetric frequencies** (left arm 1.3x speed, right 1.0x)
  - [ ] Left arm: wide arc, shoulder to full extension to behind head
  - [ ] Right arm: different arc pattern, offset timing (never mirrors left)
  - [ ] Spine: twists 10° alternating with stride
  - [ ] Head: slight lag behind spine twist (follow-through)
- [ ] `bash_door` (0.5s, loop):
  - [ ] Both fists pound alternating, frantic, body vibrating
- [ ] `hit_react` (0.3s, one-shot, additive):
  - [ ] Dramatic flinch, arms jerk wide
- [ ] `death` (0.6s, one-shot):
  - [ ] Dramatic collapse, arms go limp last (follow-through — heaviest parts settle last)

### 3F — Power Walker Animations
- [ ] `power_walk` (0.7s, loop):
  - [ ] Root: **minimal** vertical bob (0.02 units — eerily smooth)
  - [ ] Spine: perfectly upright, zero sway, zero twist
  - [ ] Legs: strong deliberate 35° swing, brief hold at extremes (foot plants firmly)
  - [ ] Arms: bent 90° at elbow, pump forward/back in perfect sync with opposite leg, 35° swing
  - [ ] Head: **does NOT bob** — counter-rotates root motion (neck absorbs it)
  - [ ] Feet: deliberate heel-strike feel via foot bone rotation at extremes
- [ ] `bash_door` (0.7s, loop):
  - [ ] Businesslike shoulder check — structured, efficient, no wasted motion
- [ ] `hit_react` (0.3s, one-shot, additive):
  - [ ] Barely flinches — slight pause in stride, then resumes
- [ ] `death` (0.6s, one-shot):
  - [ ] Falls forward stiffly like a tree — no crumple, just topples

### 3G — The Girls Animations
- [ ] `walk_chat` (0.9s, loop):
  - [ ] Root: gentle hip sway, relaxed pace
  - [ ] Spine: slight lean, natural posture
  - [ ] Legs: casual stride, 25° swing
  - [ ] Arms: one arm gestures (chatting motion — small waves), other relaxed
  - [ ] Head: turns slightly side to side (looking at friends)
  - [ ] Each instance gets random phase offset (0-2π) at spawn to prevent perfect sync
- [ ] `bash_door` (0.7s, loop):
  - [ ] Light knocking, looking around (head turns)
- [ ] `hit_react` (0.25s, one-shot, additive):
  - [ ] Startled jump — quick upward root displacement
- [ ] `death` (0.5s, one-shot):
  - [ ] Small collapse, quick

### 3H — Animation Quality Pass
- [ ] Play each clip in isolation, verify loop seams are seamless
- [ ] Verify timing feels right for each character's personality
- [ ] Check that Disney principles are evident:
  - [ ] Squash/stretch on Pee Dancer hops and Waddle Tank belly
  - [ ] Anticipation on all bash animations
  - [ ] Follow-through on Panicker arms, Waddle belly
  - [ ] Exaggeration appropriate to each character
- [ ] Verify animations read well from the 58° top-down camera angle
- [ ] Tune walk cycle speed to match game movement speed per type

---

## Phase 4: Animation Controller

> Per-enemy state machine with blending, one-shots, and LOD.

### 4A — Core Controller
- [ ] Create `js/animation/AnimationController.js`
- [ ] Implement `AnimationController` class:
  - [ ] `constructor(skinnedMesh, enemyType)`:
    - [ ] Create `THREE.AnimationMixer` bound to skinnedMesh
    - [ ] Initialize state to null
    - [ ] Initialize `updateAccumulator = 0`
  - [ ] `setState(newState)`:
    - [ ] Get clip from `AnimationLibrary.getAnimationClip(type, state)`
    - [ ] Create action via `mixer.clipAction(clip)`
    - [ ] Crossfade from current action: `currentAction.crossFadeTo(newAction, 0.2)`
    - [ ] Special case: waddle→panic_sprint uses 0.4s crossfade
    - [ ] Store new action as `this.currentAction`
  - [ ] `playOneShot(clipName)`:
    - [ ] Get clip, create action
    - [ ] `action.setLoop(THREE.LoopOnce)`
    - [ ] `action.clampWhenFinished = true`
    - [ ] `action.blendMode = THREE.AdditiveAnimationBlendMode`
    - [ ] `action.play()`
  - [ ] `setTimeScale(scale)`:
    - [ ] Adjusts playback speed (for desperate enemies, slowed enemies)
  - [ ] `update(dt, distanceToCamera)`:
    - [ ] Accumulate dt
    - [ ] Determine update interval from distance (see LOD below)
    - [ ] If enough time accumulated, call `mixer.update(accumulated)`
    - [ ] Reset accumulator
  - [ ] `dispose()`:
    - [ ] `mixer.stopAllAction()`
    - [ ] `mixer.uncacheRoot(skinnedMesh)`
    - [ ] Null out references

### 4B — LOD Throttling
- [ ] Implement distance-based update frequency:
  - [ ] Distance < 20 units: every frame (interval = 0)
  - [ ] Distance 20-40 units: ~30fps (interval = 0.033)
  - [ ] Distance > 40 units: ~15fps (interval = 0.066)
- [ ] Compensate for skipped frames by passing accumulated dt to mixer
- [ ] Test with 50+ enemies — verify no visible animation stuttering at medium distance

### 4C — Speed Synchronization
- [ ] Sync animation playback speed with enemy movement speed:
  - [ ] When enemy is slowed (wet floor): `setTimeScale(0.4)` on walk action
  - [ ] When desperate: `setTimeScale(1.5)` or higher
  - [ ] When Panicker aura boosts speed: update time scale accordingly
  - [ ] Waddle Tank panic: handled by state change, not time scale

---

## Phase 5: Game Integration

> Wire everything into the live game behind a feature flag.

### 5A — Feature Flag Setup
- [ ] Add `Game.USE_SKELETAL = true` flag in index.html init
- [ ] Branch `_createEnemy()` based on flag
- [ ] Branch animation update section based on flag
- [ ] This allows instant rollback if issues arise

### 5B — Module Wiring
- [ ] Modify `js/main.js`:
  - [ ] Import `createEnemyModel` from `EnemyModelFactory.js`
  - [ ] Import `AnimationController` from `AnimationController.js`
  - [ ] Import `getAnimationClip` from `AnimationLibrary.js`
  - [ ] Expose all via `window.*` assignments

### 5C — Replace `_createEnemy()` (index.html ~line 1229)
- [ ] New code path when `USE_SKELETAL` is true:
  - [ ] Call `createEnemyModel(enemyType, color, isDesperate, size)`
  - [ ] Store `skinnedMesh`, `skeleton`, `outlineMesh`, `boneMap` on enemy object
  - [ ] Create `AnimationController` instance, store as `e.animController`
  - [ ] Set initial animation state based on type:
    - [ ] polite → 'walk'
    - [ ] dancer → 'hop_walk'
    - [ ] waddle → 'waddle'
    - [ ] panicker → 'panic_run'
    - [ ] powerwalker → 'power_walk'
    - [ ] girls → 'walk_chat'
  - [ ] For girls: apply random phase offset to mixer time
- [ ] Remove old fields from enemy object: `e.body`, `e.leftLeg`, `e.rightLeg`, `e.leftArm`, `e.rightArm`, `e.stomachHand`

### 5D — Replace Animation Update (index.html ~line 1528)
- [ ] Replace the entire `sin/cos` procedural animation block with:
  ```javascript
  const camDist = e.mesh.position.distanceTo(this.camera.position);
  e.animController.update(dt, camDist);
  ```
- [ ] Remove all per-type walk phase manipulation (hopping, rocking, flailing, rigid stride, etc.)
- [ ] Keep `e.walkPhase` update if still needed for non-animation purposes (zig-zag movement logic)

### 5E — Replace Hit Flash (index.html ~line 1577)
- [ ] Replace `e.body.material.emissive` manipulation with:
  ```javascript
  e.skinnedMesh.material.uniforms.uHitFlash.value = Math.max(0, e.hitFlash / 0.15);
  ```

### 5F — Replace Waddle Panic Transition (index.html ~line 1471)
- [ ] Replace manual body rotation/visibility changes with:
  ```javascript
  e.animController.setState('panic_sprint');
  ```
- [ ] Remove: `e.body.rotation.x = 0.15`, `e.stomachHand.visible = false`, etc.

### 5G — Replace Bash Door Animation (index.html ~line 1596)
- [ ] On first bash frame: `e.animController.setState('bash_door')`
- [ ] Remove manual lunge position animation (z-offset hack)

### 5H — Replace Death Handling (index.html ~line 1674)
- [ ] Trigger death animation: `e.animController.playOneShot('death')`
- [ ] Delay mesh removal by clip duration (~0.5-0.8s depending on type)
- [ ] In delayed callback:
  - [ ] `e.animController.dispose()`
  - [ ] `this.scene.remove(e.mesh)`
  - [ ] Dispose geometry and materials
  - [ ] If using pooling: release to pool instead

### 5I — Replace Last Straw Effect (index.html ~line 1676)
- [ ] Replace `e.body.material.color.setHex(0xff2200)` with:
  ```javascript
  e.skinnedMesh.material.uniforms.uDesperateTint.value = 1.0;
  ```

### 5J — Fix Restart Cleanup (index.html ~line 751)
- [ ] Add proper disposal for all skeletal animation resources:
  - [ ] Call `animController.dispose()` on each enemy
  - [ ] Traverse and dispose all geometries/materials
  - [ ] Clear any object pools

### 5K — Integration Testing
- [ ] Play through waves 1-10:
  - [ ] Wave 1: Polite Knockers walk, take hits, bash door, die correctly
  - [ ] Wave 3: Pee Dancers hop correctly, cluster behavior works
  - [ ] Wave 5: Waddle Tanks waddle, panic at 50% HP with smooth transition
  - [ ] Wave 7: Panickers run with asymmetric arm flail, speed aura glows
  - [ ] Wave 9: Power Walkers stride rigidly, immune to slow visual works
  - [ ] Wave 10: The Girls spawn as cluster with phase variation
- [ ] Verify trampling still works (hitbox based on size, not mesh parts)
- [ ] Verify tower targeting still works (distance checks use e.mesh.position)
- [ ] Verify floating coin text spawns at correct position
- [ ] Verify fog interacts correctly with toon shader

---

## Phase 6: Polish & Performance

> Make it feel AAA. Optimize for horde waves.

### 6A — Object Pooling
- [ ] Implement enemy pool per type:
  - [ ] `acquire(type, color, isDesperate, size)` → reuse or create
  - [ ] `release(model)` → reset animation state, push to available pool
  - [ ] Pre-allocate: 5 per common type, 10 for polite, 7 for girls
- [ ] On enemy death: release to pool after death animation instead of disposing
- [ ] On enemy spawn: acquire from pool first
- [ ] On game restart: release all active to pool (don't destroy)

### 6B — Visual Polish
- [ ] Add squash/stretch on Pee Dancer landing (scale root bone)
- [ ] Add belly jiggle overshoot on Waddle Tank direction changes
- [ ] Add brief hitstop (2-3 frame animation pause) on heavy hits
- [ ] Add speed lines / motion blur on desperate enemies (stretched geometry or particle trail)
- [ ] Add pulsing fresnel glow on Panicker (sin(time*4) on uAuraGlow uniform)
- [ ] Add subtle teal energy lines on Power Walker (additional glow mesh or particle)
- [ ] Tune outline width per type (larger enemies = slightly thicker outline)
- [ ] Add death particles (existing door chip system can be adapted)

### 6C — Performance Optimization
- [ ] Profile with 50+ enemies on screen:
  - [ ] Monitor `renderer.info.render.calls` — target < 150 during hordes
  - [ ] Monitor heap size across multiple wave cycles — must stabilize
  - [ ] Profile animation update loop — confirm throttling is effective
- [ ] Disable outline mesh beyond 40 units distance
- [ ] Consider reducing bone updates for far enemies (skip secondary bones like belly)
- [ ] If needed: batch outline rendering into single draw call
- [ ] Target: **30fps minimum with 50+ enemies** on mid-range hardware

### 6D — Camera Angle Tuning
- [ ] Verify all animations read well from the 58° top-down perspective
- [ ] Adjust exaggeration levels — motions perpendicular to view axis (side-to-side) are most visible
- [ ] Ensure head movements are visible despite steep angle
- [ ] Verify silhouette distinctness — test by rendering all types as solid black

---

## Phase 7: Cleanup

> Remove old code, finalize.

### 7A — Remove Feature Flag
- [ ] Remove `USE_SKELETAL` flag and old code branches
- [ ] Delete old `_createEnemy` procedural mesh construction (~150 lines)
- [ ] Delete old procedural animation block (~50 lines)
- [ ] Delete references to old enemy fields (`e.body`, `e.leftLeg`, etc.)

### 7B — Code Quality
- [ ] Ensure all disposal paths are complete (no memory leaks)
- [ ] Verify game restart fully cleans up skeletal resources
- [ ] Test multiple restart cycles — memory should not grow
- [ ] Final performance pass on horde waves (15, 20, 25, 30)

### 7C — Update Documentation
- [ ] Update `GAME_DESIGN_DOC.md` with new enemy visual descriptions
- [ ] Update memory file with new architecture notes

---

## Character Reference Sheets

### Polite Knocker
```
Type: Baseline (wave 1)
Size: 1.5 | Speed: 3.0 | Color: tan (0xd4a574)
Silhouette: Average height, slightly hunched, arms at sides
Body: Rounded box torso (dress shirt/slacks look), sphere head
Walk: Measured stride, restrained arm swing, slight forward lean
Personality: Trying to be civilized about a desperate situation
Bones: 11 (skip forearms, feet)
Animations: walk (1.0s), bash_door (0.8s), hit_react (0.3s), death (0.6s)
```

### Pee Dancer
```
Type: Fast swarm (wave 3)
Size: 1.0 | Speed: 5.5 | Color: blue (0x3498db)
Silhouette: Short, compact, legs pressed together
Body: Small frame, knees together, hunched forward
Walk: Hopping/bouncing with knees together, cross-legged shuffle
Personality: Desperate, can't hold it, bouncing from foot to foot
Bones: 9 (skip shoulders, forearms, feet)
Animations: hop_walk (0.4s), bash_door (0.6s), hit_react (0.25s), death (0.5s)
Special: Squash/stretch on each hop landing
```

### Waddle Tank
```
Type: Big slow tank (wave 5)
Size: 2.0 | Speed: 2.0 | Color: brown (0x795548)
Silhouette: Wide, round belly, low center of gravity
Body: Large rotund torso, extended belly, hand on stomach, wide stance
Walk: Slow waddle, side-to-side rock, belly leads motion
Panic: At 50% HP — speed doubles, belly bounces wildly, arms pump
Personality: Big guy who ate too much, lumbering with urgency
Bones: 15 (full hierarchy + belly jiggle bone)
Animations: waddle (1.4s), panic_sprint (0.5s), bash_door (1.0s), hit_react (0.35s), death (0.8s)
Special: Belly jiggle bone with 0.1s delay + overshoot, dramatic panic transition
```

### Panicker
```
Type: Priority target (wave 7)
Size: 1.6 | Speed: 4.0 | Color: bright yellow (0xf1c40f)
Silhouette: Tall, lanky, arms flailing overhead
Body: Thin elongated torso, exaggerated arm length
Walk: Frantic zig-zag, asymmetric arm flailing, body twisting
Personality: Complete meltdown, running around screaming
Bones: 13 (skip feet, has forearms for flailing)
Animations: panic_run (0.5s), bash_door (0.5s), hit_react (0.3s), death (0.6s)
Special: Speed aura (pulsing fresnel glow), asymmetric arm frequencies (L=1.3x, R=1.0x)
```

### Power Walker
```
Type: Slow immune (wave 9)
Size: 1.4 | Speed: 3.5 | Color: teal (0x1abc9c)
Silhouette: Athletic, rigid posture, arms pumping at 90°
Body: Fit build, determined pose, athletic wear proportions
Walk: Rigid mechanical power-walk, arms pump perfectly, head doesn't bob
Personality: Fitness person walking with intense, unstoppable purpose
Bones: 15 (full hierarchy including feet for firm planting)
Animations: power_walk (0.7s), bash_door (0.7s), hit_react (0.3s), death (0.6s)
Special: Eerily minimal vertical motion, immune-to-slow visual indicator
```

### The Girls
```
Type: Cluster swarm (wave 10)
Size: 0.85 | Speed: 3.0 | Color: pink (0xe91e8c)
Silhouette: Small, clustered, ponytail shape
Body: Petite frame, ponytail sphere, slim limbs
Walk: Relaxed casual walk, hip sway, chatting gesture, head turns
Personality: Group of friends heading to the bathroom together
Bones: 9 (skip shoulders, forearms, feet)
Animations: walk_chat (0.9s), bash_door (0.7s), hit_react (0.25s), death (0.5s)
Special: Random phase offset per instance, cluster movement
```

---

## Technical Reference

### Key Integration Points in index.html

| What | Current Location | Change |
|------|-----------------|--------|
| `_createEnemy()` | ~line 1229-1386 | Replace mesh construction with `createEnemyModel()` call |
| Animation update | ~line 1528-1574 | Replace sin/cos block with `animController.update(dt, dist)` |
| Waddle panic | ~line 1471-1477 | Replace manual body rotation with `setState('panic_sprint')` |
| Hit flash | ~line 1577-1585 | Replace emissive manipulation with uniform update |
| Bash door | ~line 1596-1610 | Replace position hack with `setState('bash_door')` |
| Death | ~line 1674-1694 | Trigger death anim, delay removal, dispose |
| Last straw | ~line 1676-1683 | Replace color set with `uDesperateTint` uniform |
| Restart cleanup | ~line 751-753 | Add animController disposal |

### Performance Targets

| Metric | Target |
|--------|--------|
| FPS with 50+ enemies | ≥ 30 fps on mid-range hardware |
| Draw calls during horde | < 150 |
| Bones per character | 9-15 |
| Memory after restart cycle | Stable (no growth) |
| Animation LOD tiers | 3 (full / 30fps / 15fps) |

### Key Technical Decisions

1. **Custom `ShaderMaterial` over `MeshToonMaterial`** — r128's MeshToonMaterial has limited gradient map control; need custom uniforms for hit flash, desperate tint, aura glow
2. **Proximity-based auto-skinning** — compute skin weights from vertex-to-bone distance (simple geometry makes this reliable)
3. **Manual geometry merge** — avoid `BufferGeometryUtils` dependency (~40 lines of utility code)
4. **Feature flag migration** — `Game.USE_SKELETAL` lets both systems coexist during development
5. **Quaternion keyframes exclusively** — no Euler angles, prevents gimbal lock during interpolation
6. **Animation clip sharing** — one `AnimationClip` per type×state, shared across all instances (mixer owns per-instance state)
7. **Object pooling** — reuse SkinnedMesh+Mixer after death instead of dispose+create
