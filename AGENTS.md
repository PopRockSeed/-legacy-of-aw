# Base44 Dev Environment

This repo is **not** a runnable app by itself — it is an extracted dump of a mobile game's
private data directory (`com.mangaonline.jflr.apken`): game art assets under `resource/`,
CDN manifests (`version.xml`/`version.ios`), and SDK state. There is no source code or server.

To give the preview something live, Base44 adds a **Vite asset-browser** app at the repo root
that serves and browses the `resource/` images/videos.

## Run
```
docker compose -f docker-compose.base44.yml up -d
```
App is on **host port 3000**. Vite dev server (HMR for `index.html`/`src/*`).
Health check: `GET /` returns the browser page.

## How it works
- `vite.config.js` — a custom Vite plugin serves files under `/resource/*` (streamed from
  the repo `resource/` dir) and exposes two JSON APIs:
  - `GET /api/categories`  → top-level folder names in `resource/`
  - `GET /api/list?dir=<relpath>` → `{ dirs:[], files:[{name,ext}] }` for a folder
- `index.html` + `src/main.js` + `src/style.css` — the browser UI (sidebar categories,
  breadcrumb, thumbnail grid, image/video lightbox).
- `server.watch.ignored: ['**/resource/**']` — prevents Vite from watching the 5k+ asset files.

## Notes
- `.sdz` referenced in `version.xml` do not exist on disk; the images are already extracted
  as `.png`/`.jpg` in `resource/`.
- `setting.xml` contains live account tickets — treat as potentially leaked if shared.
- No external secrets/credentials are required.
