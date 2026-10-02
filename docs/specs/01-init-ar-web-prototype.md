# Spec 01 — Initialise the AR web prototype (scan product → view AR object)

| | |
|---|---|
| Status | Not started |
| Created | 2026-10-02 |
| Project root | The repository root |
| Executor | A Claude Code session (may be interrupted and resumed by another session) |

---

## 0. How to use this spec (read first, every session)

This file is the single source of truth **and** the progress tracker.

**Start / resume protocol**

1. Read this whole file, including the Progress log at the bottom.
2. Load the `react-senior-engineer` skill (it loads `senior-engineer`). Do this
   even before `package.json` exists. Follow both for all code.
3. Inspect the real state — never trust the checkboxes alone:
   - `git status` and `git log --oneline -20`
   - `ls -la` at the project root
   - if `package.json` exists: `npm run verify` (once that script exists)
4. Find the first unchecked task. Before starting it, confirm the previous
   checked task's **Verify** line still passes. If it does not, uncheck it,
   note why in the Progress log, and redo it.
5. Work one task at a time, in order. Phases depend on earlier phases.

**While working**

- Tick a box (`- [ ]` → `- [x]`) **immediately** after its Verify line passes,
  not in batches. A ticked box means "verified", never "attempted".
- If a task is half done when you must stop, leave it unticked and write what
  is done and what is left in the Progress log.
- At the end of each phase: run the phase gate, commit (one commit per phase,
  message `phase N: <summary>`), then add one line to the Progress log.
- If you must deviate from this spec (a library is broken, an API changed),
  record it in the Decision log (section 12) with the reason, then continue.
- Do not do work listed under Non-goals (section 2).

---

## 1. Goal

A mobile-first web prototype where a user **scans a product's QR code and sees
the AR object configured for that product**, placed in their real environment.

**User flow**

1. User scans the QR code on a product — with the phone's native camera
   (opens the product URL directly) or with the in-app scanner at `/scan`.
2. The app resolves the product slug and opens `/p/<slug>`.
3. The page shows the product's 3D model in an interactive viewer.
4. User taps **View in AR**; the model is placed in their room at real scale
   (WebXR / Scene Viewer on Android, AR Quick Look on iOS).

"The AR object that is set" = the model mapped to the product in the catalog
file (`src/adapter/products.json`). Changing the mapping is a data edit.

## 2. Non-goals (do not build)

- Backend API, database, authentication, admin/CMS for managing products.
- Image/marker tracking of the physical product (MindAR etc.). "Scan" here
  means QR code. See D2.
- Product configurator (changing colours/parts), Three.js / React Three Fiber.
- Analytics, PWA/offline, i18n, deployment to a hosting account.

## 3. Decisions

| # | Decision | Reason |
|---|---|---|
| D1 | Vite + React 19 + TypeScript, static SPA, npm | No server needed; output is static files. Node v26 / npm 11 are installed. |
| D2 | "Scan" = QR code encoding the product URL | Works with the native camera with zero code; tracking in AR is native (ARCore/ARKit) and far faster than JS image tracking. |
| D3 | `@google/model-viewer` for viewer + AR | One element covers Android and iOS; Apache-2.0. |
| D4 | `qr-scanner` (MIT) for the in-app scanner | Small, worker-based, uses native `BarcodeDetector` when present. If `npm audit` flags it or it fails on React 19 / Vite, switch to the `barcode-detector` polyfill and log it in section 12. |
| D5 | React Router (library mode, `createBrowserRouter`) | Three routes plus not-found; deep links must work. |
| D6 | Tailwind CSS v4 via `@tailwindcss/vite` | Mobile-first layout with little CSS. |
| D7 | Product catalog is a static JSON file behind a repository port | Keeps the dependency rule; a real API can replace the adapter later without touching domain/use case/UI. |
| D8 | Repository port is synchronous | The catalog is in memory. Make it async only when an API exists (YAGNI). |
| D9 | Use the latest stable version of every package at install time | Record resolved versions in the Progress log. No alpha/beta/rc. |

