document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('physics-canvas');
    if (!canvas) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f0f); // မှောင်မည်းသော ကောင်းကင်[cite: 2, 6]

    const camera = new THREE.PerspectiveCamera(80, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(-10, 10, -10);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // --- NEW: Bloom Effect Setup (Post-Processing) ---
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
        0.1,  // Bloom Strength (အလင်းဖြာထွက်အား)
        0.4,  // Radius (အကွာအဝေး)
        0.85  // Threshold (အလင်းစတင်ဖြာမည့် ပမာဏ)
    );
    
    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- ကြယ်များ ထည့်သွင်းခြင်း ---
    const starCount = 1000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
        const radius = 300 + Math.random() * 50;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        starPositions[i]     = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i + 1] = radius * Math.cos(phi);
        starPositions[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // --- တိမ်တိုက်များ (Clouds) အဝိုင်းပုံစံ ပြင်ဆင်ခြင်း ---
    const cloudCount = 50;
    const cloudGeometry = new THREE.BufferGeometry();
    const cloudPositions = new Float32Array(cloudCount * 3);
    for (let i = 0; i < cloudCount * 3; i += 3) {
        cloudPositions[i]     = (Math.random() - 0.5) * 150; 
        cloudPositions[i + 1] = 30 + Math.random() * 15;      
        cloudPositions[i + 2] = (Math.random() - 0.5) * 150; 
    }
    cloudGeometry.setAttribute('position', new THREE.BufferAttribute(cloudPositions, 3));

    // အဝိုင်းပုံ Soft Particle Texture ဖန်တီးရန် Function
    function createCloudTexture() {
        const texCanvas = document.createElement('canvas');
        texCanvas.width = 64;
        texCanvas.height = 64;
        const ctx = texCanvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        return new THREE.CanvasTexture(texCanvas);
    }

    const cloudMaterial = new THREE.PointsMaterial({
        color: 0x8899aa,
        size: 15,
        transparent: true,
        opacity: 0.3,
        map: createCloudTexture(),
        depthWrite: false,
        sizeAttenuation: true
    });

    const clouds = new THREE.Points(cloudGeometry, cloudMaterial);
    scene.add(clouds);

    // --- မိုးကြိုး အတွက် မျဉ်းကြောင်း (Line) Setup ---
    const lightningPoints = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0)
    ];
    const lightningGeometry = new THREE.BufferGeometry().setFromPoints(lightningPoints);
    const lightningMaterial = new THREE.LineBasicMaterial({ 
        color: 0xccffff, 
        transparent: true,
        opacity: 0,
        linewidth: 3
    });
    const lightningBolt = new THREE.Line(lightningGeometry, lightningMaterial);
    lightningBolt.visible = false;
    scene.add(lightningBolt);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x666666, 1);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 1); 
    spotLight.position.set(0, 50, 15); 
    spotLight.power = 150;
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight.target);
    spotLight.angle = Math.PI / 3;
    spotLight.penumbra = 0.6;
    spotLight.decay = 1.5;
    spotLight.distance = 60;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    spotLight.shadow.camera.near = 0.5;
    spotLight.shadow.camera.far = 40;
    spotLight.shadow.bias = -0.001;
    scene.add(spotLight);

    // 3. Variables & Groups
    let bodies = [];          
    let turbineBlades = [];   
    let emissionMeshes = [];  
    let seaMesh = null; 
    let drones = []; 
    let laserLines = []; 
    
    let windSpeed = 10;      
    let baseWindDirection = 0; 
    let dynamicWindDirection = 0; 
    let emissionIntensity = 1.0; 

    const particleCount = 300; 
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
        particlePositions[i]     = (Math.random() - 0.5) * 30; 
        particlePositions[i + 1] = Math.random() * 25;          
        particlePositions[i + 2] = (Math.random() - 0.5) * 30; 
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
        color: 0xaaddee,
        size: 0.12,
        transparent: true,
        opacity: 0.7
    });
    const windParticles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(windParticles);

    const loader = new THREE.GLTFLoader();

    loader.load('models/AirTurbine.glb', function (gltf) {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0, -1, 0);
        scene.add(model);
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    child.material.side = THREE.DoubleSide;
                    child.material.roughness = 1; 
                }
            }
            if (child.name.toLowerCase().includes('sea') || child.name.toLowerCase().includes('water')) {
                seaMesh = child;
            }
            if (child.name.includes('body') || child.name.includes('Pole') || child.name.includes('Stem')) {
                bodies.push(child);
            }
            if (child.name.includes('Fan') || child.name.includes('Blade') || child.name.includes('Rotor')) {
                child.userData.randomFactor = 0.8 + Math.random() * 0.4;
                turbineBlades.push(child);
            }
        });
    }, undefined, (err) => console.error('Error loading AirTurbine:', err));

    loader.load('models/Drone.glb', function (gltf) {
        const originalDrone = gltf.scene;
        for (let i = 0; i < 10; i++) {
            const droneClone = originalDrone.clone();
            droneClone.scale.set(0.3, 0.3, 0.3);
            droneClone.position.set(
                (Math.random() - 0.5) * 30,
                Math.random() * 15 + 5,
                (Math.random() - 0.5) * 30
            );
            droneClone.userData = {
                speed: 1 + Math.random() * 2,
                angle: Math.random() * Math.PI * 2,
                radius: 35 + Math.random() * 25,
                heightSpeed: 0.5 + Math.random(),
                initialY: droneClone.position.y
            };
            
            const droneSpotLight = new THREE.SpotLight(0xffffff, 5);
            droneSpotLight.position.set(0, 0, 0); 
            droneSpotLight.angle = Math.PI / 6;
            droneSpotLight.penumbra = 0.5;
            droneSpotLight.decay = 1.5;
            droneSpotLight.distance = 30;
            
            droneClone.add(droneSpotLight);
            droneClone.add(droneSpotLight.target);
            droneSpotLight.target.position.set(0, 0, 5);

            scene.add(droneClone);
            drones.push(droneClone);

            const laserMat = new THREE.LineBasicMaterial({
                color: i % 2 === 0 ? 0xff0055 : 0x00ffcc, 
                transparent: true,
                opacity: 0.8,
                linewidth: 2
            });
            const laserGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(30, -10, 30) 
            ]);
            const laserLine = new THREE.Line(laserGeo, laserMat);
            laserLine.visible = false; 
            droneClone.add(laserLine);
            laserLines.push(laserLine);
        }
    }, undefined, (err) => console.error('Error loading Drone:', err));

    const windSpeedRange = document.getElementById('windSpeedRange');
    const windDirRange = document.getElementById('windDirRange');
    const emissionRange = document.getElementById('emissionRange');
    const windSpeedVal = document.getElementById('windSpeedVal');
    const windDirVal = document.getElementById('windDirVal');
    const emissionVal = document.getElementById('emissionVal');
    const powerVal = document.getElementById('powerVal');
    const resetBtn = document.getElementById('resetSim');

    let clock = new THREE.Clock();

    windSpeedRange.addEventListener('input', (e) => {
        windSpeed = parseFloat(e.target.value);
        windSpeedVal.textContent = windSpeed;
    });
    if (windDirRange) {
        windDirRange.addEventListener('input', (e) => {
            baseWindDirection = parseFloat(e.target.value);
            if (windDirVal) windDirVal.textContent = baseWindDirection;
        });
    }
    // emissionRange.addEventListener('input', (e) => {
    //     emissionIntensity = parseFloat(e.target.value);
    //     emissionVal.textContent = emissionIntensity.toFixed(1);
    // });
    resetBtn.addEventListener('click', () => {
        windSpeed = 10;
        baseWindDirection = 0;
        emissionIntensity = 1.0;
        windSpeedRange.value = windSpeed;
        if(windDirRange) windDirRange.value = baseWindDirection;
        emissionRange.value = emissionIntensity;
        windSpeedVal.textContent = windSpeed;
        if(windDirVal) windDirVal.textContent = baseWindDirection;
        emissionVal.textContent = emissionIntensity.toFixed(1);
    });


    let lightningTimer = 0;
    let lightningDuration = 0.2; 
    let lightningGap = 3; 

    // 5. Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        let dt = clock.getDelta();
        let time = clock.getElapsedTime();

        let generatedPower = 0.5 * Math.pow(windSpeed, 3) * 0.05; 
        powerVal.textContent = generatedPower.toFixed(1);

        if (seaMesh) {
            seaMesh.rotation.y += 0.2 * dt; 
        }

        const cloudPositions = cloudGeometry.attributes.position.array;
        for (let i = 0; i < cloudCount * 3; i += 3) {
            cloudPositions[i] -= dt * 0.5; 
            if (cloudPositions[i] < -75) {
                cloudPositions[i] = 75; 
            }
        }
        cloudGeometry.attributes.position.needsUpdate = true;

        drones.forEach((drone, index) => {
            drone.userData.angle += drone.userData.speed * dt * 0.2;
            let x = Math.cos(drone.userData.angle) * drone.userData.radius;
            let z = Math.sin(drone.userData.angle) * drone.userData.radius;
            
            let calculatedY = drone.userData.initialY + Math.sin(time * drone.userData.heightSpeed) * 3;
            let y = Math.max(2, calculatedY); 
            if (y > 22) y = 22; 

            drone.position.set(x, y, z);
            drone.rotation.y = -drone.userData.angle;

            if (laserLines[index]) {
                let laserTrigger = Math.sin(time * 3 + index);
                if (laserTrigger > 0.6) {
                    laserLines[index].visible = true;
                    laserLines[index].material.opacity = 0.5 + Math.sin(time * 30) * 0.4;
                } else {
                    laserLines[index].visible = false;
                }
            }
        });

        let oscillation = Math.sin(time * 1.5) * 22.5; 
        dynamicWindDirection = baseWindDirection + oscillation;

        bodies.forEach((body, index) => {
            let baseRad = THREE.MathUtils.degToRad(dynamicWindDirection);
            let staggeredSway = baseRad + Math.sin(time * 5.5 + index * 0.5) * 0.05; 
            body.rotation.y = staggeredSway; 
        });

        if (turbineBlades.length > 0) {
            let fanRotationSpeed = windSpeed * 1.5; 
            turbineBlades.forEach((blade) => {
                let speed = fanRotationSpeed * blade.userData.randomFactor;
                blade.rotation.x -= speed * dt;
            });
        }

        const positions = particleGeometry.attributes.position.array;
        let rad = THREE.MathUtils.degToRad(dynamicWindDirection);
        let particleSpeedFactor = windSpeed * 0.02; 
        let dirX = Math.sin(rad) * particleSpeedFactor;
        let dirZ = Math.cos(rad) * particleSpeedFactor;

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i]     += dirX; 
            positions[i + 1] -= dt * (windSpeed * 1.2 + 2); 
            positions[i + 2] += dirZ; 

            if (positions[i + 1] < 0) {
                positions[i + 1] = 25;
                positions[i] = (Math.random() - 0.5) * 30;
                positions[i + 2] = (Math.random() - 0.5) * 30;
            }

            if (positions[i] > 15) positions[i] = -15;
            if (positions[i] < -15) positions[i] = 15;
            if (positions[i + 2] > 15) positions[i + 2] = -15;
            if (positions[i + 2] < -15) positions[i + 2] = 15;
        }
        particleGeometry.attributes.position.needsUpdate = true;

        emissionMeshes.forEach(mat => {
            mat.emissiveIntensity = emissionIntensity * (windSpeed / 5);
        });

        if (lightningBolt.visible) {
            lightningTimer += dt;
            if (lightningTimer > lightningDuration) {
                lightningBolt.visible = false;
                lightningMaterial.opacity = 0;
                scene.background.setHex(0x0f0f0f); 
                ambientLight.intensity = 1.0;      
                lightningTimer = 0;
                lightningGap = 2 + Math.random() * 4; 
            } else {
                let flashIntensity = 0.8 + Math.sin(lightningTimer * 50) * 0.4;
                lightningMaterial.opacity = flashIntensity;
                scene.background.setHex(0x2a3b5c); 
                ambientLight.intensity = 3.5;      
            }
        } else {
            lightningGap -= dt;
            if (lightningGap <= 0) {
                const startX = (Math.random() - 0.5) * 40;
                const startZ = (Math.random() - 0.5) * 40;
                
                const newPoints = [
                    new THREE.Vector3(startX, 35, startZ),
                    new THREE.Vector3(startX + (Math.random() - 0.5) * 4, 24, startZ + (Math.random() - 0.5) * 4),
                    new THREE.Vector3(startX + (Math.random() - 0.5) * 6, 12, startZ + (Math.random() - 0.5) * 6),
                    new THREE.Vector3(startX + (Math.random() - 0.5) * 2, 4, startZ + (Math.random() - 0.5) * 2),
                    newETA = new THREE.Vector3(startX, 0, startZ)
                ];
                // တန်ဖိုးအမှန်ပြင်ဆင်ရန်
                newPoints[4] = new THREE.Vector3(startX, 0, startZ);
                
                lightningBolt.geometry.dispose();
                lightningBolt.geometry = new THREE.BufferGeometry().setFromPoints(newPoints);
                lightningBolt.visible = true;
            }
        }

        controls.update();
        composer.render();
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        composer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
});