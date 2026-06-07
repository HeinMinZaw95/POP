// ==========================================
// 1. SMOOTH PORTAL LINK INTERCEPTIONS
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
// 2. VIDEO STREAM PIPELINE MANAGEMENT
// ==========================================
const video = document.getElementById('my-background-video');
if (video) {
    const setVideoPoster = () => {
        const posterSrc = window.innerWidth >= 800 ? 'video/desktop-thumbnail.jpg' : 'video/mobile-thumbnail.jpg';
        video.setAttribute('poster', posterSrc);
    };
    window.addEventListener('DOMContentLoaded', setVideoPoster);
    window.addEventListener('load', () => {
        video.play().catch(() => {});
    });

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
// 3. DYNAMIC LEFT-SIDE HERO TEXT SUBTITLE TIMER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const roles = ["Motion Graphic Designer", "3D Multimedia Artist", "Visual Content Director"];
    const subtitleElement = document.getElementById("dynamic-subtitle");
    let currentRoleIndex = 0;

    if (subtitleElement) {
        setInterval(() => {
            // Trigger exit fade slide up animation
            subtitleElement.classList.add("fade-out");

            setTimeout(() => {
                // Change string value behind the scenes
                currentRoleIndex = (currentRoleIndex + 1) % roles.length;
                subtitleElement.textContent = roles[currentRoleIndex];

                // Remove exit class, add entry placement class
                subtitleElement.classList.remove("fade-out");
                subtitleElement.classList.add("fade-in");

                // Clear entry architecture on micro-tick execution
                setTimeout(() => {
                    subtitleElement.classList.remove("fade-in");
                }, 50);

            }, 300); // Syncs cleanly with the css fade step transition
        }, 3500); 
    }
});

// ==========================================
// 4. RESPONSIVE NAVIGATION SCROLL ADJUSTMENT
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
// 5. HERO SCREEN BEFORE/AFTER COMPASS SLIDER
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
// 6. STUDIO WORK DISCIPLINE STREAM SWITCHER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const menuRows = document.querySelectorAll('.menu-row');
    const streamLayers = document.querySelectorAll('.stream-layer');

    if (menuRows.length > 0) {
        menuRows.forEach(row => {
            row.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = row.getAttribute('data-target');
                const targetStream = document.getElementById(targetId);

                if (targetStream) {
                    menuRows.forEach(r => r.classList.remove('active'));
                    streamLayers.forEach(layer => layer.classList.remove('active'));
                    row.classList.add('active');
                    targetStream.classList.add('active');
                }
            });
        });
    }
});

// ==========================================
// 7. MOBILE NAVIGATION BAR DRAWER TOGGLE
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

// ==========================================
// 8. AUTO-ROTATING PORTFOLIO CAROUSEL
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector('.carousel-container');
    const track = document.querySelector('.carousel-track');
    const slides = document.querySelectorAll('.carousel-slide');
    const prevBtn = document.querySelector('.carousel-nav.prev');
    const nextBtn = document.querySelector('.carousel-nav.next');
    
    if (track && slides.length > 0) {
        let currentIndex = 0;
        const totalSlides = slides.length;
        let rotationTimer = null;

        const updateCarouselPosition = () => {
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
        };

        const nextSlide = () => {
            currentIndex = (currentIndex + 1) % totalSlides;
            updateCarouselPosition();
        };

        const prevSlide = () => {
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            updateCarouselPosition();
        };

        const startAutoRotation = () => {
            if (!rotationTimer) rotationTimer = setInterval(nextSlide, 4000);
        };

        const stopAutoRotation = () => {
            if (rotationTimer) { clearInterval(rotationTimer); rotationTimer = null; }
        };

        nextBtn.addEventListener('click', () => { stopAutoRotation(); nextSlide(); startAutoRotation(); });
        prevBtn.addEventListener('click', () => { stopAutoRotation(); prevSlide(); startAutoRotation(); });

        if(container) {
            container.addEventListener('mouseenter', stopAutoRotation);
            container.addEventListener('mouseleave', startAutoRotation);
        }
        startAutoRotation();
    }
});

// ==========================================
// 9. 3D PROJECT ENGINE SWITCH CONTROLLER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const modelViewer = document.getElementById('active-3d-model');
    const threedButtons = document.querySelectorAll('.threed-btn');

    if (modelViewer && threedButtons.length > 0) {
        threedButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (button.classList.contains('active')) return;
                threedButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                const targetModelPath = button.getAttribute('data-model');
                if (targetModelPath) modelViewer.setAttribute('src', models/monkey.glb);
            });
        });
    }
});

// ==========================================
// 10. HIGH-PERFORMANCE GLOBAL SCROLL REVEAL ENGINE
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