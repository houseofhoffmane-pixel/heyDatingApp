# iOS prototype (frozen reference)

These are the original iOS-styled prototype screens — the source material
we ported into the real web app under `../web/`.

**Not deployed.** Nothing here is built or served in production. The
website deploy (`backend/` + `web/`) is fully self-contained.

## What's here

- `index.html` — entry point (loads React 18 + Babel Standalone from CDN)
- `styles.css` — original design tokens (the `:root` variables were copied verbatim into `../web/src/styles/globals.css`)
- `app.jsx` — the tweaks panel + screen picker + iOS frame wrapper
- `ios-frame.jsx` — the iPhone bezel + status bar chrome
- `tweaks-panel.jsx` — the left-hand controls used during prototyping
- `data.js` — mock people / places / events data used by the prototype only
- `design-system.jsx` — `<Icon>` set, `<Photo>` painter, `<Avatar>`, `<TabBar>`
- `screens-*.jsx` — one file per screen or screen family

## How to view it locally (optional)

Open `prototype-ios/index.html` in a browser via a small local server —
the prototype uses ES modules that don't work over `file://`.

```bash
cd prototype-ios
python3 -m http.server 8000
# then open http://localhost:8000
```

Or use any static server (`npx serve .`, VS Code Live Server, etc.).

## Kept because

- It documents the intended visual for every screen — useful when
  building new pages in `../web/`, checking spacing, comparing animation
  timing, etc.
- It's the reference for the color palette, typography, iconography, and
  micro-interactions. If a design question comes up ("what did the
  onboarding step counter look like?"), the answer is a file here.

If you're sure you don't want the reference, delete this whole folder
— nothing else depends on it.
