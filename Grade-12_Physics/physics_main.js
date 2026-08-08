// --- Fullscreen Toggle Logic ---
const canvasContainer = document.getElementById('canvasContainer');
const fullscreenBtn = document.getElementById('fullscreenBtn');

if (fullscreenBtn && canvasContainer) {
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            canvasContainer.requestFullscreen().catch(err => {
                alert(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        let icon = fullscreenBtn.querySelector('.material-symbols-outlined');
        
        // အကယ်၍ Fullscreen အပြောင်းအလဲဖြစ်ချိန်တွင် Icon ပျောက်သွားပါက အလိုအလျောက် အသစ်ပြန်ဖန်တီးပေးမည်
        if (!icon) {
            icon = document.createElement('span');
            icon.className = 'material-symbols-outlined';
            fullscreenBtn.appendChild(icon);
        }

        // Fullscreen အခြေအနေအလိုက် Icon စာသားကို မှန်ကန်စွာ ပြောင်းလဲပေးခြင်း
        icon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
    });
}

// // Reset Camera Logic
// const resetCameraBtn = document.getElementById('resetCameraBtn');

// if (resetCameraBtn) {
//     resetCameraBtn.addEventListener('click', () => {
//         // ကင်မရာ၏ မူလအနေအထား (သင်သတ်မှတ်ထားသော position)
//         camera.position.set(-20, 5, -10);
        
//         // OrbitControls ကို Reset ပြန်လုပ်ခြင်း
//         controls.target.set(0, 0, 0); // အလယ်ဗဟိုသို့ ပြန်ညှိခြင်း
//         controls.update();
//     });
// }