document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('physics-canvas');
    if (!canvas) return;

    const canvasContainer = document.getElementById('canvasContainer');

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f0f);

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 10000);
    camera.position.set(-100, 600, 500); 

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // --- Bloom Effect Setup (Post-Processing) ---
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
        0.15,  
        0.4,  
        0.85  
    );
    
    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // 2. Lighting Setup
    const sunLight = new THREE.DirectionalLight(0xfffaed, 4.0);
    const sunLightPos = new THREE.Vector3(-4000, 2000, 4000);
    sunLight.position.copy(sunLightPos);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x222244, 0.6);
    scene.add(ambientLight);

    const rgbeLoader = new THREE.RGBELoader();
    rgbeLoader.load('models/grasslands_sunset_4k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture; 
    }, undefined, (error) => {
        console.warn('HDRI Loading failed:', error);
    });

    // 3. Variables & Controls state
    let selectedSatelliteTarget = 'earth';
    let emissiveMaterials = [];
    let orbitingSatellites = [];
    let localPropellers = [];

    // UI Elements
    const satelliteSelect = document.getElementById('satelliteSelect');
    const resetBtn = document.getElementById('resetSim');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const powerVal = document.getElementById('powerVal');
    const eclipseStatus = document.getElementById('eclipse-status');
    const camInfo = document.getElementById('cam-info');

    if (satelliteSelect) {
        satelliteSelect.addEventListener('change', (e) => {
            selectedSatelliteTarget = e.target.value;
            if (camInfo) {
                camInfo.textContent = `Tracking: ${satelliteSelect.options[satelliteSelect.selectedIndex].text}`;
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            selectedSatelliteTarget = 'earth';
            if (satelliteSelect) satelliteSelect.value = 'earth';
            if (powerVal) powerVal.textContent = '145.0';
            if (eclipseStatus) {
                eclipseStatus.textContent = "Status: In Sunlight (Generating)";
                eclipseStatus.style.color = "#00ffcc";
            }
            if (camInfo) camInfo.textContent = 'Tracking: Earth Overview';
            camera.position.set(-100, 600, 500);
            controls.target.set(0, 0, 0);
        });
    }

    // --- Fullscreen Toggle (ကင်းဗတ်ပါရှိသော Container ကို မျက်နှာပြင်အပြည့်လုပ်ရန်) ---
    if (fullscreenBtn && canvasContainer) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (canvasContainer.requestFullscreen) {
                    canvasContainer.requestFullscreen();
                } else if (canvasContainer.webkitRequestFullscreen) {
                    canvasContainer.webkitRequestFullscreen();
                } else if (canvasContainer.msRequestFullscreen) {
                    canvasContainer.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        });
    }

    // 4. Starfield Background
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const starPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i++) {
        starPositions[i] = (Math.random() - 0.5) * 8000;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: true });
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // 5. Load Earth, Clouds and Atmosphere
    const loader = new THREE.GLTFLoader();
    let earthMesh = null;

    loader.load('models/Earth.glb', function (gltf) {
        earthMesh = gltf.scene;
        earthMesh.scale.set(1, 1, 1); 
        earthMesh.position.set(0, 0, 0);
        earthMesh.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                if (node.material) {
                    node.material.envMapIntensity = 0.2; 
                    node.material.roughness = 0.9;       
                    node.material.metalness = 0.1;       
                }
            }
        });
        scene.add(earthMesh);
    }, undefined, (err) => {
        console.error('Error loading Earth:', err);
    });

    const cloudGeo = new THREE.SphereGeometry(623, 64, 64); 
    const cloudTextureLoader = new THREE.TextureLoader();
    const cloudTexture = cloudTextureLoader.load('models/earth_clouds_8K.jpg'); 
    const cloudMat = new THREE.MeshStandardMaterial({
        map: cloudTexture,
        alphaMap: cloudTexture,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(cloudMesh);

    const atmosGeo = new THREE.SphereGeometry(620, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float fresnel = dot(vNormal, vec3(0.0, 0.0, 1.0));
                float intensity = pow(0.8 - fresnel, 2.0); 
                float baseAtmosphere = max(0.0, fresnel) * 0.2; 
                float finalIntensity = intensity + baseAtmosphere;
                gl_FragColor = vec4(0.2, 0.5, 1.0, 1.0) * finalIntensity;
            }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true
    });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosphere);

    // 6. Orbiting Satellites Setup
    loader.load('models/solarPanel.glb', function (gltf) {
        const baseSatelliteModel = gltf.scene;
        const orbitConfigs = [
            { radius: 630, speed: 0.002, inclination: 0.3, offset: 0.5 },
            { radius: 700, speed: 0.0015, inclination: -0.4, offset: 2.1 },
            { radius: 800, speed: 0.001, inclination: 0.7, offset: 4.2 },
            { radius: 900, speed: 0.0025, inclination: -0.8, offset: 3.0 },
            { radius: 1000, speed: 0.0008, inclination: 0.1, offset: 1.5 }
        ];

        orbitConfigs.forEach((config, idx) => {
            const satClone = baseSatelliteModel.clone(true);
            satClone.scale.set(0.8, 0.8, 0.8);

            let leftP = null;
            let rightP = null;

            satClone.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    if (node.material && node.material.emissive) {
                        emissiveMaterials.push(node.material);
                        node.material.emissiveIntensity = 2.0;
                    }
                    if (node.name.toLowerCase().includes('propeller')) {
                        localPropellers.push(node);
                    }
                }
                if (node.name.toLowerCase().includes('leftpanel') || node.name.toLowerCase().includes('left_panel')) {
                    leftP = node;
                }
                if (node.name.toLowerCase().includes('rightpanel') || node.name.toLowerCase().includes('right_panel')) {
                    rightP = node;
                }
            });

            scene.add(satClone);

            orbitingSatellites.push({
                id: `sat${idx}`,
                mesh: satClone,
                leftPanel: leftP,
                rightPanel: rightP,
                radius: config.radius,
                speed: config.speed,
                inclination: config.inclination,
                angle: config.offset
            });
        });
    }, undefined, (err) => {
        console.error('Error loading satellites:', err);
    });

    let clock = new THREE.Clock();

    // 7. Animation Loop & Orientations (Y-Axis Rotation for Panels)
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        if (earthMesh) earthMesh.rotation.y += 0.001;
        atmosphere.rotation.y += 0.001;
        if (cloudMesh) cloudMesh.rotation.y += 0.0012;

        let activePower = 145.0;
        let inShadowOverall = false;

        orbitingSatellites.forEach((sat) => {
            sat.angle += sat.speed;
            const x = Math.cos(sat.angle) * sat.radius;
            const z = Math.sin(sat.angle) * sat.radius;
            const y = Math.sin(sat.angle * 1.5) * sat.radius * sat.inclination;

            sat.mesh.position.set(x, y, z);

            // ၁။ ဂြိုဟ်တု Main Model တစ်ခုလုံးကို World Origin (0,0,0) ဘက်သို့ မျက်နှာမူစေခြင်း
            sat.mesh.lookAt(0, 0, 0);

            // ၂။ LeftPanels နဲ့ RightPanels တို့ကို Y ဝန်ရိုး (Y-axis) အတိုင်းသာ နေဘက်သို့ မျက်နှာမူစေခြင်း
            if (sat.leftPanel && sat.rightPanel) {
                const worldPos = new THREE.Vector3();
                sat.leftPanel.getWorldPosition(worldPos);
                
                const dirToSun = sunLightPos.clone().sub(worldPos);
                const targetRotationY = Math.atan2(dirToSun.x, dirToSun.z);

                sat.leftPanel.rotation.y = targetRotationY;
                sat.rightPanel.rotation.y = targetRotationY;
            }

            // ၃။ ကမ္ဘာအရိပ်ကျရောက်မှု (Eclipse) တွက်ချက်ခြင်း
            const satToEarthDir = sat.mesh.position.clone().normalize();
            const dotProduct = satToEarthDir.dot(sunLightPos.clone().normalize());
            
            if (dotProduct < -0.15) { 
                if (sat.id === selectedSatelliteTarget) inShadowOverall = true;
            }
        });

        localPropellers.forEach((prop) => {
            prop.rotation.z += 0.15;
        });

        if (emissiveMaterials.length > 0) {
            let pulseGlow = 1.5 + Math.sin(elapsedTime * 6) * 0.8;
            emissiveMaterials.forEach(mat => {
                mat.emissiveIntensity = Math.max(0.4, pulseGlow);
            });
        }

        // Camera Tracking & Power Calculation
        if (selectedSatelliteTarget !== 'earth') {
            const targetObj = orbitingSatellites.find(s => s.id === selectedSatelliteTarget);
            if (targetObj) {
                controls.target.copy(targetObj.mesh.position);
                
                const frontOffset = targetObj.mesh.position.clone().add(new THREE.Vector3(12, 5, 12));
                camera.position.lerp(frontOffset, 0.08);

                if (inShadowOverall) {
                    activePower = 3.5; 
                    if (eclipseStatus) {
                        eclipseStatus.textContent = "Status: In Earth's Shadow (Eclipse)";
                        eclipseStatus.style.color = "#ee1c4b";
                    }
                } else {
                    activePower = 145.0; 
                    if (eclipseStatus) {
                        eclipseStatus.textContent = "Status: In Sunlight (Generating)";
                        eclipseStatus.style.color = "#00ffcc";
                    }
                }
            }
        } else {
            controls.target.set(0, 0, 0);
            if (eclipseStatus) {
                eclipseStatus.textContent = "Status: Earth Overview Mode";
                eclipseStatus.style.color = "#ffcc00";
            }
        }

        if (powerVal) powerVal.textContent = activePower.toFixed(1);

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