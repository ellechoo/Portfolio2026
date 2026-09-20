# Elle Choo — Portfolio2026

A self-hosted portfolio site: plain HTML/CSS/JS, no build step, no server required. Designed to look good with video-based interaction work — thumbnails play on hover (or autoplay briefly on touch devices), and project pages carry full video/image sequences.

## How it's put together

- `index.html`, `style.css`, `main.js` — the public site. It's a single page: home, an about section, and every project detail all live in `index.html` and switch via the URL (e.g. `#about`, `#p/some-project`). No page reloads, works from a plain file or hosted anywhere static.
- All project content — titles, descriptions, and the path to each image/video — lives as JSON inside `index.html`, in the `<script id="site-data" type="application/json">` block near the bottom.
- `media/images/` and `media/videos/` — your actual files. Created automatically the first time you add something through the admin tool.
- `admin.html` — a local editing tool (see below). **Chrome or Edge only** — it uses a file-access feature Safari/Firefox don't yet support. It never leaves your computer; nothing is uploaded to any server.
- `Publish.command` — double-click to push your latest changes to GitHub (see below).

## Adding or editing work

1. Open `admin.html` in Chrome (double-click it, or drag it into a Chrome tab).
2. Click **"Choose your Portfolio2026 folder"** and select this folder. Chrome will ask you to confirm — that's normal, it's how the tool gets permission to save files here.
3. Use **"+ Add project"** to add new work: a title, category, year, a description, and drag in your images/videos. Mark one as the gallery thumbnail (a short video works great for web/interaction pieces — the tool grabs a poster frame from it automatically).
4. Click **Save project**. It writes straight into `index.html` and copies your media into `media/`.
5. To put the update live, either:
   - Double-click **`Publish.command`** in this folder (first time only: right-click it → Open, to get past macOS's "unidentified developer" warning — after that, double-clicking works normally), or
   - Open Terminal here and run `git add -A && git commit -m "Update portfolio" && git push`.

You can reopen `admin.html` any time to edit, reorder, or delete projects, and to update your name/tagline/email/bio under **Site info**.

## Previewing locally

Just double-click `index.html` — no server needed, it opens straight in a browser.

## Putting it on the web (GitHub Pages, free)

This folder is already a git repo pointing at `github.com/ellechoo/Portfolio2026`. To make it a public site:

1. Push once (`Publish.command`, or the git commands above) so GitHub has your latest files.
2. On GitHub: go to the repo → **Settings → Pages**.
3. Under "Build and deployment", set **Source: Deploy from a branch**, branch **main**, folder **/ (root)** → **Save**.
4. GitHub gives you a URL — usually `https://ellechoo.github.io/Portfolio2026/` — live in a minute or two. That's the link to share.

Every time you publish after that (step 5 above), the live site updates automatically within a minute or so.

## Video tips

- Keep clips reasonably short and compressed (a 10–30 second loop, H.264 `.mp4`, under ~15MB) — they load fast and GitHub has a 100MB-per-file limit.
- Screen recordings of interactive/web work: trim dead space at the start and end so the hover-preview loop feels tight.
