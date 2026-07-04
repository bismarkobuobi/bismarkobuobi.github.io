/* ============================================================
   Bismark Obuobi — Portfolio
   Shared site behaviour (runs on every page)
   ============================================================ */
(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;

    /* ---- Navbar transparency on scroll ---- */
    const navbar = document.getElementById('navbar');
    if (navbar) {
        const onScroll = () => {
            const y = window.pageYOffset || document.documentElement.scrollTop;
            navbar.classList.toggle('scrolled', y > 100);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ---- Highlight the active nav link ---- */
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('#navbar a[href]').forEach((link) => {
        const href = link.getAttribute('href').toLowerCase();
        if (
            href === current ||
            (current === '' && href === 'index.html') ||
            (current === 'index.html' && href === 'index.html') ||
            // treat post.html as part of the Blog tab
            (current === 'post.html' && href === 'blog.html')
        ) {
            link.classList.add('active');
        }
    });

    /* ---- Scroll reveal (replaces old per-element animations) ---- */
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length) {
        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            revealEls.forEach((el) => el.classList.add('visible'));
        } else {
            const io = new IntersectionObserver(
                (entries, obs) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                            obs.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
            );
            revealEls.forEach((el) => io.observe(el));
        }
    }

    /* ---- Animate skill bars into view ---- */
    const skillBars = document.querySelectorAll('.skill-progress');
    if (skillBars.length) {
        const fill = (bar) => {
            const pct = bar.getAttribute('data-progress') || '0';
            bar.style.width = pct + '%';
        };
        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            skillBars.forEach(fill);
        } else {
            const io = new IntersectionObserver(
                (entries, obs) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            fill(entry.target);
                            obs.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.3 }
            );
            skillBars.forEach((bar) => io.observe(bar));
        }
    }

    /* ---- Update footer year automatically ---- */
    document.querySelectorAll('[data-year]').forEach((el) => {
        el.textContent = new Date().getFullYear();
    });

    /* ---- Console easter egg (once per page) ---- */
    const style = 'color: #00ff00; font-family: monospace;';
    console.log(
        '%c> Hi there, curious developer. Like the source? Let\'s connect: bismarkobuobi19@gmail.com',
        style
    );
})();
