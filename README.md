# pdfmake

**Create PDFs from structured JavaScript or TypeScript document definitions.**

[![CI](https://github.com/bpampuch/pdfmake/actions/workflows/node.js.yml/badge.svg?branch=master)](https://github.com/bpampuch/pdfmake/actions/workflows/node.js.yml)
[![npm](https://img.shields.io/npm/v/pdfmake)](https://www.npmjs.com/package/pdfmake)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)

[Documentation](https://pdfmake.github.io/docs/0.3/) · [Interactive examples](https://pdfmake.github.io/docs/0.3/playground/) · [Migration to 0.3](https://pdfmake.github.io/docs/0.3/migration-from-0.1/) · [Report an issue](https://github.com/bpampuch/pdfmake/issues)

pdfmake runs in Node.js and the browser. Describe text, tables, images and page
layout in a document definition, then write a file, return a buffer from an API,
or let a browser download the result. No browser process is needed on the server.

> **Development branch:** this checkout targets 0.3.x and includes unreleased
> bundled TypeScript declarations and document preflight validation. The published
> 0.3.12 package does not include those additions. Build and pack this checkout to
> try them locally; do not assume installing 0.3.12 from npm installs this branch.

## Start with a PDF

The library requires **Node.js 20 or later**. All 0.3 output helpers return Promises.

```sh
npm install pdfmake
```

Save as `document.cjs`, then run `node document.cjs`:

```js
const pdfmake = require('pdfmake');
const fonts = require('pdfmake/standard-fonts/Helvetica');

pdfmake.addFonts(fonts);
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(name => Object.values(fonts.Helvetica).includes(name));

async function main() {
  const definition = {
    content: [
      { text: 'Hello, pdfmake', fontSize: 22, bold: true },
      'A document definition works in Node.js and the browser.',
      { table: { body: [['Item', 'Quantity'], ['Documents', 3]] } }
    ],
    defaultStyle: { font: 'Helvetica' }
  };
  await pdfmake.createPdf(definition).write('document.pdf');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
```

Helvetica is a standard PDF font. Use an embedded font such as Roboto when your
content needs characters outside its supported encoding. Configure access policies
for the actual resources your application needs; document input can reference files
and URLs. See [fonts](https://pdfmake.github.io/docs/0.3/fonts/) and
[resource access](https://pdfmake.github.io/docs/0.3/guides/resource-security/).

For a browser bundler:

```js
import pdfmake from 'pdfmake/build/pdfmake.js';
import vfs from 'pdfmake/build/vfs_fonts.js';

pdfmake.addVirtualFileSystem(vfs);
pdfmake.setUrlAccessPolicy(() => false);
await pdfmake.createPdf({ content: ['Hello from the browser'] }).download('hello.pdf');
```

Use `getBuffer()` / `getStream()` for server integrations; `getBlob()`, `download()`,
`open()` and `print()` belong to the browser entry. Construct a fresh definition
for each generation: layout processing mutates the definition.

## TypeScript

This branch ships its own declarations. **Do not install `@types/pdfmake` alongside
the locally built package.** The declarations are based on the MIT-licensed
DefinitelyTyped 0.3 definitions, maintained here with environment-specific APIs.
Attribution is retained in [types/LICENSE](types/LICENSE).

```ts
import pdfmake from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake';

const definition = {
  content: [{ text: 'Checked by TypeScript', fontSize: 18 }]
} satisfies TDocumentDefinitions;
```

Use `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `strict: true` and
`esModuleInterop: true` for Node ESM. TypeScript CommonJS can use
`import pdfmake = require('pdfmake')`. For browser bundlers, use the explicit
browser imports above with `module: "ESNext"` and `moduleResolution: "Bundler"`.
`pdfmake/interfaces` and `pdfmake/interfaces.js` remain supported type paths.
The runtime is CommonJS/UMD; bundled declarations do not turn it into native ESM.

## Validate document input

The unreleased preflight API checks the complete declared document structure and
adds semantic checks for table shapes/spans, IDs, style/layout/font references,
numeric ranges and cycles. It collects diagnostics without changing input,
executing callbacks, fetching resources or evaluating source code.

```js
const result = pdfmake.validateDocument(definition, { strict: true });
if (!result.valid) {
  for (const issue of result.errors) console.error(issue.path, issue.message);
}

// Alternatively, reject invalid input before starting PDF generation.
const buffer = await pdfmake.createPdf(definition, { validation: true }).getBuffer();
```

Unknown properties produce warnings by default, allowing application metadata;
`strict: true` turns them into errors. Results include `errors`, `warnings`,
`deferred` checks and `truncated`. Defaults limit diagnostics to 100, nesting to
100 levels and inspected values to 50,000. Exhausted validation never reports success.
Callbacks and resource decoding still need rendering; always await output and
handle its rejection. JavaScript syntax errors happen before this object API runs.
See [diagnostics](https://pdfmake.github.io/docs/0.3/guides/errors/).

## What you can build

- Flowing text with named styles, wrapping, alignment and embedded fonts.
- Tables with repeated headers, row/column spans, borders and custom layouts.
- Columns, nested lists, page sections, backgrounds, headers and footers.
- Images, SVG, canvas vectors, QR codes, links and a table of contents.
- Metadata, encryption, attachments and supported archival/accessibility options.

Start with [your first PDF](https://pdfmake.github.io/docs/0.3/learn/first-pdf/),
then explore the [document definition reference](https://pdfmake.github.io/docs/0.3/document-definition-object/).

## Develop and contribute

Development tools require Node >=20.19 on 20.x or >=22.12 on newer lines.
The optional standalone playground requires Node >=22.13.

```sh
npm ci
npm test
npm run test:typescript
npm run build:examples
npm run test:package
```

`npm test` verifies the generated validation contract, builds both environments,
runs the test suite and lints source. Consumer tests install the real npm tarball
without `@types/pdfmake`, compile strict Node/browser fixtures and render PDFs.
CI runs these checks on Linux, macOS and Windows with Node 20, 22 and 24.

After editing `types/interfaces.d.ts`, run `npm run schema:generate` and commit
the generated contract with the declaration change. Never edit `js/` or `build/`.
See [AGENTS.md](AGENTS.md) for the source map and compatibility expectations.

```sh
npm run playground
# http://127.0.0.1:1234/playground/

npm pack
# Install the resulting .tgz in an isolated project to review unreleased changes.
```

Documentation, translations, Markdown exports and the read-only documentation MCP
server live in [pdfmake/docs](https://github.com/pdfmake/docs).
For bugs, include a minimal definition, pdfmake version, runtime and expected PDF.

## License and acknowledgments

[MIT](LICENSE). Founded by [Bartek Pampuch](https://github.com/bpampuch), maintained
with [liborm85](https://github.com/liborm85) and the contributor community.
PDF generation builds on [PDFKit](https://github.com/foliojs/pdfkit).