## 4. Engineering rules (apply to every task)

These come from the project owner and are mandatory.

- **KISS and readable.** Simplest design that satisfies this spec. No
  speculative abstractions, no extra config knobs.
- **Few comments.** Comment only a non-obvious *why*. No comments that restate
  the code, no banner/section comments, no commented-out code.
- **Efficient, O(n) or better.** Build the catalog index (`Map<slug, Product>`)
  once at startup — O(n); every lookup is O(1). No nested scans over lists.
- **Safe under many users / no deadlock.** This prototype has no server state:
  it is static files on a CDN, so users cannot contend with each other. The
  equivalent client-side rules apply:
  - the scanner handles the **first** valid result only, then stops (the
    decode callback fires many times per second);
  - camera stream and scanner worker are always released on unmount, on
    error, and after a successful scan — no leaked streams, no stuck camera;
  - effects are StrictMode-safe (mount → unmount → mount leaves one scanner).
- **No regressions.** Before ticking any task, the whole `npm run verify`
  must be green, not only the new tests.
- **Test every function.** Unit test for every function; component tests for
  every component state; E2E for the user flow.
- **API and DB testing.** There is no API or DB in this spec, so the
  `senior-engineer` Gate 3 is reported as "no persistent state". Do **not**
  claim API/DB tests passed. If a later spec adds a backend, section 11 binds.
- **Security.** QR content and the `:slug` route param are untrusted input —
  see section 6.3. Model URLs come only from the catalog, never from the QR
  payload, the URL query, or any user input.
- **Clean Architecture** layering as in section 5. Inner layers never import
  outer ones.

## 5. Target structure

```
prototype-ar-product/
├─ docs/specs/01-init-ar-web-prototype.md   (this file)
├─ public/
│  ├─ models/            <slug>.glb, CREDITS.md
│  └─ _headers
├─ scripts/generate-qr.mjs
├─ qr/                   generated, git-ignored
├─ e2e/                  Playwright specs
├─ src/
│  ├─ domain/            product.ts, productLink.ts            (pure, no imports from other layers)
│  ├─ usecase/           productCatalog.ts                     (port + use cases)
│  ├─ adapter/           staticProductRepository.ts, products.json
│  ├─ ui/
│  │  ├─ components/     ModelViewer.tsx, QrScanner.tsx
│  │  └─ pages/          HomePage.tsx, ScanPage.tsx, ProductPage.tsx, NotFoundPage.tsx
│  ├─ app/               container.ts (composition root), router.tsx
│  ├─ types/             model-viewer.d.ts
│  ├─ main.tsx
│  └─ index.css
└─ (config: vite, tsconfig, eslint, prettier, playwright)
```

Tests sit next to the code: `foo.ts` → `foo.test.ts`, `Foo.tsx` → `Foo.test.tsx`.

Import direction: `ui` → `usecase` → `domain`; `adapter` → `usecase`, `domain`;
`app` wires everything. `domain` imports nothing from the project.

## 6. Design

### 6.1 Domain

```ts
type Product = {
  slug: string
  name: string
  description: string
  modelUrl: string        // e.g. "/models/chair.glb"
  iosModelUrl?: string    // optional .usdz; omitted → model-viewer generates one
  posterUrl?: string
  alt: string             // accessible description of the 3D model
  placement: 'floor' | 'wall'
}
```

- `SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`, max length 64.
- `isValidSlug(value: string): boolean`
- `buildProductPath(slug: string): string` → `/p/<slug>`
- `parseProductLink(text: string): string | null` — returns the slug or `null`.
  Accepts (a) an absolute URL whose pathname is exactly `/p/<slug>`, or
  (b) a bare slug. Everything else → `null`. Never throws.

### 6.2 Use case and adapter

