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
- [x] Create `js/models/EnemyMaterials.js`
- [x] Implement `createEnemyMaterials(enemyType, baseColor, isDesperate)`:
  - [x] `body`: `THREE.ShaderMaterial` using toon shader, `skinning: true`
    - [x] Set `uBaseColor` from `baseColor` param
    - [x] Set `uDesperateTint` if `isDesperate`
    - [x] Configure roughness/metalness-equivalent uniforms
  - [x] `skin`: Flesh-tone toon material (0xffccaa), `skinning: true`
  - [x] `legs`: Dark toon material (0x333333), `skinning: true`
  - [x] `outline`: Outline `ShaderMaterial`, `side: THREE.BackSide`, `skinning: true`
  - [x] Return material object
- [x] Implement material template caching:
  - [x] Store one template per type, clone for each instance
  - [x] Each instance gets unique uniforms (hit flash state differs per enemy)
- [x] Handle desperate color tinting:
  - [x] Boost red channel, reduce green/blue (matching current: +80/-40/-40 on RGB)

### 2B — Enemy Model Factory
- [x] Create `js/models/EnemyModelFactory.js`
- [x] Implement `createEnemyModel(enemyType, color, isDesperate, size)`:
  - [x] Call `createSkeleton()` to get bone hierarchy
  - [x] Build body part geometries per type (see character sheets below)
  - [x] Apply transforms (position, rotation) to each part geometry
  - [x] Merge all parts into single `BufferGeometry` using merge utility
  - [x] Compute `skinIndex` and `skinWeight` attributes:
    - [x] For each vertex, find nearest 1-2 bones by distance
    - [x] Weight by inverse distance, normalize to sum to 1.0
    - [x] Override explicit regions (belly vertices → belly bone 100%)
  - [x] Create `THREE.SkinnedMesh(mergedGeometry, bodyMaterial)`
  - [x] Add root bone as child of skinned mesh
  - [x] Call `mesh.bind(skeleton)` and `mesh.normalizeSkinWeights()`
  - [x] Create outline mesh (clone geometry, apply outline material)
  - [x] Wrap in `THREE.Group`
  - [x] Return `{ group, skinnedMesh, skeleton, boneMap, outlineMesh }`
- [x] Implement per-type geometry builders:
  - [x] `_buildPoliteKnockerGeometry(size)` — rounded box torso, sphere head, cylinder limbs
  - [x] `_buildPeeDancerGeometry(size)` — compact torso, close-set legs, hunched posture
  - [x] `_buildWaddleTankGeometry(size)` — wide rounded torso, extended belly sphere, wide-set thick legs
  - [x] `_buildPanickerGeometry(size)` — elongated thin torso, long arms, narrow legs
  - [x] `_buildPowerWalkerGeometry(size)` — athletic torso, defined arms, strong legs
  - [x] `_buildGirlsGeometry(size)` — petite torso, ponytail sphere on head, slim limbs
- [x] Ensure sufficient vertex subdivisions at joints (2+ segments along limb length) for smooth deformation

### 2C — Visual Validation
- [x] Spawn one of each enemy type in a test scene
- [x] Verify mesh deforms correctly when bones are manually rotated
- [x] Verify toon shading looks correct under game lighting
- [x] Verify rim lighting provides silhouette pop at the 58° camera angle
- [x] Verify outlines render correctly and follow bone deformation
- [x] Verify hit flash uniform works (set `uHitFlash` to 1.0, check white flash)
- [x] Verify desperate tint works
- [x] Compare silhouettes — each type must be instantly recognizable as a solid black fill

---

## Phase 3: Animation Clips

> Define all keyframe animations. 24+ clips total.

### 3A — Animation Library Infrastructure
- [x] Create `js/animation/AnimationLibrary.js`
- [x] Implement clip caching: `Map<string, THREE.AnimationClip>` keyed by `type_state`
- [x] Implement `getAnimationClip(enemyType, stateName)`:
  - [x] Check cache first
  - [x] Build clip on first request, store in cache
  - [x] Return shared clip instance
- [x] Write quaternion helper: `quatFromAxisAngle(axis, angle)` → returns flat [x,y,z,w] array
- [x] Write keyframe helper: `buildRotationTrack(boneName, times, angles, axis)` → `QuaternionKeyframeTrack`

