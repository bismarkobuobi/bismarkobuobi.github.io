/* ==========================================================================
   Bismark Obuobi — Portfolio
   Shared behaviour. Runs on every page.

   The stored theme is applied by a small inline script in each page's <head>,
   before first paint — this file only handles what can wait for the DOM.
   ========================================================================== */
(function () {
    'use strict';

    var root = document.documentElement;

    /* ----------------------------------------------------------------------
       Active navigation link
       ---------------------------------------------------------------------- */

    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    // A single note is still the Notes section.
    if (here === 'note.html') here = 'notes.html';

    document.querySelectorAll('[data-nav] a[href]').forEach(function (link) {
        if ((link.getAttribute('href') || '').toLowerCase() === here) {
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
            }, 240);
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
                theme === 'ink' ? 'Switch to light theme' : 'Switch to dark theme'
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
       Footer year
       ---------------------------------------------------------------------- */

    document.querySelectorAll('[data-year]').forEach(function (el) {
        el.textContent = String(new Date().getFullYear());
    });
})();
