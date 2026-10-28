# Bismark Obuobi — Portfolio

Personal site for Bismark Obuobi, software engineer and aspiring security engineer.
Static HTML, CSS and vanilla JavaScript. No build step, no dependencies to install.

Live at **[bismarkobuobi.github.io](https://bismarkobuobi.github.io)**.

---

## File structure

```
├── index.html      Home: intro, experience, featured projects, skills, notes, contact
├── projects.html   Every personal project
├── notes.html      Notes index
├── note.html       Single note renderer
│
├── styles.css      All styles; colour tokens at the top
├── script.js       Theme toggle, active nav link, footer year
├── notes.js        Notes engine (index, single note, home "latest notes")
├── notes.json      Notes manifest
├── notes/*.md      Note bodies in Markdown
│
├── docs/           Résumé PDF
└── icons/          Favicons
```

The header and footer are repeated in all four pages. Change all four when you edit
them.

---

## Adding a project

Open `projects.html`. At the top of the list there is a commented-out block to copy.
Paste it where the project should appear and fill in the name, a one or two sentence
description, the repo link and a status. To feature a project on the home page too,
add the same block (without tags) to the Projects section of `index.html`.

Client work goes under Experience in `index.html`, not in Projects.

---

## Adding a note

Notes are short write-ups on personal projects, a few minutes to read.

1. Write `notes/your-slug.md` in plain Markdown.
2. Add an entry to `notes.json`:

```json
[
    {
        "slug": "your-slug",
        "title": "Your Title",
        "date": "2026-11-01",
        "excerpt": "One sentence shown in the list.",
        "tags": ["Networking"]
    }
]
```

The slug must match the filename, dates are `YYYY-MM-DD`, and notes sort newest
first. The home page shows the three latest. Reading time is calculated for you.

---

## Running it locally

Notes are fetched over HTTP, so serve the folder rather than opening the file:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

---

## Deploying

The repo is served by GitHub Pages from `main`, root folder. Push to `main` and the
site updates within a minute or two.
