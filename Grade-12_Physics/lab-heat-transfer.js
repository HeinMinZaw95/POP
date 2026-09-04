// Hein-Pop Lab: Heat Transfer (Conduction) - Distinct Base Colors & Realistic Lag
let scene, camera, renderer, controls;
let composer, bloomPass;
let rodMesh = null;
let heatSourceLeft = null;
let tempIndicator1 = null;
let tempIndicator2 = null;
let isHeating = true; 
let currentAppliedTemp = 25.0; 
let elapsedTime = 0.0;

// UI Controls Elements
const tempRange = document.getElementById('tempRange');
const tempVal = document.getElementById('tempVal');
const materialSelect = document.getElementById('materialSelect');
const resetSimBtn = document.getElementById('resetSim');
const tipTempVal = document.getElementById('tipTempVal');
const sensor1Val = document.getElementById('sensor1Val');
const sensor2Val = document.getElementById('sensor2Val');
const heatStatus = document.getElementById('heatStatus');
const totalTimeVal = document.getElementById('totalTimeVal');

// သတ္တုအမျိုးအစားအလိုက် သဘာဝအလျောက် မူလအရောင် (baseColor) နှင့် အပူကူးနှုန်းများ
const materialProfiles = {
    copper: { 
        rate: 0.01, 
        kValue: "401 W/m·K", 
        name: "Copper (ကြေးနီ)", 
        baseFactor: 1.0, 
        baseColor: new THREE.Color(0xb87333) // ကြေးနီရောင် (Copper Reddish-Brown)
    },
    aluminum: { 
        rate: 0.006, 
        kValue: "237 W/m·K", 
        name: "Aluminum (အလူမီနီယမ်)", 
        baseFactor: 1.4, 
        baseColor: new THREE.Color(0xd0d4dc) // ငွေရောင်/အလူမီနီယမ် (Silver-Grey)
    },
    iron: { 
        rate: 0.0025, 
        kValue: "80 W/m·K", 
        name: "Iron (သံ)", 
        baseFactor: 2.2, 
        baseColor: new THREE.Color(0x7a7d85) // မီးခဲရောင်သမ်းသော သံရောင် (Darker Grey/Iron)
    }
};

function init() {
    const container = document.getElementById('canvasContainer');

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111118);

    // 2. Camera Setup
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 4, 8);

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('physics-canvas') });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Post-processing (Unreal Bloom Effect) Setup
    const renderScene = new THREE.RenderPass(scene, camera);
    
    bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight), 
        0.0,  
        0.4,  
        0.85  
    );

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // 5. Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // 7. Load Blender GLB Model
    const loader = new THREE.GLTFLoader();
    loader.load('models/rod_mesh.glb', (gltf) => {
        scene.add(gltf.scene);

        rodMesh = gltf.scene.getObjectByName("rod_mesh");
        heatSourceLeft = gltf.scene.getObjectByName("heat_source_left");
        tempIndicator1 = gltf.scene.getObjectByName("temp_indicator_1");
        tempIndicator2 = gltf.scene.getObjectByName("temp_indicator_2");

        if (rodMesh) {
            const currentProfile = materialProfiles[materialSelect.value];
            rodMesh.material = new THREE.MeshStandardMaterial({
                color: currentProfile.baseColor, // ရွေးထားသော သတ္တုမူလအရောင်ကို ထည့်ပေးခြင်း
                roughness: 0.25,
                metalness: 0.85
            });
            console.log("Model loaded with distinct metallic base colors!");
        }
    }, undefined, (error) => {
        console.error('Error loading GLB model:', error);
    });

    // Event Listeners
    tempRange.addEventListener('input', (e) => {
        tempVal.textContent = e.target.value;
        heatStatus.textContent = "Thermal Conduction Adjusting...";
        heatStatus.style.color = "#ff9900";
    });

    // သတ္တုအမျိုးအစား ပြောင်းလဲလိုက်ချိန်တွင် မူလအရောင်ပါ တစ်ခါတည်း ပြောင်းသွားစေရန်
    materialSelect.addEventListener('change', (e) => {
        const profile = materialProfiles[e.target.value];
        const kDisplay = document.getElementById('kValueDisplay');
        if (kDisplay) kDisplay.textContent = profile.kValue;

        if (rodMesh && currentAppliedTemp < 150) {
            rodMesh.material.color.copy(profile.baseColor);
        }
    });

    resetSimBtn.addEventListener('click', () => {
        currentAppliedTemp = 25.0;
        elapsedTime = 0.0;
        tempRange.value = 100;
        tempVal.textContent = "100";
        
        const profile = materialProfiles[materialSelect.value];
        if (rodMesh) {
            rodMesh.material.color.copy(profile.baseColor); // Reset to specific metal color
            rodMesh.material.emissive.setHex(0x000000);
        }
        bloomPass.strength = 0.0;
        tipTempVal.textContent = "25.0 °C";
        if (sensor1Val) sensor1Val.textContent = "25.0 °C";
        if (sensor2Val) sensor2Val.textContent = "25.0 °C";
        if (totalTimeVal) totalTimeVal.textContent = "0.0 s";
        heatStatus.textContent = "Idle / Cooling";
        heatStatus.style.color = "inherit";
    });

    window.addEventListener('resize', onWindowResize);
    
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
        if (!document.fullscreenElement) {
            container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    animate();
}

