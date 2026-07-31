// ==========================================
// 1. THEME SWITCHER ENGINE
// ==========================================
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
            const toggleThemeLogic = () => {
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
            };

            if (!document.startViewTransition) {
                toggleThemeLogic();
            } else {
                document.startViewTransition(() => toggleThemeLogic());
            }
        });
    }
});

// ==========================================
// 2. RUNTIME LANGUAGE TOGGLE SYSTEM
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const langToggle = document.getElementById("lang-toggle");
    const langText = langToggle ? langToggle.querySelector(".lang-text") : null;
    let currentLang = localStorage.getItem("portfolio-lang") || "en";

    const updateDOMText = (lang) => {
        const translatableElements = document.querySelectorAll("[data-en]");
        
        translatableElements.forEach(el => el.classList.add("text-swapping"));
        if (langText) langText.classList.add("text-swapping");

        setTimeout(() => {
            translatableElements.forEach(el => {
                const translation = el.getAttribute(`data-${lang}`);
                if (translation) {
                    el.textContent = translation;
                }
                el.classList.remove("text-swapping");
                el.classList.add("text-swapped-in");
            });

            if (langText) {
                langText.textContent = lang === "en" ? "MM" : "EN";
                langText.classList.remove("text-swapping");
                langText.classList.add("text-swapped-in");
            }
        }, 200);

        setTimeout(() => {
            translatableElements.forEach(el => el.classList.remove("text-swapped-in"));
            if (langText) langText.classList.remove("text-swapped-in");
        }, 450);
    };

    document.querySelectorAll("[data-en]").forEach(el => {
        const translation = el.getAttribute(`data-${currentLang}`);
        if (translation) el.textContent = translation;
    });
    if (langText) langText.textContent = currentLang === "en" ? "MM" : "EN";

    if (langToggle) {
        langToggle.addEventListener("click", () => {
            currentLang = currentLang === "en" ? "mm" : "en";
            localStorage.setItem("portfolio-lang", currentLang);
            updateDOMText(currentLang);
        });
    }
});

// ==========================================
// 3. HERO ROLE TEXT INTERVAL ENGINE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const subtitleElement = document.getElementById("dynamic-subtitle");
    
    const rolesEN = ["Motion Graphic Designer", "3D Multimedia Artist", "Visual Content Creator"];
    const rolesMM = ["မိုရှင်းဂရပ်ဖစ် ဒီဇိုင်နာ", "၃ဒီ မာလ်တီမီဒီယာ ပညာရှင်", "ဗီဒီယို ဖန်တီးမှု ဒါရိုက်တာ"];
    let currentRoleIndex = 0;

    if (subtitleElement) {
        setInterval(() => {
            const activeLang = localStorage.getItem("portfolio-lang") || "en";
            const currentRolesList = activeLang === "en" ? rolesEN : rolesMM;
            
            subtitleElement.style.opacity = '0';
            subtitleElement.style.transform = 'translateY(5px)';
            
            setTimeout(() => {
                currentRoleIndex = (currentRoleIndex + 1) % currentRolesList.length;
                subtitleElement.textContent = currentRolesList[currentRoleIndex];
                subtitleElement.style.opacity = '1';
                subtitleElement.style.transform = 'translateY(0)';
            }, 300);
        }, 3500);
    }
});

// ==========================================
// 4. IMAGE CONTRAST SLIDER
// ==========================================
const slider = document.getElementById('slider');
const foreground = document.getElementById('foreground');
const line = document.getElementById('line');
const button = document.getElementById('button');

