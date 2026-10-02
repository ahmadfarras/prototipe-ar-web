# mind-ar (vendored)

Prebuilt image-tracking files from `mind-ar@1.2.5` (MIT, see `LICENSE`),
copied from `dist/` of the npm tarball on 2026-10-02
(sha256 of `mind-ar-1.2.5.tgz`:
`e14a0f6e1bdd85beb757d72354999a967efcaaac2fc9a036ce1852ea2d6c5193`).

Vendored instead of installed because the package depends on the native
`canvas` module, which does not build on Node 26, and on the full
TensorFlow.js and MediaPipe packages that these prebuilt files do not need.

| File | Used by |
|---|---|
| `mindar-image-three.prod.js` | `TargetTracker` (the app) |
| `mindar-image.prod.js` | `scripts/build-targets.mjs` (the target compiler) |
| `controller-mGt1s8dJ.js`, `ui-fBadYuor.js` | shared chunks of the two above |

## Local changes

Reapply these when updating the files.

`mindar-image-three.prod.js`:

1. Removed the `sRGBEncoding` import and the
   `this.renderer.outputEncoding = …` assignment. Current three.js no longer
   exports it; this lets MindAR share the `three` version that
   `@google/model-viewer` uses.
2. The `resize` listener is stored as `this.onResize` so it can be removed.

`controller-mGt1s8dJ.js`:

3. The Node-only `require("node-fetch")` (TensorFlow.js's Node platform, never
   used in a browser) is replaced by a throw. The bundler cannot resolve that
   package and fails the build otherwise.
