import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC5U2QwKBo8TiyN_wZ912hdEYhgtLpoTOA",
    authDomain: "heinpop-ai.firebaseapp.com",
    projectId: "heinpop-ai",
    storageBucket: "heinpop-ai.firebasestorage.app",
    messagingSenderId: "1015505581879",
    appId: "1:1015505581879:web:2e40a4a1f65e046f9bccb2",
    measurementId: "G-KW5B79LGV4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let currentChatId = null;
let activeChatMessages = [];
let isVoiceMuted = false;
let currentLangState = localStorage.getItem("portfolio-lang") || "en";
let userProfileImageBase64 = null;

let scene, camera, renderer, controls;
let character1, character2, activeCharacter;
let mixer, mixer1, mixer2;
let animationsMap = new Map();
let animationsMap1 = new Map();
let animationsMap2 = new Map();
let activeAction;
let activeCharIndex = 1; // 1 = Boy, 2 = Girl[cite: 1]

let frontLight, redLight, cyanLight;
const clock = new THREE.Clock();

function updateLoadingProgress(percent, message) {
    const bar = document.getElementById('loadingBar');
    const txt = document.getElementById('loadingText');
    if (bar) bar.style.width = `${percent}%`;
    if (txt && message) txt.textContent = message;
}

function hideCyberLoadingScreen() {
    const screen = document.getElementById('cyberLoadingScreen');
    if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => screen.remove(), 500);
    }
}

window.toggleVoiceSpeech = function() {
    isVoiceMuted = !isVoiceMuted;
    const voiceIcon = document.getElementById('voiceIcon');
    if (isVoiceMuted) {
        if (voiceIcon) voiceIcon.textContent = "volume_off";
        showCustomNotification("AI အသံထွက်ကို ပိတ်ထားလိုက်ပါပြီ။");
    } else {
        if (voiceIcon) voiceIcon.textContent = "volume_up";
        showCustomNotification("AI အသံထွက်ကို ဖွင့်ထားလိုက်ပါပြီ။");
    }
}

// Sidebar Toggle Function (Fixes Console Error)
window.toggleHistorySidebar = function() {
    const sidebar = document.getElementById('historySidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

function showCustomNotification(message) {
    let existingToast = document.getElementById('cyberToast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'cyberToast';
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px);
        background: rgba(14, 8, 24, 0.95); border: 1px solid #00f0ff; color: #00f0ff;
        padding: 10px 20px; border-radius: 8px; font-size: 0.85rem; box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
        z-index: 2000; opacity: 0; transition: all 0.3s ease; backdrop-filter: blur(8px);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function init3DStage() {
    const container = document.querySelector('.cyber-character-stage');
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, .5, 2.5);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('charCanvas'), antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 0, 0);
    controls.enableZoom = false; 
    controls.enableRotate = true;

    const ambient = new THREE.AmbientLight(0xffffff, 2.2);
    scene.add(ambient);

    frontLight = new THREE.PointLight(0xffffff, 5, 10);
    frontLight.position.set(0, 2, 2.5);
    scene.add(frontLight);

    redLight = new THREE.PointLight(0xEE1C4B, 6, 10);
    redLight.position.set(-2, 2, 1);
    scene.add(redLight);

    cyanLight = new THREE.PointLight(0x00f0ff, 5, 10);
    cyanLight.position.set(2, 1, 2);
    scene.add(cyanLight);

    createClubBalloons();
    updateLoadingProgress(20, "LOADING 3D ENVIRONMENT...");

    const loader = new GLTFLoader();
    let loadedCount = 0;

    const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount >= 2) {
            updateLoadingProgress(100, "SYSTEM READY");
            setTimeout(hideCyberLoadingScreen, 400);
        }
    };

    loader.load('Char.glb', (gltf) => {
        character1 = gltf.scene;
        character1.scale.set(1.0, 1.0, 1.0);
        character1.position.set(0, -1.2, 0);
        scene.add(character1);

        mixer1 = new THREE.AnimationMixer(character1);
        if (gltf.animations && gltf.animations.length > 0) {
            gltf.animations.forEach((clip) => {
                animationsMap1.set(clip.name.toUpperCase().trim(), mixer1.clipAction(clip));
            });
        }

        activeCharacter = character1;
        mixer = mixer1;
        animationsMap = animationsMap1;
        activeCharIndex = 1;

        const defaultAction = animationsMap.get('IDLE0') || animationsMap.values().next().value;
        if (defaultAction) {
            activeAction = defaultAction;
            activeAction.play();
        }

        document.getElementById('charStatus').textContent = "CYBER STAGE READY";
        loadCenteredStarters(currentLangState);
        updateLoadingProgress(60, "LOADING CHARACTER 2...");
        checkAllLoaded();
    }, undefined, () => checkAllLoaded());

    loader.load('Char2.glb', (gltf) => {
        character2 = gltf.scene;
        character2.scale.set(1.0, 1.0, 1.0);
        character2.position.set(0, -1.2, 0);
        character2.visible = false;
        scene.add(character2);

        mixer2 = new THREE.AnimationMixer(character2);
        if (gltf.animations && gltf.animations.length > 0) {
            gltf.animations.forEach((clip) => {
                animationsMap2.set(clip.name.toUpperCase().trim(), mixer2.clipAction(clip));
            });
        }
        updateLoadingProgress(90, "FINALIZING STAGE...");
        checkAllLoaded();
    }, undefined, () => checkAllLoaded());

    animate();
}

