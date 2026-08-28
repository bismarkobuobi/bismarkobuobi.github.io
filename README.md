# Bismark Obuobi — Portfolio

Personal site for Bismark Obuobi, backend developer. Static HTML, CSS and vanilla
JavaScript. No build step, no dependencies to install.

Live at **[www.bismarkobuobi.live](https://www.bismarkobuobi.live)**.

---

## The design

A "gallery paper" system: warm off-white by default, with a dark **ink** mode the
visitor can toggle (the choice is remembered in `localStorage`).

Four visual languages, each with a defined job so they argue on the page without
shouting over each other:

| Language              | Where it shows up                                                                     |
| --------------------- | ------------------------------------------------------------------------------------- |
| **Luxury editorial**  | Instrument Serif display type, Newsreader prose, wide measures, hairline rules         |
| **Conceptual sketch** | The About system diagram, project plates, crosshatch shading, Caveat margin notes      |
| **Pixel**             | Skill meters, corner joints, tick bullets, the wordmark, Silkscreen micro-labels       |
| **Graffiti**          | One spray colour, the marker sweep under the hero name, section and project numerals   |

### Type

| Role              | Family            |
| ----------------- | ----------------- |
| Display           | Instrument Serif  |
| Prose             | Newsreader        |
| UI, labels, tags  | JetBrains Mono    |
| Margin notes      | Caveat            |
| Pixel micro-type  | Silkscreen        |
| Graffiti numerals | Permanent Marker  |

All loaded from Google Fonts in a single request per page.

### Colour

Every colour is a CSS custom property at the top of `styles.css`. Paper values sit
on `:root`; ink values override them under `[data-theme="ink"]`. Change them in one
place and the whole site follows.

```css
--paper       /* page surface      */
--ink         /* primary text      */
--spray       /* graffiti accent   */
--spray-ink   /* same, text-safe   */
--blueprint   /* draft-pen accent  */
```

`--spray` is used for large decorative fills; `--spray-ink` is the darker variant
that passes contrast when used on text.

### Motion

Motion follows [Emil Kowalski's design engineering
principles](https://github.com/emilkowalski/skills):

- `transform` and `opacity` only, so animation stays off the layout and paint path.
- Strong custom curves (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`), never `ease-in`.
- UI interactions stay under 300ms; only the hero and scroll reveals run longer,
  because those are marketing surfaces seen once per visit.
- Every pressable element scales to `0.97` on `:active`.
- Hover motion is gated behind `@media (hover: hover) and (pointer: fine)` so touch
  taps don't trigger false hovers.
- `prefers-reduced-motion` keeps colour and opacity, drops movement.
- Scroll reveals only arm when JavaScript is present, so a no-JS visitor sees the
  full page rather than a blank one.

---

## File structure

```
Portfolio/
├── index.html          Home
├── about.html          Bio + the request-path diagram
├── skills.html         Pixel proficiency meters
├── projects.html       Project entries with sketch plates
├── blog.html           Writing index
├── post.html           Single post renderer
├── contact.html        Contact channels
│
├── styles.css          The entire design system
├── script.js           Shared behaviour (theme, nav, reveals, copy button)
├── blog.js             Blog engine (index, single post, home "recent")
│
├── posts.json          Post manifest — the source of truth for the blog
├── blog/posts/*.md     Post bodies in Markdown
│
├── docs/               Résumé PDF
├── icons/              favicon.svg (pixel mark) + favicon.png fallback
└── CNAME               Custom domain for GitHub Pages
```

---

## Running it locally

The blog fetches `posts.json` and Markdown over HTTP, so opening `index.html`
straight from disk will show an error in the Writing sections. Serve the folder
instead:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Any static server works — `npx serve`, VS Code Live Server, whatever you have.

---

## Adding a blog post

1. Write `blog/posts/your-slug.md` in plain Markdown.
2. Add an entry to `posts.json`:

```json
{
  "slug": "your-slug",
  "title": "Your Title",
  "date": "2026-08-28",
  "excerpt": "One or two sentences that show up on the index.",
  "tags": ["Backend", "System Design"]
}
```

The slug must match the filename, dates are `YYYY-MM-DD`, and the list sorts newest
first automatically. The home page picks up the three most recent posts on its own.
Reading time is calculated from the Markdown — you don't set it.

---

## Where the content lives

Everything is plain HTML, so edit it directly:

| What                     | Where                                                           |
| ------------------------ | --------------------------------------------------------------- |
| Hero name, lede, facts   | `index.html`, the `.hero` section                                |
| Bio and the route list   | `about.html`                                                     |
| The system diagram       | `about.html`, the inline `<svg>` inside `.diagram`               |
| Skill names and numbers  | `skills.html` — set `--fill` as a decimal (`--fill:.85` for 85)  |
| Projects                 | `projects.html`, duplicated in short form on `index.html`        |
| Contact channels         | `contact.html`                                                   |
| Nav and footer           | Repeated in every page — change all seven when you edit them     |

The header, mobile menu and footer are intentionally duplicated across pages rather
than injected by JavaScript, so the site works without JS and search engines see the
real markup.

---

## Deploying

The repo is set up for GitHub Pages with a custom domain:

1. Push to the default branch.
2. Settings → Pages → Source: the branch, root folder.
3. `CNAME` already points at `www.bismarkobuobi.live`; keep the DNS record in the
   registrar pointed at GitHub Pages.

There is no build step, so what is in the repo is what ships.

---

## Accessibility notes

- Skip link, visible focus rings, `aria-current` on the active nav item.
- The mobile menu traps interaction with `inert`, closes on Escape, and returns
  focus to the button.
- Decorative SVG is `aria-hidden`; the About diagram carries a real `<title>` and
  `<desc>`.
- The copy-to-clipboard button announces success through a live region.
- Colour pairs were checked against WCAG AA in both themes.
