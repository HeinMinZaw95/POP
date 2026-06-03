// ==========================================
// 1. SMOOTH SCROLLING
// ==========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ==========================================
// 2. VIDEO MANAGEMENT (Combined & Protected)
// ==========================================
const video = document.getElementById('my-background-video');

if (video) {
    // Dynamic Thumbnails
    const setVideoPoster = () => {
        const posterSrc = window.innerWidth >= 800 ? 'video/desktop-thumbnail.jpg' : 'video/mobile-thumbnail.jpg';
        video.setAttribute('poster', posterSrc);
    };

    window.addEventListener('DOMContentLoaded', setVideoPoster);

    // Play safely on load
    window.addEventListener('load', () => {
        video.play().catch(err => console.log("Autoplay prevented or video failed to play:", err));
    });

    // Debounced Resize Source Refresh
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            video.load();
            video.play().catch(() => {});
            console.log("Video source updated.");
        }, 250); 
    });
}

// ==========================================
// 3. OPTIMIZED SCROLL EFFECT (Throttle/Passive)
// ==========================================
const navbar = document.querySelector('.navbar');
let ticking = false;

if (navbar) {
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                navbar.style.backgroundColor = window.scrollY > 50 
                    ? 'rgba(10, 10, 10, 0.98)' 
                    : 'rgba(10, 10, 10, 0.95)';
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true }); // Improves mobile scroll performance
}

// ==========================================
// 4. BEFORE/AFTER IMAGE SLIDER
// ==========================================
const slider = document.getElementById('slider');
const foreground = document.getElementById('foreground');
const line = document.getElementById('line');
const button = document.getElementById('button');

if (slider && foreground && line && button) {
    const updateSplit = (percentage) => {
        const cappedPercent = Math.max(0, Math.min(100, percentage));
        foreground.style.clipPath = `polygon(0 0, ${cappedPercent}% 0, ${cappedPercent}% 100%, 0 100%)`;
        line.style.left = `${cappedPercent}%`;
        button.style.left = `${cappedPercent}%`;
    };

    const handleMove = (clientX) => {
        const rect = slider.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const percentage = (mouseX / rect.width) * 100;
        updateSplit(percentage);
    };

    slider.addEventListener('mousemove', (e) => handleMove(e.clientX));
    slider.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    }, { passive: true });
}

// ==========================================
// 5. CLEAN TAB SWITCHER (Using CSS .active)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const socialBtn = document.getElementById("socialDesign");
    const printBtn = document.getElementById("printDesign");
    const videoBtn = document.getElementById("commercialVideo");

    const socialSection = document.getElementById("successSocialDesign");
    const printSection = document.getElementById("successPrintDesign");
    const videoSection = document.getElementById("successCommercialVideo");

    if (socialBtn && printBtn && videoBtn) {
        const tabs = [
            { btn: socialBtn, section: socialSection },
            { btn: printBtn, section: printSection },
            { btn: videoBtn, section: videoSection }
        ];

        tabs.forEach(item => {
            item.btn.addEventListener('click', (e) => {
                e.preventDefault();

                // Clear active states
                tabs.forEach(t => {
                    if (t.section) t.section.classList.remove('active');
                });

                // Add active state to clicked item section
                if (item.section) {
                    item.section.classList.add('active');
                }
            });
        });

        // Initialize display configuration state smoothly
        if (socialSection) socialSection.classList.add('active');
    } else {
        console.warn("Tab elements could not be initialized. Verify IDs match up correctly.");
    }
});