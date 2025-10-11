// Navbar transparency on scroll
let lastScrollTop = 0;
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add 'scrolled' class when scrolling down, remove when at top
    if (scrollTop > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScrollTop = scrollTop;
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all sections for animation
document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// Observe project cards
document.querySelectorAll('.project-card').forEach(card => {
    observer.observe(card);
});

// Observe skill categories
document.querySelectorAll('.skill-category').forEach(category => {
    observer.observe(category);
});

// Animate skill bars when they come into view
const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const progressBars = entry.target.querySelectorAll('.skill-progress');
            progressBars.forEach(bar => {
                bar.style.animation = 'none';
                setTimeout(() => {
                    bar.style.animation = 'loadBar 1.5s ease-out forwards';
                }, 100);
            });
            skillObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.skill-category').forEach(category => {
    skillObserver.observe(category);
});

// Add active state to navigation links based on scroll position
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Add typing effect to about section
const typingObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const text = entry.target;
            const originalText = text.textContent;
            text.textContent = '';
            text.style.opacity = '1';
            
            let index = 0;
            const typingInterval = setInterval(() => {
                if (index < originalText.length) {
                    text.textContent += originalText.charAt(index);
                    index++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 20);
            
            typingObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

// Only apply typing effect to the first paragraph in about section
const firstAboutParagraph = document.querySelector('.about-text .typing-effect');
if (firstAboutParagraph) {
    firstAboutParagraph.style.opacity = '0';
    typingObserver.observe(firstAboutParagraph);
}

// Random glitch effect on section titles
setInterval(() => {
    const glitchElements = document.querySelectorAll('.glitch');
    const randomElement = glitchElements[Math.floor(Math.random() * glitchElements.length)];
    
    if (randomElement) {
        randomElement.style.animation = 'none';
        setTimeout(() => {
            randomElement.style.animation = '';
        }, 100);
    }
}, 5000);

// Console Easter Egg
console.log(`
%c
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
█░ BISMARK OBUOBI - PORTFOLIO  ░░█
█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
█░  Backend Developer              █
█░  System Design Enthusiast       █
█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
█░  Looking at the source code?    █
█░  I like your style! 😎          █
█░  Let's connect!                 █
█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
`, 'color: #00ff00; font-family: monospace; font-size: 12px;');

console.log('%c> System initialized successfully', 'color: #00ff00; font-family: monospace;');
console.log('%c> Ready for collaboration...', 'color: #00ff00; font-family: monospace;');

// Add parallax effect to hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// Add hover effect to project cards
document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.borderColor = 'var(--primary-color)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.borderColor = 'var(--border-color)';
    });
});

// Terminal cursor blink in contact section
const terminalCursors = document.querySelectorAll('.cursor');
terminalCursors.forEach(cursor => {
    setInterval(() => {
        cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
    }, 500);
});

// Add subtle random flicker to scanlines
setInterval(() => {
    const scanlines = document.querySelector('.scanlines');
    if (scanlines && Math.random() > 0.95) {
        scanlines.style.opacity = '0.5';
        setTimeout(() => {
            scanlines.style.opacity = '1';
        }, 50);
    }
}, 100);

// Konami Code Easter Egg
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode.splice(-konamiSequence.length - 1, konamiCode.length - konamiSequence.length);
    
    if (konamiCode.join('').includes(konamiSequence.join(''))) {
        document.body.style.animation = 'glitch-1 0.5s infinite';
        setTimeout(() => {
            document.body.style.animation = '';
            alert('🎮 Konami Code Activated! You found the secret! 🎮\n\n- Bismark Obuobi');
        }, 1000);
    }
});

// Log page load time
window.addEventListener('load', () => {
    const loadTime = performance.now();
    console.log(`%c> Page loaded in ${loadTime.toFixed(2)}ms`, 'color: #00ff00; font-family: monospace;');
});
