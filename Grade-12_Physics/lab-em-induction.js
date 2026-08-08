/* ==========================================================================
   Grade 12 Physics Lab: Electromagnetic Induction Logic (Three.js - Solenoid)
   ========================================================================== */
// Responsive Window & Mobile Screen Resize
    window.addEventListener('resize', () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('physics-canvas');
    if (!canvas) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060608);

    const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 3, 9);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Orbit Controls
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
    }

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.5, 50);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // 3. Solenoid Coil Group (True Helix/Spring Wire Structure)
    const coilGroup = new THREE.Group();
    scene.add(coilGroup);

    const solenoidRadius = 1.3;
    const solenoidLength = 3.5;
    const wireMat = new THREE.MeshStandardMaterial({ 
        color: 0xd4af37, // Copper
        metalness: 0.9, 
        roughness: 0.2 
    });

    function updateSolenoidCoil(turns) {
        while(coilGroup.children.length > 0){ 
            coilGroup.remove(coilGroup.children[0]); 
        }

        // Solenoid ကို Spring (Helix) ပုံစံ TubeGeometry ဖြင့် ဖန်တီးခြင်း
        const totalAngle = turns * Math.PI * 2;
        const curve = {
            getPoint: function(t) {
                const x = (t - 0.5) * solenoidLength;
                const angle = t * totalAngle;
                const y = Math.sin(angle) * solenoidRadius;
                const z = Math.cos(angle) * solenoidRadius;
                return new THREE.Vector3(x, y, z);
            }
        };

        const tubularSegments = turns * 30;
        const tubeRadius = 0.06;
        const radialSegments = 12;
        
        // Custom Curve Geometry ဖန်တီးရန်
        const path = new THREE.CurvePath();
        // Three.js TubeGeometry အတွက် မျဉ်းကွေးလမ်းကြောင်းသတ်မှတ်ခြင်း
        const points = [];
        for (let i = 0; i <= tubularSegments; i++) {
            let t = i / tubularSegments;
            points.push(curve.getPoint(t));
        }
        const threeCurve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(threeCurve, tubularSegments, tubeRadius, radialSegments, false);
        
        const solenoidMesh = new THREE.Mesh(tubeGeo, wireMat);
        coilGroup.add(solenoidMesh);
    }

    // 4. Create Bar Magnet & Magnetic Flux Field Lines
    const magnetGroup = new THREE.Group();
    
    // North Pole (Red)
    const northGeo = new THREE.BoxGeometry(1.2, 0.9, 0.9);
    const northMat = new THREE.MeshStandardMaterial({ color: 0xEE1C4B, roughness: 0.3 });
    const northMesh = new THREE.Mesh(northGeo, northMat);
    northMesh.position.x = 0.6;

    // South Pole (Blue)
    const southGeo = new THREE.BoxGeometry(1.2, 0.9, 0.9);
    const southMat = new THREE.MeshStandardMaterial({ color: 0x1C66EE, roughness: 0.3 });
    const southMesh = new THREE.Mesh(southGeo, southMat);
    southMesh.position.x = -0.6;

    magnetGroup.add(northMesh);
    magnetGroup.add(southMesh);

    // --- Magnetic Flux Field Lines Group ---
    const fluxGroup = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.45
    });

    const numLines = 8;
    for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2;
        const ry = 0.9 * Math.sin(angle);
        const rz = 0.9 * Math.cos(angle);

        const curveLine = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0.6, 0, 0),
            new THREE.Vector3(0, ry * 2.5, rz * 2.5),
            new THREE.Vector3(-0.6, 0, 0)
        );

        const points = curveLine.getPoints(30);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const fluxLine = new THREE.Line(geometry, lineMat);
        fluxGroup.add(fluxLine);
    }
    magnetGroup.add(fluxGroup);
    scene.add(magnetGroup);

    // 5. Induced Current Indicator Particles (Electrons along Solenoid Helix)
    let particleCount = 150;
    const particleGeo = new THREE.BufferGeometry();
    const particleMat = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.16,
        transparent: true,
        opacity: 0.95
    });
    let particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    let particleTValues = []; // Solenoid တစ်လျှောက် တည်နေရာ (0 မှ 1 ထိ)

    function updateParticleSystem(count) {
        particleTValues = [];
        const particlePositions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            let t = Math.random();
            particleTValues.push(t);

            let x = (t - 0.5) * solenoidLength;
            let angle = t * coilTurns * Math.PI * 2;
            let r = solenoidRadius + 0.15; // ဝါယာကြိုး၏ အပြင်ဘက်စွန်း
            let y = Math.sin(angle) * r;
            let z = Math.cos(angle) * r;

            let i3 = i * 3;
            particlePositions[i3] = x;
            particlePositions[i3 + 1] = y;
            particlePositions[i3 + 2] = z;
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeo.attributes.position.needsUpdate = true;
    }

    // 6. UI Element Bindings & Interactive States
    const speedRange = document.getElementById('speedRange');
    const insertRange = document.getElementById('insertRange');
    const coilTurnsRange = document.getElementById('coilTurnsRange');
    const fluxStrengthRange = document.getElementById('fluxStrengthRange');

    const speedVal = document.getElementById('speedVal');
    const turnsVal = document.getElementById('turnsVal');
    const fluxVal = document.getElementById('fluxVal');
    const emfValue = document.getElementById('emfValue');
    const currentStatus = document.getElementById('currentStatus');
    const resetBtn = document.getElementById('resetSim');

    let speed = 1.0;
    let manualPosition = 0;
    let isAutoPlay = true;
    let coilTurns = 12; // Default Solenoid turns
    let fluxStrength = 1.0;
    let clock = new THREE.Clock();

    // Initial build
    updateSolenoidCoil(coilTurns);
    updateParticleSystem(particleCount);

    if (speedRange) {
        speedRange.addEventListener('input', (e) => {
            speed = parseFloat(e.target.value);
            if (speedVal) speedVal.textContent = speed.toFixed(1);
            isAutoPlay = true; // Speed ပြောင်းရင် Auto ပြန်စမည်
        });
    }

    if (insertRange) {
        insertRange.addEventListener('input', (e) => {
            isAutoPlay = false; // Manual Slider ဆွဲလျှင် Auto ကို ချက်ချင်း ပိတ်မည်
            manualPosition = parseFloat(e.target.value);
        });
    }
    if (coilTurnsRange) {
        coilTurnsRange.addEventListener('input', (e) => {
            coilTurns = parseInt(e.target.value);
            if (turnsVal) turnsVal.textContent = coilTurns;
            updateSolenoidCoil(coilTurns);
            updateParticleSystem(particleCount);
        });
    }

    if (fluxStrengthRange) {
        fluxStrengthRange.addEventListener('input', (e) => {
            fluxStrength = parseFloat(e.target.value);
            if (fluxVal) fluxVal.textContent = fluxStrength.toFixed(1);
            fluxGroup.scale.set(1, fluxStrength, fluxStrength);
            lineMat.opacity = Math.min(0.15 * fluxStrength, 0.9);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            speed = 1.0;
            coilTurns = 12;
            fluxStrength = 1.0;
            if (speedRange) speedRange.value = 1.0;
            if (coilTurnsRange) coilTurnsRange.value = 12;
            if (fluxStrengthRange) fluxStrengthRange.value = 1.0;
            if (speedVal) speedVal.textContent = "1.0";
            if (turnsVal) turnsVal.textContent = "12";
            if (fluxVal) fluxVal.textContent = "1.0";
            updateSolenoidCoil(12);
            updateParticleSystem(particleCount);
            fluxGroup.scale.set(1, 1, 1);
            lineMat.opacity = 0.45;
            isAutoPlay = true;
        });
    }

 // 7. Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        let elapsedTime = clock.getElapsedTime();
        let magnetX = 0;
        let velocity = 0;

        if (isAutoPlay) {
            let prevX = magnetGroup.position.x;
            magnetX = Math.sin(elapsedTime * speed * 1.5) * 2.8;
            magnetGroup.position.x = magnetX;
            velocity = (magnetX - prevX) * 60 * speed; 
            
            // Slider value ပါ တခါတည်း လိုက်ရွေ့နေစေရန်
            if (insertRange) insertRange.value = magnetX.toFixed(1);
        } else {
            // Manual Position ကို သုံးသည့်အခါ
            let prevX = magnetGroup.position.x;
            magnetGroup.position.x = manualPosition;
            velocity = (manualPosition - prevX) * 30; // လက်တံကို ရွေ့သည့် အမြန်နှုန်းပေါ် မူတည်ပြီး EMF ထွက်မည်
        }

        fluxGroup.rotation.x = Math.sin(elapsedTime * 2) * 0.1;

        // Faraday's Law Formula: ε = -N * (ΔΦ / Δt)
        let rateOfChangeFlux = velocity * fluxStrength;
        let inducedEMF = Math.abs(rateOfChangeFlux * (coilTurns / 12) * 1.5).toFixed(2);
        if (emfValue) emfValue.textContent = inducedEMF + " V";

        if (currentStatus) {
            if (Math.abs(velocity) > 0.05) {
                currentStatus.textContent = velocity > 0 ? "Forward (Lenz's Law)" : "Reverse (Lenz's Law)";
                currentStatus.style.color = "#00ffcc";
            } else {
                currentStatus.textContent = "Zero (No Motion - Stopped)";
                currentStatus.style.color = "#ff4444";
            }
        }

        // Animate particles along the Solenoid Helix path
        const positions = particleGeo.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            let i3 = i * 3;
            if (Math.abs(velocity) > 0.01) {
                let dir = velocity > 0 ? 1 : -1;
                particleTValues[i] += dir * 0.004 * (isAutoPlay ? speed : Math.abs(velocity)) * fluxStrength;
                
                if (particleTValues[i] > 1) particleTValues[i] = 0;
                if (particleTValues[i] < 0) particleTValues[i] = 1;

                let t = particleTValues[i];
                let x = (t - 0.5) * solenoidLength;
                let angle = t * coilTurns * Math.PI * 2;
                let r = solenoidRadius + 0.15;
                let y = Math.sin(angle) * r;
                let z = Math.cos(angle) * r;

                positions[i3] = x;
                positions[i3 + 1] = y;
                positions[i3 + 2] = z;
            }
        }
        particleGeo.attributes.position.needsUpdate = true;

        if (controls) controls.update();
        renderer.render(scene, camera);
    }

    animate();

    // Responsive Window Resize
    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
});