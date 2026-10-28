/* ==========================================================================
   Bismark Obuobi — Portfolio
   Notes engine. Powers the Notes index, a single note, and the latest notes
   on the home page.

   Notes are Markdown files in /notes/, listed in notes.json.
   ========================================================================== */
(function () {
    'use strict';

    var MANIFEST = 'notes.json';
    var NOTES_DIR = 'notes/';

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

    // Each note file opens with its own H1 so it reads as a standalone document,
    // but the page already renders the title — drop the duplicate.
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

    function fetchOk(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response;
        });
    }

    function byNewest(a, b) {
        return a.date < b.date ? 1 : -1;
    }

    /* ----------------------------------------------------------------------
       Note rows — shared by the Notes index and the home page
       ---------------------------------------------------------------------- */

    function rowMarkup(note) {
        return (
            '<a class="note-row" href="note.html?slug=' + encodeURIComponent(note.slug) + '">' +
            '<span class="note-row-date">' + escapeHtml(formatDate(note.date)) + '</span>' +
            '<span>' +
            '<span class="note-row-title">' + escapeHtml(note.title) + '</span>' +
            (note.excerpt
                ? '<span class="note-row-excerpt">' + escapeHtml(note.excerpt) + '</span>'
                : '') +
            '</span>' +
            '</a>'
        );
    }

    function renderRows(container, limit) {
        fetchOk(MANIFEST)
            .then(function (response) {
                return response.json();
            })
            .then(function (notes) {
                if (!Array.isArray(notes) || notes.length === 0) {
                    container.innerHTML =
                        '<p class="empty-state">No notes yet &mdash; the first ones are on the way.</p>';
                    return;
                }

                var list = notes.slice().sort(byNewest);
                if (limit) list = list.slice(0, limit);
                container.innerHTML = list.map(rowMarkup).join('');
            })
            .catch(function () {
                container.innerHTML =
                    '<p class="empty-state">Could not load notes. If you opened this file ' +
                    'from disk, run a local server &mdash; <code>python -m http.server</code>.</p>';
            });
    }

    /* ----------------------------------------------------------------------
       Single note
       ---------------------------------------------------------------------- */

    function renderNote(article) {
        var slug = new URLSearchParams(location.search).get('slug');
        var titleEl = document.getElementById('note-title');
        var metaEl = document.getElementById('note-meta');
        var tagsEl = document.getElementById('note-tags');

        function fail(message) {
            titleEl.textContent = 'Note not found';
            metaEl.textContent = '';
            article.innerHTML = '<p class="empty-state">' + message + '</p>';
        }

        if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
            fail('That note does not exist.');
            return;
        }

        fetchOk(MANIFEST)
            .then(function (response) {
                return response.json();
            })
            .then(function (notes) {
                var meta = (notes || []).filter(function (note) {
                    return note.slug === slug;
                })[0];
                if (!meta) throw new Error('unknown slug');

                return fetchOk(NOTES_DIR + slug + '.md')
                    .then(function (response) {
                        return response.text();
                    })
                    .then(function (markdown) {
                        return { meta: meta, markdown: stripLeadingTitle(markdown) };
                    });
            })
            .then(function (result) {
                var meta = result.meta;
                var markdown = result.markdown;

                document.title = meta.title + ' — Bismark Obuobi';
                var description = document.querySelector('meta[name="description"]');
                if (description && meta.excerpt) description.setAttribute('content', meta.excerpt);

                titleEl.textContent = meta.title;
                metaEl.textContent =
                    formatDate(meta.date) + '  ·  ' + readingTime(markdown) + ' min read';

                if (meta.tags && meta.tags.length) {
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
                fail('Could not load this note.');
            });
    }

    /* ----------------------------------------------------------------------
       Boot
       ---------------------------------------------------------------------- */

    document.addEventListener('DOMContentLoaded', function () {
        var index = document.getElementById('note-list');
        if (index) renderRows(index, 0);

        var recent = document.getElementById('recent-notes');
        if (recent) renderRows(recent, 3);

        var article = document.getElementById('note-content');
        if (article) renderNote(article);
    });
})();
