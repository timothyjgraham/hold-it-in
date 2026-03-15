// ForestEnvironmentModels.js — Low-poly 3D forest environment for "Hold It In"
// Forest scenario: dirt path through dense woods, outhouse replaces bathroom.
// All functions return THREE.Group objects with toon materials.

import { PALETTE } from '../data/palette.js';
import { toonMat, matWood, matDark, matInk, outlineMatStatic } from '../shaders/toonMaterials.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Simple seeded-ish random for consistent placement (not truly seeded, but stable per session) */
function rand(min, max) {
    return min + Math.random() * (max - min);
}

function randPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─── 1. Forest Ground ───────────────────────────────────────────────────────

export function createForestGround() {
    const group = new THREE.Group();
    group.name = 'forestGround';

    const grassGeo = new THREE.PlaneGeometry(160, 160);
    const grassMat = toonMat(PALETTE.forestGrass);

    // Inject procedural simplex noise into the toon shader for organic,
    // seamless ground variation — no canvas texture, no tiling artifacts.
    grassMat.onBeforeCompile = (shader) => {
        // Pass world position from vertex → fragment shader
        shader.vertexShader = shader.vertexShader.replace(
            'void main() {',
            'varying vec3 vWorldPos;\nvoid main() {'
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>',
            '#include <project_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
        );

        // Inject simplex noise function before main()
        shader.fragmentShader = shader.fragmentShader.replace(
            'void main() {',
            `varying vec3 vWorldPos;
vec3 mod289v(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289v2(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permutev(vec3 x){return mod289v(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289v2(i);
  vec3 p=permutev(permutev(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m;m=m*m;
  vec3 xn=2.0*fract(p*C.www)-1.0;vec3 h=abs(xn)-0.5;
  vec3 ox=floor(xn+0.5);vec3 a0=xn-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
void main() {`
        );

        // Modulate diffuse color with multi-octave noise
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>
vec2 nc=vWorldPos.xz*0.1;
float n1=snoise(nc)*0.5+0.5;
float n2=snoise(nc*2.8+42.0)*0.5+0.5;
float n3=snoise(nc*7.5+100.0)*0.5+0.5;
float blend=n1*0.55+n2*0.3+n3*0.15;
diffuseColor.rgb*=0.93+blend*0.14;
diffuseColor.g+=blend*0.01;`
        );
    };

    const grassPlane = new THREE.Mesh(grassGeo, grassMat);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.position.set(0, -0.05, 35);
    grassPlane.receiveShadow = true;
    group.add(grassPlane);

    return group;
}

// ─── 1b. Cross-Billboard Grass Tufts ────────────────────────────────────────

/** Paint a grass-tuft silhouette onto a canvas — soft, rounded blade shapes */
function _createGrassTuftTexture() {
    const S = 128;
    const cvs = document.createElement('canvas');
    cvs.width = S;
    cvs.height = S;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, S, S);

    const hex = (c) => '#' + c.toString(16).padStart(6, '0');
    const darkCol  = hex(PALETTE.forestLeafDark);
    const midCol   = hex(PALETTE.forestGrass);
    const tipCol   = hex(PALETTE.forestBush);

    // 5 blades fanning from bottom center — rounded, soft shapes
    const blades = [
        { cx: 0.35, angle: -0.32, h: 0.65, w: 0.11 },
        { cx: 0.43, angle: -0.12, h: 0.78, w: 0.13 },
        { cx: 0.50, angle:  0.02, h: 0.85, w: 0.14 },
        { cx: 0.57, angle:  0.14, h: 0.75, w: 0.12 },
        { cx: 0.65, angle:  0.30, h: 0.60, w: 0.10 },
    ];

    for (const b of blades) {
        ctx.save();
        ctx.translate(b.cx * S, S);
        ctx.rotate(b.angle);

        const h = b.h * S;
        const w = b.w * S;

        // Gradient: dark base → mid → bright tip
        const grad = ctx.createLinearGradient(0, 0, 0, -h);
        grad.addColorStop(0, darkCol);
        grad.addColorStop(0.4, midCol);
        grad.addColorStop(1.0, tipCol);
        ctx.fillStyle = grad;

        // Soft rounded blade with bezier curves — no sharp points
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.bezierCurveTo(-w * 0.45, -h * 0.35, -w * 0.2, -h * 0.75, 0, -h + 2);
        ctx.bezierCurveTo( w * 0.2, -h * 0.75,  w * 0.45, -h * 0.35, w / 2, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    return new THREE.CanvasTexture(cvs);
}

export function createForestGrassTufts() {
    const group = new THREE.Group();
    group.name = 'forestGrassTufts';

    const grassTex = _createGrassTuftTexture();

    // Toon gradient ramp (same values as toonMaterials.js)
    const gradData = new Uint8Array([89, 217, 255]);
    const gradTex = new THREE.DataTexture(gradData, 3, 1, THREE.LuminanceFormat);
    gradTex.minFilter = THREE.NearestFilter;
    gradTex.magFilter = THREE.NearestFilter;
    gradTex.needsUpdate = true;

    // Toon material with alpha cutout for crisp toon edges
    const turfMat = new THREE.MeshToonMaterial({
        map: grassTex,
        alphaTest: 0.4,
        side: THREE.DoubleSide,
        gradientMap: gradTex,
    });

    // Plane geometry with bottom-pivot (shift vertices up so y=0 is the base)
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const posArr = planeGeo.attributes.position;
    for (let i = 0; i < posArr.count; i++) {
        posArr.setY(i, posArr.getY(i) + 0.5);
    }
    posArr.needsUpdate = true;

    const tufts = [];

    // Helper: place a single tuft at (tx, tz) with scale s
    function placeTuft(tx, tz, s) {
        const tuft = new THREE.Group();

        const p1 = new THREE.Mesh(planeGeo, turfMat);
        p1.scale.set(s, s, 1);
        p1.receiveShadow = true;
        tuft.add(p1);

        const p2 = new THREE.Mesh(planeGeo, turfMat);
        p2.rotation.y = Math.PI / 2;
        p2.scale.set(s, s, 1);
        p2.receiveShadow = true;
        tuft.add(p2);

        tuft.position.set(tx, 0, tz);
        tuft.rotation.y = Math.random() * Math.PI;
        group.add(tuft);

        tufts.push({
            mesh: tuft,
            phase: tx * 0.5 + tz * 0.3 + Math.random() * Math.PI,
            scale: s,
        });
    }

    // --- Open clearing grass (central play area) ---
    for (let i = 0; i < 90; i++) {
        let tx, tz;
        do {
            tx = rand(-16, 16);
            tz = rand(-3, 72);
        } while (Math.abs(tx) < 3.5 && tz < 9 && tz > -1); // skip outhouse

        const r = Math.random();
        let s;
        if (r < 0.35)      s = rand(2.0, 2.8);
        else if (r < 0.75)  s = rand(2.8, 3.8);
        else                s = rand(3.6, 4.5);

        placeTuft(tx, tz, s);
    }

    // --- Under-tree / forest interior grass (extends into tree bands) ---
    for (let i = 0; i < 80; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const tx = side * rand(14, 45);
        const tz = rand(-5, 75);

        // Smaller & sparser under dense canopy
        const r = Math.random();
        let s;
        if (r < 0.5)       s = rand(1.4, 2.2);
        else if (r < 0.85)  s = rand(2.2, 3.0);
        else                s = rand(2.8, 3.5);

        placeTuft(tx, tz, s);
    }

    group.userData.tufts = tufts;
    return group;
}

// ─── 2. Forest Trees ────────────────────────────────────────────────────────

export function createForestTrees() {
    const group = new THREE.Group();
    group.name = 'forestTrees';

    const barkMat = toonMat(PALETTE.forestBark);
    const leafMat = toonMat(PALETTE.forestLeaf);
    const leafDarkMat = toonMat(PALETTE.forestLeafDark);

    // --- Helper: create a pine tree ---
    function createPine(x, z, scale) {
        const pine = new THREE.Group();
        pine.name = 'pineTree';

        const trunkH = rand(8, 14) * scale;
        const trunkR = rand(0.3, 0.5) * scale;

        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 6);
        const trunk = new THREE.Mesh(trunkGeo, barkMat);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        pine.add(trunk);

        // 2-3 stacked cones for canopy
        const coneCount = Math.random() > 0.4 ? 3 : 2;
        const canopyStart = trunkH * 0.35;
        const canopySpan = trunkH * 0.75;

        for (let i = 0; i < coneCount; i++) {
            const t = i / coneCount;
            const coneR = (2.5 - t * 0.8) * scale;
            const coneH = (3.5 - t * 0.5) * scale;
            const mat = i === 0 ? leafDarkMat : leafMat;

            const coneGeo = new THREE.ConeGeometry(coneR, coneH, 7);
            const cone = new THREE.Mesh(coneGeo, mat);
            cone.position.y = canopyStart + t * canopySpan + coneH / 2;
            cone.castShadow = true;
            cone.receiveShadow = true;
            pine.add(cone);
        }

        pine.position.set(x, 0, z);
        pine.rotation.y = Math.random() * Math.PI * 2;
        return pine;
    }

    // --- Helper: create a round deciduous tree ---
    function createDeciduous(x, z, scale) {
        const tree = new THREE.Group();
        tree.name = 'deciduousTree';

        const trunkH = rand(5, 8) * scale;
        const trunkR = rand(0.25, 0.4) * scale;

        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 6);
        const trunk = new THREE.Mesh(trunkGeo, barkMat);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Large sphere canopy
        const canopyR = rand(2, 4) * scale;
        const canopyGeo = new THREE.SphereGeometry(canopyR, 8, 8);
        const canopyMat = Math.random() > 0.5 ? leafMat : leafDarkMat;
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.y = trunkH + canopyR * 0.5;
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        tree.add(canopy);

        tree.position.set(x, 0, z);
        tree.rotation.y = Math.random() * Math.PI * 2;
        return tree;
    }

    // --- Place trees on both sides — dense wall of forest, no gaps ---
    // Path is 20 wide (x ±10), so trees start at x=12 inward edge
    for (let side = -1; side <= 1; side += 2) {
        // Inner band — tree line just beyond the path
        for (let i = 0; i < 20; i++) {
            const x = side * rand(12, 22);
            const z = rand(-5, 75);
            group.add(createPine(x, z, rand(0.7, 1.3)));
        }
        for (let i = 0; i < 10; i++) {
            const x = side * rand(12, 22);
            const z = rand(-5, 75);
            group.add(createDeciduous(x, z, rand(0.7, 1.2)));
        }

        // Middle band — dense fill
        for (let i = 0; i < 18; i++) {
            const x = side * rand(20, 35);
            const z = rand(-5, 78);
            group.add(createPine(x, z, rand(0.8, 1.4)));
        }
        for (let i = 0; i < 10; i++) {
            const x = side * rand(20, 35);
            const z = rand(-5, 78);
            group.add(createDeciduous(x, z, rand(0.8, 1.3)));
        }

        // Outer band — fills to camera edges
        for (let i = 0; i < 15; i++) {
            const x = side * rand(32, 50);
            const z = rand(-8, 80);
            group.add(createPine(x, z, rand(0.9, 1.5)));
        }
        for (let i = 0; i < 8; i++) {
            const x = side * rand(32, 50);
            const z = rand(-8, 80);
            group.add(createDeciduous(x, z, rand(0.9, 1.4)));
        }

        // Far outer band — for wide screens
        for (let i = 0; i < 10; i++) {
            const x = side * rand(45, 65);
            const z = rand(-10, 82);
            group.add(createPine(x, z, rand(1.0, 1.6)));
        }

        // Bottom edge fill — behind/beside the outhouse (low Z)
        for (let i = 0; i < 6; i++) {
            const x = side * rand(5, 20);
            const z = rand(-8, 2);
            group.add(createPine(x, z, rand(0.8, 1.2)));
        }
        for (let i = 0; i < 4; i++) {
            const x = side * rand(5, 20);
            const z = rand(-8, 2);
            group.add(createDeciduous(x, z, rand(0.7, 1.1)));
        }
    }

    // Back tree line — behind outhouse, spanning full width
    for (let i = 0; i < 12; i++) {
        const x = rand(-40, 40);
        const z = rand(-10, -3);
        group.add(createPine(x, z, rand(0.8, 1.3)));
    }

    return group;
}

// ─── 3. Forest Bushes ───────────────────────────────────────────────────────

export function createForestBushes() {
    const group = new THREE.Group();
    group.name = 'forestBushes';

    const bushMat = toonMat(PALETTE.forestBush);
    const flowerPinkMat = toonMat(PALETTE.forestFlower);
    const flowerYellowMat = toonMat(PALETTE.forestFlowerY);

    // --- Helper: create a bush ---
    function createBush(x, z) {
        const bush = new THREE.Group();
        bush.name = 'bush';

        const sphereCount = 2 + Math.floor(Math.random() * 2); // 2-3
        for (let i = 0; i < sphereCount; i++) {
            const r = rand(0.5, 1.5);
            const geo = new THREE.SphereGeometry(r, 8, 6);
            const mesh = new THREE.Mesh(geo, bushMat);
            mesh.position.set(
                rand(-0.5, 0.5),
                r * 0.6,
                rand(-0.5, 0.5)
            );
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            bush.add(mesh);
        }

        // Chance of flowers
        if (Math.random() > 0.5) {
            const flowerCount = 2 + Math.floor(Math.random() * 4);
            const flowerMat = Math.random() > 0.5 ? flowerPinkMat : flowerYellowMat;
            for (let i = 0; i < flowerCount; i++) {
                const fGeo = new THREE.SphereGeometry(0.2, 5, 4);
                const flower = new THREE.Mesh(fGeo, flowerMat);
                flower.position.set(
                    rand(-1.2, 1.2),
                    rand(0.5, 1.6),
                    rand(-1.2, 1.2)
                );
                bush.add(flower);
            }
        }

        bush.position.set(x, 0, z);
        return bush;
    }

    // --- Helper: create a mushroom ---
    function createMushroom(x, z, sizeScale) {
        const shroom = new THREE.Group();
        shroom.name = 'mushroom';
        const sc = sizeScale || 1;

        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.18 * sc, 0.28 * sc, 1.0 * sc, 6);
        const stemMat = toonMat(PALETTE.cream);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.5 * sc;
        stem.castShadow = true;
        shroom.add(stem);

        // Cap (half-sphere)
        const capR = 0.55 * sc;
        const capGeo = new THREE.SphereGeometry(capR, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2);
        const capColor = Math.random() > 0.5 ? PALETTE.forestFlower : PALETTE.forestBark;
        const capMat = toonMat(capColor);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 1.0 * sc;
        cap.castShadow = true;
        shroom.add(cap);

        // White spots on red/pink caps
        if (capColor === PALETTE.forestFlower && Math.random() > 0.3) {
            const spotMat = toonMat(PALETTE.cream);
            const spotCount = 3 + Math.floor(Math.random() * 4);
            for (let sp = 0; sp < spotCount; sp++) {
                const spotGeo = new THREE.CircleGeometry((0.06 + Math.random() * 0.05) * sc, 5);
                const spot = new THREE.Mesh(spotGeo, spotMat);
                const theta = rand(0, Math.PI * 2);
                const phi = rand(0.2, 1.1);
                const r = capR + 0.01;
                spot.position.set(
                    Math.sin(phi) * Math.cos(theta) * r,
                    1.0 * sc + Math.cos(phi) * r,
                    Math.sin(phi) * Math.sin(theta) * r
                );
                spot.lookAt(spot.position.x * 2, spot.position.y * 2, spot.position.z * 2);
                shroom.add(spot);
            }
        }

        shroom.position.set(x, 0, z);
        shroom.rotation.y = Math.random() * Math.PI * 2;
        return shroom;
    }

    // --- Helper: create a mushroom patch (cluster of 3-7 shrooms) ---
    function createMushroomPatch(cx, cz) {
        const patch = new THREE.Group();
        patch.name = 'mushroomPatch';
        const count = 3 + Math.floor(Math.random() * 5); // 3-7

        for (let i = 0; i < count; i++) {
            // Cluster within ~2 unit radius
            const angle = Math.random() * Math.PI * 2;
            const dist = rand(0.3, 2.5);
            const mx = Math.cos(angle) * dist;
            const mz = Math.sin(angle) * dist;

            // Size variety — one big "hero" shroom per patch, rest are smaller
            const sizeScale = (i === 0) ? rand(1.5, 2.2) : rand(0.6, 1.4);

            patch.add(createMushroom(mx, mz, sizeScale));
        }

        patch.position.set(cx, 0, cz);
        return patch;
    }

    // Place bushes along path edges and scattered in the forest
    const bushCount = 30 + Math.floor(Math.random() * 11);
    for (let i = 0; i < bushCount; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * rand(10, 25);
        const z = rand(-3, 72);
        group.add(createBush(x, z));
    }

    // --- Mushroom patches — clusters dotted around the forest floor ---
    // Large patches deep in the forest
    const patchPositions = [];
    for (let i = 0; i < 8; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const px = side * rand(10, 35);
        const pz = rand(5, 68);
        patchPositions.push([px, pz]);
        group.add(createMushroomPatch(px, pz));
    }

    // Smaller scattered individual mushrooms along the path edges
    for (let i = 0; i < 10; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * rand(5, 18);
        const z = rand(8, 68);
        group.add(createMushroom(x, z, rand(0.8, 1.4)));
    }

    return group;
}

// ─── 4. Forest Rocks ────────────────────────────────────────────────────────

export function createForestRocks() {
    const group = new THREE.Group();
    group.name = 'forestRocks';

    const stoneMat = toonMat(PALETTE.forestStone);
    const mossMat = toonMat(PALETTE.forestMoss, { transparent: true, opacity: 0.7 });

    const rockCount = 10 + Math.floor(Math.random() * 6);

    for (let i = 0; i < rockCount; i++) {
        const rock = new THREE.Group();
        rock.name = 'rock';

        const size = rand(0.3, 1.5);

        // Use dodecahedron for organic look, slightly squashed
        const geo = new THREE.DodecahedronGeometry(size, 0);
        const mesh = new THREE.Mesh(geo, stoneMat);
        mesh.scale.y = rand(0.5, 0.8); // squash vertically
        mesh.position.y = size * 0.3;
        mesh.rotation.set(
            rand(-0.3, 0.3),
            rand(0, Math.PI * 2),
            rand(-0.3, 0.3)
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        rock.add(mesh);

        // Chance of moss patch on top
        if (Math.random() > 0.5) {
            const mossGeo = new THREE.PlaneGeometry(size * 0.8, size * 0.8);
            const moss = new THREE.Mesh(mossGeo, mossMat);
            moss.rotation.x = -Math.PI / 2;
            moss.position.y = size * 0.55;
            rock.add(moss);
        }

        const side = Math.random() > 0.5 ? 1 : -1;
        rock.position.set(
            side * rand(8, 30),
            0,
            rand(-3, 72)
        );

        group.add(rock);
    }

    return group;
}

// ─── 5. Outhouse ────────────────────────────────────────────────────────────

export function createOuthouse() {
    const group = new THREE.Group();
    group.name = 'outhouse';

    const plankMat = toonMat(PALETTE.forestPlanks);
    const plankDarkMat = toonMat(PALETTE.forestBark); // darker shade for bench
    const inkMat = matInk();

    // --- Floor platform (4 wide x 5 deep, extra depth so player doesn't clip front) ---
    const floorGeo = new THREE.BoxGeometry(4, 0.15, 5);
    const floorMesh = new THREE.Mesh(floorGeo, plankMat);
    floorMesh.position.set(0, 0.075, 0);
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // --- Walls (4 wide, 5 deep, 5 tall) ---
    const wallThickness = 0.12;
    const wallW = 4;
    const wallD = 5;    // depth (Z)
    const wallH = 5;
    const halfW = wallW / 2; // 2.0
    const halfD = wallD / 2; // 2.5
    const wallCenterY = 0.15 + wallH / 2; // 2.65

    // Back wall (full)
    const backWallGeo = new THREE.BoxGeometry(wallW, wallH, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, plankMat);
    backWall.position.set(0, wallCenterY, -halfD + wallThickness / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);

    // Left wall (full)
    const sideWallGeo = new THREE.BoxGeometry(wallThickness, wallH, wallD);
    const leftWall = new THREE.Mesh(sideWallGeo, plankMat);
    leftWall.position.set(-halfW + wallThickness / 2, wallCenterY, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    group.add(leftWall);

    // Right wall (full)
    const rightWall = new THREE.Mesh(sideWallGeo, plankMat);
    rightWall.position.set(halfW - wallThickness / 2, wallCenterY, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    group.add(rightWall);

    // Front wall — two panels flanking the door opening (2.4 unit gap)
    const doorOpening = 2.4;
    const panelW = (wallW - doorOpening) / 2; // 0.8
    const frontPanelGeo = new THREE.BoxGeometry(panelW, wallH, wallThickness);
    const frontLeft = new THREE.Mesh(frontPanelGeo, plankMat);
    frontLeft.position.set(-halfW + panelW / 2, wallCenterY, halfD - wallThickness / 2);
    frontLeft.castShadow = true;
    group.add(frontLeft);

    const frontRight = new THREE.Mesh(frontPanelGeo, plankMat);
    frontRight.position.set(halfW - panelW / 2, wallCenterY, halfD - wallThickness / 2);
    frontRight.castShadow = true;
    group.add(frontRight);

    // Transom above door (2.4 wide, 0.5 tall)
    const transomGeo = new THREE.BoxGeometry(doorOpening, 0.5, wallThickness);
    const transom = new THREE.Mesh(transomGeo, plankMat);
    transom.position.set(0, 0.15 + wallH - 0.25, halfD - wallThickness / 2);
    transom.castShadow = true;
    group.add(transom);

    // --- Plank gap details (thin dark lines between planks) ---
    const gapMat = matDark();
    function addPlankGaps(parent, width, height, posZ, isVertical) {
        const gapCount = Math.floor(height / 1.0);
        for (let i = 1; i < gapCount; i++) {
            const gapGeo = isVertical
                ? new THREE.BoxGeometry(width + 0.02, 0.02, 0.01)
                : new THREE.BoxGeometry(0.02, height + 0.02, 0.01);
            const gap = new THREE.Mesh(gapGeo, gapMat);
            if (isVertical) {
                gap.position.set(0, 0.15 + i * 1.0, posZ + 0.07);
            }
            parent.add(gap);
        }
    }

    // Horizontal plank lines on back wall
    for (let i = 1; i <= 4; i++) {
        const gapGeo = new THREE.BoxGeometry(wallW - 0.1, 0.02, 0.01);
        const gap = new THREE.Mesh(gapGeo, gapMat);
        gap.position.set(0, 0.15 + i * 1.0, -halfD + wallThickness + 0.01);
        group.add(gap);
    }

    // --- Roof removed — invisible so player can see inside the outhouse ---

    // --- Interior: bench/seat ---
    const benchGeo = new THREE.BoxGeometry(3.2, 0.15, 1.2);
    const bench = new THREE.Mesh(benchGeo, plankDarkMat);
    bench.position.set(0, 1.0, -1.0);
    bench.receiveShadow = true;
    group.add(bench);

    // Bench front face
    const benchFrontGeo = new THREE.BoxGeometry(3.2, 0.85, 0.1);
    const benchFront = new THREE.Mesh(benchFrontGeo, plankDarkMat);
    benchFront.position.set(0, 0.575, -0.45);
    group.add(benchFront);

    // Hole in bench (dark cylinder going down)
    const holeGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 8);
    const holeMat = matInk();
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(0, 0.95, -1.0);
    group.add(hole);

    // --- Lantern / candle providing warm light ---
    // Small lantern body
    const lanternGeo = new THREE.BoxGeometry(0.15, 0.25, 0.15);
    const lanternMat = toonMat(PALETTE.forestSunbeam);
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(-1.2, 1.3, -1.6);
    group.add(lantern);

    // Warm point light
    const lanternLight = new THREE.PointLight(PALETTE.forestSunbeam, 0.5, 10);
    lanternLight.position.set(-1.2, 1.6, -1.6);
    group.add(lanternLight);

    // --- Moon cutout decoration (small yellow circle on transom area) ---
    const moonGeo = new THREE.CircleGeometry(0.22, 8);
    const moonMat = toonMat(PALETTE.forestSunbeam, {
        emissive: PALETTE.forestSunbeam,
        emissiveIntensity: 0.4,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(0, 0.15 + wallH - 0.25, halfD - wallThickness / 2 + 0.07);
    group.add(moon);

    // Position the outhouse at the toilet location
    group.position.set(0, 0, 3);

    return group;
}

// ─── 6. Outhouse Door ───────────────────────────────────────────────────────

export function createOuthouseDoor() {
    const group = new THREE.Group();
    group.name = 'outhouseDoor';

    const doorColor = PALETTE.forestPlanks;

    const doorMat = toonMat(doorColor, {
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
    });
    doorMat.depthWrite = false;

    // --- Door panel (wider + taller to match bigger outhouse) ---
    const doorGeo = new THREE.BoxGeometry(2.4, 4.5, 0.1);
    const doorPanel = new THREE.Mesh(doorGeo, doorMat);
    doorPanel.position.set(0, 2.4, 0);
    doorPanel.castShadow = false;
    doorPanel.receiveShadow = false;
    group.add(doorPanel);

    // --- Horizontal plank lines on door ---
    const plankLineMat = matDark();
    for (let i = 1; i <= 4; i++) {
        const lineGeo = new THREE.BoxGeometry(2.3, 0.02, 0.01);
        const line = new THREE.Mesh(lineGeo, plankLineMat);
        line.position.set(0, 0.3 + i * 1.0, 0.06);
        group.add(line);
    }

    // --- Moon cutout circle (yellow circle on upper third of door) ---
    const moonGeo = new THREE.CircleGeometry(0.22, 8);
    const moonMat = toonMat(PALETTE.forestSunbeam, {
        emissive: PALETTE.forestSunbeam,
        emissiveIntensity: 0.5,
    });
    const moonCutout = new THREE.Mesh(moonGeo, moonMat);
    moonCutout.position.set(0, 3.8, 0.06);
    group.add(moonCutout);

    // --- Rustic handle (wooden peg) ---
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6);
    const handleMat = toonMat(PALETTE.forestBark);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.85, 2.2, 0.15);
    group.add(handle);

    // --- Hinges (two small dark cylinders on left side) ---
    const hingeMat = matInk();
    for (let i = 0; i < 2; i++) {
        const hingeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6);
        const hinge = new THREE.Mesh(hingeGeo, hingeMat);
        hinge.position.set(-1.15, 1.2 + i * 2.4, 0.06);
        group.add(hinge);

        // Hinge plate (small dark box)
        const plateGeo = new THREE.BoxGeometry(0.2, 0.1, 0.02);
        const plate = new THREE.Mesh(plateGeo, hingeMat);
        plate.position.set(-1.05, 1.2 + i * 2.4, 0.055);
        group.add(plate);
    }

    // --- Crack / damage overlay meshes (Fortnite-style 3-layer glow) ---
    // Three layers per segment: soft halo → dark outline → bright glow center
    const crackDarkMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.9 });
    const crackGlowMat = new THREE.MeshBasicMaterial({ color: PALETTE.glow, transparent: true, opacity: 0.85 });
    const crackHaloMat = new THREE.MeshBasicMaterial({ color: PALETTE.glow, transparent: true, opacity: 0.25 });
    const cracks = [];

    function buildCrack(segments, zBase) {
        const crackGroup = new THREE.Group();
        for (const seg of segments) {
            const haloGeo = new THREE.BoxGeometry(seg.w * 1.6, seg.h * 4, 0.01);
            const haloMesh = new THREE.Mesh(haloGeo, crackHaloMat);
            haloMesh.position.set(seg.x, seg.y, zBase - 0.003);
            if (seg.rot) haloMesh.rotation.z = seg.rot;
            crackGroup.add(haloMesh);

            const darkGeo = new THREE.BoxGeometry(seg.w * 1.2, seg.h * 2.5, 0.01);
            const darkMesh = new THREE.Mesh(darkGeo, crackDarkMat);
            darkMesh.position.set(seg.x, seg.y, zBase);
            if (seg.rot) darkMesh.rotation.z = seg.rot;
            crackGroup.add(darkMesh);

            const glowGeo = new THREE.BoxGeometry(seg.w, seg.h * 1.5, 0.01);
            const glowMesh = new THREE.Mesh(glowGeo, crackGlowMat);
            glowMesh.position.set(seg.x, seg.y, zBase + 0.003);
            if (seg.rot) glowMesh.rotation.z = seg.rot;
            crackGroup.add(glowMesh);
        }
        crackGroup.visible = false;
        return crackGroup;
    }

    // Crack 0 — upper left (HP ≤ 80%)
    const crack0 = buildCrack([
        { x: -0.5, y: 2.8, w: 0.42, h: 0.08, rot: 0.3 },
        { x: -0.35, y: 2.7, w: 0.32, h: 0.08, rot: -0.5 },
        { x: -0.25, y: 2.6, w: 0.25, h: 0.07, rot: 0.15 },
        { x: -0.6, y: 2.72, w: 0.2, h: 0.07, rot: -0.3 },
        { x: -0.15, y: 2.55, w: 0.2, h: 0.06, rot: 0.55 },
    ], 0.06);
    crack0.name = 'crack_0';
    group.add(crack0);
    cracks.push(crack0);

    // Crack 1 — center right (HP ≤ 60%)
    const crack1 = buildCrack([
        { x: 0.4, y: 1.9, w: 0.48, h: 0.08, rot: -0.2 },
        { x: 0.6, y: 1.8, w: 0.38, h: 0.08, rot: 0.5 },
        { x: 0.3, y: 2.0, w: 0.25, h: 0.07, rot: -0.4 },
        { x: 0.7, y: 1.72, w: 0.22, h: 0.07, rot: -0.1 },
        { x: 0.25, y: 1.85, w: 0.2, h: 0.06, rot: 0.6 },
    ], 0.06);
    crack1.name = 'crack_1';
    group.add(crack1);
    cracks.push(crack1);

    // Crack 2 — lower center (HP ≤ 40%)
    const crack2 = buildCrack([
        { x: -0.1, y: 0.9, w: 0.55, h: 0.09, rot: 0.1 },
        { x: 0.1, y: 0.8, w: 0.42, h: 0.08, rot: -0.35 },
        { x: -0.15, y: 1.0, w: 0.3, h: 0.08, rot: 0.5 },
        { x: 0.2, y: 0.7, w: 0.25, h: 0.07, rot: -0.15 },
        { x: -0.3, y: 0.85, w: 0.22, h: 0.07, rot: 0.65 },
        { x: 0.35, y: 0.88, w: 0.18, h: 0.06, rot: -0.5 },
    ], 0.06);
    crack2.name = 'crack_2';
    group.add(crack2);
    cracks.push(crack2);

    // Crack 3 — upper right (HP ≤ 20%)
    const crack3 = buildCrack([
        { x: 0.6, y: 2.6, w: 0.38, h: 0.09, rot: -0.6 },
        { x: 0.5, y: 2.5, w: 0.3, h: 0.08, rot: 0.25 },
        { x: 0.7, y: 2.55, w: 0.25, h: 0.08, rot: -0.1 },
        { x: 0.4, y: 2.42, w: 0.22, h: 0.07, rot: 0.5 },
        { x: 0.75, y: 2.65, w: 0.18, h: 0.07, rot: -0.4 },
    ], 0.06);
    crack3.name = 'crack_3';
    group.add(crack3);
    cracks.push(crack3);

    // Crack 4 — center critical (HP ≤ 10%)
    const crack4 = buildCrack([
        { x: 0.0, y: 1.4, w: 0.6, h: 0.10, rot: 0.2 },
        { x: -0.1, y: 1.2, w: 0.42, h: 0.09, rot: -0.4 },
        { x: 0.2, y: 1.5, w: 0.38, h: 0.09, rot: 0.6 },
        { x: -0.15, y: 1.55, w: 0.3, h: 0.08, rot: -0.15 },
        { x: 0.3, y: 1.3, w: 0.25, h: 0.08, rot: -0.5 },
        { x: -0.25, y: 1.35, w: 0.2, h: 0.07, rot: 0.45 },
    ], 0.06);
    crack4.name = 'crack_4';
    group.add(crack4);
    cracks.push(crack4);

    // --- Store metadata on group.userData (matches bathroom door interface) ---
    group.userData.door = doorPanel;
    group.userData.cracks = cracks;
    group.userData.doorHP = 100;
    group.userData.maxDoorHP = 100;
    group.userData.originalColor = doorColor;

    // Position: flush with the outhouse front wall (outhouse at z=3, front wall at z=5.5)
    group.position.set(0, 0, 5.5);

    return group;
}

// ─── 7. Sunbeams — Volumetric Light Shafts ──────────────────────────────────

export function createSunbeams() {
    const group = new THREE.Group();
    group.name = 'forestSunbeams';

    const beams = [];
    const beamCount = 8 + Math.floor(Math.random() * 4); // 8-11

    // Custom shader for soft volumetric light shafts:
    // - Soft vertical gradient (bright center, fading to edges)
    // - Horizontal fade at edges for smooth blending
    // - Additive blending for light accumulation
    const beamVertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const beamFragmentShader = `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
            // Horizontal fade — strongest in center, transparent at edges
            float hFade = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 1.5);
            // Vertical: slightly brighter toward bottom where beam "hits"
            float vFade = 0.5 + 0.5 * (1.0 - vUv.y);
            // Combined soft glow
            float alpha = hFade * vFade * uOpacity;
            gl_FragColor = vec4(uColor, alpha);
        }
    `;

    for (let i = 0; i < beamCount; i++) {
        // Long shafts stretching from high above down to the ground
        const beamHeight = rand(35, 55);
        const beamWidth = rand(2.0, 5.0);

        const beamGeo = new THREE.PlaneGeometry(beamWidth, beamHeight, 1, 1);

        // Taper the top — narrow at top, wider at bottom
        const pos = beamGeo.attributes.position;
        for (let v = 0; v < pos.count; v++) {
            const y = pos.getY(v);
            if (y > 0) {
                // Top vertices — squeeze inward for cone-of-light look
                pos.setX(v, pos.getX(v) * rand(0.2, 0.4));
            }
        }
        pos.needsUpdate = true;

        const baseOpacity = rand(0.04, 0.08);
        const beamColor = new THREE.Color(PALETTE.forestSunbeam);

        const beamMat = new THREE.ShaderMaterial({
            vertexShader: beamVertexShader,
            fragmentShader: beamFragmentShader,
            uniforms: {
                uColor: { value: beamColor },
                uOpacity: { value: baseOpacity },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });

        const beam = new THREE.Mesh(beamGeo, beamMat);

        // Slight angle — light comes from upper-left
        beam.rotation.z = rand(-0.15, -0.05);
        beam.rotation.y = rand(-0.3, 0.3);

        // Position: spread across the forest, very high up so they reach from sky
        beam.position.set(
            rand(-25, 25),
            beamHeight / 2 - 2, // base near ground, top far above
            rand(8, 65)
        );

        beam.castShadow = false;
        beam.receiveShadow = false;
        beam.renderOrder = 999; // render after opaque objects
        group.add(beam);

        beams.push(beam);
    }

    group.userData.beams = beams;

    return group;
}

// ─── 8. Butterflies ─────────────────────────────────────────────────────────

export function createButterflies() {
    const group = new THREE.Group();
    group.name = 'forestButterflies';

    const butterflyColors = [PALETTE.forestFlower, PALETTE.forestFlowerY, PALETTE.cream];
    const butterflies = [];

    const count = 8 + Math.floor(Math.random() * 5); // 8-12

    for (let i = 0; i < count; i++) {
        const butterfly = new THREE.Group();
        butterfly.name = 'butterfly';

        const wingColor = randPick(butterflyColors);
        const wingMat = toonMat(wingColor, { side: THREE.DoubleSide });

        // Wing shape: small triangle via custom geometry
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(0.15, 0.1);
        wingShape.lineTo(0.12, -0.08);
        wingShape.closePath();

        const wingGeo = new THREE.ShapeGeometry(wingShape);

        // Left wing
        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.position.x = -0.02;
        leftWing.rotation.y = 0.3;
        butterfly.add(leftWing);

        // Right wing (mirrored)
        const rightWing = new THREE.Mesh(wingGeo, wingMat);
        rightWing.scale.x = -1;
        rightWing.position.x = 0.02;
        rightWing.rotation.y = -0.3;
        butterfly.add(rightWing);

        // Tiny body
        const bodyGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 4);
        const bodyMat = matInk();
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.z = Math.PI / 2;
        butterfly.add(body);

        // Random starting position — spread across wider forest
        const cx = rand(-25, 25);
        const cy = rand(1, 4);
        const cz = rand(5, 68);
        butterfly.position.set(cx, cy, cz);

        group.add(butterfly);

        butterflies.push({
            mesh: butterfly,
            phase: Math.random() * Math.PI * 2,
            speed: rand(0.3, 0.8),
            center: new THREE.Vector3(cx, cy, cz),
            radius: rand(0.5, 2.0),
            leftWing: leftWing,
            rightWing: rightWing,
        });
    }

    group.userData.butterflies = butterflies;

    return group;
}

// ─── 9. Forest Props ────────────────────────────────────────────────────────

export function createForestProps() {
    const group = new THREE.Group();
    group.name = 'forestProps';

    const barkMat = toonMat(PALETTE.forestBark);
    const stoneMat = toonMat(PALETTE.forestStone);
    const stumpMat = toonMat(PALETTE.forestBark);

    // --- Fallen logs ---
    for (let i = 0; i < 3; i++) {
        const logLength = rand(3, 6);
        const logRadius = rand(0.2, 0.5);
        const logGeo = new THREE.CylinderGeometry(logRadius, logRadius * 1.1, logLength, 6);
        const log = new THREE.Mesh(logGeo, barkMat);

        // Lying on ground at angle
        log.rotation.z = Math.PI / 2;
        log.rotation.y = rand(-0.5, 0.5);
        log.position.set(
            (i === 0 ? -1 : 1) * rand(12, 25),
            logRadius * 0.8,
            rand(15, 55)
        );
        log.castShadow = true;
        log.receiveShadow = true;
        group.add(log);
    }

    // --- Campfire near the outhouse ---
    const campfire = new THREE.Group();
    campfire.name = 'campfire';

    // Ring of stones
    const stoneCount = 8;
    for (let i = 0; i < stoneCount; i++) {
        const angle = (i / stoneCount) * Math.PI * 2;
        const stoneGeo = new THREE.SphereGeometry(rand(0.12, 0.18), 5, 4);
        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.position.set(
            Math.cos(angle) * 0.6,
            0.1,
            Math.sin(angle) * 0.6
        );
        stone.scale.y = 0.7;
        campfire.add(stone);
    }

    // Pile of sticks (thin cylinders crossed)
    for (let i = 0; i < 5; i++) {
        const stickGeo = new THREE.CylinderGeometry(0.02, 0.025, rand(0.6, 0.9), 4);
        const stick = new THREE.Mesh(stickGeo, barkMat);
        stick.position.set(
            rand(-0.15, 0.15),
            0.2 + i * 0.05,
            rand(-0.15, 0.15)
        );
        stick.rotation.z = rand(-0.8, 0.8);
        stick.rotation.x = rand(-0.5, 0.5);
        campfire.add(stick);
    }

    // Orange/yellow glow cone above fire
    const glowGeo = new THREE.ConeGeometry(0.4, 1.2, 6, 1, true);
    const glowMat = toonMat(PALETTE.forestSunbeam, {
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
    });
    glowMat.depthWrite = false;
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.7;
    campfire.add(glow);

    // Campfire point light
    const fireLight = new THREE.PointLight(PALETTE.forestSunbeam, 0.4, 6);
    fireLight.position.y = 0.5;
    campfire.add(fireLight);

    campfire.position.set(3, 0, 5);
    group.add(campfire);

    // --- Tree stumps ---
    for (let i = 0; i < 3; i++) {
        const stumpR = rand(0.3, 0.6);
        const stumpH = rand(0.2, 0.5);
        const stumpGeo = new THREE.CylinderGeometry(stumpR, stumpR * 1.1, stumpH, 7);
        const stump = new THREE.Mesh(stumpGeo, stumpMat);
        stump.position.set(
            (Math.random() > 0.5 ? 1 : -1) * rand(12, 25),
            stumpH / 2,
            rand(10, 60)
        );
        stump.castShadow = true;
        stump.receiveShadow = true;
        group.add(stump);
    }

    // --- Small wooden sign post ---
    const signPost = new THREE.Group();
    signPost.name = 'signPost';

    // Post
    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.0, 6);
    const post = new THREE.Mesh(postGeo, barkMat);
    post.position.y = 1.0;
    post.castShadow = true;
    signPost.add(post);

    // Sign board
    const boardGeo = new THREE.BoxGeometry(1.0, 0.5, 0.06);
    const boardMat = toonMat(PALETTE.forestPlanks);
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 1.8, 0);
    board.rotation.y = 0.15;
    board.castShadow = true;
    signPost.add(board);

    signPost.position.set(-5, 0, 10);
    group.add(signPost);

    return group;
}
