/* ==========================================================================
   Bismark Obuobi — Portfolio
   Blog engine. Powers the Writing index, a single post, and the "recent
   writing" block on the home page.

   Posts are Markdown files in /blog/posts/, listed in posts.json.
   ========================================================================== */
(function () {
    'use strict';

    var MANIFEST = 'posts.json';
    var POSTS_DIR = 'blog/posts/';
    var ARROW =
        '<svg viewBox="0 0 16 10" fill="none" aria-hidden="true">' +
        '<path d="M0 5h13.5M9.5 1 13.8 5 9.5 9" stroke="currentColor" stroke-width="1.4"/></svg>';

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    }

    function formatDate(iso) {
        var date = new Date(iso + 'T00:00:00');
        if (isNaN(date.getTime())) return iso;
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    // Each post file opens with its own H1 so it still reads as a standalone
    // document, but the page already renders that title in the header — drop the
    // duplicate rather than showing it twice.
    function stripLeadingTitle(markdown) {
        return markdown.replace(/^﻿?\s*#\s+[^\n]*(?:\r?\n\s*)*/, '');
    }

    function readingTime(markdown) {
        var words = markdown
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/[#>*_`\-]/g, ' ')
            .split(/\s+/)
            .filter(Boolean).length;
        return Math.max(1, Math.round(words / 220));
    }

    function fetchJson(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        });
    }

    function fetchText(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
        });
    }

    function byNewest(a, b) {
        return a.date < b.date ? 1 : -1;
    }

    function offlineNotice() {
        return (
            '<p class="empty-state">Could not load posts. If you opened this file ' +
            'directly from disk, run a local server &mdash; ' +
            '<code>python -m http.server</code> &mdash; because the blog fetches ' +
            'its Markdown over HTTP.</p>'
        );
    }

    /* ----------------------------------------------------------------------
       Post rows — shared by the Writing index and the home page
       ---------------------------------------------------------------------- */

    function rowMarkup(post, index, withTags) {
        var tags = withTags
            ? (post.tags || [])
                  .map(function (tag) {
                      return '<span class="tag">' + escapeHtml(tag) + '</span>';
                  })
                  .join('')
            : '';

        return (
            '<article class="post-row" data-reveal style="--i:' + index + '">' +
            '<a class="post-row-link" href="post.html?slug=' +
            encodeURIComponent(post.slug) +
            '">' +
            '<div class="post-date">' +
            escapeHtml(formatDate(post.date)) +
            '</div>' +
            '<div class="post-main">' +
            '<h3 class="post-title">' +
            escapeHtml(post.title) +
            '</h3>' +
            '<p class="post-excerpt">' +
            escapeHtml(post.excerpt || '') +
            '</p>' +
            (tags ? '<div class="tag-row">' + tags + '</div>' : '') +
            '</div>' +
            '<span class="arrow-link" aria-hidden="true">Read' +
            ARROW +
            '</span>' +
            '</a>' +
            '</article>'
        );
    }

    function renderRows(container, limit, withTags) {
        fetchJson(MANIFEST)
            .then(function (posts) {
                if (!Array.isArray(posts) || posts.length === 0) {
                    container.innerHTML =
                        '<p class="empty-state">Nothing published yet. Check back soon.</p>';
                    return;
                }

                var list = posts.slice().sort(byNewest);
                if (limit) list = list.slice(0, limit);

                container.innerHTML = list
                    .map(function (post, index) {
                        return rowMarkup(post, index, withTags);
                    })
                    .join('');

                // Rows arrive after the shared reveal observer has already run,
                // so reveal them here rather than leaving them at opacity 0.
                container.querySelectorAll('[data-reveal]').forEach(function (row) {
                    row.setAttribute('data-visible', '');
                });
            })
            .catch(function () {
                container.innerHTML = offlineNotice();
            });
    }

    /* ----------------------------------------------------------------------
       Single post
       ---------------------------------------------------------------------- */

    function renderPost(article) {
        var params = new URLSearchParams(location.search);
        var slug = params.get('slug');
        var titleEl = document.getElementById('post-title');
        var metaEl = document.getElementById('post-meta');
        var tagsEl = document.getElementById('post-tags');

        function fail(message) {
            if (titleEl) titleEl.textContent = 'Post not found';
            if (metaEl) metaEl.textContent = '';
            article.innerHTML = '<p class="empty-state">' + message + '</p>';
        }

        if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
            fail('That post does not exist.');
            return;
        }

        fetchJson(MANIFEST)
            .then(function (posts) {
                var meta = (posts || []).filter(function (post) {
                    return post.slug === slug;
                })[0];

                if (!meta) throw new Error('unknown slug');

                return fetchText(POSTS_DIR + slug + '.md').then(function (markdown) {
                    return { meta: meta, markdown: stripLeadingTitle(markdown) };
                });
            })
            .then(function (result) {
                var meta = result.meta;
                var markdown = result.markdown;

                document.title = meta.title + ' — Bismark Obuobi';
                var description = document.querySelector('meta[name="description"]');
                if (description && meta.excerpt) {
                    description.setAttribute('content', meta.excerpt);
                }

                if (titleEl) titleEl.textContent = meta.title;

                if (metaEl) {
                    metaEl.textContent =
                        formatDate(meta.date) +
                        '  ·  ' +
                        readingTime(markdown) +
                        ' min read';
                }

                if (tagsEl && meta.tags && meta.tags.length) {
                    tagsEl.innerHTML = meta.tags
                        .map(function (tag) {
                            return '<span class="tag">' + escapeHtml(tag) + '</span>';
                        })
                        .join('');
                }

                article.innerHTML = window.marked
                    ? window.marked.parse(markdown)
                    : '<pre>' + escapeHtml(markdown) + '</pre>';
            })
            .catch(function () {
                fail(
                    'Could not load this post. If you opened this file directly ' +
                        'from disk, run a local server first.'
                );
            });
    }

    /* ----------------------------------------------------------------------
       Boot
       ---------------------------------------------------------------------- */

    document.addEventListener('DOMContentLoaded', function () {
        var index = document.getElementById('post-list');
        if (index) renderRows(index, 0, true);

        var recent = document.getElementById('recent-posts');
        if (recent) renderRows(recent, 3, false);

        var article = document.getElementById('post-content');
        if (article) renderPost(article);
    });
})();
