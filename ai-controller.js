import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔗 Vercel Serverless Proxy Endpoint
const VERCEL_BACKEND_URL = "https://my-project-mu-red.vercel.app/api/chat";

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
let userProfileImageBase64 = null; // 📸 User Profile Image Base64 storage

let scene, camera, renderer, character, controls;
let mixer, animationsMap = new Map();
let activeAction;
let frontLight, redLight, cyanLight;
const clock = new THREE.Clock();

const synth = window.speechSynthesis;
let selectedVoice = null;

function loadVoices() {
    const voices = synth.getVoices();
    selectedVoice = voices.find(voice => 
        (voice.name.includes('Female') || voice.name.includes('Victoria') || voice.name.includes('Google US English') || voice.name.includes('Aria') || voice.name.includes('Zira')) && voice.lang.startsWith('en')
    ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
}

if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
}
loadVoices();

window.toggleVoiceSpeech = function() {
    isVoiceMuted = !isVoiceMuted;
    const voiceIcon = document.getElementById('voiceIcon');
    if (isVoiceMuted) {
        voiceIcon.textContent = "volume_off";
        if (synth.speaking) synth.cancel();
        showCustomNotification("AI အသံထွက်ကို ပိတ်ထားလိုက်ပါပြီ။");
    } else {
        voiceIcon.textContent = "volume_up";
        showCustomNotification("AI အသံထွက်ကို ဖွင့်ထားလိုက်ပါပြီ။");
    }
}