### 3B — Polite Knocker Animations
- [x] `walk` (1.0s, loop):
  - [x] Root: vertical bob — subtle rise at mid-stride, dip at extremes
  - [x] Spine: 5° forward lean constant, slight twist with stride
  - [x] Head: counter-rotates spine tilt (stays level — eyes on target)
  - [x] Legs: alternating 30° swing (hip flexion/extension)
  - [x] Arms: opposite to legs, 20° swing, slight delay (follow-through)
- [x] `bash_door` (0.8s, loop):
  - [x] 0.0-0.2s: anticipation — weight shifts back, spine leans away
  - [x] 0.2-0.35s: lunge forward — root drives forward, arms reach
  - [x] 0.35-0.45s: hold on contact — brief freeze (hitstop feel)
  - [x] 0.45-0.8s: recovery — pulls back to neutral
- [x] `hit_react` (0.3s, one-shot, additive):
  - [x] Root jerks backward, spine compresses, quick recovery
- [x] `death` (0.6s, one-shot):
  - [x] Root drops, spine goes limp forward, legs buckle, scale to 0 over final 0.2s

### 3C — Pee Dancer Animations
- [x] `hop_walk` (0.4s, loop):
  - [x] Root: high bounce — squash at bottom (scaleY 0.85, scaleXZ 1.1), stretch at apex (scaleY 1.1, scaleXZ 0.95)
  - [x] Legs: stay close together, knees bent, tiny alternating micro-steps
  - [x] Body: rocks side to side 15°, hunched forward
  - [x] Arms: pressed against sides, fists clenched (no arm bones needed — baked into mesh)
  - [x] Head: bobs with body, slight anticipation dip before each hop
- [x] `bash_door` (0.6s, loop):
  - [x] Frantic small knocking, high frequency, body still bouncing
- [x] `hit_react` (0.25s, one-shot, additive):
  - [x] Quick flinch, minimal — doesn't break hop rhythm
- [x] `death` (0.5s, one-shot):
  - [x] Collapses into a heap, legs cross, final squash

### 3D — Waddle Tank Animations
- [x] `waddle` (1.4s, loop):
  - [x] Root: lateral rock — hips sway 10° left/right on Z-axis, minimal vertical bob
  - [x] Spine: leans opposite to hip sway (counterbalance), 5° forward lean
  - [x] Belly bone: follows spine with 0.1s delay + 20% overshoot (secondary motion)
  - [x] Legs: short steps, wide stance maintained, one lifts while body leans opposite
  - [x] Arms: one hand on stomach (baked), other arm hangs with slight swing
  - [x] Head: stays relatively stable (counter-rotates body sway)
- [x] `panic_sprint` (0.5s, loop):
  - [x] Root: uprights from forward lean, higher vertical bob
  - [x] Legs: dramatically wider swing (50° vs 15°), frantic
  - [x] Belly bone: high-frequency independent bounce (2x body frequency)
  - [x] Arms: both pump wildly, stomach hand released
  - [x] Head: bobs freely (no counter-rotation — loss of composure)
- [x] `bash_door` (1.0s, loop):
  - [x] Full body slam — winds up by leaning far back, crashes forward with belly leading
  - [x] Belly compresses on impact (squash), bounces back (stretch)
- [x] `hit_react` (0.35s, one-shot, additive):
  - [x] Belly absorbs hit (jiggle), root slides back
- [x] `death` (0.8s, one-shot):
  - [x] Slow topple sideways, belly drags, exaggerated weight

### 3E — Panicker Animations
- [x] `panic_run` (0.5s, loop):
  - [x] Root: moderate vertical bob, slight forward lean
  - [x] Legs: fast pump, 40° swing, slightly asymmetric timing
  - [x] Arms: flail overhead — **asymmetric frequencies** (left arm 1.3x speed, right 1.0x)
  - [x] Left arm: wide arc, shoulder to full extension to behind head
  - [x] Right arm: different arc pattern, offset timing (never mirrors left)
  - [x] Spine: twists 10° alternating with stride
  - [x] Head: slight lag behind spine twist (follow-through)
- [x] `bash_door` (0.5s, loop):
  - [x] Both fists pound alternating, frantic, body vibrating
- [x] `hit_react` (0.3s, one-shot, additive):
  - [x] Dramatic flinch, arms jerk wide
- [x] `death` (0.6s, one-shot):
  - [x] Dramatic collapse, arms go limp last (follow-through — heaviest parts settle last)

