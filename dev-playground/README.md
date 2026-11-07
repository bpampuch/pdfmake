# Development playground

From the **library root**, with Node.js >=22.13:

```sh
npm ci
npm run build
npm run playground
```

Open http://127.0.0.1:1234/playground/. The command installs separate locked build
tools, compiles CodeMirror, and copies the local engine, Roboto and PDF.js assets
before starting a static localhost server. No Express, AngularJS or CDN is needed.
Set `PORT` to choose another port.

After changing engine sources, rebuild the library, run `npm run build:playground`
again and reload. Definitions run in a fresh browser worker, terminated on Cancel
or a ten-second timeout. Custom code is trusted user code, not a security sandbox.
The current workspace, undo history and Live preview preference are autosaved locally. When Live preview is enabled, reloading, restoring a saved document and importing code update the PDF automatically. Turn Live preview off before importing code you want to inspect first; this preference also survives reloads. Named documents and quick drafts are stored separately.

The editor supports highlighting, completions, Tab indentation and Ctrl/Command +
Enter. Ten examples cover tables, spans, styles, headers/footers, lists, columns,
embedded images, SVG and QR. PDF.js provides page navigation, zoom and extracted
page text. Live preview uses a typing delay and an offscreen canvas to keep the previous PDF visible until the replacement is ready. Code import/export and PDF downloads stay local.

The docs repository mirrors the authored UI and tests it in Chromium. Update both
copies with its `scripts/sync-playground.mjs <library-root>` and verify using
`--check`. The two repositories have no runtime dependency on one another.

Core CI retains Node 20/22/24 coverage. The playground toolchain is built on Node
24; its higher Node requirement does not apply to consumers of the npm library.