// သတ္တု၏ မူလအရောင်မှ အပူချိန်တက်လာသည်နှင့် Blackbody Radiation အရောင်သို့ အဆင့်ချင်းပြောင်းလဲခြင်း
function getRealisticThermalColor(tempC, baseColor) {
    const color = baseColor.clone();
    
    if (tempC < 150) {
        return color; // အေးနေချိန်တွင် သတ္တုအမျိုးအစားအလိုက် မူလအရောင်အတိုင်းရှိမည်
    } else if (tempC >= 150 && tempC < 300) {
        color.lerp(new THREE.Color(0x661111), (tempC - 150) / 150);
    } else if (tempC >= 300 && tempC < 550) {
        color.lerpColors(new THREE.Color(0x661111), new THREE.Color(0xcc2200), (tempC - 300) / 250);
    } else if (tempC >= 550 && tempC < 800) {
        color.lerpColors(new THREE.Color(0xcc2200), new THREE.Color(0xff6600), (tempC - 550) / 250);
    } else {
        color.lerpColors(new THREE.Color(0xff6600), new THREE.Color(0xffffff), (tempC - 800) / 200);
    }
    return color;
}

function animate() {
    requestAnimationFrame(animate);

    if (isHeating && rodMesh) {
        const targetSliderTemp = parseFloat(tempRange.value);
        const matType = materialSelect.value;
        const profile = materialProfiles[matType] || materialProfiles.copper;

        // Thermal Lag Calculation
        currentAppliedTemp += (targetSliderTemp - currentAppliedTemp) * profile.rate;
        elapsedTime += 0.05 * profile.baseFactor;

        if (Math.abs(targetSliderTemp - currentAppliedTemp) < 0.5) {
            heatStatus.textContent = `Thermal Equilibrium Reached (${profile.name})`;
            heatStatus.style.color = "#00ffcc";
        }

        // Telemetry Calculations
        tipTempVal.textContent = currentAppliedTemp.toFixed(1) + " °C";

        // Distinct Base Color to Thermal Color Mapping
        const targetColor = getRealisticThermalColor(currentAppliedTemp, profile.baseColor);
        rodMesh.material.color.copy(targetColor);

        // Dynamic Emissive & Bloom Intensity
        if (currentAppliedTemp > 300) {
            const heatIntensityFactor = (currentAppliedTemp - 300) / 700;
            rodMesh.material.emissive.copy(targetColor).multiplyScalar(heatIntensityFactor * 1.5);
            bloomPass.strength = heatIntensityFactor * 1.8;
        } else {
            rodMesh.material.emissive.setHex(0x000000);
            bloomPass.strength = 0.0;
        }

        // Sensors
        const sensor1Temp = 25.0 + (currentAppliedTemp - 25.0) * 0.7;
        const sensor2Temp = 25.0 + (currentAppliedTemp - 25.0) * 0.4;

        if (sensor1Val) sensor1Val.textContent = Math.max(25.0, sensor1Temp).toFixed(1) + " °C";
        if (sensor2Val) sensor2Val.textContent = Math.max(25.0, sensor2Temp).toFixed(1) + " °C";

        if (totalTimeVal) {
            totalTimeVal.textContent = elapsedTime.toFixed(1) + " s";
        }
    }

    controls.update();
    composer.render();
}

function onWindowResize() {
    const container = document.getElementById('canvasContainer');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    composer.setSize(container.clientWidth, container.clientHeight);
}

window.addEventListener('DOMContentLoaded', init);
