# Working on pdfmake

This branch targets the **0.3 API**. Do not copy the 0.1/0.2 `PdfPrinter`
constructor or callback output methods into 0.3 examples.

## Source map

- `src/base.js`: shared public API and resource policies; `src/index.js`: Node entry.
- `src/browser-extensions/`: browser entry, font containers and output helpers.
- `DocPreprocessor` → `DocMeasure`/`TextInlines` → `LayoutBuilder`/`TableProcessor`
  → `Renderer` → PDFKit is the main document pipeline.
- `src/OutputDocument*.js`: asynchronous buffer, stream and file output.
- `tests/unit/` and `tests/integration/`: Mocha tests against compiled `js/`.
- `examples/`: runnable feature examples; `fonts/` and `standard-fonts/`: font assets.
- Developer website and documentation MCP: separate `pdfmake/docs` repository,
  `master` branch. Canonical docs: https://pdfmake.github.io/docs/0.3/.

## Validation

Library runtime remains Node >=20. Development tools require Node >=20.19 on 20.x or >=22.12 on newer lines (CI covers 20, 22 and 24). Run `npm ci` from the committed lockfile.
Run `npm test` after source changes: this builds both Node and browser artifacts,
runs all Mocha tests and ESLint. A focused loop is `npm run build:node` followed by
`npx mocha tests/unit/<name>.spec.js`. Never edit generated `js/` or `build/`.
Run `npm run build:examples` and `npm run test:package` before proposing a release.
`npm run benchmark:text` compares the text flattener to its former implementation;
timings are diagnostic, not a CI pass/fail threshold.

## Compatibility and boundaries

Document definitions are processed and mutated during layout. Construct a fresh
definition for each independent document. Preserve font/style/line-break behavior
when optimizing; add regression cases before changing pagination or measurement.
Policies passed to `setUrlAccessPolicy` and `setLocalAccessPolicy` must return a
synchronous boolean. Do not add network fetching, telemetry, LLM providers or new
runtime dependencies for documentation tooling. Keep documentation tooling out of
the library's browser bundle. Do not rewrite vendored third-party sources.

Run `npm run test:typescript` after public API/package changes. It tests real packed
consumers using the bundled declarations and no @types/pdfmake dependency. Keep native declarations
in types/ aligned with the runtime; preserve the MIT attribution. Do not add broad
ambient module shims or claim a native ESM runtime. Keep CJS, Node ESM and browser
imports working and retain negative type assertions.
