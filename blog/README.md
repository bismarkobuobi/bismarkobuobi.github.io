# Writing a blog post

The blog is file-based — no build step, no CMS. To publish a new post:

1. **Create the Markdown file** in `blog/posts/`, named after the slug:
   `blog/posts/my-new-post.md`

2. **Write in plain Markdown** (headings, lists, code blocks, links, images, quotes all work).

3. **Register it** by adding an entry to `posts.json` in the project root:

   ```json
   {
       "slug": "my-new-post",
       "title": "My New Post Title",
       "date": "2026-08-01",
       "excerpt": "One or two sentences shown on the blog listing card.",
       "tags": ["Backend", "Notes"]
   }
   ```

   - `slug` **must** match the filename (without `.md`).
   - `date` uses `YYYY-MM-DD`. Posts are sorted newest-first automatically.
   - `excerpt` and `tags` are optional but recommended.

4. **Preview locally.** The blog fetches files over HTTP, so open the site with a
   local server rather than double-clicking the HTML:

   ```bash
   python -m http.server 8000
   # then visit http://localhost:8000/blog.html
   ```

5. **Commit & push** — GitHub Pages serves it live at `/blog.html`.

That's it. New post = one Markdown file + one JSON entry.
