/* ==========================================================================
   Bismark Obuobi — Portfolio
   Shared behaviour. Runs on every page.

   The `js` class and the stored theme are applied by a small inline script in
   each page's <head>, before first paint — this file only handles behaviour
   that can safely wait for the DOM.
   ========================================================================== */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ----------------------------------------------------------------------
       Header — hairline appears once the page has moved
       ---------------------------------------------------------------------- */

    var header = document.querySelector('.site-header');
    if (header) {
        var onScroll = function () {
            var y = window.pageYOffset || root.scrollTop;
            if (y > 8) {
                header.setAttribute('data-scrolled', '');
            } else {
                header.removeAttribute('data-scrolled');
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ----------------------------------------------------------------------
       Active navigation link
       ---------------------------------------------------------------------- */

    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (here === '') here = 'index.html';
    // A single post is still the Writing section.
    if (here === 'post.html') here = 'blog.html';

    document.querySelectorAll('[data-nav] a[href]').forEach(function (link) {
        var href = (link.getAttribute('href') || '').toLowerCase();
        if (href === here) {
            link.setAttribute('aria-current', 'page');
        }
    });

    /* ----------------------------------------------------------------------
       Theme toggle
       Colour crossfade is armed only for the duration of the switch, so the
       page never transitions on load.
       ---------------------------------------------------------------------- */

    var switchTimer = null;

    function setTheme(theme, animate) {
        if (animate) {
            root.classList.add('theme-switching');
            window.clearTimeout(switchTimer);
            switchTimer = window.setTimeout(function () {
                root.classList.remove('theme-switching');
            }, 260);
        }

        root.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            /* private mode, blocked storage — the toggle still works for this visit */
        }

        var themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute('content', theme === 'ink' ? '#0d0c0b' : '#f4f1e9');
        }

        document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
            btn.setAttribute('aria-pressed', theme === 'ink' ? 'true' : 'false');
            btn.setAttribute(
                'aria-label',
                theme === 'ink' ? 'Switch to paper theme' : 'Switch to ink theme'
            );
        });
    }

    setTheme(root.getAttribute('data-theme') === 'ink' ? 'ink' : 'paper', false);

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            setTheme(root.getAttribute('data-theme') === 'ink' ? 'paper' : 'ink', true);
        });
    });

    /* ----------------------------------------------------------------------
       Mobile menu
       ---------------------------------------------------------------------- */

    var menuButton = document.querySelector('[data-menu-button]');
    var menu = document.getElementById('mobile-menu');

    if (menuButton && menu) {
        var inertTargets = [
            document.querySelector('main'),
            document.querySelector('.site-footer')
        ].filter(Boolean);

        var closeMenu = function (restoreFocus) {
            if (!menu.hasAttribute('data-open')) return;
            menu.removeAttribute('data-open');
            menu.setAttribute('aria-hidden', 'true');
            menuButton.removeAttribute('data-menu-open');
            menuButton.setAttribute('aria-expanded', 'false');
            document.body.style.removeProperty('overflow');
            inertTargets.forEach(function (el) {
                el.removeAttribute('inert');
            });
            if (restoreFocus) menuButton.focus();
        };

        var openMenu = function () {
            menu.setAttribute('data-open', '');
            menu.setAttribute('aria-hidden', 'false');
            menuButton.setAttribute('data-menu-open', '');
            menuButton.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            inertTargets.forEach(function (el) {
                el.setAttribute('inert', '');
            });
            var first = menu.querySelector('a[href], button');
            if (first) first.focus({ preventScroll: true });
        };

        menuButton.addEventListener('click', function () {
            if (menu.hasAttribute('data-open')) {
                closeMenu(true);
            } else {
                openMenu();
            }
        });

        menu.addEventListener('click', function (event) {
            if (event.target.closest('a[href]')) closeMenu(false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeMenu(true);
        });

        // Crossing back to the desktop breakpoint should never strand the lock.
        var wide = window.matchMedia('(min-width: 861px)');
        var onWide = function (event) {
            if (event.matches) closeMenu(false);
        };
        if (wide.addEventListener) {
            wide.addEventListener('change', onWide);
        } else if (wide.addListener) {
            wide.addListener(onWide);
        }
    }

    /* ----------------------------------------------------------------------
       Scroll reveal
       Marketing surface only, fires once. Falls back to "everything visible"
       wherever IntersectionObserver is missing.
       ---------------------------------------------------------------------- */

    // Auto-number the children of a group so stagger doesn't need hand-written
    // --i values in the markup.
    document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
        var i = 0;
        Array.prototype.forEach.call(group.children, function (child) {
            if (child.hasAttribute('data-reveal') && !child.style.getPropertyValue('--i')) {
                child.style.setProperty('--i', String(i++));
            }
        });
    });

    function revealAll(nodes) {
        nodes.forEach(function (el) {
            el.setAttribute('data-visible', '');
        });
    }

    var revealTargets = Array.prototype.slice.call(
        document.querySelectorAll('[data-reveal]')
    );

    if (revealTargets.length) {
        if (!('IntersectionObserver' in window)) {
            revealAll(revealTargets);
        } else {
            var revealObserver = new IntersectionObserver(
                function (entries, observer) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        entry.target.setAttribute('data-visible', '');
                        observer.unobserve(entry.target);
                    });
                },
                { threshold: 0.08, rootMargin: '0px 0px -80px 0px' }
            );
            revealTargets.forEach(function (el) {
                revealObserver.observe(el);
            });

            // Failsafe. An element that starts on screen must never stay hidden
            // because the observer did not report it — hidden content is a far
            // worse outcome than a skipped animation.
            window.setTimeout(function () {
                revealTargets.forEach(function (el) {
                    if (el.hasAttribute('data-visible')) return;
                    if (el.getBoundingClientRect().top < window.innerHeight) {
                        el.setAttribute('data-visible', '');
                        revealObserver.unobserve(el);
                    }
                });
            }, 1200);
        }
    }

    /* ----------------------------------------------------------------------
       Pixel skill meters — fill when the list scrolls into view
       ---------------------------------------------------------------------- */

    var meterLists = Array.prototype.slice.call(document.querySelectorAll('.meter-list'));

    if (meterLists.length) {
        meterLists.forEach(function (list) {
            Array.prototype.forEach.call(list.children, function (item, index) {
                var fill = item.querySelector('.meter-fill');
                if (fill) fill.style.setProperty('--i', String(index));
            });
        });

        if (!('IntersectionObserver' in window)) {
            revealAll(meterLists);
        } else {
            var meterObserver = new IntersectionObserver(
                function (entries, observer) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        entry.target.setAttribute('data-visible', '');
                        observer.unobserve(entry.target);
                    });
                },
                { threshold: 0.25 }
            );
            meterLists.forEach(function (list) {
                meterObserver.observe(list);
            });
        }
    }

    /* ----------------------------------------------------------------------
       Marquee — clone the track so the loop is seamless without duplicated markup
       ---------------------------------------------------------------------- */

    document.querySelectorAll('.marquee').forEach(function (marquee) {
        var track = marquee.querySelector('.marquee-track');
        if (!track || reduceMotion.matches) return;
        var clone = track.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        marquee.appendChild(clone);
    });

    /* ----------------------------------------------------------------------
       Copy to clipboard
       ---------------------------------------------------------------------- */

    document.querySelectorAll('[data-copy]').forEach(function (button) {
        var resetTimer = null;

        button.addEventListener('click', function () {
            var value = button.getAttribute('data-copy');

            var done = function () {
                button.setAttribute('data-copied', '');
                var live = document.getElementById('copy-status');
                if (live) live.textContent = 'Email address copied to clipboard.';
                window.clearTimeout(resetTimer);
                resetTimer = window.setTimeout(function () {
                    button.removeAttribute('data-copied');
                    if (live) live.textContent = '';
                }, 2200);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(value).then(done, function () {
                    window.prompt('Copy this address:', value);
                });
                return;
            }

            // Older browsers: hand the value over in a selectable field.
            var field = document.createElement('textarea');
            field.value = value;
            field.setAttribute('readonly', '');
            field.style.position = 'fixed';
            field.style.top = '-1000px';
            document.body.appendChild(field);
            field.select();
            try {
                document.execCommand('copy');
                done();
            } catch (e) {
                window.prompt('Copy this address:', value);
            }
            document.body.removeChild(field);
        });
    });

    /* ----------------------------------------------------------------------
       Footer year
       ---------------------------------------------------------------------- */

    document.querySelectorAll('[data-year]').forEach(function (el) {
        el.textContent = String(new Date().getFullYear());
    });

    /* ----------------------------------------------------------------------
       For anyone reading the source
       ---------------------------------------------------------------------- */

    console.log(
        '%cLiked the build? Say hello — bismarkobuobi19@gmail.com',
        'font-family: monospace; color: #d93a1f;'
    );
})();
