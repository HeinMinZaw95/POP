document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('physics-canvas');
    if (!canvas) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507); // Dark portfolio background

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 3, 5); // အပေါ်စီးကနေ မြင်ကွက်ကို ချိန်ထားခြင်း

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x00ffcc, 1, 10);
    pointLight.position.set(-2, 2, 2);
    scene.add(pointLight);

    // 3. Variables & Groups
    let centrifugeRotor = null;
    let testTubeTemplate = null;
    let tubesGroup = new THREE.Group(); // Test Tube များကို ထည့်မည့် Group

    let totalTubes = 8; // စုစုပေါင်း Test Tube အရေအတွက်
    let radius = 0.15;  // မူလ Radius (meters)
    let rpm = 100;

    const loader = new THREE.GLTFLoader();

    // Load Centrifuge Body & Rotor (`centrifuge.glb`)
    loader.load('models/centrifuge.glb', function (gltf) {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0, -0.5, 0);
        scene.add(model);

        // Rotor အပိုင်းကို ရှာဖွေပြီး tubesGroup ကို သူ့ရဲ့ Child အဖြစ် ချိတ်ပေးခြင်း
        model.traverse((child) => {
            if (child.name.includes('Roter') || child.name.includes('Rotor')) {
                centrifugeRotor = child;
                centrifugeRotor.add(tubesGroup); // Rotor လည်လျှင် Tube များပါ တစ်ပါတည်း လည်မည်
            }
        });
        console.log("Centrifuge loaded successfully!");
    }, undefined, (err) => console.error('Error loading centrifuge.glb:', err));

    // Load Single Tilted Test Tube (`TestCube.glb`)
    loader.load('models/TestCube.glb', function (gltf) {
        testTubeTemplate = gltf.scene;
        // မော်ဒယ်ဝင်ရောက်လာသည်နှင့် Tube များကို စက်ဝိုင်းပုံစံ စတင်စီပေးမည်
        updateTubePositions(radius);
        console.log("TestCube loaded successfully!");
    }, undefined, (err) => console.error('Error loading TestCube.glb:', err));

    // 4. UI Elements
    const rpmRange = document.getElementById('rpmRange');
    const radiusRange = document.getElementById('radiusRange');
    const rpmVal = document.getElementById('rpmVal');
    const radiusVal = document.getElementById('radiusVal');
    const omegaVal = document.getElementById('omegaVal');
    const accVal = document.getElementById('accVal');
    const resetBtn = document.getElementById('resetSim');

    let clock = new THREE.Clock();

    // Update Tube Positions & Rotations Function
    function updateTubePositions(currentRadius) {
        // အရင်ရှိနေတဲ့ Tube တွေအားလုံးကို ရှင်းထုတ်မည်
        while (tubesGroup.children.length > 0) {
            tubesGroup.remove(tubesGroup.children[0]);
        }

        if (!testTubeTemplate) return;

        let angleStep = (Math.PI * 2) / totalTubes;

        for (let i = 0; i < totalTubes; i++) {
            let angle = i * angleStep;
            let tubeClone = testTubeTemplate.clone();

            // ဗဟိုချက်မှ အပြင်ဘက်သို့ Radius အကွာအဝေးအလိုက် Position တွက်ထုတ်ခြင်း
            tubeClone.position.x = Math.cos(angle) * currentRadius;
            tubeClone.position.z = Math.sin(angle) * currentRadius;
            tubeClone.position.y = 0.05; // လိုအပ်ပါက အမြင့် ချိန်ရန်

            // Blender တွင် စောင်းထားသော Tube များကို စက်ဝိုင်းပတ်လည်သို့ မျက်နှာမူစေရန် Y-axis လှည့်ခြင်း
            tubeClone.rotation.y = -angle;

            tubesGroup.add(tubeClone);
        }
    }

    // Event Listeners for UI Controls
    rpmRange.addEventListener('input', (e) => {
        rpm = parseFloat(e.target.value);
        rpmVal.textContent = rpm;
    });

    radiusRange.addEventListener('input', (e) => {
        radius = parseFloat(e.target.value);
        radiusVal.textContent = radius.toFixed(2);
        
        // Radius Slider ရွှေ့လိုက်တိုင်း Tube တွေရဲ့ နေရာကို အသစ်ပြန်စီမည်
        updateTubePositions(radius);
    });

    resetBtn.addEventListener('click', () => {
        rpm = 100;
        radius = 0.15;
        rpmRange.value = rpm;
        radiusRange.value = radius;
        rpmVal.textContent = rpm;
        radiusVal.textContent = radius.toFixed(2);
        updateTubePositions(radius);
    });

    // 5. Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        let dt = clock.getDelta();
        
        // Physics Calculations
        let omega = (2 * Math.PI * rpm) / 60;          // Angular velocity (\(\omega\))
        let centripetalAcc = (omega * omega) * radius; // Centripetal Acceleration (\(a_c\))

        // Update UI Telemetry
        omegaVal.textContent = omega.toFixed(2);
        accVal.textContent = centripetalAcc.toFixed(2);

        // Rotate Centrifuge Rotor (Tube တွေက Rotor ရဲ့ Child ဖြစ်므로 အတူတူ လည်ပတ်ပါမည်)
        if (centrifugeRotor) {
            centrifugeRotor.rotation.y -= omega * dt;
        }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();

    // Window Resize Handling
    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
});