### 3F — Power Walker Animations
- [x] `power_walk` (0.7s, loop):
  - [x] Root: **minimal** vertical bob (0.02 units — eerily smooth)
  - [x] Spine: perfectly upright, zero sway, zero twist
  - [x] Legs: strong deliberate 35° swing, brief hold at extremes (foot plants firmly)
  - [x] Arms: bent 90° at elbow, pump forward/back in perfect sync with opposite leg, 35° swing
  - [x] Head: **does NOT bob** — counter-rotates root motion (neck absorbs it)
  - [x] Feet: deliberate heel-strike feel via foot bone rotation at extremes
- [x] `bash_door` (0.7s, loop):
  - [x] Businesslike shoulder check — structured, efficient, no wasted motion
- [x] `hit_react` (0.3s, one-shot, additive):
  - [x] Barely flinches — slight pause in stride, then resumes
- [x] `death` (0.6s, one-shot):
  - [x] Falls forward stiffly like a tree — no crumple, just topples

### 3G — The Girls Animations
- [x] `walk_chat` (0.9s, loop):
  - [x] Root: gentle hip sway, relaxed pace
  - [x] Spine: slight lean, natural posture
  - [x] Legs: casual stride, 25° swing
  - [x] Arms: no arm bones — baked into mesh (chatting gesture deferred to Phase 6 polish)
  - [x] Head: turns slightly side to side (looking at friends)
  - [x] Each instance gets random phase offset (0-2π) at spawn to prevent perfect sync
- [x] `bash_door` (0.7s, loop):
  - [x] Light knocking, looking around (head turns)
- [x] `hit_react` (0.25s, one-shot, additive):
  - [x] Startled jump — quick upward root displacement
- [x] `death` (0.5s, one-shot):
  - [x] Small collapse, quick

### 3H — Animation Quality Pass
- [x] Play each clip in isolation, verify loop seams are seamless
- [x] Verify timing feels right for each character's personality
- [x] Check that Disney principles are evident:
  - [x] Squash/stretch on Pee Dancer hops and Waddle Tank belly
  - [x] Anticipation on all bash animations
  - [x] Follow-through on Panicker arms, Waddle belly
  - [x] Exaggeration appropriate to each character
- [x] Verify animations read well from the 58° top-down camera angle
- [x] Tune walk cycle speed to match game movement speed per type

---

## Phase 4: Animation Controller

> Per-enemy state machine with blending, one-shots, and LOD.

### 4A — Core Controller
- [x] Create `js/animation/AnimationController.js`
- [x] Implement `AnimationController` class:
  - [x] `constructor(skinnedMesh, enemyType)`:
    - [x] Create `THREE.AnimationMixer` bound to skinnedMesh
    - [x] Initialize state to null
    - [x] Initialize `updateAccumulator = 0`
  - [x] `setState(newState)`:
    - [x] Get clip from `AnimationLibrary.getAnimationClip(type, state)`
    - [x] Create action via `mixer.clipAction(clip)`
    - [x] Crossfade from current action: `currentAction.crossFadeTo(newAction, 0.2)`
    - [x] Special case: waddle→panic_sprint uses 0.4s crossfade
    - [x] Store new action as `this.currentAction`
  - [x] `playOneShot(clipName)`:
    - [x] Get clip, create action
    - [x] `action.setLoop(THREE.LoopOnce)`
    - [x] `action.clampWhenFinished = true`
    - [x] `action.blendMode = THREE.AdditiveAnimationBlendMode`
    - [x] `action.play()`
  - [x] `setTimeScale(scale)`:
    - [x] Adjusts playback speed (for desperate enemies, slowed enemies)
  - [x] `update(dt, distanceToCamera)`:
    - [x] Accumulate dt
    - [x] Determine update interval from distance (see LOD below)
    - [x] If enough time accumulated, call `mixer.update(accumulated)`
    - [x] Reset accumulator
  - [x] `dispose()`:
    - [x] `mixer.stopAllAction()`
    - [x] `mixer.uncacheRoot(skinnedMesh)`
    - [x] Null out references

### 4B — LOD Throttling
- [x] Implement distance-based update frequency:
  - [x] Distance < 20 units: every frame (interval = 0)
  - [x] Distance 20-40 units: ~30fps (interval = 0.033)
  - [x] Distance > 40 units: ~15fps (interval = 0.066)