```ts
interface ProductRepository {
  findBySlug(slug: string): Product | undefined
  list(): readonly Product[]
}
```

- `usecase/productCatalog.ts` declares the port and exposes
  `findProduct(slug)` (returns `undefined` for an invalid or unknown slug —
  validates with `isValidSlug` before touching the repository) and
  `listProducts()`.
- `adapter/staticProductRepository.ts` takes the catalog array, builds the
  `Map` once, implements the port.
- `app/container.ts` creates the repository from `products.json` and exports
  the wired use cases. Pages receive them as props from `router.tsx`
  (no globals imported inside pages → pages are testable with fakes).

### 6.3 Untrusted input rules

- The in-app scanner **never navigates to the scanned URL**. It extracts the
  slug with `parseProductLink` and navigates internally to
  `buildProductPath(slug)`. A QR pointing at another site is therefore inert.
- `/p/:slug` with an invalid or unknown slug renders the not-found state.
  The slug is rendered as text only, never as HTML.
- No `dangerouslySetInnerHTML` anywhere.

### 6.4 Routes

| Path | Page | Behaviour |
|---|---|---|
| `/` | `HomePage` | App title, primary **Scan product** link to `/scan`, list of catalog products linking to `/p/<slug>` (lets testers skip the QR). |
| `/scan` | `ScanPage` | In-app QR scanner. States: requesting camera, scanning, unrecognised QR (inline message, keeps scanning), camera denied/unavailable (message + link to `/`). |
| `/p/:slug` | `ProductPage` | Product name, description, `ModelViewer`. Unknown slug → not-found content. Lazy-loaded route (`React.lazy`) so `model-viewer` is not in the initial bundle. |
| `*` | `NotFoundPage` | Message + link to `/`. |

### 6.5 `ModelViewer` component

Thin wrapper around the `<model-viewer>` custom element.

- Props: `product: Product`.
- Attributes: `src`, `ios-src` (only if present), `poster` (only if present),
  `alt`, `ar`, `ar-modes="webxr scene-viewer quick-look"`, `ar-scale="fixed"`,
  `ar-placement` from `product.placement`, `camera-controls`,
  `touch-action="pan-y"`, `shadow-intensity="1"`.
- A custom **View in AR** `<button slot="ar-button">` (model-viewer hides it
  automatically when AR is unavailable).
- After the element's `load` event, if `canActivateAR` is false, show a short
  note: AR is not available on this device, open this page on a phone.
- Handle the `error` event with a visible error state.
- `src/types/model-viewer.d.ts` augments React's JSX `IntrinsicElements` with
  `'model-viewer'`, using `ModelViewerElement` from `@google/model-viewer`.
  No `any`.
- Check in the DOM that boolean attributes (`ar`, `camera-controls`) are
  really present on the element under React 19.

### 6.6 `QrScanner` component

- Props: `onResult(text: string): void`, `onError(error: ScanError): void`
  where `ScanError = 'permission-denied' | 'no-camera' | 'unknown'`.
- Renders `<video muted playsInline>`; prefers the back camera
  (`preferredCamera: 'environment'`).
- One effect creates the scanner and returns a cleanup that calls
  `stop()` + `destroy()`.
- `ScanPage` owns the logic: on each result call `parseProductLink`; on the
  first non-null slug, ignore later results and navigate.

### 6.7 Assets

- 2 sample products minimum, one `floor`, one `wall` if a suitable model
  exists (otherwise both `floor`).
- Source: Khronos `glTF-Sample-Assets` or Poly Haven. **Read each model's
  licence**; only use CC0 or CC-BY. Record name, source URL, author and
  licence in `public/models/CREDITS.md`.
- Models must be at real-world scale in metres (`ar-scale="fixed"`).
- Budget per model: **≤ 5 MB**, textures ≤ 2048 px, ≤ 100k triangles.
  Optimise with `@gltf-transform/cli` (check `npx gltf-transform optimize
  --help` for current flags; prefer Meshopt geometry + WebP textures).
  Keep the optimised file only.

