// CoinPool.js — Mario-style collectible coin drops
// Coins burst from enemies on death, hover upright and spin in the air.
// Coin Magnets auto-collect them with a satisfying pull arc.

const GRAVITY = 18;
const BASE_LIFETIME = 10.0;
const BLINK_TIME = 3.0;
const MAGNET_DURATION = 0.35;

// Mario-style idle animation
const HOVER_Y = 0.9;            // float at waist height, not on the ground
const SPIN_SPEED = 10.0;         // rad/s — ~1.6 revolutions/sec, classic coin spin
const BOB_AMP = 0.18;            // vertical bob amplitude
const BOB_FREQ = 1.2;            // Hz — smooth, hypnotic
const SQUASH_AMP = 0.08;         // squash/stretch on bob cycle

// Spawn burst
const SPAWN_POP_SCALE = 1.6;     // brief scale overshoot on spawn
const SPAWN_POP_DURATION = 0.2;  // seconds for pop to settle

// Coin visuals
const COIN_SCALE = 1.8;

export class CoinPool {
    constructor() {
        this._pool = [];
        this._active = [];
        this._stats = { hits: 0, misses: 0, totalSpawned: 0 };

        // Coin geometry — upright disc. Built as cylinder then rotated 90° on X
        // so the flat face is vertical (like a real coin standing on edge).
        this._coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.07, 16);
        this._coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0xffaa00,
            emissiveIntensity: 0.6,
        });

        // Face detail (dollar sign / stamp circle)
        this._stampGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.01, 16);
        this._stampMat = new THREE.MeshStandardMaterial({
            color: 0xdaa520,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0xcc8800,
            emissiveIntensity: 0.4,
        });

        // Inner ring detail for the face
        this._ringGeo = new THREE.TorusGeometry(0.3, 0.025, 8, 24);
        this._ringMat = new THREE.MeshStandardMaterial({
            color: 0xeec900,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0xddaa00,
            emissiveIntensity: 0.3,
        });
    }

    preAllocate(count = 60) {
        for (let i = 0; i < count; i++) {
            this._pool.push(this._createCoinMesh());
        }
    }

    spawnCoins(x, z, totalValue, numCoins, scene) {
        const perCoin = Math.floor(totalValue / numCoins);
        let remainder = totalValue - perCoin * numCoins;

        for (let i = 0; i < numCoins; i++) {
            const value = perCoin + (i === numCoins - 1 ? remainder : 0);
            const mesh = this._acquireMesh();
            mesh.visible = true;
            mesh.position.set(x, 1.0, z);
            mesh.rotation.set(0, Math.random() * Math.PI * 2, 0);
            mesh.scale.set(COIN_SCALE, COIN_SCALE, COIN_SCALE);

            // Reset materials
            mesh.traverse(child => {
                if (child.isMesh) {
                    child.material.opacity = 1;
                    child.material.transparent = false;
                }
            });

            scene.add(mesh);

            // Burst upward with spread — coins fountain out of the enemy
            const angle = (i / numCoins) * Math.PI * 2 + Math.random() * 0.5;
            const spread = 1.5 + Math.random() * 2.0;

            this._active.push({
                mesh,
                value,
                x, y: 1.0, z,
                vx: Math.cos(angle) * spread,
                vy: 5 + Math.random() * 3,       // high pop for drama
                vz: Math.sin(angle) * spread,
                spinOffset: Math.random() * Math.PI * 2,  // desync spin per coin
                bobOffset: Math.random() * Math.PI * 2,   // desync bob per coin
                state: 'flying',     // flying | hovering | magnetPull | expiring
                life: BASE_LIFETIME,
                maxLife: BASE_LIFETIME,
                collectTarget: null,
                collectProgress: 0,
                collectStartPos: null,
                spawnTimer: SPAWN_POP_DURATION,  // scale pop countdown
                settleSpeed: 0,                  // velocity when transitioning to hover
            });

            this._stats.totalSpawned++;
        }
    }

    update(dt, elapsedTime, scene) {
        for (let i = this._active.length - 1; i >= 0; i--) {
            const c = this._active[i];

            if (c.state === 'flying') {
                // Ballistic arc with air drag
                c.vy -= GRAVITY * dt;
                c.vx *= (1 - 1.5 * dt); // air friction for natural arc
                c.vz *= (1 - 1.5 * dt);
                c.x += c.vx * dt;
                c.y += c.vy * dt;
                c.z += c.vz * dt;

                // Tumble spin while flying (chaotic, fun)
                c.mesh.rotation.y += 12 * dt;

                c.mesh.position.set(c.x, c.y, c.z);

                // Spawn pop — overshoot scale then settle
                if (c.spawnTimer > 0) {
                    c.spawnTimer -= dt;
                    const t = 1 - (c.spawnTimer / SPAWN_POP_DURATION);
                    // Elastic ease out: overshoot then settle
                    const elastic = t < 0.5
                        ? COIN_SCALE * (1 + (SPAWN_POP_SCALE - 1) * (1 - t * 2))
                        : COIN_SCALE;
                    c.mesh.scale.setScalar(elastic);
                }

                // Transition to hover when falling past hover height
                if (c.y <= HOVER_Y && c.vy < 0) {
                    c.y = HOVER_Y;
                    c.state = 'hovering';
                    c.mesh.position.y = HOVER_Y;
                    // Store final x/z as the hover position
                    c.hoverX = c.x;
                    c.hoverZ = c.z;
                }

            } else if (c.state === 'hovering') {
                c.life -= dt;

                // === THE MARIO SPIN ===
                // Smooth Y-axis rotation — the classic coin spin
                c.mesh.rotation.y = elapsedTime * SPIN_SPEED + c.spinOffset;

                // === SMOOTH BOB ===
                const bobPhase = elapsedTime * BOB_FREQ * Math.PI * 2 + c.bobOffset;
                const bob = Math.sin(bobPhase);
                c.mesh.position.y = HOVER_Y + bob * BOB_AMP;

                // === SQUASH & STRETCH ===
                // Subtle vertical squash at bottom of bob, stretch at top
                const squash = 1 + bob * SQUASH_AMP;
                c.mesh.scale.set(
                    COIN_SCALE / squash,  // wider when squashed
                    COIN_SCALE * squash,  // taller when stretched
                    COIN_SCALE / squash
                );

                // === EMISSIVE PULSE ===
                // Shimmer synced to spin — brighter when face is toward camera
                const spinAngle = c.mesh.rotation.y % (Math.PI * 2);
                const faceFactor = Math.abs(Math.cos(spinAngle));
                const emissive = 0.35 + faceFactor * 0.45;
                const coinMesh = c.mesh.children[0];
                if (coinMesh?.material) coinMesh.material.emissiveIntensity = emissive;

                // === EXPIRY WARNING ===
                if (c.life <= BLINK_TIME) {
                    const urgencyT = 1 - c.life / BLINK_TIME; // 0→1 as expiry approaches

                    // Speed up spin as time runs out (urgency!)
                    const urgency = 1 + urgencyT * 3;
                    c.mesh.rotation.y = elapsedTime * SPIN_SPEED * urgency + c.spinOffset;

                    // Smooth pulsing glow — sine wave that speeds up over time
                    const pulseHz = 2 + urgencyT * 6; // 2 Hz → 8 Hz
                    const pulse = Math.sin(elapsedTime * pulseHz * Math.PI * 2);
                    const pulseNorm = pulse * 0.5 + 0.5; // 0→1

                    // Opacity: smooth sine pulse, floor rises so it never fully vanishes
                    const opacityFloor = 0.4 - urgencyT * 0.15; // 0.4 → 0.25
                    const opacity = opacityFloor + (1 - opacityFloor) * pulseNorm;

                    // Emissive color shift: gold → warm orange/red as time runs out
                    const r = 1.0;
                    const g = 0.67 - urgencyT * 0.35; // orange → reddish
                    const b = 0.0;

                    c.mesh.traverse(child => {
                        if (child.isMesh) {
                            child.material.transparent = true;
                            child.material.opacity = opacity;
                            child.material.emissiveIntensity = 0.5 + pulseNorm * 0.8;
                            child.material.emissive.setRGB(r, g, b);
                        }
                    });

                    // Scale pulse — gentle breathe synced to glow
                    const breathe = 1 + pulseNorm * 0.12 * (1 + urgencyT);
                    c.mesh.scale.setScalar(COIN_SCALE * breathe);

                    // Final shrink + fade in last 0.5s
                    if (c.life <= 0.5) {
                        const shrink = c.life / 0.5;
                        c.mesh.scale.setScalar(COIN_SCALE * shrink);
                        c.mesh.traverse(child => {
                            if (child.isMesh) {
                                child.material.opacity = shrink;
                            }
                        });
                    }
                }

                // Expired
                if (c.life <= 0) {
                    this._removeCoin(i, scene);
                    continue;
                }

            } else if (c.state === 'magnetPull') {
                c.collectProgress += dt / MAGNET_DURATION;
                if (c.collectProgress >= 1) {
                    this._removeCoin(i, scene);
                    continue;
                }
                const t = c.collectProgress;
                // Smooth ease-in-out for satisfying pull
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

                // Arc path: start → high midpoint → magnet
                const sx = c.collectStartPos.x, sy = c.collectStartPos.y, sz = c.collectStartPos.z;
                const tx = c.collectTarget.x, tz = c.collectTarget.z;
                const midY = Math.max(sy, 1.5) + 1.0; // arc peaks above both points

                // Quadratic bezier
                const oneMinE = 1 - ease;
                c.mesh.position.set(
                    oneMinE * oneMinE * sx + 2 * oneMinE * ease * ((sx + tx) / 2) + ease * ease * tx,
                    oneMinE * oneMinE * sy + 2 * oneMinE * ease * midY + ease * ease * 0.4,
                    oneMinE * oneMinE * sz + 2 * oneMinE * ease * ((sz + tz) / 2) + ease * ease * tz
                );

                // Accelerating spin — faster as it approaches the magnet
                c.mesh.rotation.y += (15 + ease * 30) * dt;

                // Shrink as it arrives — "absorbed" into the magnet
                const shrink = 1 - ease * ease * 0.7;
                c.mesh.scale.setScalar(COIN_SCALE * shrink);
            }
        }
    }

    magnetCollect(magnetX, magnetZ, range, scene) {
        let totalValue = 0;
        const r2 = range * range;

        for (let i = 0; i < this._active.length; i++) {
            const c = this._active[i];
            if (c.state !== 'hovering') continue;
            const dx = c.x - magnetX;
            const dz = c.z - magnetZ;
            if (dx * dx + dz * dz <= r2) {
                totalValue += c.value;
                c.state = 'magnetPull';
                c.collectProgress = 0;
                c.collectStartPos = {
                    x: c.mesh.position.x,
                    y: c.mesh.position.y,
                    z: c.mesh.position.z,
                };
                c.collectTarget = { x: magnetX, z: magnetZ };
            }
        }

        return totalValue;
    }

    getGroundCoinCount() {
        let count = 0;
        for (const c of this._active) {
            if (c.state === 'hovering') count++;
        }
        return count;
    }

    getGroundCoinValue() {
        let value = 0;
        for (const c of this._active) {
            if (c.state === 'hovering') value += c.value;
        }
        return value;
    }

    clear(scene) {
        for (let i = this._active.length - 1; i >= 0; i--) {
            this._removeCoin(i, scene);
        }
    }

    getStats() {
        return {
            ...this._stats,
            poolSize: this._pool.length,
            activeCount: this._active.length,
        };
    }

    // ── Private ──

    _createCoinMesh() {
        const group = new THREE.Group();

        // Inner pivot — rotated 90° on X so the coin stands upright
        const pivot = new THREE.Group();
        pivot.rotation.x = Math.PI / 2; // flat face now vertical

        const coin = new THREE.Mesh(this._coinGeo, this._coinMat.clone());
        coin.castShadow = false;
        coin.receiveShadow = false;
        pivot.add(coin);

        // Stamp detail on front face
        const stampFront = new THREE.Mesh(this._stampGeo, this._stampMat.clone());
        stampFront.position.y = 0.04;
        stampFront.castShadow = false;
        stampFront.receiveShadow = false;
        pivot.add(stampFront);

        // Stamp detail on back face
        const stampBack = new THREE.Mesh(this._stampGeo, this._stampMat.clone());
        stampBack.position.y = -0.04;
        stampBack.castShadow = false;
        stampBack.receiveShadow = false;
        pivot.add(stampBack);

        // Ring detail on front
        const ringFront = new THREE.Mesh(this._ringGeo, this._ringMat.clone());
        ringFront.position.y = 0.04;
        ringFront.castShadow = false;
        ringFront.receiveShadow = false;
        pivot.add(ringFront);

        // Ring detail on back
        const ringBack = new THREE.Mesh(this._ringGeo, this._ringMat.clone());
        ringBack.position.y = -0.04;
        ringBack.castShadow = false;
        ringBack.receiveShadow = false;
        pivot.add(ringBack);

        group.add(pivot);
        group.scale.set(COIN_SCALE, COIN_SCALE, COIN_SCALE);
        group.visible = false;
        return group;
    }

    _acquireMesh() {
        if (this._pool.length > 0) {
            this._stats.hits++;
            return this._pool.pop();
        }
        this._stats.misses++;
        return this._createCoinMesh();
    }

    _removeCoin(index, scene) {
        const c = this._active[index];
        scene.remove(c.mesh);
        c.mesh.visible = false;
        c.mesh.traverse(child => {
            if (child.isMesh) {
                child.material.transparent = false;
                child.material.opacity = 1;
                // Reset emissive back to gold (expiry warning shifts it orange/red)
                child.material.emissive.setHex(
                    child.material.color.getHex() === 0xffd700 ? 0xffaa00 :
                    child.material.color.getHex() === 0xdaa520 ? 0xcc8800 : 0xddaa00
                );
                child.material.emissiveIntensity =
                    child.material.color.getHex() === 0xffd700 ? 0.6 :
                    child.material.color.getHex() === 0xdaa520 ? 0.4 : 0.3;
            }
        });
        c.mesh.scale.set(COIN_SCALE, COIN_SCALE, COIN_SCALE);
        c.mesh.rotation.set(0, 0, 0);
        this._pool.push(c.mesh);
        this._active.splice(index, 1);
    }
}
