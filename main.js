import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let floorMesh = null; 
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickableObjects = []; 

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const container = document.getElementById('three-container');
container.appendChild(renderer.domElement);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.3;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// SpotLight များနှင့် အရိပ်များ သတ်မှတ်ခြင်း
const lightPositions = [
    { x: 7.5, z: 7.5 },
    { x: 7.5, z: 0 },
    { x: 0, z: -7.5 },
    { x: 7.5, z: -7.5 }
];

lightPositions.forEach(pos => {
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.power = 1000;
    spotLight.position.set(pos.x, 8, pos.z);
    spotLight.target.position.set(pos.x, 0 , pos.z);
    spotLight.angle = Math.PI / 3;
    spotLight.penumbra = 0.8;
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.001;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    scene.add(spotLight);
    scene.add(spotLight.target);
});

// Curve များနှင့် မော်ဒယ်များ လုဒ်လုပ်ခြင်း
const rotationMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
const cameraPoints = ([
    new THREE.Vector3(-8.349138259887695, 0.36281853914260864, 2.337218999862671),
    new THREE.Vector3(-7.947566986083984, 0.6351768970489502, 2.6128194332122803),
    new THREE.Vector3(-7.431847095489502, 0.8292107582092285, 2.9013867378234863),
    new THREE.Vector3(-6.816199779510498, 0.9570558071136475, 3.1935949325561523),
    new THREE.Vector3(-6.11484432220459, 1.0308476686477661, 3.480119228363037),
    new THREE.Vector3(-5.342000484466553, 1.0627223253250122, 3.7516331672668457),
    new THREE.Vector3(-4.5118889808654785, 1.0648151636123657, 3.9988112449645996),
    new THREE.Vector3(-3.638728618621826, 1.0492621660232544, 4.2123284339904785),
    new THREE.Vector3(-2.7367398738861084, 1.0281985998153687, 4.3828582763671875),
    new THREE.Vector3(-1.8201422691345215, 1.0137605667114258, 4.501075744628906),
    new THREE.Vector3(-0.9031559824943542, 1.0180834531784058, 4.557655334472656),
    new THREE.Vector3(0.0, 1.0533032417297363, 4.543269634246826),
    new THREE.Vector3(0.90226811170578, 1.129454493522644, 4.452752113342285),
    new THREE.Vector3(1.8026235103607178, 1.2381505966186523, 4.294386863708496),
    new THREE.Vector3(2.691617488861084, 1.3654742240905762, 4.077497959136963),
    new THREE.Vector3(3.5598020553588867, 1.4975086450576782, 3.8114113807678223),
    new THREE.Vector3(4.397728443145752, 1.6203361749649048, 3.5054516792297363),
    new THREE.Vector3(5.195949077606201, 1.7200404405593872, 3.1689441204071045),
    new THREE.Vector3(5.9450154304504395, 1.7827035188674927, 2.8112142086029053),
    new THREE.Vector3(6.635478973388672, 1.7944084405899048, 2.441586971282959),
    new THREE.Vector3(7.257891654968262, 1.741237759590149, 2.069387435913086),
    new THREE.Vector3(7.802804946899414, 1.609274983406067, 1.7039411067962646),
    new THREE.Vector3(8.260770797729492, 1.384602427482605, 1.3545727729797363),
    new THREE.Vector3(8.622342109680176, 1.0533032417297363, 1.0306075811386108),
    new THREE.Vector3(8.943147659301758, 0.4660835266113281, 0.6604627370834351),
    new THREE.Vector3(8.998405456542969, -0.13078048825263977, 0.4508887529373169),
    new THREE.Vector3(8.811088562011719, -0.726304292678833, 0.3786916732788086),
    new THREE.Vector3(8.404170989990234, -1.3095030784606934, 0.42067813873291016),
    new THREE.Vector3(7.800626754760742, -1.8693917989730835, 0.5536540746688843),
    new THREE.Vector3(7.023427486419678, -2.394986152648926, 0.7544256448745728),
    new THREE.Vector3(6.095546722412109, -2.875300407409668, 0.9997991323471069),
    new THREE.Vector3(5.039958953857422, -3.2993507385253906, 1.266580581665039),
    new THREE.Vector3(3.879636526107788, -3.65615177154541, 1.53157639503479),
    new THREE.Vector3(2.6375532150268555, -3.9347190856933594, 1.771592378616333),
    new THREE.Vector3(1.3366819620132446, -4.124067306518555, 1.963435173034668),
    new THREE.Vector3(0.0, -4.213212966918945, 2.0839109420776367),
    new THREE.Vector3(-1.187278389930725, -4.198128700256348, 2.1168041229248047),
    new THREE.Vector3(-2.361645460128784, -4.095775604248047, 2.090386152267456),
    new THREE.Vector3(-3.501405954360962, -3.914006233215332, 2.020656108856201),
    new THREE.Vector3(-4.584866046905518, -3.660672664642334, 1.9236128330230713),
    new THREE.Vector3(-5.590330123901367, -3.3436279296875, 1.815256118774414),
    new THREE.Vector3(-6.496103763580322, -2.970724105834961, 1.7115850448608398),
    new THREE.Vector3(-7.280492305755615, -2.5498132705688477, 1.628598690032959),
    new THREE.Vector3(-7.92180061340332, -2.0887489318847656, 1.5822962522506714),
    new THREE.Vector3(-8.398335456848145, -1.595382571220398, 1.588677167892456),
    new THREE.Vector3(-8.688399314880371, -1.0775671005249023, 1.663740634918213),
    new THREE.Vector3(-8.77030086517334, -0.5431551933288574, 1.8234858512878418),
    new THREE.Vector3(-8.622342109680176, 5.960464477539063e-08, 2.0839109420776367),
]);
cameraPoints.forEach(p => p.applyMatrix4(rotationMatrix));
const cameraCurve = new THREE.CatmullRomCurve3(cameraPoints, true, 'centripetal', 0.5);

const objectCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(8, 2, 8),
    new THREE.Vector3(-8, 1, 8),
    new THREE.Vector3(-8, 2, -8),
    new THREE.Vector3(8, 1, -8)
], true, 'centripetal', 0.5 );

let progress = 0;
const speed = 0.0002;
let movingModel = null;

const loader = new GLTFLoader();

loader.load('Fish_All.glb', (gltf) => {
    movingModel = gltf.scene;
    scene.add(movingModel);
    movingModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            child.visible = false;
        }
    });
});

loader.load('Portfolio.glb', (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                if (child.material.emissiveMap) {
                    child.material.emissive = new THREE.Color(0xffffff);
                    child.material.emissiveIntensity = 3.0;
                }
                child.material.roughness = Math.max(child.material.roughness, 0.2);
                child.material.needsUpdate = true;
            }
            if (child.name === "SideLight") {
                child.castShadow = false;
                child.receiveShadow = false;
            }
            if (child.name === "Floor") {
                floorMesh = child; 
            }
        }
    });
    scene.add(model);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let isCinematic = false;
let idleTimeout = null;
let lastCameraPosition = new THREE.Vector3(-3, 1.6, 0);
let lastCameraQuaternion = new THREE.Quaternion();
let isDragging = false;
let clickStartTime = 0;
let clickStartPos = { x: 0, y: 0 };
let previousMousePosition = { x: 0, y: 0 };

const markerGeometry = new THREE.RingGeometry(0.3, 0.4, 32); 
markerGeometry.rotateX(-Math.PI / 2); 
const markerMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff, 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
});

const floorMarker = new THREE.Mesh(markerGeometry, markerMaterial);
floorMarker.position.y = 0.01; 
floorMarker.visible = false;
scene.add(floorMarker);

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
euler.setFromQuaternion(camera.quaternion);

function resetIdleTimer() {
    clearTimeout(idleTimeout);
    if (isCinematic) {
        returnToOriginalView();
    }
    // ၁၀ စက္ကန့် (10000 ms) ဘာမှမနှိပ်မှ Cinematic စတင်မည်
    idleTimeout = setTimeout(() => {
        if (!isCinematic) startCinematicDrone(); 
    }, 10000); 
}

