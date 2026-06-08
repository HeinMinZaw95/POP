// ==========================================
// 1. SMOOTH NAVIGATION LINK ACTIONS
// ==========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) navLinks.classList.remove('mobile-active');
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ==========================================
// 2. HERO VIDEO AUTO-PLAY PIPELINE
// ==========================================
const video = document.getElementById('my-background-video');
if (video) {
    const setVideoPoster = () => {
        const posterSrc = window.innerWidth >= 800 ? 'video/desktop-thumbnail.jpg' : 'video/mobile-thumbnail.jpg';
        video.setAttribute('poster', posterSrc);
    };
    window.addEventListener('DOMContentLoaded', setVideoPoster);
    window.addEventListener('load', () => { video.play().catch(() => {}); });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            video.load();
            video.play().catch(() => {});
        }, 250); 
    });
}

// ==========================================
// 3. HERO ROLE TEXT INTERVAL ENGINE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const roles = ["Motion Graphic Designer", "3D Multimedia Artist", "Visual Content Director"];
    const subtitleElement = document.getElementById("dynamic-subtitle");
    let currentRoleIndex = 0;

    if (subtitleElement) {
        setInterval(() => {
            subtitleElement.style.opacity = '0';
            subtitleElement.style.transform = 'translateY(5px)';
            setTimeout(() => {
                currentRoleIndex = (currentRoleIndex + 1) % roles.length;
                subtitleElement.textContent = roles[currentRoleIndex];
                subtitleElement.style.opacity = '1';
                subtitleElement.style.transform = 'translateY(0)';
            }, 300); 
        }, 3500); 
    }
});

// ==========================================
// 4. NAVBAR SCROLL COLOR TRANSITIONS
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
    }, { passive: true }); 
}

// ==========================================
// 5. SPLIT-SCREEN PHOTO COMPARE SLIDER
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

// ==========================================================
// 6. ACCORDION / DROPDOWN SELECTION MANAGER
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const currentItem = header.parentElement;
            const isAlreadyActive = currentItem.classList.contains('active');

            // Close all active open dropdown cards uniformly
            document.querySelectorAll('.accordion-item').forEach(item => {
                item.classList.remove('active');
            });

            // Toggle active card element state
            if (!isAlreadyActive) {
                currentItem.classList.add('active');
            }
        });
    });
});

// ==========================================
// 7. MOBILE DRAWER INTERACTION EXPANSION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('mobile-active');
        });
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove('mobile-active');
            }
        });
    }
});

// ==========================================================
// 8. CLEAN STANDARD 3D MOCKUP SWITCHER (STABLE VIEWPORT)
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    const modelViewer = document.getElementById('active-3d-model');
    const threedButtons = document.querySelectorAll('.threed-btn');

    if (modelViewer && threedButtons.length > 0) {
        threedButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (button.classList.contains('active')) return;
                
                // Track standard button links active highlight
                threedButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Read structural file route path
                const targetModelPath = button.getAttribute('data-model');
                if (targetModelPath) {
                    modelViewer.setAttribute('src', targetModelPath);
                }
            });
        });
    }
});

// ==========================================
// 9. HIGH-PERFORMANCE GLOBAL SCROLL REVEAL ENGINE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    const observerOptions = {
        root: null, 
        threshold: 0.12, 
        rootMargin: "0px 0px -40px 0px" 
    };

    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appeared');
                observer.unobserve(entry.target); 
            }
        });
    };

    const scrollObserver = new IntersectionObserver(revealCallback, observerOptions);
    revealElements.forEach(element => scrollObserver.observe(element));
});