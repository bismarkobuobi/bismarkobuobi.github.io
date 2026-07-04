/* ============================================================
   Blog engine — powers blog.html (list) and post.html (single)
   Posts are Markdown files in /blog/posts/, listed in posts.json
   ============================================================ */
(function () {
    'use strict';

    const MANIFEST = 'posts.json';
    const POSTS_DIR = 'blog/posts/';

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function formatDate(iso) {
        const d = new Date(iso + 'T00:00:00');
        if (isNaN(d)) return iso;
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    function fetchJson(url) {
        return fetch(url, { cache: 'no-cache' }).then((r) => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function fetchText(url) {
        return fetch(url, { cache: 'no-cache' }).then((r) => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
        });
    }

    /* ---------- Blog listing ---------- */
    function renderList(container) {
        fetchJson(MANIFEST)
            .then((posts) => {
                if (!Array.isArray(posts) || posts.length === 0) {
                    container.innerHTML =
                        '<p class="empty-state">No posts yet — check back soon.</p>';
                    return;
                }
                posts.sort((a, b) => (a.date < b.date ? 1 : -1));

                container.innerHTML = posts.map((p) => {
                    const tags = (p.tags || [])
                        .map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`)
                        .join('');
                    const url = `post.html?slug=${encodeURIComponent(p.slug)}`;
                    return `
                        <article class="post-card reveal">
                            <a class="post-card-link" href="${url}">
                                <div class="post-card-header">
                                    <span>${escapeHtml(formatDate(p.date))}</span>
                                    <span>~/blog</span>
                                </div>
                                <div class="post-card-body">
                                    <h3>${escapeHtml(p.title)}</h3>
                                    <p class="post-excerpt">${escapeHtml(p.excerpt || '')}</p>
                                    <div class="post-tags">${tags}</div>
                                    <span class="read-more"><span class="blink">&gt;</span> read_post()</span>
                                </div>
                            </a>
                        </article>`;
                }).join('');

                // reveal newly injected cards
                container.querySelectorAll('.reveal').forEach((el) =>
                    el.classList.add('visible')
                );
            })
            .catch(() => {
                container.innerHTML =
                    '<p class="empty-state">Could not load posts. If you are opening this file directly, run a local server (e.g. <code>python -m http.server</code>) — the blog needs HTTP to fetch Markdown.</p>';
            });
    }

    /* ---------- Single post ---------- */
    function getSlug() {
        const params = new URLSearchParams(location.search);
        return params.get('slug');
    }

    function renderPost(article, titleEl, metaEl) {
        const slug = getSlug();
        if (!slug || !/^[a-z0-9\-]+$/i.test(slug)) {
            article.innerHTML =
                '<p class="empty-state">Post not found. <a class="back-link" href="blog.html">Back to blog</a></p>';
            return;
        }

        fetchJson(MANIFEST)
            .then((posts) => {
                const meta = (posts || []).find((p) => p.slug === slug);
                return fetchText(POSTS_DIR + slug + '.md').then((md) => ({ meta, md }));
            })
            .then(({ meta, md }) => {
                if (meta) {
                    document.title = meta.title + ' — Bismark Obuobi';
                    if (titleEl) titleEl.textContent = meta.title;
                    if (metaEl) {
                        metaEl.textContent =
                            'Published ' + formatDate(meta.date) +
                            ((meta.tags && meta.tags.length)
                                ? '  •  ' + meta.tags.join(', ')
                                : '');
                    }
                }
                const html = window.marked
                    ? window.marked.parse(md)
                    : '<pre>' + escapeHtml(md) + '</pre>';
                article.innerHTML = html;
            })
            .catch(() => {
                article.innerHTML =
                    '<p class="empty-state">Could not load this post. <a class="back-link" href="blog.html">Back to blog</a></p>';
            });
    }

    /* ---------- Boot ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        const list = document.getElementById('blog-list');
        if (list) renderList(list);

        const article = document.getElementById('post-content');
        if (article) {
            renderPost(
                article,
                document.getElementById('post-title'),
                document.getElementById('post-meta')
            );
        }
    });
})();
