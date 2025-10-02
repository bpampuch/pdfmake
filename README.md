# pdfmake [![Node.js CI][githubactions_img]][githubactions_url] [![GitHub][github_img]][github_url] [![npm][npm_img]][npm_url] [![Bower][bower_img]][bower_url] [![Packagist][packagist_img]][packagist_url] [![CDNJS][cdnjs_img]][cndjs_url]

[githubactions_img]: https://github.com/bpampuch/pdfmake/actions/workflows/node.js.yml/badge.svg?branch=0.2
[githubactions_url]: https://github.com/bpampuch/pdfmake/actions

[github_img]: https://img.shields.io/github/release/bpampuch/pdfmake.svg?colorB=0E7FBF
[github_url]: https://github.com/bpampuch/pdfmake/releases/latest

[npm_img]: https://img.shields.io/npm/v/pdfmake.svg?colorB=0E7FBF
[npm_url]: https://www.npmjs.com/package/pdfmake

[bower_img]: https://img.shields.io/bower/v/pdfmake.svg?colorB=0E7FBF
[bower_url]: https://github.com/bpampuch/pdfmake

[packagist_img]: https://img.shields.io/packagist/v/bpampuch/pdfmake.svg?colorB=0E7FBF
[packagist_url]: https://packagist.org/packages/bpampuch/pdfmake

[cdnjs_img]: https://img.shields.io/cdnjs/v/pdfmake.svg?colorB=0E7FBF
[cndjs_url]: https://cdnjs.com/libraries/pdfmake


PDF document generation library for server-side and client-side usage in pure JavaScript.

Check out [the playground](http://bpampuch.github.io/pdfmake/playground.html) and [examples](https://github.com/bpampuch/pdfmake/tree/0.1/examples).

### Features

* line-wrapping,
* text-alignments (left, right, centered, justified),
* numbered and bulleted lists,
* tables and columns
  * auto/fixed/star-sized widths,
  * col-spans and row-spans,
  * headers automatically repeated in case of a page-break,
* images and vector graphics,
* convenient styling and style inheritance,
* page headers and footers:
  * static or dynamic content,
  * access to current page number and page count,
* background-layer,
* page dimensions and orientations,
* margins,
* custom page breaks,
* font embedding,
* support for complex, multi-level (nested) structures,
* table of contents,
* helper methods for opening/printing/downloading the generated PDF,
* setting of PDF metadata (e.g. author, subject).

## Documentation

Documentation URL: https://pdfmake.github.io/docs/

## Building from sources version 0.2.x

using npm:
```
git clone --branch 0.2 https://github.com/bpampuch/pdfmake.git
cd pdfmake
npm install
npm run build
```

using yarn:
```
git clone --branch 0.2 https://github.com/bpampuch/pdfmake.git
cd pdfmake
yarn
yarn run build
```

## License
MIT

## Authors
* [@bpampuch](https://github.com/bpampuch) (founder)
* [@liborm85](https://github.com/liborm85)

pdfmake is based on a truly amazing library [pdfkit](https://github.com/devongovett/pdfkit) (credits to [@devongovett](https://github.com/devongovett)).

Thanks to all contributors.

---

## FlowAccount Customizations (Fork Notes)

This fork extends pdfmake 0.2.x with FlowAccount-specific features and behavior.

### 1. Remote Image URLs (Browser & Node)
You can now reference HTTP(S) image URLs directly in your `docDefinition.images` map or inline `image` properties.

Browser usage (helper auto-fetch):
```js
pdfMake.createPdf(docDefinition).download(); // remote image URLs resolved before layout
```

Node usage (async prefetch):
```js
const printer = new PdfPrinter(fonts);
await printer.resolveRemoteImages(docDefinition); // fetch & embed as data URLs
const pdfDoc = await printer.createPdfKitDocumentAsync(docDefinition, options);
pdfDoc.pipe(fs.createWriteStream('out.pdf'));
pdfDoc.end();
```
Errors while fetching images are swallowed (image omitted) so a bad URL will not abort PDF generation.

### 2. Dynamic Header/Footer Height Measurement
If your header or footer function returns variable-height content, the layout engine performs a preliminary measurement pass and adjusts `pageMargins.top` / `pageMargins.bottom` so body content starts after real header/footer height.

### 3. Vertical Alignment in Table Cells & Layers
Table cells and layered content can specify `verticalAlign: 'top'|'middle'|'bottom'` (same values as legacy implementation). Markers are inserted to compute and realign content after row height is known.

### 4. Layers
Any node can include `layers: [ nodeA, nodeB, ... ]`. Layers share the same starting Y position; the tallest layer determines consumed height. Useful for overlaying backgrounds/watermarks behind foreground text without manual positioning.

### 5. Remark Table Transformation
Legacy pattern: when `docStructure[2][0]` contains a `remark` table and is immediately followed by a detail node, these two nodes are transformed into added header rows inside the remark table for consistent page-break behavior.

### 6. footerBreak Logic
Nodes marked with `footerBreak: true` after the first such node are skipped (prevents duplicate footer sections when custom flows generate repeated fragments).

### 7. Async API Additions
`printer.resolveRemoteImages(docDefinition, timeoutMs?)` – fetch remote images and inline them.

`printer.createPdfKitDocumentAsync(docDefinition, options)` – async variant ensuring remote images (and any future async preprocessing) are complete before layout.

### 8. Development Helpers
Hot reload (playground) via `npm run dev:play` (nodemon + webpack watch) – see `dev-playground/README.md`.

### 9. Testing
Added unit tests covering remote image resolution and legacy layout customizations (`tests/layoutBuilder_legacy_custom.spec.js`).

### 10. Caveats
* Dynamic header/footer measurement is a heuristic single-pass; if header/footer height depends on total page count, final heights might differ slightly.
* Remote image fetching uses global `fetch`; ensure Node >= 18 or polyfill fetch in earlier runtimes.

---