window.switchCharacter = function(charIndex) {
    const btn1 = document.getElementById('charBtn1');
    const btn2 = document.getElementById('charBtn2');

    if (charIndex === 1) {
        if (!character1) return;
        if (character2) character2.visible = false;
        character1.visible = true;
        activeCharacter = character1;
        mixer = mixer1;
        animationsMap = animationsMap1;
        activeCharIndex = 1;
        if (btn1) btn1.classList.add('active');
        if (btn2) btn2.classList.remove('active');
        showCustomNotification("Boy Character (Char.glb) သို့ ပြောင်းလိုက်ပါပြီ။[cite: 1]");
    } else if (charIndex === 2) {
        if (!character2) return;
        if (character1) character1.visible = false;
        character2.visible = true;
        activeCharacter = character2;
        mixer = mixer2;
        animationsMap = animationsMap2;
        activeCharIndex = 2;
        if (btn2) btn2.classList.add('active');
        if (btn1) btn1.classList.remove('active');
        showCustomNotification("Girl Character (Char2.glb) သို့ ပြောင်းလိုက်ပါပြီ။[cite: 1]");
    }
    fadeToAction('IDLE0', 0.3);
}

function fadeToAction(name, duration = 0.5) {
    const cleanName = name.toUpperCase().trim();
    let nextAction = animationsMap.get(cleanName);

    if (!nextAction) {
        if (activeCharIndex === 1) {
            if (cleanName.includes('TALK')) {
                const talks = ['TALKING0', 'TALKING1', 'TALKING2'].filter(t => animationsMap.has(t));
                nextAction = animationsMap.get(talks[Math.floor(Math.random() * talks.length)] || 'TALKING0');
            } else if (cleanName.includes('DANCE') || cleanName.includes('EXCITING')) {
                const dances = ['DANCE0', 'DANCE1', 'DANCE2'].filter(d => animationsMap.has(d));
                nextAction = animationsMap.get(dances[Math.floor(Math.random() * dances.length)] || 'DANCE0');
            } else {
                nextAction = animationsMap.get('IDLE0');
            }
        } else {
            if (cleanName.includes('TALK')) {
                nextAction = animationsMap.get('TALKING0');
            } else if (cleanName.includes('DANCE') || cleanName.includes('EXCITING')) {
                nextAction = animationsMap.get('EXCITING') || animationsMap.get('GREETING');
            } else {
                nextAction = animationsMap.get('IDLE0');
            }
        }
    }

    if (!nextAction || activeAction === nextAction) return;
    nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
    if (activeAction) activeAction.crossFadeTo(nextAction, duration, true);
    nextAction.play();
    activeAction = nextAction;
}