## 7. Tasks

### Phase 0 — Preflight and repository

- [x] **P0.1** Confirm tools: `node -v` (≥ 22), `npm -v`, `git --version`.
  *Verify:* versions written to the Progress log.
- [x] **P0.2** `git init` (branch `main`) if `.git` is missing.
  *Verify:* `git status` works.
- [x] **P0.3** Add `.gitignore` (node_modules, dist, coverage, playwright
  output, `.env*` except `.env.example`, `qr/`, `.DS_Store`, `.scaffold/`)
  and `.nvmrc` with the installed Node major.
  *Verify:* files exist.
- [x] **P0.4** Commit: `phase 0: repository setup` (includes this spec).

### Phase 1 — Scaffold

> Never run `create-vite` with `--overwrite` in the project root — it empties
> the directory and would delete this spec.

- [x] **P1.1** Scaffold into a subfolder:
  `npm create vite@latest .scaffold -- --template react-ts`. If the CLI
  prompts, decline "install and start now". Move every file (including
  dotfiles, excluding any `.git`) from `.scaffold/` to the root, without
  overwriting `.gitignore` (merge its entries instead), then delete
  `.scaffold/`.
  *Verify:* `package.json`, `vite.config.ts`, `src/main.tsx` at root;
  `.scaffold/` gone; this spec still present.
- [x] **P1.2** Set `package.json` `name` to `prototype-ar-product`,
  `private: true`. Run `npm install`.
  *Verify:* `npm run build` succeeds.
- [x] **P1.3** Remove template demo content (`App.css`, logos, counter demo).
  Keep `StrictMode` in `main.tsx`.
  *Verify:* `npm run build` succeeds; no unused asset files in `src/assets`.
- [x] **P1.4** Commit: `phase 1: scaffold vite react-ts`.

### Phase 2 — Tooling