function returnToOriginalView() {
    if (!isCinematic) return;
    isCinematic = false;
    
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(camera); 
    
    gsap.to(camera.position, { 
        duration: 1.5, 
        x: lastCameraPosition.x, 
        y: lastCameraPosition.y, 
        z: lastCameraPosition.z, 
        ease: "power2.out", 
        onComplete: () => {  
            resetIdleTimer(); 
        } 
    });
}

let curveProgress = 0;

function startCinematicDrone() {
    if (isCinematic) return;
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) {
        uiOverlay.classList.remove('active');
    }
    
    lastCameraPosition.copy(camera.position);
    lastCameraQuaternion.copy(camera.quaternion);
    isCinematic = true;

    // Curve ၏ ပထမဆုံးအစမှတ်ဆီသို့ လက်ရှိနေရာမှ Smooth စွာသွားခြင်း
    const startPoint = cameraCurve.getPointAt(0); 

    gsap.to(camera.position, {
        x: startPoint.x,
        y: startPoint.y,
        z: startPoint.z,
        duration: 2.0, 
        ease: "power2.out",
        onUpdate: () => {
            if (movingModel) {
                camera.lookAt(movingModel.position);
            } else {
                camera.lookAt(0, 0, 0);
            }
        },
        onComplete: () => {
            if (isCinematic) {
                curveProgress = 0;
                beginCurveMovement();
            }
        }
    });
}

function beginCurveMovement() {
    gsap.to({ value: curveProgress }, {
        value: 1,
        duration: 40, 
        repeat: -1,   
        ease: "none",
        onUpdate: function() {
            if (!isCinematic) return;
            curveProgress = this.targets()[0].value;
            
            const currentPoint = cameraCurve.getPointAt(curveProgress);
            camera.position.copy(currentPoint);
            
            if (movingModel) {
                camera.lookAt(movingModel.position);
            } else {
                camera.lookAt(0, 0, 0);
            }
        }
    });
}

window.addEventListener('pointerdown', (event) => {
    resetIdleTimer();
    isDragging = true;
    clickStartTime = Date.now();
    clickStartPos.x = event.clientX;
    clickStartPos.y = event.clientY;
    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
});

window.addEventListener('pointermove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (isDragging) {
        floorMarker.visible = false;     
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;
        const moveDistance = Math.hypot(event.clientX - clickStartPos.x, event.clientY - clickStartPos.y);
        
        if (moveDistance > 5) {
            const rotationSpeed = 0.003;
            euler.y += deltaX * rotationSpeed;
            euler.x += deltaY * rotationSpeed;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
            camera.quaternion.setFromEuler(euler);
        }
        renderer.domElement.style.cursor = 'grabbing';
    } else {
        if (floorMesh) {
            const intersects = raycaster.intersectObject(floorMesh);
            if (intersects.length > 0) {
                renderer.domElement.style.cursor = 'pointer';
                floorMarker.visible = true;
                floorMarker.position.x = intersects[0].point.x;
                floorMarker.position.z = intersects[0].point.z;
            } else {
                renderer.domElement.style.cursor = 'grab';
                floorMarker.visible = false;
            }
        }
    }
    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
});

window.addEventListener('pointerup', (event) => {
    resetIdleTimer();
    isDragging = false;
    
    const clickDuration = Date.now() - clickStartTime;
    const moveDistance = Math.hypot(event.clientX - clickStartPos.x, event.clientY - clickStartPos.y);
    
    if (clickDuration < 250 && moveDistance < 5) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        
        if (floorMesh) {
            const intersects = raycaster.intersectObject(floorMesh);
            if (intersects.length > 0) {
                const targetPoint = intersects[0].point;
                gsap.to(camera.position, {
                    x: targetPoint.x,
                    z: targetPoint.z,
                    duration: 1.5,
                    ease: "power2.out",
                    onComplete: () => {
                        lastCameraPosition.copy(camera.position);
                    }
                });
            }
        }
    }
});

animate();

function animate() {
    requestAnimationFrame(animate);

    progress += speed;
    if (progress > 1) progress = 0;

    if (movingModel) {
        const objectPosition = objectCurve.getPointAt(progress);
        movingModel.position.copy(objectPosition);
    }
    
    renderer.render(scene, camera);
}