let balloonsGroup = [];
function createClubBalloons() {
    const balloonGroupContainer = new THREE.Group();
    const balloonGeo = new THREE.SphereGeometry(0.12, 32, 32);
    balloonGeo.scale(1, 1.2, 1);
    const colors = [0xff0055, 0x00f0ff, 0x7000ff, 0x00ffcc, 0xff00aa];
    
    for (let i = 0; i < 15; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0.8 });
        const balloon = new THREE.Mesh(balloonGeo, material);
        balloon.position.set(
            (Math.random() - 0.5) * 3.5,
            Math.random() * 2.0 - 0.5,
            (Math.random() - 0.5) * 2.0 - 0.5
        );
        balloon.userData = { baseY: balloon.position.y, speed: 0.5 + Math.random() * 1.5, offset: Math.random() * Math.PI * 2 };
        balloonGroupContainer.add(balloon);
        balloonsGroup.push(balloon);
    }
    scene.add(balloonGroupContainer);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    if (mixer) mixer.update(delta);
    if (controls) controls.update();
    balloonsGroup.forEach((b) => {
        b.position.y = b.userData.baseY + Math.sin(elapsedTime * b.userData.speed + b.userData.offset) * 0.15;
    });
    if (renderer && scene && camera) renderer.render(scene, camera);
}

init3DStage();

window.handleInlineProfileImageUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        userProfileImageBase64 = e.target.result;
        showCustomNotification("🎨 CV ဓာတ်ပုံကို အောင်မြင်စွာ တင်ပြီးပါပြီ။");
        const badge = document.getElementById('uploadedPhotoBadge');
        if (badge) { badge.innerHTML = `✅ ပုံတင်ပြီးပါပြီ`; badge.style.color = "#00ffcc"; }
        const chatInput = document.getElementById('aiChatInput');
        if (chatInput) { chatInput.value = "I have uploaded my profile photo. Please generate my final CV now."; sendHeinPopAIChat(); }
    };
    reader.readAsDataURL(file);
}

window.loadCenteredStarters = async function(lang = "en") {
    if (activeChatMessages && activeChatMessages.length > 0) {
        const startersWrapper = document.getElementById('centeredStartersContainer');
        if (startersWrapper) startersWrapper.classList.add('hidden');
        return;
    }
    const startersListContainer = document.getElementById('startersChipsList');
    const startersWrapper = document.getElementById('centeredStartersContainer');
    if (!startersListContainer || !startersWrapper) return;

    startersWrapper.classList.remove('hidden');
    startersListContainer.innerHTML = `<div style="font-size:0.75rem; color:#00f0ff; text-align:center;">Generating versatile starters...</div>`;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isStarterRequest: true, lang })
        });
        const data = await response.json();
        let parsed = data;
        if (data.choices && data.choices[0]) {
            parsed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, "").trim());
        }
        startersListContainer.innerHTML = '';
        parsed.starters.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'starter-chip-btn';
            btn.textContent = text;
            btn.onclick = () => {
                const input = document.getElementById('aiChatInput');
                if (input) { input.value = text; sendHeinPopAIChat(); }
            };
            startersListContainer.appendChild(btn);
        });
    } catch (err) {
        console.error("Starters error:", err);
    }
}

