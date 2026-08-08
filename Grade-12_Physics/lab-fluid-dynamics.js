/* ==========================================================================
   Grade 12 Physics Lab: Fluid Dynamics with Custom Size Box & Shake Particles
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

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 3, 8);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
    }

    // 2. Lighting Setup (Ambient & Hemisphere Light)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemisphereLight.position.set(0, 10, 0);
    scene.add(hemisphereLight);

    const gridHelper = new THREE.GridHelper(10, 10, 0x333333, 0x1a1a1a);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // 3. Airplane Group & GLB Model Loading
    const aeroplaneGroup = new THREE.Group();
    scene.add(aeroplaneGroup);

    let isModelLoaded = false;
    const propellers = [];

    const gltfLoader = new THREE.GLTFLoader();
    gltfLoader.load(
        'models/Airplane.glb',
        function (gltf) {
            const model = gltf.scene;
            model.scale.set(1.5, 1.5, 1.5);
            model.position.set(0, 0, 0);
            
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Blender ထဲက ပန်ကာနာမည်များ (Fan) ကို ရှာဖွေခြင်း
                    if (child.name.includes('Fan')) {
                        propellers.push(child);
                    }
                }
            });

            aeroplaneGroup.add(model);
            isModelLoaded = true;
        },
        undefined,
        function (error) {
            console.error('GLB Loading Error:', error);
        }
    );

    // 4. Particle System with Circular Shape & Vertex Colors
    const particleCount = 500;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const normalColor = new THREE.Color(0x00d9ff); // ပုံမှန်လေစီးကြောင်း (အပြာနုရောင်)[cite: 1]
    const turbColor = new THREE.Color(0xff5500);   // Turbulence / Drag (လိမ္မော်နီရောင်)[cite: 1]

    for(let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;     
        positions[i * 3 + 1] = (Math.random() - 0.5) * 4; 
        positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2; 

        colors[i * 3] = normalColor.r;
        colors[i * 3 + 1] = normalColor.g;
        colors[i * 3 + 2] = normalColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Canvas ဖြင့် အဝိုင်းပုံ Texture (Circular Sprite) ဖန်တီးခြင်း
    function createCircleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        return new THREE.CanvasTexture(canvas);
    }

    const particleMat = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true, 
        transparent: true,
        opacity: 0.9,
        map: createCircleTexture(),
        alphaTest: 0.5,
        depthWrite: false
    });
    
    const airflowParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(airflowParticles);

    // 5. State Variables & Manual Drag Controls
    let airflowSpeed = 10.0;
    let angleOfAttack = 8.0;
    
    // Drag & Wake ဧရိယာ ချိန်ညှိချက်များ
    let dragRangeLength = 1.2;  

    const clock = new THREE.Clock();

    const speedRange = document.getElementById('speedRange');
    const angleRange = document.getElementById('angleRange');
    const speedVal = document.getElementById('speedVal');
    const angleVal = document.getElementById('angleVal');
    
    const liftValue = document.getElementById('liftValue');
    const pressureValue = document.getElementById('pressureValue');
    const resetBtn = document.getElementById('resetSim');

    aeroplaneGroup.rotation.x = THREE.MathUtils.degToRad(angleOfAttack);

    if (speedRange) {
        speedRange.addEventListener('input', (e) => {
            airflowSpeed = parseFloat(e.target.value);
            speedVal.textContent = airflowSpeed.toFixed(1);
        });
    }
    if (angleRange) {
        angleRange.addEventListener('input', (e) => {
            angleOfAttack = parseFloat(e.target.value);
            angleVal.textContent = angleOfAttack.toFixed(1);
            aeroplaneGroup.rotation.x = THREE.MathUtils.degToRad(angleOfAttack);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            airflowSpeed = 10.0;
            angleOfAttack = 8.0;
            if(speedRange) speedRange.value = 10.0;
            if(angleRange) angleRange.value = 8.0;
            speedVal.textContent = "10.0";
            angleVal.textContent = "8.0";
            aeroplaneGroup.rotation.x = THREE.MathUtils.degToRad(8.0);
        });
    }

    // 6. Animation Loop
    const tempVector = new THREE.Vector3();

    function animate() {
        requestAnimationFrame(animate);

        let dt = clock.getDelta();
        const radAngle = THREE.MathUtils.degToRad(angleOfAttack);

        // Propeller Rotation
        if (propellers.length > 0) {
            propellers.forEach(prop => {
                prop.rotation.x += airflowSpeed * dt * 2.5; 
            });
        }

        // Physics Equation (Speed & Angle of Attack)
        let vRatio = airflowSpeed / 10.0;
        let turbulenceIndex = (vRatio * vRatio) * Math.sin(radAngle);
        let isStalledOrDrag = turbulenceIndex > 0.35;

        // ===== လေယာဉ်၏ Scale နှင့် ကိုက်ညီသော Custom Size Box ဧရိယာ =====
        let boxMinX = -1.5, boxMaxX = 1.5;   
        let boxMinY = -0.8, boxMaxY = 0.8;   
        let boxMinZ = -1.5, boxMaxZ = 1.5;   

        const posAttr = particleGeo.attributes.position;
        const colorAttr = particleGeo.attributes.color;

        for(let i = 0; i < particleCount; i++) {
            let px = posAttr.getX(i);
            let py = posAttr.getY(i);
            let pz = posAttr.getZ(i);

            let speedMultiplier = (py > 0) ? (1.35 + angleOfAttack * 0.025) : 0.9;
            pz += airflowSpeed * speedMultiplier * dt * 0.45;

            let isTurbulent = false;

            if (pz > 5) {
                pz = -5;
                px = (Math.random() - 0.5) * 10;
                py = (Math.random() - 0.5) * 4;
            }

            tempVector.set(px, py, pz);

            // Box ထဲ ဝင်ရောက်ခြင်း ရှိမရှိ စစ်ဆေးခြင်း
            let insideBox = (px >= boxMinX && px <= boxMaxX) &&
                            (py >= boxMinY && py <= boxMaxY) &&
                            (pz >= boxMinZ && pz <= boxMaxZ);

            if (insideBox) {
                // Box ထဲရောက်သောအခါ Particle လေးများ Shake (တုန်ခါ) ခြင်း
                let shakeIntensity = 0.08 * (airflowSpeed / 10.0);
                px += (Math.random() - 0.5) * shakeIntensity;
                py += (Math.random() - 0.5) * shakeIntensity;

                if (isStalledOrDrag) {
                    isTurbulent = true;
                }
            } 
            // လေယာဉ်နောက်ဘက် Drag / Wake ဇုန်
            else if (isModelLoaded && pz > boxMaxZ && pz < (boxMaxZ + dragRangeLength)) {
                let dragFactor = 0.012 * turbulenceIndex;
                py += (Math.random() - 0.5) * dragFactor;
                px += (Math.random() - 0.5) * dragFactor;
                
                if (isStalledOrDrag) {
                    isTurbulent = true;
                }
            }

            let targetColor = isTurbulent ? turbColor : normalColor;
            colorAttr.setXYZ(i, targetColor.r, targetColor.g, targetColor.b);
            posAttr.setXYZ(i, px, py, pz);
        }

        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;

        // Physics Telemetry Calculations
        let airDensity = 1.225;
        let wingArea = 2.0;
        let liftCoefficient = 0.4 + (angleOfAttack * 0.09);
        let F_lift = 0.5 * liftCoefficient * airDensity * (airflowSpeed * airflowSpeed) * wingArea;
        let delta_P = 0.5 * airDensity * (airflowSpeed * airflowSpeed) * (1.0 + angleOfAttack * 0.05);

        if (liftValue) liftValue.textContent = F_lift.toFixed(2);
        if (pressureValue) pressureValue.textContent = delta_P.toFixed(2);

        if (controls) controls.update();
        renderer.render(scene, camera);
    }

    animate();
});