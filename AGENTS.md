# Working in pdfmake

These instructions apply to the entire repository. Follow `.github/CONTRIBUTING.md`.

## Changes

- Preserve support for both Node.js and browsers. Use the current branch's API and implementation.
- Edit source code in `src/`. Do not manually edit generated files in `js/` or `build/`.
- When changing `src/3rd-party/`, account for existing patches and `build:3rdparty`.
- Keep changes focused. Avoid unrelated refactoring, formatting, and dependency changes.
- Follow `.editorconfig`, `eslint.config.mjs`, and the surrounding code style.
- Write code identifiers, comments, and test descriptions in English.
- User documentation lives in `pdfmake/docs`. Keep local examples consistent with behavior changes.

## Verification

Run commands from the repository root with Node.js >= 20.

- Add a behavioral regression test for bug fixes. For layout bugs, use the integration tests and `tests/integration/integrationTestHelper.js`.
- After source changes, run `npm run build:node` before targeted tests; most tests load compiled code from `js/`.
- Run a targeted test with, for example, `npx mocha tests/unit/TableProcessor.spec.js`.
- Run `npm run build` before browser tests, which load files from `build/`.
- Before handing over implementation changes, run `npm test` (full build, tests, and lint).
- If examples change, also run `npm run build:examples`.
- For changes that may affect PDF output, run `npm run build:examples` and compare the generated PDFs with output from before the change. Check for unintended changes in layout, pagination, and content; visually inspect affected examples.
- Documentation-only changes do not require a build or tests.
- Report checks performed, skipped checks, and failures in the final response.

## Branch-specific authoring and type support


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

Library runtime remains Node >=20. Development tools require Node >=20.19 on 20.x or >=22.12 on newer lines (CI covers 20, 22, 24 and 26). Run `npm ci` from the committed lockfile.
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