function showCustomNotification(message) {
    let existingToast = document.getElementById('cyberToast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'cyberToast';
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(14, 8, 24, 0.95);
        border: 1px solid #00f0ff;
        color: #00f0ff;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 0.85rem;
        box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
        z-index: 2000;
        opacity: 0;
        transition: all 0.3s ease;
        backdrop-filter: blur(8px);
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

    const loader = new GLTFLoader();
    loader.load('Char.glb', (gltf) => {
        character = gltf.scene;
        character.scale.set(1.0, 1.0, 1.0);
        character.position.set(0, -1.2, 0);
        scene.add(character);

        mixer = new THREE.AnimationMixer(character);

        if (gltf.animations && gltf.animations.length > 0) {
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                animationsMap.set(clip.name.toUpperCase().trim(), action);
            });

            const defaultAction = animationsMap.get('IDLE0') || animationsMap.values().next().value;
            if (defaultAction) {
                activeAction = defaultAction;
                activeAction.play();
            }
        }

        document.getElementById('charStatus').textContent = "CYBER STAGE READY";
        loadCenteredStarters(currentLangState);
    }, undefined, (err) => {
        console.error(err);
        document.getElementById('charStatus').textContent = "ERROR LOADING MODEL";
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

init3DStage();

window.addEventListener('resize', () => {
    const container = document.querySelector('.cyber-character-stage');
    if (!container || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

function fadeToAction(name, duration = 0.5) {
    const cleanName = name.toUpperCase().trim();
    const nextAction = animationsMap.get(cleanName);
    if (!nextAction) return;
    if (activeAction === nextAction) return;

    nextAction.reset();
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);

    if (activeAction) {
        activeAction.crossFadeTo(nextAction, duration, true);
    }

    nextAction.play();
    activeAction = nextAction;
}

function updateStageMood(actionName) {
    const stageElement = document.querySelector('.cyberpunk-stage');
    const moodBadge = document.getElementById('moodBadge');
    if (!stageElement) return;

    stageElement.className = "cyberpunk-stage";
    if (moodBadge) moodBadge.textContent = `MOOD: ${actionName}`;

    if (actionName === 'EXCITING') {
        stageElement.classList.add('mood-exciting');
        if (moodBadge) { moodBadge.style.color = '#00f0ff'; moodBadge.style.borderColor = 'rgba(0,240,255,0.4)'; }
        if (redLight) redLight.color.setHex(0x00f0ff);
        if (cyanLight) cyanLight.color.setHex(0x00ffcc);
    } else if (actionName === 'THINKING') {
        stageElement.classList.add('mood-thinking');
        if (moodBadge) { moodBadge.style.color = '#da70d6'; moodBadge.style.borderColor = 'rgba(138,43,226,0.4)'; }
        if (redLight) redLight.color.setHex(0x8a2be2);
        if (cyanLight) cyanLight.color.setHex(0xda70d6);
    } else if (actionName === 'ARGUING' || actionName === 'AGGRESIVE') {
        stageElement.classList.add('mood-drama');
        if (moodBadge) { moodBadge.style.color = '#ff4d6d'; moodBadge.style.borderColor = 'rgba(238,28,75,0.4)'; }
        if (redLight) redLight.color.setHex(0xff0033);
        if (cyanLight) cyanLight.color.setHex(0xff5722);
    } else if (actionName === 'THANKFUL') {
        stageElement.classList.add('mood-warm');
        if (moodBadge) { moodBadge.style.color = '#ffd700'; moodBadge.style.borderColor = 'rgba(255,165,0,0.4)'; }
        if (redLight) redLight.color.setHex(0xffa500);
        if (cyanLight) cyanLight.color.setHex(0xffd700);
    } else {
        stageElement.classList.add('mood-idle');
        if (moodBadge) { moodBadge.style.color = '#00f0ff'; moodBadge.style.borderColor = 'rgba(0,240,255,0.3)'; }
        if (redLight) redLight.color.setHex(0xEE1C4B);
        if (cyanLight) cyanLight.color.setHex(0x00f0ff);
    }
}

function updateMindsetAndMoodUI(mindset, emotion) {
    let mindsetBadge = document.getElementById('mindsetBadge');
    if (!mindsetBadge) {
        const headerTools = document.querySelector('.header-tools');
        if (headerTools) {
            mindsetBadge = document.createElement('div');
            mindsetBadge.id = 'mindsetBadge';
            headerTools.appendChild(mindsetBadge);
        }
    }
    if (mindsetBadge) {
        mindsetBadge.style.cssText = "font-size: 0.72rem; padding: 4px 10px; border-radius: 20px; background: rgba(238,28,75,0.15); border: 1px solid var(--accent); color: var(--text-main); letter-spacing: 0.5px; backdrop-filter: blur(6px); margin-left: auto; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block; vertical-align: middle;";
        mindsetBadge.title = `Mindset: ${mindset || "NEUTRAL"} | Emotion: ${emotion || "CALM"}`;
        mindsetBadge.innerHTML = `🧠 <b>${mindset || "NEUTRAL"}</b> | ⚡ <b>${emotion || "CALM"}</b>`;
    }
}

window.handleInlineProfileImageUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        userProfileImageBase64 = e.target.result;
        showCustomNotification("🎨 CV ဓာတ်ပုံကို အောင်မြင်စွာ တင်ပြီးပါပြီ။ CV ထုတ်လုပ်နေပါပြီ...");
        
        const badge = document.getElementById('uploadedPhotoBadge');
        if (badge) {
            badge.innerHTML = `✅ ပုံတင်ပြီးပါပြီ`;
            badge.style.color = "#00ffcc";
        }

        const chatInput = document.getElementById('aiChatInput');
        if (chatInput) {
            chatInput.value = "I have uploaded my profile photo. Please generate my final CV now.";
            sendHeinPopAIChat();
        }
    };
    reader.readAsDataURL(file);
}

window.handleInlineInfoFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const chatInput = document.getElementById('aiChatInput');
        if (chatInput) {
            chatInput.value = `Here is my CV information loaded from file: ${file.name}`;
            sendHeinPopAIChat();
        }
        showCustomNotification("📁 အချက်အလက်ဖိုင်ကို အောင်မြင်စွာ ဖတ်ရှုပြီးပါပြီ။");
    };
    reader.readAsText(file);
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
    startersListContainer.innerHTML = `<div style="font-size:0.75rem; color:#00f0ff; text-align:center;" data-en="Generating versatile starters..." data-mm="နယ်ပယ်စုံမှ အကြံပြုချက်များ ဖန်တီးနေသည်...">Generating versatile starters...</div>`;

    try {
        const response = await fetch(VERCEL_BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                isStarterRequest: true,
                lang: lang
            })
        });

        const data = await response.json();
        let rawContent = data.choices[0].message.content;

        let parsed;
        try {
            const cleanJson = rawContent.replace(/```json|```/g, "").trim();
            parsed = JSON.parse(cleanJson);
        } catch (e) {
            parsed = { 
                starters: lang === "mm" ? [
                    "🎨 Professional CV ဖောင်အလှ ဖန်တီးရန်",
                    "✨ Modern Brand Identity ဒီဇိုင်းဆွဲရန်",
                    "🚀 Creative Portfolio Layout ပြုလုပ်ရန်"
                ] : [
                    "🎨 Design Professional CV Layout",
                    "✨ Modern Brand Identity Concept",
                    "🚀 Creative Portfolio Structure"
                ]
            };
        }

        if (activeChatMessages && activeChatMessages.length > 0) {
            startersWrapper.classList.add('hidden');
            return;
        }

        startersListContainer.innerHTML = '';
        parsed.starters.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'starter-chip-btn';
            btn.textContent = text;
            
            btn.onclick = () => {
                const input = document.getElementById('aiChatInput');
                if (input) {
                    input.value = text;
                    sendHeinPopAIChat();
                }
            };
            
            startersListContainer.appendChild(btn);
        });

    } catch (err) {
        console.error("Starters error:", err);
        startersListContainer.innerHTML = `<div style="font-size:0.75rem; color:#ff4d6d; text-align:center;">Failed to load trendy starters.</div>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("theme-toggle");
    const body = document.body;
    const themeIcon = themeToggle ? themeToggle.querySelector(".material-symbols-outlined") : null;

    const savedTheme = localStorage.getItem("portfolio-theme") || "dark";
    if (savedTheme === "light") {
        body.classList.remove("dark-theme");
        body.classList.add("light-theme");
        if (themeIcon) themeIcon.textContent = "dark_mode";
    }

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            if (body.classList.contains("dark-theme")) {
                body.classList.remove("dark-theme");
                body.classList.add("light-theme");
                localStorage.setItem("portfolio-theme", "light");
                if (themeIcon) themeIcon.textContent = "dark_mode";
            } else {
                body.classList.remove("light-theme");
                body.classList.add("dark-theme");
                localStorage.setItem("portfolio-theme", "dark");
                if (themeIcon) themeIcon.textContent = "light_mode";
            }
        });
    }

    const langToggle = document.getElementById("lang-toggle");
    const langText = langToggle ? langToggle.querySelector(".lang-text") : null;
    currentLangState = localStorage.getItem("portfolio-lang") || "en";

    const updateDOMText = (lang) => {
        document.querySelectorAll("[data-en]").forEach(el => {
            const translation = el.getAttribute(`data-${lang}`);
            if (translation) el.textContent = translation;
        });
        document.querySelectorAll("[data-en-placeholder]").forEach(el => {
            const ph = el.getAttribute(`data-${lang}-placeholder`);
            if (ph) el.placeholder = ph;
        });
        if (langText) langText.textContent = lang === "en" ? "MM" : "EN";
    };

    updateDOMText(currentLangState);

    if (langToggle) {
        langToggle.addEventListener("click", () => {
            currentLangState = currentLangState === "en" ? "mm" : "en";
            localStorage.setItem("portfolio-lang", currentLangState);
            updateDOMText(currentLangState);
            loadCenteredStarters(currentLangState);
        });
    }
});

window.openLoginModal = () => document.getElementById('loginModal').classList.add('active');
window.closeLoginModal = () => document.getElementById('loginModal').classList.remove('active');
window.openShareModal = (url) => {
    document.getElementById('shareLinkInput').value = url;
    document.getElementById('shareModal').classList.add('active');
};
window.closeShareModal = () => document.getElementById('shareModal').classList.remove('active');

window.copyShareLink = () => {
    const input = document.getElementById('shareLinkInput');
    input.select();
    navigator.clipboard.writeText(input.value);
    showCustomNotification("Public Share Link ကို ကူးယူပြီးပါပြီ။");
};

window.toggleHistorySidebar = () => document.getElementById('historySidebar').classList.toggle('open');

window.loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
        closeLoginModal();
    } catch (e) {
        console.error(e);
    }
};

window.logoutUser = async () => {
    try {
        await signOut(auth);
        currentUser = null;
        document.getElementById('creditDisplay').textContent = "--";
        document.getElementById('authContainer').innerHTML = `<button class="cta-button" onclick="openLoginModal()" style="padding: 0.5rem 1.2rem; font-size: 0.85rem;" data-en="Sign In" data-mm="အကောင့်ဝင်ရန်">Sign In</button>`;
        document.getElementById('chatHistoryList').innerHTML = "";
        showCustomNotification("အကောင့်မှ ထွက်ပြီးပါပြီ။");
    } catch (e) {
        console.error("Logout error:", e);
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const snap = await getDoc(doc(db, "users", user.uid));
        const userCredits = snap.exists() ? snap.data().credits : 10;
        document.getElementById('creditDisplay').textContent = userCredits;
        
        document.getElementById('authContainer').innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size:0.85rem; color:var(--text-main); font-weight:600;">${user.displayName}</span>
                <button onclick="logoutUser()" class="toolbar-btn" title="Log Out" style="width: auto; padding: 0 10px; font-size: 0.75rem; border-color: var(--accent); color: var(--accent);">Log Out</button>
            </div>
        `;
        loadUserChats();
    }
});

