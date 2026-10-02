# AR Product Prototype

A mobile-first web prototype: scan a product's QR code and see its 3D model
placed in your own space in augmented reality.

## How it works

1. A product carries a QR code that encodes `https://<host>/p/<slug>`.
2. Scanning it — with the phone's camera app, or the in-app scanner at
   `/scan` — opens the product page.
3. The page shows the product's 3D model. **View in AR** places it in the
   room at real size.

AR runs through [`<model-viewer>`](https://modelviewer.dev): WebXR or Scene
Viewer on Android (ARCore devices), AR Quick Look on iPhone and iPad. On a
desktop browser you get the 3D viewer only.

There is no backend. The product catalog is a JSON file and the build output
is static files.

## Stack

Vite, React 19, TypeScript, React Router, Tailwind CSS, `@google/model-viewer`,
`qr-scanner`. Tests: Vitest, Testing Library, Playwright. Lint: Oxlint.
Format: Prettier.

## Scripts

| Command                             | What it does                                              |
| ----------------------------------- | --------------------------------------------------------- |
| `npm run dev`                       | Dev server on `http://localhost:5173`                     |
| `npm run dev:https`                 | Dev server over HTTPS on your LAN, for testing on a phone |
| `npm run build` / `npm run preview` | Production build and local preview                        |
| `npm run verify`                    | Typecheck, lint, format check, unit tests, build          |
| `npm run test`                      | Unit and component tests                                  |
| `npm run test:e2e`                  | Playwright tests against the production build             |
| `npm run qr -- <base-url>`          | Write one QR code per product to `qr/`                    |
| `npm run format`                    | Format the code                                           |

## Project layout

```
src/domain    Product type, slug rules, product link parsing (pure)
src/usecase   Product catalog use cases and the repository port
src/adapter   Static JSON catalog implementing the port
src/ui        Pages and components
src/app       Composition root and routes
scripts       QR code generation
e2e           Playwright tests
```

Dependencies point inward: `ui` → `usecase` → `domain`. To move the catalog
to an API later, add a new adapter that implements `ProductRepository`.

## Add a product

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
npm run dev:https
```

Open the printed `https://<lan-ip>:5173` URL on a phone on the same Wi-Fi and
accept the self-signed certificate warning. If the phone refuses the
certificate, expose the plain dev server through an HTTPS tunnel instead
(for example `cloudflared tunnel --url http://localhost:5173`).

Generate QR codes for that address with `npm run qr -- https://<lan-ip>:5173`.

Device requirements: an ARCore-supported Android phone with Chrome, or an
iPhone/iPad with Safari.

## Deploy

`npm run build` writes static files to `dist/`. Any static host with HTTPS
works. The host must serve `index.html` for unknown paths so that
`/p/<slug>` deep links work:

- Cloudflare Pages: automatic. `public/_headers` is applied as well.
- Netlify: add `public/_redirects` containing `/* /index.html 200`.

## Known limits

- iPhones have no WebXR AR; they use AR Quick Look with a USDZ generated from
  the GLB. If a model looks wrong there, export a real `.usdz` and set
  `iosModelUrl`.
- `@google/model-viewer` 4.3 prints a few debug lines to the console.
- No Content-Security-Policy header yet.