- [x] Compensate for skipped frames by passing accumulated dt to mixer
- [ ] Test with 50+ enemies — verify no visible animation stuttering at medium distance

### 4C — Speed Synchronization
- [x] Sync animation playback speed with enemy movement speed:
  - [x] When enemy is slowed (wet floor): `setTimeScale(0.4)` on walk action
  - [x] When desperate: `setTimeScale(1.5)` or higher
  - [x] When Panicker aura boosts speed: update time scale accordingly
  - [x] Waddle Tank panic: handled by state change, not time scale

---

## Phase 5: Game Integration

> Wire everything into the live game behind a feature flag.

### 5A — Feature Flag Setup
- [x] Add `Game.USE_SKELETAL = true` flag in index.html init
- [x] Branch `_createEnemy()` based on flag
- [x] Branch animation update section based on flag
- [x] This allows instant rollback if issues arise

### 5B — Module Wiring
- [x] Modify `js/main.js`:
  - [x] Import `createEnemyModel` from `EnemyModelFactory.js`
  - [x] Import `AnimationController` from `AnimationController.js`
  - [x] Import `getAnimationClip` from `AnimationLibrary.js`
  - [x] Expose all via `window.*` assignments

### 5C — Replace `_createEnemy()` (index.html ~line 1229)
- [x] New code path when `USE_SKELETAL` is true:
  - [x] Call `createEnemyModel(enemyType, color, isDesperate, size)`
  - [x] Store `skinnedMesh`, `skeleton`, `outlineMesh`, `boneMap` on enemy object
  - [x] Create `AnimationController` instance, store as `e.animController`
  - [x] Set initial animation state based on type:
    - [x] polite → 'walk'
    - [x] dancer → 'hop_walk'
    - [x] waddle → 'waddle'
    - [x] panicker → 'panic_run'
    - [x] powerwalker → 'power_walk'
    - [x] girls → 'walk_chat'
  - [x] For girls: apply random phase offset to mixer time
- [x] Remove old fields from enemy object: `e.body`, `e.leftLeg`, `e.rightLeg`, `e.leftArm`, `e.rightArm`, `e.stomachHand`

### 5D — Replace Animation Update (index.html ~line 1528)
- [x] Replace the entire `sin/cos` procedural animation block with:
  ```javascript
  const camDist = e.mesh.position.distanceTo(this.camera.position);
  e.animController.update(dt, camDist);
  ```
- [x] Remove all per-type walk phase manipulation (hopping, rocking, flailing, rigid stride, etc.)
- [x] Keep `e.walkPhase` update if still needed for non-animation purposes (zig-zag movement logic)

### 5E — Replace Hit Flash (index.html ~line 1577)
- [x] Replace `e.body.material.emissive` manipulation with:
  ```javascript
  e.skinnedMesh.material.uniforms.uHitFlash.value = Math.max(0, e.hitFlash / 0.15);
  ```

### 5F — Replace Waddle Panic Transition (index.html ~line 1471)
- [x] Replace manual body rotation/visibility changes with:
  ```javascript
  e.animController.setState('panic_sprint');
  ```
- [x] Remove: `e.body.rotation.x = 0.15`, `e.stomachHand.visible = false`, etc.

### 5G — Replace Bash Door Animation (index.html ~line 1596)
- [x] On first bash frame: `e.animController.setState('bash_door')`
- [x] Remove manual lunge position animation (z-offset hack)

### 5H — Replace Death Handling (index.html ~line 1674)
- [x] Trigger death animation: `e.animController.playOneShot('death')`
- [x] Delay mesh removal by clip duration (~0.5-0.8s depending on type)
- [x] In delayed callback:
  - [x] `e.animController.dispose()`
  - [x] `this.scene.remove(e.mesh)`
  - [x] Dispose geometry and materials
  - [ ] If using pooling: release to pool instead

### 5I — Replace Last Straw Effect (index.html ~line 1676)
- [x] Replace `e.body.material.color.setHex(0xff2200)` with:
  ```javascript
  e.skinnedMesh.material.uniforms.uDesperateTint.value = 1.0;
  ```

### 5J — Fix Restart Cleanup (index.html ~line 751)
- [x] Add proper disposal for all skeletal animation resources:
  - [x] Call `animController.dispose()` on each enemy
  - [x] Traverse and dispose all geometries/materials
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
