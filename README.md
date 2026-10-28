# Deadlock — landing page

Static landing page for **Deadlock**, a free, local-first encrypted file vault for Windows.
Vite + vanilla TypeScript + plain CSS custom properties. GSAP (+ ScrollTrigger) and Lenis are bundled from npm; fonts are self-hosted via @fontsource. No analytics, no trackers, no runtime third-party requests.

## Commands

```bash
npm install
npm run dev          # local dev server (http://localhost:5173)
npm run build        # contrast gate + type-check + production build into dist/
npm run preview      # serve dist/ on http://localhost:4173
```

`dist/` is plain static files with relative URLs, so it works from any host root or sub-path.

Verification (all use Playwright/Chromium against the built `dist/`):

| Command | What it does | Output |
| --- | --- | --- |
| `npm run contrast` | WCAG AA check of every text/background token pair (also runs inside `build`, which fails on any miss) | console |
| `npm run shots` | Full-page + first-screen screenshots at 360/390/768/1280/1920 in light and dark; overflow, tap-target and CLS checks at 360/390/430/768/1024/1280/1440/1920 and phone landscape | `shots/*.png`, `shots/layout-report.json` |
| `npm run frames` | Frame sequences: intro, deadbolt scroll (desktop + phone), bento reveal, pinned steps, mobile menu (incl. focus trap/Esc), theme toggle, FAQ | `shots/frames/` |
| `npm run reduced` | `prefers-reduced-motion` and JavaScript-disabled runs | `shots/reduced/` |
| `npm run lighthouse` | Warm-up + 3 Lighthouse runs each for mobile and desktop; median reports saved | `shots/lighthouse/` |
| `npm run perf` / `perf:headed` | rAF frame times during real scroll gestures (desktop wheel, phone touch with 4x CPU slowdown) | `shots/perf-*.json` |
| `npm run icons` | Regenerates favicons, apple-touch icon, manifest icons and the 1200×630 OG image from the icon-tile SVG | `public/` |
| `npm run font-metrics` | Re-measures the metric-matched fallback font values used in `src/styles/fonts.css` | console |
| `npm run verify` | build + shots + frames + reduced + lighthouse | |

## Changing links and copy

- **The three outbound links** (Download, source, issues), the version text, author and year live in **`src/config.ts`**. They are injected into `index.html` at build time through `{{download}}`, `{{source}}`, `{{issues}}`, `{{version}}`, `{{author}}`, `{{year}}` placeholders (see the `deadlock-html` plugin in `vite.config.ts`; an unknown placeholder fails the build).
- If the site gets a public URL, set `SITE.url` in `src/config.ts`: a canonical link and `og:url` are then emitted and the OG image URL becomes absolute.
- **All copy is plain HTML in `index.html`**, in reading order (hero, features bento, how it works, honest limits, FAQ, CTA, footer). Edit text directly. Big headings wrap trailing punctuation as `<span class="p">.</span>` to tighten the heavy-weight comma/period spacing — keep that wrapper if you edit those headings.
- Colours are tokens in `src/styles/tokens.css` (light block, plus two identical dark blocks: one for the toggle, one for the OS preference). `npm run contrast` checks them and verifies the two dark blocks match.

## How the animation system is organised

Content is complete and visible from HTML + CSS alone. Motion is layered on top:

1. **First paint: CSS only** (`src/styles/motion.css`). A tiny inline script in `<head>` sets `html.motion` (no reduced-motion preference) and `html.intro` (first load this session, via `sessionStorage`) plus the saved theme. The intro (nav slide, masked h1 line rise, sub-copy/buttons, card scale + shadow bloom, chip) and the deadbolt lock + keyhole pulse are CSS keyframes, all finished within ~1.2 s. Nothing waits for JavaScript. The hero sub-copy rises with a transform only (no fade), so the largest text is painted at full opacity on the first frame and LCP never waits for the intro.
2. **Bootstrap** (`src/main.ts`, ~1 KB). Loads the main bundle (`src/app.ts`) on the first interaction, or 1.2 s after `load`, whichever comes first. Parsing the bundle therefore never competes with first paint or the intro frames.
3. **App** (`src/app.ts`) wires modules from `src/motion/` after fonts are ready, yielding between steps:
   - `smooth.ts` — Lenis (`lerp 0.09`) driven by `gsap.ticker`, `lenis.on('scroll', ScrollTrigger.update)`. Not created on touch-first devices (native momentum) or with reduced motion.
   - `anchors.ts` — in-page links: offset for the floating nav, focus moved to the target heading, `history.pushState`. Jumps longer than 3 screens use a View Transition cross-fade where supported.
   - `reveal.ts` + `split.ts` — once-only reveals: masked line rise for `[data-split]` headings, rise + fade for `[data-reveal]`, bento wave for `[data-card]` (then icons draw via `stroke-dashoffset` on `pathLength="1"` paths), divider hairlines, CTA scale .96 → 1. Elements already in view when JS arrives are never hidden.
   - `hero.ts` — scroll-scrubbed deadbolt (unlock while the mark is on screen, re-lock as it reaches the nav) on an inner `<g>` (the CSS intro owns the outer one), and the 4° lock-card tilt.
   - `background.ts` — one ScrollTrigger interpolates the three blob positions and the brass tone layer between per-section keyframes (transform + opacity only). CSS drift loops pause when the tab is hidden.
   - `nav.ts` — compact pill after 80 px; one shared brass underline slides to the current section.
   - `steps.ts` — `gsap.matchMedia`: pinned horizontal sequence with a filling rail on screens ≥1024×680, vertical timeline below that.
   - `pointer.ts` — magnetic primary buttons (max 8 px, elastic return) and the cursor-following card glow (CSS variables written once per frame). Only on `(hover: hover) and (pointer: fine)`.
   - `faq.ts` — native `<details>`; open/close animates the panel opacity and FLIP-translates everything below (no height animation).
   - `menu.ts` — full-screen modal `<dialog>`: focus trapped (Tab wraps), Esc closes, scroll locked, `aria-expanded`, focus returned. Works without JS in browsers that support `commandfor`.
   - `theme.ts` — light/dark toggle saved in `localStorage` (try/catch), circular View Transition reveal from the button where supported.
4. **Scenes** (`src/scenes/`) — the Add-to-Vault loop, recovery-key flip-in and backup line/check are code-split and imported by an IntersectionObserver 400 px before they scroll in. Their SVG/HTML is already in the page, showing the final frame, which is also what reduced-motion and no-JS visitors see. The vault loop only runs while on screen.

**Reduced motion:** no Lenis, no parallax, no pinning, no loops, no intro. Below-the-fold content appears with a 0.35 s opacity fade, and SVGs are shown fully drawn.

Rules followed: only `transform` and `opacity` are animated, apart from `stroke-dashoffset` for line draws and the `clip-path` circle of the theme View Transition. `will-change` is used only on the three scroll-driven background layers.