window.createNewChatSession = async function() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    activeChatMessages = [];
    currentChatId = null;
    document.getElementById('chatHistory').innerHTML = '';
    
    currentLangState = localStorage.getItem("portfolio-lang") || "en";
    loadCenteredStarters(currentLangState);
    loadUserChats();
}

async function loadUserChats() {
    if (!currentUser) return;
    const chatListContainer = document.getElementById('chatHistoryList');
    chatListContainer.innerHTML = '';

    try {
        const q = query(collection(db, "users", currentUser.uid, "chats"), orderBy("updatedAt", "desc"));
        const querySnapshot = await getDocs(q);

        let chats = [];
        querySnapshot.forEach((docSnap) => {
            chats.push({ id: docSnap.id, ...docSnap.data() });
        });

        chats.sort((a, b) => {
            const pinA = a.pinned ? 1 : 0;
            const pinB = b.pinned ? 1 : 0;
            return pinB - pinA;
        });

        chats.forEach((data) => {
            const wrapper = document.createElement('div');
            wrapper.className = `history-item-wrapper ${data.id === currentChatId ? 'active' : ''}`;

            const titleSpan = document.createElement('div');
            titleSpan.className = `history-item-title ${data.pinned ? 'pinned' : ''}`;
            titleSpan.innerHTML = `${data.pinned ? '<span style="color:#00f0ff; margin-right:4px;">📌</span>' : ''} ${data.title || "New Chat"}`;
            titleSpan.onclick = () => selectChatSession(data.id, data.messages);

            const menuBtn = document.createElement('button');
            menuBtn.className = 'history-menu-btn';
            menuBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">more_vert</span>';
            menuBtn.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.history-dropdown-menu').forEach(m => { if(m !== dropdown) m.classList.remove('show'); });
                dropdown.classList.toggle('show');
            };

            const dropdown = document.createElement('div');
            dropdown.className = 'history-dropdown-menu';
            
            const pinOpt = document.createElement('button');
            pinOpt.className = 'dropdown-opt';
            pinOpt.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">keep</span> ${data.pinned ? 'Unpin' : 'Pin'}`;
            pinOpt.onclick = (e) => { e.stopPropagation(); togglePinChat(data.id, !data.pinned); };

            const shareOpt = document.createElement('button');
            shareOpt.className = 'dropdown-opt';
            shareOpt.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">share</span> Share Link`;
            shareOpt.onclick = (e) => { e.stopPropagation(); generatePublicShareLink(data); dropdown.classList.remove('show'); };

            const deleteOpt = document.createElement('button');
            deleteOpt.className = 'dropdown-opt delete';
            deleteOpt.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">delete</span> Delete`;
            deleteOpt.onclick = (e) => { e.stopPropagation(); deleteChatSession(data.id); };

            dropdown.appendChild(pinOpt);
            dropdown.appendChild(shareOpt);
            dropdown.appendChild(deleteOpt);

            wrapper.appendChild(titleSpan);
            wrapper.appendChild(menuBtn);
            wrapper.appendChild(dropdown);
            chatListContainer.appendChild(wrapper);
        });
    } catch (err) {
        console.error("Error loading chats:", err);
    }
}

