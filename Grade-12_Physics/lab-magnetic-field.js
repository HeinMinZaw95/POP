/* ==========================================================================
   Grade 12 Physics Lab: 3D Magnetic Field & Two-Magnet Interaction (Three.js)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('physics-canvas');
    if (!canvas) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060608);

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 5.5, 7.5);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
    }

    // Resize Handler
    window.addEventListener('resize', () => {
        if (!canvas) return;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    // 2. Lighting & Reference Grid
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(12, 16, 0x2a2a35, 0x16161d);
    gridHelper.position.y = -0.6;
    scene.add(gridHelper);

    // 3. Helper Function to Create 3D Bar Magnet with N / S Labels
    function createBarMagnet() {
        const magnetGroup = new THREE.Group();
        const halfLen = 0.75;
        const width = 0.55;
        const height = 0.4;

        // North Pole (Red - +X side by default)
        const northGeo = new THREE.BoxGeometry(halfLen, height, width);
        const northMat = new THREE.MeshStandardMaterial({ color: 0xee1c4b, roughness: 0.3, metalness: 0.2 });
        const northMesh = new THREE.Mesh(northGeo, northMat);
        northMesh.position.x = halfLen / 2;

        // South Pole (Blue - -X side by default)
        const southGeo = new THREE.BoxGeometry(halfLen, height, width);
        const southMat = new THREE.MeshStandardMaterial({ color: 0x0088ff, roughness: 0.3, metalness: 0.2 });
        const southMesh = new THREE.Mesh(southGeo, southMat);
        southMesh.position.x = -halfLen / 2;

        // Create Canvas Label Texture ("S" on left, "N" on right)
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256;
        labelCanvas.height = 128;
        const ctx = labelCanvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 256, 128);
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('S', 64, 64);
        ctx.fillText('N', 192, 64);

        const labelTex = new THREE.CanvasTexture(labelCanvas);
        const labelPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(halfLen * 2, width),
            new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
        );
        labelPlane.rotation.x = -Math.PI / 2;
        labelPlane.position.y = height / 2 + 0.01;

        magnetGroup.add(northMesh, southMesh, labelPlane);
        return magnetGroup;
    }

    const magnet1 = createBarMagnet(); // Left Magnet: [-S | N+]
    const magnet2 = createBarMagnet(); // Right Magnet
    scene.add(magnet1, magnet2);

    // Force Vector Arrows on Magnets
    const forceArrow1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.5, 0), 1, 0x00ffcc, 0.25, 0.18);
    const forceArrow2 = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0.5, 0), 1, 0x00ffcc, 0.25, 0.18);
    scene.add(forceArrow1, forceArrow2);

    // 4. 3D Compass Needle Grid
    const compassGroup = new THREE.Group();
    scene.add(compassGroup);
    const compassNeedles = [];

    function buildCompassGrid() {
        const needleGeo = new THREE.ConeGeometry(0.06, 0.28, 8);
        needleGeo.rotateX(Math.PI / 2); // Point along +Z locally so lookAt works cleanly

        for (let x = -4.5; x <= 4.5; x += 1.0) {
            for (let z = -3.5; z <= 3.5; z += 1.0) {
                const holder = new THREE.Group();
                holder.position.set(x, -0.35, z);

                const northTip = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0xee1c4b }));
                northTip.position.z = 0.14;

                const southTip = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0x8899aa }));
                southTip.rotation.y = Math.PI;
                southTip.position.z = -0.14;

                holder.add(northTip, southTip);
                compassGroup.add(holder);
                compassNeedles.push(holder);
            }
        }
    }
    buildCompassGrid();

    // 5. Dynamic 3D Field Lines Group & Flow Particles
    const fieldLinesGroup = new THREE.Group();
    scene.add(fieldLinesGroup);

    const flowParticles = [];
    const particleGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    let activeCurves = [];

    // 6. State Variables
    let mode = 'attract'; // 'attract', 'repel', 'single'
    let distance = 3.0;   // Center-to-center distance
    let poleStrength = 5.0;
    const poleOffset = 0.65; // Distance from magnet center to its internal monopole

    // Physics Calculation: Magnetic Field Vector B at any 3D point P
    function getMagneticFieldAt(point) {
        const B = new THREE.Vector3(0, 0, 0);
        const poles = [];

        // Magnet 1 poles (South at -X, North at +X)
        const m1X = magnet1.position.x;
        poles.push({ pos: new THREE.Vector3(m1X + poleOffset, 0, 0), q: +poleStrength }); // N
        poles.push({ pos: new THREE.Vector3(m1X - poleOffset, 0, 0), q: -poleStrength }); // S

        // Magnet 2 poles
        if (mode !== 'single') {
            const m2X = magnet2.position.x;
            if (mode === 'attract') {
                // Facing South (-X) to Magnet 1's North (+X)
                poles.push({ pos: new THREE.Vector3(m2X + poleOffset, 0, 0), q: +poleStrength }); // N
                poles.push({ pos: new THREE.Vector3(m2X - poleOffset, 0, 0), q: -poleStrength }); // S
            } else if (mode === 'repel') {
                // Facing North (-X) to Magnet 1's North (+X)
                poles.push({ pos: new THREE.Vector3(m2X - poleOffset, 0, 0), q: +poleStrength }); // N
                poles.push({ pos: new THREE.Vector3(m2X + poleOffset, 0, 0), q: -poleStrength }); // S
            }
        }

        const diff = new THREE.Vector3();
        for (let i = 0; i < poles.length; i++) {
            diff.subVectors(point, poles[i].pos);
            const rSq = diff.lengthSq();
            if (rSq < 0.04) continue; // Avoid singularity inside pole
            const invR3 = poles[i].q / (rSq * Math.sqrt(rSq));
            B.addScaledVector(diff, invR3);
        }
        return B;
    }

    // Trace a single field line starting near a North Pole
    function traceFieldLine(startPos, directionSign = 1) {
        const points = [startPos.clone()];
        let curr = startPos.clone();
        const stepSize = 0.14;
        const maxSteps = 95;

        const m1S = new THREE.Vector3(magnet1.position.x - poleOffset, 0, 0);
        const m2S = mode === 'attract'
            ? new THREE.Vector3(magnet2.position.x - poleOffset, 0, 0)
            : new THREE.Vector3(magnet2.position.x + poleOffset, 0, 0);

        for (let s = 0; s < maxSteps; s++) {
            const B = getMagneticFieldAt(curr);
            if (B.lengthSq() < 0.0001) break;
            B.normalize().multiplyScalar(stepSize * directionSign);
            curr.add(B);
            points.push(curr.clone());

            // Stop if line enters a South pole or leaves simulation bounds
            if (curr.distanceTo(m1S) < 0.25) break;
            if (mode !== 'single' && curr.distanceTo(m2S) < 0.25) break;
            if (curr.length() > 8.5) break;
        }
        return points;
    }

    // Rebuild Field Lines, Compasses & Telemetry whenever sliders change
    function updateSimulation() {
        // Position Magnets
        if (mode === 'single') {
            magnet1.position.set(0, 0, 0);
            magnet2.visible = false;
            forceArrow1.visible = false;
            forceArrow2.visible = false;
        } else {
            magnet1.position.set(-distance / 2, 0, 0);
            magnet2.position.set(distance / 2, 0, 0);
            magnet2.visible = true;
            magnet2.rotation.y = (mode === 'repel') ? Math.PI : 0;
        }

        // Clear Old Field Lines
        while (fieldLinesGroup.children.length > 0) {
            const child = fieldLinesGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            fieldLinesGroup.remove(child);
        }
        activeCurves = [];

        // Seed Points around North Poles in 3D ring
        const seeds = [];
        const ringAngles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, -(3 * Math.PI) / 4, -Math.PI / 2, -Math.PI / 4];

        // Seeds around Magnet 1 North Pole
        const n1Pos = new THREE.Vector3(magnet1.position.x + poleOffset, 0, 0);
        ringAngles.forEach(ang => {
            seeds.push(new THREE.Vector3(
                n1Pos.x + 0.15,
                Math.sin(ang) * 0.22,
                Math.cos(ang) * 0.22
            ));
        });

        // Seeds around Magnet 2 North Pole (if 2 magnets active)
        if (mode !== 'single') {
            const n2X = (mode === 'attract')
                ? magnet2.position.x + poleOffset
                : magnet2.position.x - poleOffset;
            const xDir = (mode === 'attract') ? 0.15 : -0.15;

            ringAngles.forEach(ang => {
                seeds.push(new THREE.Vector3(
                    n2X + xDir,
                    Math.sin(ang) * 0.22,
                    Math.cos(ang) * 0.22
                ));
            });
        }

        const lineMat = new THREE.LineBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.45
        });

        seeds.forEach(seed => {
            const pts = traceFieldLine(seed, 1);
            if (pts.length > 3) {
                const curve = new THREE.CatmullRomCurve3(pts);
                activeCurves.push(curve);
                const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
                const line = new THREE.Line(geo, lineMat);
                fieldLinesGroup.add(line);
            }
        });

        // Sync Animated Flow Particles
        while (flowParticles.length < activeCurves.length) {
            const p = new THREE.Mesh(particleGeo, particleMat);
            scene.add(p);
            flowParticles.push({ mesh: p, offset: Math.random() });
        }
        flowParticles.forEach((p, idx) => {
            p.mesh.visible = idx < activeCurves.length;
        });

        // Orient 3D Compasses
        const target = new THREE.Vector3();
        compassNeedles.forEach(needle => {
            const B = getMagneticFieldAt(needle.position);
            if (B.lengthSq() > 0.00001) {
                target.copy(needle.position).add(B);
                needle.lookAt(target);
            }
        });

        // Update Force Arrows & Telemetry HUD
        const stateBadge = document.getElementById('stateBadge');
        const forceVal = document.getElementById('forceVal');
        const fieldVal = document.getElementById('fieldVal');

        const midB = getMagneticFieldAt(new THREE.Vector3(0, 0, 0)).length() * 10; // Scaled uT
        if (fieldVal) fieldVal.textContent = midB.toFixed(2);

        if (mode === 'single') {
            stateBadge.textContent = 'ISOLATED FIELD';
            stateBadge.style.color = '#00ffcc';
            forceVal.textContent = '0.00';
        } else {
            // Net force between inner poles (dominant) + outer poles
            const rInner = Math.max(0.4, distance - 2 * poleOffset);
            const forceMag = (0.1 * poleStrength * poleStrength) / (rInner * rInner);
            forceVal.textContent = forceMag.toFixed(2);

            const arrowLen = Math.min(0.4 + forceMag * 0.18, 1.8);
            forceArrow1.visible = true;
            forceArrow2.visible = true;
            forceArrow1.position.set(magnet1.position.x, 0.45, 0);
            forceArrow2.position.set(magnet2.position.x, 0.45, 0);
            forceArrow1.setLength(arrowLen, 0.25, 0.16);
            forceArrow2.setLength(arrowLen, 0.25, 0.16);

            if (mode === 'attract') {
                stateBadge.textContent = 'ATTRACTION (N ↔ S)';
                stateBadge.style.color = '#00ffcc';
                forceArrow1.setDirection(new THREE.Vector3(1, 0, 0));
                forceArrow2.setDirection(new THREE.Vector3(-1, 0, 0));
                forceArrow1.setColor(0x00ffcc);
                forceArrow2.setColor(0x00ffcc);
            } else {
                stateBadge.textContent = 'REPULSION (N ↔ N)';
                stateBadge.style.color = '#ee1c4b';
                forceArrow1.setDirection(new THREE.Vector3(-1, 0, 0));
                forceArrow2.setDirection(new THREE.Vector3(1, 0, 0));
                forceArrow1.setColor(0xee1c4b);
                forceArrow2.setColor(0xee1c4b);
            }
        }
    }

    // 7. UI Event Listeners
    const poleConfig = document.getElementById('poleConfig');
    const distRange = document.getElementById('distRange');
    const strengthRange = document.getElementById('strengthRange');
    const distVal = document.getElementById('distVal');
    const strengthVal = document.getElementById('strengthVal');
    const distanceGroup = document.getElementById('distanceGroup');
    const toggleCompasses = document.getElementById('toggleCompasses');
    const resetBtn = document.getElementById('resetSim');

    if (poleConfig) {
        poleConfig.addEventListener('change', (e) => {
            mode = e.target.value;
            if (distanceGroup) {
                distanceGroup.style.opacity = (mode === 'single') ? '0.4' : '1';
                distRange.disabled = (mode === 'single');
            }
            updateSimulation();
        });
    }

    if (distRange) {
        distRange.addEventListener('input', (e) => {
            distance = parseFloat(e.target.value);
            distVal.textContent = distance.toFixed(1);
            updateSimulation();
        });
    }

    if (strengthRange) {
        strengthRange.addEventListener('input', (e) => {
            poleStrength = parseFloat(e.target.value);
            strengthVal.textContent = poleStrength.toFixed(1);
            updateSimulation();
        });
    }

    if (toggleCompasses) {
        toggleCompasses.addEventListener('change', (e) => {
            compassGroup.visible = e.target.checked;
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            mode = 'attract';
            distance = 3.0;
            poleStrength = 5.0;
            if (poleConfig) poleConfig.value = 'attract';
            if (distRange) { distRange.value = 3.0; distRange.disabled = false; }
            if (distanceGroup) distanceGroup.style.opacity = '1';
            if (strengthRange) strengthRange.value = 5.0;
            if (distVal) distVal.textContent = '3.0';
            if (strengthVal) strengthVal.textContent = '5.0';
            if (toggleCompasses) { toggleCompasses.checked = true; compassGroup.visible = true; }
            updateSimulation();
        });
    }

    // Initial Build
    updateSimulation();

    // 8. Animation Loop (Animate Field Flow Particles)
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        const dt = clock.getDelta();

        for (let i = 0; i < activeCurves.length; i++) {
            const pObj = flowParticles[i];
            if (!pObj || !pObj.mesh.visible) continue;
            pObj.offset = (pObj.offset + dt * (0.25 + poleStrength * 0.04)) % 1.0;
            const pos = activeCurves[i].getPointAt(pObj.offset);
            pObj.mesh.position.copy(pos);
        }

        if (controls) controls.update();
        renderer.render(scene, camera);
    }

    animate();
});