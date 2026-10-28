# pdfmake [![Node.js CI][githubactions_img]][githubactions_url] [![GitHub][github_img]][github_url] [![npm][npm_img]][npm_url]

[githubactions_img]: https://github.com/bpampuch/pdfmake/actions/workflows/node.js.yml/badge.svg?branch=master
[githubactions_url]: https://github.com/bpampuch/pdfmake/actions

[github_img]: https://img.shields.io/github/release/bpampuch/pdfmake.svg?colorB=0E7FBF
[github_url]: https://github.com/bpampuch/pdfmake/releases/latest

[npm_img]: https://img.shields.io/npm/v/pdfmake.svg?colorB=0E7FBF
[npm_url]: https://www.npmjs.com/package/pdfmake


PDF document generation library for Node.js and browsers, written in pure JavaScript.

Check out [the playground](http://bpampuch.github.io/pdfmake/playground.html) and [examples](https://github.com/bpampuch/pdfmake/tree/master/examples).

## Features

* line wrapping
* text alignment (left, right, centered, justified)
* numbered and bulleted lists
* tables and columns:
  * auto/fixed/star-sized widths
  * column spans and row spans
  * headers automatically repeated after a page break
  * snaking columns (newspaper-style layout where content flows from column to column)
* images, SVG and vector graphics
* QR codes
* convenient styling and style inheritance
* page headers and footers:
  * static or dynamic content
  * access to current page number and page count
* background layer
* watermarks
* page dimensions and orientations
* margins
* document sections
* custom page breaks
* font embedding
* support for complex, multi-level (nested) structures
* table of contents
* document outlines (bookmarks)
* external links and internal navigation
* file attachments
* encryption, password protection and document permissions
* PDF/A support
* helper methods for opening/printing/downloading the generated PDF
* PDF metadata (e.g. author, subject)

## Installation

Install with npm:

```sh
npm install pdfmake
```

## Quick start

### Node.js

Save the following as `example.js`:

```js
const pdfmake = require('pdfmake');
const Roboto = require('pdfmake/fonts/Roboto');

pdfmake.addFonts(Roboto);

const docDefinition = {
	content: ['Hello from pdfmake!']
};

pdfmake.createPdf(docDefinition).write('document.pdf').catch(console.error);
```

Run `node example.js` to create `document.pdf` in the current directory.

### Browser

Save the following as `index.html` next to your `node_modules` directory and open it in a browser.

```html
<!doctype html>
<meta charset="utf-8">
<script src="node_modules/pdfmake/build/pdfmake.min.js"></script>
<script src="node_modules/pdfmake/build/vfs_fonts.js"></script>

<button onclick="pdfMake.createPdf(docDefinition).download('document.pdf').catch(console.error)">Download PDF</button>
<script>
	const docDefinition = {
		content: ['Hello from pdfmake!']
	};
</script>
```

## Documentation

See the [documentation](https://pdfmake.github.io/docs/) for usage and API details.

Documentation improvements are welcome in the [documentation repository](https://github.com/pdfmake/docs).

## Building from source

```sh
git clone https://github.com/bpampuch/pdfmake.git
cd pdfmake
npm install
npm run build
```

## License
MIT

## Authors
* [@bpampuch](https://github.com/bpampuch) (founder)
* [@liborm85](https://github.com/liborm85)

pdfmake is based on [PDFKit](https://github.com/foliojs/pdfkit).

Thanks to all contributors.
