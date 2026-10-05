# AR Product Prototype

A mobile-first web prototype that brings augmented reality to physical
products, in the browser, with no app to install.

- **Scan product** (`/scan`): point the camera at a registered product. The
  product itself is recognised and a card stays attached to it, with the
  product explanation and a coupon to claim.
- **View product in AR** (`/view-in-ar`): scan a product's QR code and place
  its 3D model in your own room at real size.

Built by [Ahmad Farras Syafrin](https://ahmadfarrassyafrin.com).

## How it works

**Scan product.** Recognition runs on the phone with
[MindAR](https://github.com/hiukim/mind-ar-js) image tracking, so no camera
image leaves the device. Product details and coupon claims come from a small
API backed by PostgreSQL. A visitor always gets the same coupon code, and a
campaign never hands out more codes than its quantity.

**View product in AR.** A QR code opens the product page, which shows the 3D
model with [`<model-viewer>`](https://modelviewer.dev). **View in AR** uses
WebXR or Scene Viewer on Android and AR Quick Look on iPhone and iPad. On a
desktop browser you get the 3D viewer only.

## Stack

- **Web:** Vite, React 19, TypeScript, React Router, Tailwind CSS,
  `@google/model-viewer`, `qr-scanner`, MindAR with three.js
- **API:** Node 26, Fastify, PostgreSQL 18
- **Tests:** Vitest, Testing Library, Playwright

Both sides follow Clean Architecture: `ui` / `adapter` → `usecase` → `domain`.

## Run it locally

Needs Node 26 and Docker.

```bash
npm install
cp .env.example .env      # then use the local values listed at the bottom of the file
docker compose up -d db   # PostgreSQL
make migrate              # apply the schema
make seed                 # two sample products with coupons
npm run api:dev           # API           (terminal 1)
npm run dev               # web on http://localhost:5173   (terminal 2)
```

The Scan product page lists the images you can scan. On a desktop, open one
of them on a phone or a second screen and show it to the webcam.

## Test on a phone

Camera access and AR need HTTPS:

```bash
npm run api:dev      # terminal 1
npm run dev:https    # terminal 2
```

Open the printed `https://<lan-ip>:5173` address on a phone on the same Wi-Fi
and accept the self-signed certificate warning. `npm run qr -- https://<lan-ip>:5173`
writes a QR code for every View-in-AR product to `qr/`.

## Tests

```bash
npm run verify       # typecheck, lint, format check, unit tests, build
npm run verify:all   # the above plus database and Playwright tests
```

The database tests need two extra databases, created once with:

```bash
docker compose exec -T db psql -U ar -d ar < server/db-init/create-databases.sql
```

## Add your own products

**For scanning.** Save a sharp, straight picture of the product's flat face
as `public/targets/images/<slug>.jpg`, add the product to
`server/seed/seed.json`, then run `make seed` and `npm run targets:build`.

**For View in AR.** Put the model at `public/models/<slug>.glb`, add it to
`src/adapter/products.json`, then run `npm run usdz:build` to create the
`.usdz` file that iPhones need. Keep models under 5 MB, at real-world scale
in metres, and leave the geometry uncompressed so the same file works in the
web viewer, on Android and in the iPhone conversion.

Credit every image and model in the `CREDITS.md` next to it.

## Known limits

- Scanning works on flat, detailed, printed surfaces (a book cover, the front
  of a box), not on bare bottles or curved labels. At most 20 products.
- Coupons are anonymous: clearing cookies gives a second coupon. Tie them to
  an account before using this for anything of value.
- View in AR needs an ARCore-supported Android phone or an iPhone/iPad. The
  Google app and in-app browsers (Instagram and the like) cannot open it.

## Licence and credits

The code is released under the [MIT licence](LICENSE).

Files from other authors keep their own licences: the sample images
([`public/targets/CREDITS.md`](public/targets/CREDITS.md)), the 3D models
([`public/models/CREDITS.md`](public/models/CREDITS.md)) and the bundled
MindAR library ([`src/vendor/mind-ar/LICENSE`](src/vendor/mind-ar/LICENSE)).
