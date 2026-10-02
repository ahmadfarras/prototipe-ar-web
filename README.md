# AR Product Prototype

A mobile-first web prototype with two features:

- **Scan product** (`/scan`, the main feature): point the camera at a
  registered product. The product itself is recognised and becomes the AR
  target; a card stays attached to it with the product explanation and a
  coupon to claim.
- **View product in AR** (`/view-in-ar`): scan a product's QR code and place
  its 3D model in your own space.

## How it works

### Scan product

1. Open `/scan` and tap **Start camera**.
2. Point the camera at a registered product (a flat printed face such as a
   book cover or the front of a box).
3. When it is recognised, a card anchored to the product shows its name and
   two buttons: **About this product** and **Claim coupon**.
4. Claiming returns a coupon code. The same visitor always gets the same
   code, and a campaign never hands out more codes than its quantity.

Recognition runs on the phone with [MindAR](https://github.com/hiukim/mind-ar-js)
image tracking against a compiled file of the registered products
(`public/targets/`). No camera image leaves the device. Product details and
coupon claims come from a small API backed by PostgreSQL.

### View product in AR

1. A product carries a QR code that encodes
   `https://<host>/view-in-ar/p/<slug>`.
2. Scanning it — with the phone's camera app, or the in-app scanner at
   `/view-in-ar/scan` — opens the product page.
3. The page shows the product's 3D model. **View in AR** places it in the
   room at real size.

AR runs through [`<model-viewer>`](https://modelviewer.dev): WebXR or Scene
Viewer on Android (ARCore devices), AR Quick Look on iPhone and iPad. On a
desktop browser you get the 3D viewer only. This feature needs no backend:
its catalog is a JSON file.

## Stack

Web: Vite, React 19, TypeScript, React Router, Tailwind CSS,
`@google/model-viewer`, `qr-scanner`, MindAR (vendored) with three.js.
API: Node 26 running TypeScript directly, Fastify, `pg`, PostgreSQL 18
(Docker), `node-pg-migrate`.
Tests: Vitest, Testing Library, Playwright. Lint: Oxlint. Format: Prettier.

## Run it locally

Needs Node 26 and Docker.

```bash
npm install
cp .env.example .env
docker compose up -d   # PostgreSQL on 127.0.0.1:54329
make migrate           # apply the schema
make seed              # two sample products with coupons
npm run api:dev        # API on http://127.0.0.1:3000   (terminal 1)
npm run dev            # web on http://localhost:5173   (terminal 2)
```

The dev server proxies `/api` to the API, so the browser only ever talks to
one origin. To try the scanner on a desktop, show
`targets/images/wizard-of-oz.jpg` to the webcam on a phone or a second screen.

## Scripts

| Command                              | What it does                                                         |
| ------------------------------------ | -------------------------------------------------------------------- |
| `npm run dev`                        | Web dev server on `http://localhost:5173`                            |
| `npm run dev:https`                  | Web dev server over HTTPS on your LAN, for testing on a phone        |
| `npm run api:dev` / `api:start`      | API with / without file watching                                     |
| `docker compose up -d` / `down`      | Start / stop the PostgreSQL container                                |
| `make migrate` / `make migrate-down` | Apply the schema / roll back the latest migration                    |
| `make seed`                          | Insert or update the products in `server/seed/seed.json`             |
| `npm run targets:build`              | Compile the registered product images into `public/targets/`         |
| `npm run build` / `npm run preview`  | Production build and local preview                                   |
| `npm run verify`                     | Typecheck, lint, format check, unit tests, build (no database)       |
| `npm run test`                       | Unit and component tests, web and API                                |
| `npm run test:db`                    | API tests over real HTTP and database tests (needs the database)     |
| `npm run test:e2e`                   | Playwright against the production build and API (needs the database) |
| `npm run verify:all`                 | `verify`, `test:db` and `test:e2e`                                   |
| `npm run qr -- <base-url>`           | Write one QR code per View-in-AR product to `qr/`                    |
| `npm run format`                     | Format the code                                                      |

## Project layout

```
src/domain        Types and pure rules (slugs, product links, target manifest)
src/usecase       Use cases and the ports they need
src/adapter       Static JSON catalog, HTTP gateways to the API
src/ui            Pages and components
src/app           Composition root and routes
src/vendor        Prebuilt MindAR files (see its README)
server/src        The API, in the same four layers
server/migrations SQL schema
server/seed       Seed data
server/test       Tests that need PostgreSQL or a listening server
targets/images    Source images of the registered products
public/targets    Compiled targets and their manifest (generated, committed)
scripts           QR code generation, target compilation
e2e               Playwright tests
```

Dependencies point inward on both sides: `ui`/`adapter` → `usecase` →
`domain`. `src/` and `server/` never import from each other.

## Register a product for scanning

1. Take a straight, sharp, evenly lit picture of the flat face of the product
   and save it as `targets/images/<slug>.jpg`. Use artwork with a lot of
   detail; large plain areas and repeating patterns track badly. Shortest
   side at least 512 px, at most 1 MB. Credit it in `targets/CREDITS.md`.
2. Add the product to `server/seed/seed.json` with the next free target
   `index` (indexes are `0, 1, 2, …` without gaps; at most 20 targets) and,
   optionally, a `coupon`.
3. Run `make seed`, then `npm run targets:build`.
4. Run `npm run test` — a test checks that the published targets match the
   seed file.

A product needs at least one target row to count as registered. Two images of
the same product (front and back) are two targets with the same slug.

## API

Base path `/api/v1`, JSON, same origin as the web app.

| Request                              | Result                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                        | `200` when the database answers                                                                                                 |
| `GET /products/:slug/experience`     | Product details and coupon status; `404 product_not_found`                                                                      |
| `POST /products/:slug/coupon-claims` | `201` with a code, `200` with the same code on a repeat; `409 coupon_sold_out` / `coupon_not_active`; `404`; `429 rate_limited` |

Errors are always `{ "error": { "code", "message" } }`. A visitor is
identified by an `HttpOnly` cookie the API issues on the first claim.

A `POST` that a browser marks as coming from another site
(`Sec-Fetch-Site` other than `same-origin`) is refused with
`403 cross_site_request`, so another website cannot make its visitors claim
coupons.

A claim is one short database transaction that inserts the visitor's claim
and then takes one unit of stock with a single conditional `UPDATE`. Every
transaction takes its locks in that same order, so claims cannot deadlock,
and `server/test/concurrency.test.ts` proves it with hundreds of simultaneous
requests.

## Add a product to View product in AR

1. Put the model at `public/models/<slug>.glb` (see the budget below) and
   credit it in `public/models/CREDITS.md`.
2. Add an entry to `src/adapter/products.json`:

   ```json
   {
     "slug": "my-product",
     "name": "My Product",
     "description": "Shown on the product page.",
     "modelUrl": "/models/my-product.glb",
     "alt": "3D model of my product",
     "placement": "floor"
   }
   ```

   `slug` is lowercase letters, digits and single hyphens. `placement` is
   `floor` or `wall`. Optional: `iosModelUrl` (a `.usdz`) and `posterUrl`.

3. Run `npm run test` — a catalog test checks slugs and file paths.
4. Run `npm run qr -- https://your-host` and print `qr/<slug>.svg`.

### Model budget

- GLB, at real-world scale in metres (AR uses a fixed scale).
- At most 5 MB, textures at most 2048 px, at most 100k triangles.
- Shrink a model with glTF Transform, for example:

  ```bash
  npx @gltf-transform/cli optimize in.glb out.glb --compress false --texture-compress auto --texture-size 1024
  ```

  Geometry is left uncompressed on purpose so the same file works in the web
  viewer, Android Scene Viewer and the generated iOS model without extra
  decoders.

## Test on a phone

Camera access and AR need HTTPS (or `localhost`).

```bash
npm run api:dev      # terminal 1
npm run dev:https    # terminal 2
```

Open the printed `https://<lan-ip>:5173` URL on a phone on the same Wi-Fi and
accept the self-signed certificate warning. If the phone refuses the
certificate, expose the plain dev server through an HTTPS tunnel instead
(for example `cloudflared tunnel --url http://localhost:5173`).

Generate QR codes for that address with `npm run qr -- https://<lan-ip>:5173`.

For **Scan product**, point the phone at the real product, or at its image
printed or shown on another screen.

Device requirements: any recent phone browser with camera access for **Scan
product**; an ARCore-supported Android phone with Chrome, or an iPhone/iPad
with Safari, for **View product in AR**.

## Deploy

Two parts, served from **one origin** over HTTPS:

- Static files: `npm run build` writes them to `dist/`. `public/_headers`
  (security headers, including the ones that forbid framing the site) is only
  applied by hosts that understand that file; on your own server, set the
  same headers in the web server configuration. The host must serve
  `index.html` for unknown paths so that deep links work (automatic on
  Cloudflare Pages, which also applies `public/_headers`; on Netlify add
  `public/_redirects` containing `/* /index.html 200`).
- The API: a Node 26 process (`node server/src/main.ts`) with PostgreSQL,
  reachable at `/api` on the same host through a reverse proxy. Set
  `DATABASE_URL`, `COOKIE_SECURE=true` and, behind the proxy,
  `TRUST_PROXY=true` so rate limiting sees the real client address. The API
  listens on `127.0.0.1`.

## Known limits

- **Flat targets only.** Image tracking needs a flat, detailed, printed
  surface. A bare bottle, a curved label or a glossy plain box will not track
  reliably.
- **At most 20 registered targets.** The compiled file and the per-frame
  search grow with the number of targets.
- **Coupons are anonymous.** Without login, clearing cookies gives a second
  coupon, and a script can drain a campaign within the rate limit (10 claims
  per minute per address). Tie coupons to an account before using this for
  anything of value.
- **Rate limiting is in memory**, so it only holds for one API instance.
- The visitor cookie is a persistent identifier; check whether your audience
  needs a consent notice.
- MindAR's last release is from January 2024. It is vendored and patched in
  three places (`src/vendor/mind-ar/README.md`).
- iPhones have no WebXR AR; View product in AR uses AR Quick Look with a USDZ
  generated from the GLB. If a model looks wrong there, export a real `.usdz`
  and set `iosModelUrl`.
- `@google/model-viewer` 4.3 prints a few debug lines to the console.
- No Content-Security-Policy header yet.