if (slider && foreground && line && button) {
    let animationFrameId;
    let isUserInteracting = false;
    let startTime = null;

    const updateSplit = (percentage) => {
        const cappedPercent = Math.max(0, Math.min(100, percentage));
        foreground.style.clipPath = `polygon(0 0, ${cappedPercent}% 0, ${cappedPercent}% 100%, 0 100%)`;
        line.style.left = `${cappedPercent}%`;
        button.style.left = `${cappedPercent}%`;
    };

    const handleMove = (clientX) => {
        stopAutoMovement();
        const rect = slider.getBoundingClientRect();
        const percentage = ((clientX - rect.left) / rect.width) * 100;
        updateSplit(percentage);
    };

    const animatePeek = (timestamp) => {
        if (isUserInteracting) return;
        if (!startTime) startTime = timestamp;
        const autoPercentage = 50 + (Math.sin((timestamp - startTime) * 0.0015) * 12);
        updateSplit(autoPercentage);
        animationFrameId = requestAnimationFrame(animatePeek);
    };

    const stopAutoMovement = () => {
        if (!isUserInteracting) {
            isUserInteracting = true;
            cancelAnimationFrame(animationFrameId);
            line.style.transition = 'none';
            button.style.transition = 'none';
            foreground.style.transition = 'none';
        }
    };

    line.style.transition = 'left 0.1s ease-out';
    button.style.transition = 'left 0.1s ease-out';
    foreground.style.transition = 'clip-path 0.1s ease-out';
    animationFrameId = requestAnimationFrame(animatePeek);

    slider.addEventListener('mousemove', (e) => handleMove(e.clientX));
    slider.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    }, { passive: true });
    slider.addEventListener('mouseenter', stopAutoMovement);
    slider.addEventListener('touchstart', stopAutoMovement, { passive: true });
}

// ==========================================
// 5. ACCORDION CARD CONTROLLER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    const evaluateResponsiveLayoutBehavior = () => {
        const isMobileScreen = window.innerWidth <= 768;

        if (isMobileScreen) {
            accordionItems.forEach(item => {
                item.classList.add('active');
            });
        } else {
            accordionItems.forEach((item, index) => {
                if (index === 0) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
    };

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            if (window.innerWidth > 768) {
                const currentItem = header.parentElement;
                const isAlreadyActive = currentItem.classList.contains('active');

                accordionItems.forEach(item => {
                    item.classList.remove('active');
                });

                if (!isAlreadyActive) {
                    currentItem.classList.add('active');
                }
            }
        });
    });

    evaluateResponsiveLayoutBehavior();

    let resizeDebounceTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeDebounceTimeout);
        resizeDebounceTimeout = setTimeout(evaluateResponsiveLayoutBehavior, 150);
    });
});

// ==========================================
// 6. VIEWPORT SCROLL REVEAL ENGINE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appeared');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => observer.observe(el));
});

// ==========================================
// 7. NAVIGATION CONTROLLER & SCROLLSPY
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const trackedSections = document.querySelectorAll('section, footer');
    const dropdown = document.querySelector('.dropdown');
    const dropdownBtn = document.querySelector('.dropdown-btn');

    // Mobile Navigation Drawer Toggle
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

    // Mobile Dropdown Toggle (Specializations Click Event)
    if (dropdownBtn) {
        dropdownBtn.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                dropdown.classList.toggle('active');
            }
        });
    }

    // Close Mobile Drawer when selecting sub-menu item
    const allNavSubLinks = document.querySelectorAll('.dropdown-menu a');
    allNavSubLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                navLinks.classList.remove('mobile-active');
            }
        });
    });

    // High-performance Scrollspy
    const processActiveScrollspyTrack = () => {
        const viewportCenterLine = window.innerHeight / 2;
        let activeSectionId = "";

        trackedSections.forEach(section => {
            const boundary = section.getBoundingClientRect();
            if (boundary.top <= viewportCenterLine && boundary.bottom >= viewportCenterLine) {
                activeSectionId = section.getAttribute('id');
            }
        });

        if (window.scrollY < 120) {
            activeSectionId = "home";
        }

        document.querySelectorAll('.nav-links > li > a').forEach(link => {
            const targetHref = link.getAttribute('href');
            if (targetHref === `#${activeSectionId}`) {
                link.classList.add('scroll-active');
            } else {
                link.classList.remove('scroll-active');
            }
        });
    };

    window.addEventListener('scroll', processActiveScrollspyTrack, { passive: true });
    window.addEventListener('resize', processActiveScrollspyTrack, { passive: true });
    processActiveScrollspyTrack();
});

// ==========================================
// 8. 3D MODEL VIEWER TOUCH/POINTER CONTROLLER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const viewer = document.querySelector('#active-3d-model');

    if (viewer) {
        viewer.addEventListener('load', () => {
            viewer.addEventListener('pointerdown', () => viewer.play());
            viewer.addEventListener('pointerup', () => viewer.pause());
            viewer.addEventListener('pointerleave', () => viewer.pause());
        });
    }
});