window.togglePinChat = async function(chatId, newPinStatus) {
    if (!currentUser) return;
    try {
        const chatRef = doc(db, "users", currentUser.uid, "chats", chatId);
        await updateDoc(chatRef, { pinned: newPinStatus });
        loadUserChats();
        showCustomNotification(newPinStatus ? "ဆွေးနွေးမှုကို Pin လုပ်ပြီးပါပြီ။" : "Pin ကို ဖြုတ်ပြီးပါပြီ။");
    } catch (err) {
        console.error("Error pinning chat:", err);
    }
}

window.deleteChatSession = async function(chatId) {
    if (!currentUser) return;
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "chats", chatId));
        showCustomNotification("ဆွေးနွေးမှုကို ဖျက်ပြီးပါပြီ။");
        if (currentChatId === chatId) {
            createNewChatSession();
        } else {
            loadUserChats();
        }
    } catch (err) {
        console.error("Error deleting chat:", err);
    }
}

window.generatePublicShareLink = async function(chatData) {
    if (!currentUser) return;
    try {
        const shareRef = await addDoc(collection(db, "public_shares"), {
            title: chatData.title || "Shared Chat",
            messages: chatData.messages || [],
            createdAt: serverTimestamp()
        });
        const shareUrl = `${window.location.origin}${window.location.pathname}?shareId=${shareRef.id}`;
        openShareModal(shareUrl);
    } catch (err) {
        console.error("Error generating share link:", err);
        showCustomNotification("Share Link ထုတ်ယူရာတွင် အမှားဖြစ်ပေါ်သွားပါသည်။");
    }
}

