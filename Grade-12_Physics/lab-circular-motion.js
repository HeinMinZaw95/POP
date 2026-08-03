/* ==========================================================================
   Grade 12 Physics Lab: Circular Motion Logic (Three.js)
   ========================================================================== */
window.addEventListener('resize', () => {
    const canvas = document.getElementById('physics-canvas');
    if(!canvas) return;
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

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060608);

    const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 8);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
    }

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.2, 50);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // 3. Circular Motion Objects
    // Center Peg
    const pegGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 16);
    const pegMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    const peg = new THREE.Mesh(pegGeo, pegMat);
    scene.add(peg);

    // Grid Helper for reference
    const gridHelper = new THREE.GridHelper(10, 10, 0x333333, 0x222222);
    scene.add(gridHelper);

    // Moving Mass (Sphere)
    const massGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const massMat = new THREE.MeshStandardMaterial({ color: 0xEE1C4B, roughness: 0.2 });
    const massSphere = new THREE.Mesh(massGeo, massMat);
    scene.add(massSphere);

    // String (Line connecting center to mass)
    const stringMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const stringGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(2,0,0)]);
    const stringLine = new THREE.Line(stringGeo, stringMat);
    scene.add(stringLine);

    // Vectors (ArrowHelpers)
    // Velocity Vector (Blue - Tangential)
    const velDir = new THREE.Vector3(0, 0, -1);
    const velArrow = new THREE.ArrowHelper(velDir, massSphere.position, 1.5, 0x00aaff, 0.3, 0.2);
    scene.add(velArrow);

    // Force/Acceleration Vector (Green - Inward/Centripetal)
    const forceDir = new THREE.Vector3(-1, 0, 0);
    const forceArrow = new THREE.ArrowHelper(forceDir, massSphere.position, 1.5, 0x00ffcc, 0.3, 0.2);
    scene.add(forceArrow);

    // Path Trace (Circle)
    const pathGeo = new THREE.RingGeometry(1.95, 2.05, 64);
    const pathMat = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const pathRing = new THREE.Mesh(pathGeo, pathMat);
    pathRing.rotation.x = Math.PI / 2;
    scene.add(pathRing);

    // 4. State Variables & UI Bindings (Synchronized with HTML defaults: mass=1.0, radius=2.0, speed=2.0)
    let mass = 1.0; // kg
    let radius = 2.0; // m
    let speed = 2.0; // m/s
    let angle = 0;
    const clock = new THREE.Clock();

    const massRange = document.getElementById('massRange');
    const radiusRange = document.getElementById('radiusRange');
    const speedRange = document.getElementById('speedRange');

    const massVal = document.getElementById('massVal');
    const radiusVal = document.getElementById('radiusVal');
    const speedVal = document.getElementById('speedVal');
    
    const forceValue = document.getElementById('forceValue');
    const accValue = document.getElementById('accValue');
    const resetBtn = document.getElementById('resetSim');

    function updatePathRing() {
        pathRing.geometry.dispose();
        pathRing.geometry = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 64);
    }

    if (massRange) {
        massRange.addEventListener('input', (e) => {
            mass = parseFloat(e.target.value);
            massVal.textContent = mass.toFixed(1);
            let scale = 0.5 + (mass * 0.2);
            massSphere.scale.set(scale, scale, scale);
        });
    }
    if (radiusRange) {
        radiusRange.addEventListener('input', (e) => {
            radius = parseFloat(e.target.value);
            radiusVal.textContent = radius.toFixed(1);
            updatePathRing();
        });
    }
    if (speedRange) {
        speedRange.addEventListener('input', (e) => {
            speed = parseFloat(e.target.value);
            speedVal.textContent = speed.toFixed(1);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            mass = 1.0; radius = 2.0; speed = 2.0;
            if(massRange) massRange.value = 1.0;
            if(radiusRange) radiusRange.value = 2.0;
            if(speedRange) speedRange.value = 2.0;
            
            massVal.textContent = "1.0";
            radiusVal.textContent = "2.0";
            speedVal.textContent = "2.0";
            
            massSphere.scale.set(0.7, 0.7, 0.7);
            updatePathRing();
        });
    }

    // 5. Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        let dt = clock.getDelta();
        
        // Circular Motion Math
        let omega = speed / radius;
        angle += omega * dt;

        // Position update
        let x = Math.cos(angle) * radius;
        let z = Math.sin(angle) * -radius; 
        massSphere.position.set(x, 0.2, z);

        // Update String
        const positions = stringLine.geometry.attributes.position.array;
        positions[3] = x;
        positions[4] = 0.2;
        positions[5] = z;
        stringLine.geometry.attributes.position.needsUpdate = true;

        // Update Vectors
        velArrow.position.copy(massSphere.position);
        velDir.set(-Math.sin(angle), 0, -Math.cos(angle)).normalize();
        velArrow.setDirection(velDir);
        velArrow.setLength(speed * 0.5 + 0.8);

        // Calculate Centripetal Force (Fc = m * v^2 / r) and Acceleration (ac = v^2 / r)
        let Fc = (mass * speed * speed) / radius; 
        let ac = (speed * speed) / radius; 

        forceArrow.position.copy(massSphere.position);
        forceDir.set(-x, 0, -z).normalize(); 
        forceArrow.setDirection(forceDir);
        forceArrow.setLength(Math.min(Fc * 0.2 + 0.5, 3));

        if (forceValue) forceValue.textContent = Fc.toFixed(2);
        if (accValue) accValue.textContent = ac.toFixed(2);

        if (controls) controls.update();
        renderer.render(scene, camera);
    }

    animate();
});