// Authentication & Firebase Chat History
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const snap = await getDoc(doc(db, "users", user.uid));
        const userCredits = snap.exists() ? snap.data().credits : 10;
        const creditDisplay = document.getElementById('creditDisplay');
        if (creditDisplay) creditDisplay.textContent = userCredits;
        
        const authContainer = document.getElementById('authContainer');
        if (authContainer) {
            authContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size:0.85rem; color:var(--text-main); font-weight:600;">${user.displayName}</span>
                    <button onclick="logoutUser()" class="toolbar-btn" title="Log Out" style="width: auto; padding: 0 10px; font-size: 0.75rem; border-color: var(--accent); color: var(--accent);">Log Out</button>
                </div>
            `;
        }
        loadUserChats();
    }
});

window.loginWithGoogle = async () => {
    try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); }
};

window.logoutUser = async () => {
    try { await signOut(auth); currentUser = null; location.reload(); } catch (e) { console.error(e); }
};

window.createNewChatSession = async function() {
    if (!currentUser) { openLoginModal(); return; }
    activeChatMessages = [];
    currentChatId = null;
    document.getElementById('chatHistory').innerHTML = '';
    loadCenteredStarters(currentLangState);
    loadUserChats();
}

async function saveCurrentChat(titlePrompt) {
    if (!currentUser) return;
    if (!currentChatId) {
        const chatRef = await addDoc(collection(db, "users", currentUser.uid, "chats"), {
            title: titlePrompt.substring(0, 25) + "...",
            messages: activeChatMessages,
            pinned: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        currentChatId = chatRef.id;
    } else {
        const chatRef = doc(db, "users", currentUser.uid, "chats", currentChatId);
        await updateDoc(chatRef, { messages: activeChatMessages, updatedAt: serverTimestamp() });
    }
    loadUserChats();
}

async function loadUserChats() {
    if (!currentUser) return;
    const chatListContainer = document.getElementById('chatHistoryList');
    if (!chatListContainer) return;
    chatListContainer.innerHTML = '';

    try {
        const q = query(collection(db, "users", currentUser.uid, "chats"), orderBy("updatedAt", "desc"));
        const querySnapshot = await getDocs(q);
        let chats = [];
        querySnapshot.forEach((docSnap) => {
            chats.push({ id: docSnap.id, ...docSnap.data() });
        });

        chats.forEach((data) => {
            const wrapper = document.createElement('div');
            wrapper.className = `history-item-wrapper ${data.id === currentChatId ? 'active' : ''}`;
            wrapper.style.cssText = "padding: 8px 12px; cursor: pointer; border-radius: 6px; margin-bottom: 4px; font-size: 0.85rem; color: var(--text-main); display: flex; justify-content: space-between; align-items: center;";
            wrapper.innerHTML = `<span>${data.title || "New Chat"}</span>`;
            wrapper.onclick = () => selectChatSession(data.id, data.messages);
            chatListContainer.appendChild(wrapper);
        });
    } catch (err) {
        console.error("Error loading chats:", err);
    }
}

function selectChatSession(chatId, messages) {
    currentChatId = chatId;
    activeChatMessages = messages || [];
    const chatBox = document.getElementById('chatHistory');
    const startersWrapper = document.getElementById('centeredStartersContainer');
    if (startersWrapper) startersWrapper.classList.add('hidden');
    chatBox.innerHTML = '';

    activeChatMessages.forEach((msg) => {
        const roleClass = msg.role === 'user' ? 'user' : 'ai';
        const senderName = msg.role === 'user' ? 'You' : 'HeinPop AI';
        chatBox.innerHTML += `<div class="chat-msg ${roleClass}"><strong>${senderName}:</strong> ${msg.content}</div>`;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Main Chat Execution via Vercel Backend Proxy[cite: 3]
window.sendHeinPopAIChat = async function() {
    const input = document.getElementById('aiChatInput');
    const chatHistory = document.getElementById('chatHistory');
    const charStatus = document.getElementById('charStatus');
    const startersWrapper = document.getElementById('centeredStartersContainer');
    
    if (!input || !input.value.trim()) return;
    if (startersWrapper) startersWrapper.classList.add('hidden');

    const userMsg = input.value.trim();
    chatHistory.innerHTML += `<div class="chat-msg user"><strong>You:</strong> ${userMsg}</div>`;
    activeChatMessages.push({ role: "user", content: userMsg });

    input.value = "";
    chatHistory.scrollTop = chatHistory.scrollHeight;

    if (charStatus) charStatus.textContent = "AI THINKING...";
    fadeToAction('THINKING', 0.5);

    try {
        let isCVRequest = userMsg.toLowerCase().includes('cv') || userMsg.toLowerCase().includes('resume') || userMsg.toLowerCase().includes('ဖောင်');
        let isExportRequest = isCVRequest || userMsg.toLowerCase().includes('pdf') || userMsg.toLowerCase().includes('excel') || userMsg.toLowerCase().includes('pptx') || userMsg.toLowerCase().includes('download');

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: activeChatMessages,
                userMsg: userMsg,
                isExportRequest: isExportRequest,
                isCVRequest: isCVRequest,
                hasPhoto: !!userProfileImageBase64,
                lang: currentLangState
            })
        });

        const data = await response.json();
        let parsed = data;
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let rawContent = data.choices[0].message.content;
            let cleanJson = rawContent.trim();
            if (cleanJson.startsWith("```")) {
                cleanJson = cleanJson.replace(/^```(json)?/, "").replace(/```$/, "").trim();
            }
            const jsonStart = cleanJson.indexOf('{');
            const jsonEnd = cleanJson.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
            }
            parsed = JSON.parse(cleanJson);
        }

        let fileBtnHTML = '';
        if (parsed.file_export) {
            const fe = parsed.file_export;
            fileBtnHTML = `<br><button class="cta-button" style="margin-top:8px; font-size:0.75rem;" onclick='triggerFileDownloadFromHistoryDirect(${JSON.stringify(fe)})'>📥 Download ${fe.filename || fe.title} (${fe.type.toUpperCase()})</button>`;
            triggerFileDownloadFromHistoryDirect(fe);
        }

        chatHistory.innerHTML += `<div class="chat-msg ai"><strong>HeinPop AI:</strong> ${parsed.reply}${fileBtnHTML}</div>`;
        activeChatMessages.push({ role: "ai", content: parsed.reply, file_export: parsed.file_export || null });
        chatHistory.scrollTop = chatHistory.scrollHeight;

        if (parsed.action) {
            if (charStatus) charStatus.textContent = `ANIMATION: ${parsed.action}`;
            fadeToAction(parsed.action, 0.5);
        }

        await saveCurrentChat(userMsg);
    } catch (err) {
        console.error(err);
        if (charStatus) charStatus.textContent = "CONNECTION ERROR";
        fadeToAction('IDLE0', 1.0);
    }
}