window.addEventListener('click', (e) => {
    if (!e.target.closest('.history-menu-btn') && !e.target.closest('.history-dropdown-menu')) {
        document.querySelectorAll('.history-dropdown-menu').forEach(m => m.classList.remove('show'));
    }
});

function selectChatSession(chatId, messages) {
    currentChatId = chatId;
    activeChatMessages = messages || [];
    const chatBox = document.getElementById('chatHistory');
    const startersWrapper = document.getElementById('centeredStartersContainer');
    
    if (startersWrapper) startersWrapper.classList.add('hidden');
    chatBox.innerHTML = '';

    activeChatMessages.forEach((msg, idx) => {
        const roleClass = msg.role === 'user' ? 'user' : 'ai';
        const senderName = msg.role === 'user' ? 'You' : 'HeinPop AI';
        
        let fileBtnHTML = '';
        if (msg.file_export) {
            const fe = msg.file_export;
            const fileNameOrTitle = fe.filename || fe.title || 'File';
            const fileType = (fe.type || 'file').toUpperCase();
            
            const btnText = `📥 Download ${fileNameOrTitle} (${fileType})`;
            fileBtnHTML = `<br><button class="cta-button" style="margin-top:8px; padding: 4px 12px; font-size: 0.75rem;" onclick="triggerFileDownloadFromHistory(${idx})">${btnText}</button>`;
        }

        let cleanContent = msg.content ? msg.content.replace(/[\#\*\`\>]/g, '').trim() : '';
        chatBox.innerHTML += `<div class="chat-msg ${roleClass}"><strong>${senderName}:</strong> ${cleanContent}${fileBtnHTML}</div>`;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
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

// 🛡️ Vercel Serverless Backend Proxy ဆီသို့ Request ပို့ပေးသော Main Chat Handler
window.sendHeinPopAIChat = async function() {
    const input = document.getElementById('aiChatInput');
    const chatHistory = document.getElementById('chatHistory');
    const charStatus = document.getElementById('charStatus');
    const startersWrapper = document.getElementById('centeredStartersContainer');
    
    if (!input.value.trim()) return;
    
    if (startersWrapper) startersWrapper.classList.add('hidden');

    const userMsg = input.value.trim();
    chatHistory.innerHTML += `<div class="chat-msg user"><strong>You:</strong> ${userMsg}</div>`;
    activeChatMessages.push({ role: "user", content: userMsg });

    input.value = "";
    chatHistory.scrollTop = chatHistory.scrollHeight;

    charStatus.textContent = "AI THINKING...";
    fadeToAction('THINKING', 0.5);
    updateStageMood('THINKING');

    try {
        let isCVRequest = userMsg.toLowerCase().includes('cv') || userMsg.toLowerCase().includes('resume') || userMsg.toLowerCase().includes('ဖောင်');
        let isExportRequest = isCVRequest || userMsg.toLowerCase().includes('pdf') || userMsg.toLowerCase().includes('excel') || userMsg.toLowerCase().includes('pptx') || userMsg.toLowerCase().includes('download') || userMsg.toLowerCase().includes('presentation');

        // Vercel Serverless API Proxy ဆီသို့ Fetch ခေါ်ယူခြင်း
        const response = await fetch(VERCEL_BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                messages: activeChatMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
                userMsg: userMsg,
                isExportRequest: isExportRequest,
                isCVRequest: isCVRequest,
                hasPhoto: !!userProfileImageBase64
            })
        });

        const data = await response.json();
        let rawContent = data.choices[0].message.content;

        let parsed;
        try {
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
        } catch (e) {
            console.error("JSON Parse Error:", e, rawContent);
            parsed = { 
                reply: rawContent.replace(/[\#\*\`\>]/g, '').trim(), 
                action: "TALKING0", 
                mindset: "CREATIVE", 
                emotion: "INSPIRED", 
                file_export: null 
            };
        }

        if (parsed.reply) {
            parsed.reply = parsed.reply.replace(/[\#\*\`\>]/g, '').trim();
        }

        let inlineUploadHTML = '';
        const lowerReply = (parsed && parsed.reply) ? parsed.reply.toLowerCase() : '';
        const lowerUserMsg = userMsg.toLowerCase();
        
        const needsPhoto = lowerUserMsg.includes('ပုံ') || lowerUserMsg.includes('photo') || lowerUserMsg.includes('cv') ||
                           lowerReply.includes('photo') || lowerReply.includes('ဓာတ်ပုံ') || lowerReply.includes('upload') || lowerReply.includes('တင်ရန်');

        if (!userProfileImageBase64 && needsPhoto && !parsed.file_export) {
            inlineUploadHTML = `
                <div style="margin-top: 12px; padding: 10px; background: rgba(0, 240, 255, 0.05); border: 1px dashed var(--accent); border-radius: 8px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                    <label style="font-size: 0.75rem; color: var(--accent); cursor: pointer; padding: 5px 10px; border: 1px solid var(--accent); border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 14px;">photo_camera</span>
                        <span id="uploadedPhotoBadge">ဓာတ်ပုံ တင်ရန်</span>
                        <input type="file" accept="image/*" style="display: none;" onchange="handleInlineProfileImageUpload(event)">
                    </label>
                    <label style="font-size: 0.75rem; color: #00ffcc; cursor: pointer; padding: 5px 10px; border: 1px solid #00ffcc; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 14px;">description</span>
                        <span>အချက်အလက် (Word/Text) တင်ရန်</span>
                        <input type="file" accept=".txt,.doc,.docx" style="display: none;" onchange="handleInlineInfoFileUpload(event)">
                    </label>
                </div>
            `;
        }

        let fileBtnHTML = '';
        if (parsed.file_export) {
            const fe = parsed.file_export;
            const fileNameOrTitle = fe.filename || fe.title || 'File';
            const fileType = (fe.type || 'file').toUpperCase();
            
            const btnText = `📥 Download ${fileNameOrTitle} (${fileType})`;
            fileBtnHTML = `<br><button class="cta-button" style="margin-top:8px; padding: 4px 12px; font-size: 0.75rem;" onclick="triggerFileDownloadFromHistory(${activeChatMessages.length})">${btnText}</button>`;
            
            triggerFileDownloadFromHistoryDirect(fe);
        }

        chatHistory.innerHTML += `<div class="chat-msg ai"><strong>HeinPop AI:</strong> ${parsed.reply}${inlineUploadHTML}${fileBtnHTML}</div>`;
        
        activeChatMessages.push({ 
            role: "ai", 
            content: parsed.reply,
            file_export: parsed.file_export || null 
        });

        chatHistory.scrollTop = chatHistory.scrollHeight;

        updateMindsetAndMoodUI(parsed.mindset, parsed.emotion);

        if (parsed.action) {
            charStatus.textContent = `ANIMATION: ${parsed.action}`;
            fadeToAction(parsed.action, 0.5);
            updateStageMood(parsed.action);
        }

        await saveCurrentChat(userMsg);

        if (!isVoiceMuted) {
            speakAndAnimateVoice(parsed.reply, () => {
                fadeToAction('IDLE0', 1.0);
                updateStageMood('IDLE0');
                charStatus.textContent = "SYSTEM ONLINE";
            });
        } else {
            setTimeout(() => {
                fadeToAction('IDLE0', 1.0);
                updateStageMood('IDLE0');
                charStatus.textContent = "SYSTEM ONLINE";
            }, 1000);
        }

    } catch (err) {
        console.error(err);
        charStatus.textContent = "CONNECTION ERROR";
        fadeToAction('IDLE0', 1.0);
        updateStageMood('IDLE0');
    }
}

function speakAndAnimateVoice(text, onComplete) {
    if (!text || isVoiceMuted) { if (onComplete) onComplete(); return; }
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.pitch = 1.5;

    utterance.onend = () => { if (onComplete) onComplete(); };
    utterance.onerror = () => { if (onComplete) onComplete(); };

    synth.speak(utterance);
}

window.triggerFileDownloadFromHistory = function(msgIndex) {
    const msg = activeChatMessages[msgIndex];
    if (msg && msg.file_export) {
        triggerFileDownloadFromHistoryDirect(msg.file_export);
    }
};

function triggerFileDownloadFromHistoryDirect(fe) {
    if (!fe) return;
    const type = (fe.type || '').toLowerCase();
    
    if (type === 'excel') window.generateExcelFile(fe.filename || 'Designer_Data', fe.data || []);
    else if (type === 'pptx') window.generatePPTXFile(fe.title || 'Design_Presentation', fe.slides || [], fe.theme || null);
    else if (type === 'pdf') window.generatePDFFile(fe.filename || 'Designer_Document', fe.html || '<div style="padding:20px;">Empty Design Layout</div>');
    
    showCustomNotification("🎨 Designer-Grade ဖိုင်ကို အလှပဆုံး တည်ဆောက်ဒေါင်းလုဒ်ဆွဲလိုက်ပါပြီ။");
}

window.generateExcelFile = function(fileName, dataArray) {
    if (typeof XLSX === 'undefined') {
        showCustomNotification("Excel Library မတင်ရသေးပါ။");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(dataArray);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DesignGrid");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

window.generatePPTXFile = function(title, slidesData, theme) {
    if (typeof PptxGenJS === 'undefined') {
        showCustomNotification("PowerPoint Library မတင်ရသေးပါ။");
        return;
    }
    let pptx = new PptxGenJS();
    
    const bgColor = (theme && theme.bgColor) ? theme.bgColor : "0F172A";
    const cardBg = (theme && theme.cardBg) ? theme.cardBg : "1E293B";
    const titleColor = (theme && theme.titleColor) ? theme.titleColor : "38BDF8";
    const textColor = (theme && theme.textColor) ? theme.textColor : "F8FAFC";
    const accentColor = (theme && theme.accentColor) ? theme.accentColor : "EE1C4B";

    let slide = pptx.addSlide();
    slide.background = { color: bgColor };
    
    slide.addText("", { x: 0.8, y: 1.6, w: 0.12, h: 1.8, fill: { color: accentColor } });
    slide.addText(title, { x: 1.1, y: 1.8, w: 8.5, fontSize: 32, bold: true, color: titleColor, align: "left" });
    slide.addText("DESIGNED BY HEINPOP AI STUDIO", { x: 1.1, y: 3.2, fontSize: 11, color: textColor, tracking: 3 });

    if (Array.isArray(slidesData)) {
        slidesData.forEach((item, index) => {
            let contentSlide = pptx.addSlide();
            contentSlide.background = { color: bgColor };

            contentSlide.addText("", { 
                x: 0.5, y: 0.5, w: 9.0, h: 4.6, 
                fill: { color: cardBg }, 
                line: { color: accentColor, width: 1 } 
            });

            contentSlide.addText(`0${index + 1}`, { x: 8.0, y: 0.8, w: 1.2, fontSize: 14, bold: true, color: accentColor, align: "right" });
            contentSlide.addText(item.heading || "Layout Concept", { x: 0.9, y: 0.8, w: 7.0, fontSize: 22, bold: true, color: titleColor });
            
            const bullets = Array.isArray(item.bulletPoints) ? item.bulletPoints.join("\n\n• ") : (item.bulletPoints || "");
            contentSlide.addText("• " + bullets, { x: 0.9, y: 1.7, w: 8.2, h: 3.1, fontSize: 14, color: textColor, lineSpacing: 18 });
        });
    }

    pptx.writeFile({ fileName: `${title}.pptx` });
};

window.generatePDFFile = function(fileName, htmlContent) {
    if (typeof html2pdf === 'undefined') {
        showCustomNotification("PDF Library မတင်ရသေးပါ။");
        return;
    }

    let finalHtml = htmlContent;
    if (userProfileImageBase64) {
        finalHtml = finalHtml.replace(/__PROFILE_IMAGE_PLACEHOLDER__/g, userProfileImageBase64);
    }

    const element = document.createElement('div');
    element.style.cssText = 'font-family: "Inter", "Segoe UI", sans-serif; background: #ffffff; color: #1e293b;';
    element.innerHTML = finalHtml;

    const opt = {
        margin:       10,
        filename:     `${fileName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
};