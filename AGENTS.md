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