window.triggerFileDownloadFromHistoryDirect = function(fe) {
    if (!fe) return;
    const type = (fe.type || '').toLowerCase();
    if (type === 'excel') generateExcelFile(fe.filename || 'Data', fe.data || []);
    else if (type === 'pptx') generatePPTXFile(fe.title || 'Presentation', fe.slides || [], fe.theme || null);
    else if (type === 'pdf') generatePDFFile(fe.filename || 'Document', fe.html || '');
    showCustomNotification("🎨 ဖိုင်ကို အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။");
};

window.generateExcelFile = function(fileName, dataArray) {
    if (typeof XLSX === 'undefined') return;
    const worksheet = XLSX.utils.json_to_sheet(dataArray);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

window.generatePPTXFile = function(title, slidesData, theme) {
    if (typeof PptxGenJS === 'undefined') return;
    let pptx = new PptxGenJS();
    let slide = pptx.addSlide();
    slide.background = { color: theme?.bgColor || "0F172A" };
    slide.addText(title, { x: 1, y: 1.5, fontSize: 28, color: theme?.titleColor || "38BDF8", bold: true });
    pptx.writeFile({ fileName: `${title}.pptx` });
};

window.generatePDFFile = function(fileName, htmlContent) {
    if (typeof html2pdf === 'undefined') return;
    let finalHtml = htmlContent;
    if (userProfileImageBase64) finalHtml = finalHtml.replace(/__PROFILE_IMAGE_PLACEHOLDER__/g, userProfileImageBase64);
    html2pdf().from(finalHtml).save(`${fileName}.pdf`);
};