- [x] **P2.1** TypeScript strict: confirm `strict: true`,
  `noUncheckedIndexedAccess: true`, `resolveJsonModule: true`. Add script
  `typecheck` (`tsc -b --noEmit` or the template's equivalent).
  *Verify:* `npm run typecheck` exits 0.
- [x] **P2.2** ESLint: keep the template's flat config with `react-hooks`;
  add `eslint-plugin-jsx-a11y` (recommended) and `eslint-config-prettier`.
  Script `lint` = `eslint . --max-warnings 0`.
  *Verify:* `npm run lint` exits 0.
- [x] **P2.3** Prettier with a minimal `.prettierrc`; scripts `format` and
  `format:check`.
  *Verify:* `npm run format:check` exits 0.
- [x] **P2.4** Tailwind v4: install `tailwindcss` + `@tailwindcss/vite`, add
  the plugin, `@import "tailwindcss";` in `src/index.css`.
  *Verify:* a utility class changes the rendered page in `npm run dev`.
- [x] **P2.5** Vitest: install `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/user-event`, `@testing-library/jest-dom`; configure the
  `test` block (environment `jsdom`, setup file, exclude `e2e/`). Scripts
  `test` (`vitest run`) and `test:watch`.
  *Verify:* a trivial test passes, then delete it.
- [x] **P2.6** Playwright: install `@playwright/test`, install Chromium,
  `playwright.config.ts` with `webServer` = `npm run build && npm run preview`
  and one mobile project (Pixel-class viewport). Script `test:e2e`.
  *Verify:* `npm run test:e2e` runs (zero or one smoke spec) and exits 0.
- [x] **P2.7** Script `verify` =
  `typecheck && lint && format:check && test && build`.
  *Verify:* `npm run verify` exits 0.
- [x] **P2.8** Run `npm audit`; resolve or record high/critical findings.
  *Verify:* result written to the Progress log.
- [x] **P2.9** Commit: `phase 2: tooling`.

### Phase 3 — Domain, use case, adapter (no UI)

- [x] **P3.1** `src/domain/product.ts`: `Product`, `SLUG_PATTERN`,
  `isValidSlug`. Tests: valid slugs, empty, uppercase, spaces, leading or
  trailing hyphen, double hyphen, 64 vs 65 chars, path characters (`../`).
- [x] **P3.2** `src/domain/productLink.ts`: `buildProductPath`,
  `parseProductLink`. Tests (table-driven): absolute URL on any host, bare
  slug, trailing slash, extra path segments, query/hash present, wrong prefix,
  `javascript:` URL, empty string, whitespace, very long input, invalid slug
  inside a valid URL. Must never throw.
- [x] **P3.3** `src/usecase/productCatalog.ts`: port + `findProduct`,
  `listProducts`. Tests with an in-memory fake: found, unknown, invalid slug
  does not call the repository.
- [x] **P3.4** `src/adapter/staticProductRepository.ts`. Tests: lookup hit and
  miss, `list()` order, duplicate slug in input throws at construction.
- [x] **P3.5** `src/app/container.ts` wiring the static repository to the use
  cases (catalog JSON may still be empty or hold placeholders until Phase 4).
- [x] **Phase 3 gate:** `npm run verify` green. Commit:
  `phase 3: product domain and catalog`.

### Phase 4 — 3D assets

- [ ] **P4.1** Choose and download 2 models that meet section 6.7. Write
  `public/models/CREDITS.md`.
  *Verify:* licence of each model confirmed from its source page/README.
- [ ] **P4.2** Optimise each to `public/models/<slug>.glb` within budget.
  *Verify:* `ls -l public/models` shows each file ≤ 5 MB;
  `npx gltf-transform inspect <file>` shows texture and triangle budgets met.
- [ ] **P4.3** Fill `src/adapter/products.json` with the 2 products.
- [ ] **P4.4** Catalog integrity test (`products.test.ts`): every slug valid
  and unique, every `modelUrl` / `iosModelUrl` / `posterUrl` points to an
  existing file under `public/`, `alt` non-empty.
- [ ] **Phase 4 gate:** `npm run verify` green. Commit:
  `phase 4: sample models and catalog`.

### Phase 5 — Viewer and pages

- [ ] **P5.1** Install `@google/model-viewer` and `react-router`. Add
  `src/types/model-viewer.d.ts`.
  *Verify:* `npm run typecheck` green with a `<model-viewer>` in JSX.
- [ ] **P5.2** `ModelViewer` component per 6.5. Component tests: renders the
  element with `src`, `alt`, `ar-placement` from the product; `ios-src` and
  `poster` absent when not provided; AR-unavailable note appears after `load`
  when `canActivateAR` is false; error state on `error` event. (Mock the
  `@google/model-viewer` import in jsdom.)
- [ ] **P5.3** `NotFoundPage` and `HomePage` per 6.4, with tests (links by
  role, product list from an injected `listProducts`).
- [ ] **P5.4** `ProductPage` per 6.4, with tests: known slug shows name and
  viewer; unknown slug and invalid slug show not-found.
- [ ] **P5.5** `src/app/router.tsx` with the four routes, `ProductPage` lazy
  with a `<Suspense>` fallback, and a route error element. Wire in `main.tsx`.
- [ ] **P5.6** Mobile-first styling: readable at 360 px width, viewer fills
  most of the viewport height, AR button ≥ 44 px touch target, visible focus.
- [ ] **P5.7** E2E `e2e/product.spec.ts`: `/` lists products and links work;
  `/p/<slug>` shows the product and the model finishes loading (wait for the
  element's `loaded` state; if headless WebGL is unavailable, assert the
  element and its `src` instead and note that in the Progress log);
  `/p/unknown` and `/nope` show not-found; no console errors on any page.
- [ ] **P5.8** Build check: `npm run build` output shows `model-viewer` in a
  separate chunk from the entry chunk.
- [ ] **Phase 5 gate:** `npm run verify` and `npm run test:e2e` green.
  Commit: `phase 5: viewer and pages`.

### Phase 6 — In-app scanner

- [ ] **P6.1** Install the scanner library (D4). `npm audit` again.
- [ ] **P6.2** `QrScanner` component per 6.6. Tests with the library mocked:
  starts on mount, `stop` + `destroy` on unmount, exactly one live instance
  under StrictMode, maps permission and no-camera failures to `ScanError`.
- [ ] **P6.3** `ScanPage` per 6.4 and 6.6. Tests: valid result navigates to
  `/p/<slug>` once even if `onResult` fires repeatedly; unrecognised QR shows
  the inline message and does not navigate; a foreign-site URL without a
  `/p/<slug>` path does not navigate; each `ScanError` shows its message and
  the link home.
- [ ] **P6.4** E2E `e2e/scan.spec.ts`: with camera permission denied, `/scan`
  shows the denied state and the link home works. Optional stretch: launch
  Chromium with `--use-fake-device-for-media-stream
  --use-fake-ui-for-media-stream --use-file-for-fake-video-capture=<file>`
  feeding a video of a product QR, and assert navigation to `/p/<slug>`.
- [ ] **Phase 6 gate:** `npm run verify` and `npm run test:e2e` green.
  Commit: `phase 6: in-app qr scanner`.

### Phase 7 — QR generation

- [ ] **P7.1** Dev dependency `qrcode` (MIT). `scripts/generate-qr.mjs`:
  takes a base URL argument (must be `http(s)`), reads the catalog, writes
  `qr/<slug>.svg` encoding `<base>/p/<slug>`. Script: `npm run qr -- <base>`.
  Keep the URL-building in a small pure function with a unit test.
- [ ] **P7.2** *Verify:* run it with `https://example.test`; one SVG per
  product exists; decoding one (with the scanner library in a test, or
  manually) yields the expected URL.
- [ ] **Phase 7 gate:** `npm run verify` green. Commit: `phase 7: qr generation`.

### Phase 8 — Phone testing and deploy readiness

- [ ] **P8.1** HTTPS dev mode for phones on the LAN: `@vitejs/plugin-basic-ssl`
  enabled only when `mode === 'https'`, with `server.host: true`. Script
  `dev:https` = `vite --mode https`. Plain `npm run dev` stays HTTP on
  localhost.
  *Verify:* `npm run dev:https` prints an `https://<lan-ip>:<port>` URL.
- [ ] **P8.2** `public/_headers` (Cloudflare Pages / Netlify format) for `/*`:
  `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(self), xr-spatial-tracking=(self)`.
  Long-lived immutable cache for `/assets/*`.
  *Verify:* file is copied to `dist/` by the build.
- [ ] **P8.3** `README.md`: what the prototype does, the user flow, scripts,
  how to add a product (drop a GLB, add a catalog entry, run `npm run qr`),
  how to test on a phone (`dev:https`, certificate warning, or a tunnel),
  device requirements (ARCore Android / iPhone), hosting notes (HTTPS
  required; SPA fallback to `index.html` — automatic on Cloudflare Pages,
  needs a `_redirects` rule on Netlify), asset budgets.
- [ ] **Phase 8 gate:** `npm run verify` green. Commit:
  `phase 8: phone testing and deploy readiness`.

### Phase 9 — Final verification (the three gates)

- [ ] **P9.1 Gate 1:** `npm run verify` and `npm run test:e2e` — all green,
  0 lint warnings. Paste the summary lines into the Progress log.
- [ ] **P9.2 Gate 2 (live run):** `npm run build && npm run preview`, then in
  a real browser (built-in browser tools) at mobile width:
  `/` renders and lists products; a product page loads its model with no
  console errors; `/p/does-not-exist` and `/p/..%2F..%2Fetc` show not-found;
  `/scan` with camera blocked shows the denied state; `/scan` navigates away
  and back without leaving the camera indicator on. Record results.
- [ ] **P9.3 Gate 3:** state explicitly in the delivery summary: *no API and
  no database in this spec — nothing persisted, nothing to verify*.
- [ ] **P9.4** Comment audit: remove every comment that restates the code.
- [ ] **P9.5** Delivery summary (format from `senior-engineer` section 9)
  appended to the Progress log. Set Status at the top to
  `Done — awaiting device check`. Commit: `phase 9: verification`.

### Phase 10 — Real-device check (manual, by the project owner)

An agent cannot do these. Leave them unticked; never mark them passed.

- [ ] **P10.1** Android (ARCore device, Chrome): scan a generated QR with the
  native camera → product page opens → **View in AR** places the model at
  real scale on the floor.
- [ ] **P10.2** iPhone (Safari): same flow → AR Quick Look opens with the
  model. If the auto-generated USDZ looks wrong, add a real `.usdz` and set
  `iosModelUrl` for that product.
- [ ] **P10.3** In-app scanner at `/scan` on both phones resolves the QR.
- [ ] **P10.4** Model loads in under ~3 s on mobile data.

## 8. Acceptance criteria

1. `npm run verify` and `npm run test:e2e` pass from a clean clone after
   `npm install`.
2. Scanning a product QR (native camera or `/scan`) leads to that product's
   page, and the page offers AR on supported phones.
3. Unknown, malformed or hostile QR/URL input never navigates off-site, never
   throws, and shows a clear not-found or "unrecognised" state.
4. Leaving `/scan` always releases the camera.
5. Adding a product requires only a GLB file and one catalog entry.
6. Each sample model is ≤ 5 MB and credited.
7. Code follows section 4: layered, O(1) lookups, minimal comments.

## 9. Known risks

- **iOS has no WebXR AR.** iPhones use AR Quick Look via `model-viewer`; the
  auto-generated USDZ does not support every material. Mitigation: P10.2.
- **Self-signed HTTPS** shows a browser warning on phones; a tunnel
  (e.g. `cloudflared`) is the alternative. Both documented in the README.
- **Decoders from a CDN.** `model-viewer` fetches Draco/KTX2/Meshopt decoders
  from an external CDN by default. Acceptable for the prototype; see
  follow-ups.
- **Headless WebGL** may be missing in CI-like environments (see P5.7).

## 10. Follow-ups (out of scope, list for the owner)

- Content-Security-Policy header (needs testing on the real host; must allow
  the decoder CDN or self-hosted decoders, `blob:` workers and WASM).
- Self-host the mesh/texture decoders.
- Desktop fallback: show a QR of the current page so the user can switch to a
  phone.
- Backend + admin to manage which AR object is set per product.

## 11. Rules that bind if a backend is added later

Not used in this spec. Any future spec that adds an API or database must:

- keep handlers stateless; O(n) or better per request; paginate every list;
- use a pooled connection, short transactions, a consistent lock order, and
  timeouts — and prove no deadlock with concurrent requests;
- index every lookup column and check hot queries with `EXPLAIN`;
- test at three levels: unit, real HTTP calls against the running API, and
  direct database queries confirming what the API claims;
- implement `ProductRepository` as a new adapter; make the port async then.

## 12. Decision log (deviations from this spec)

| Date | Task | Deviation | Reason |
|---|---|---|---|
| | | | |

## 13. Progress log

One line per phase or interruption: date, session, what was completed, what
is next, anything the next session must know (resolved versions, skipped
checks, open problems).

| Date | Phase / task | Notes |
|---|---|---|
| 2026-10-02 | Spec written | Project folder was empty. Node v26.0.0, npm 11.12.1, git 2.51.2; no pnpm/bun. Nothing scaffolded yet. Next: P0.1. |
