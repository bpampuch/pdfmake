# pdfmake FlowAccount Fork – Repository Structure

**Package:** `@flowaccount/pdfmake`  
**Version:** 0.2.20-local  
**License:** MIT  
**Fork of:** [bpampuch/pdfmake@0.2](https://github.com/bpampuch/pdfmake)

---

## Overview

This is a FlowAccount-maintained fork of pdfmake 0.2.x, extended with:
- **Remote image URL support** (browser + Node async fetch)
- **Dynamic header/footer measurement**
- **Vertical alignment** in table cells and layers
- **Layers** for overlapping content without manual positioning
- **Remark table transformation** and `footerBreak` logic (legacy FlowAccount patterns)
- **Browser VFS auto-detection** for default Roboto fonts

---

## 📁 Repository Structure

```
pdfmake_flowaccount/
│
├── 📦 src/                         ← Core engine (used by both Node and browser builds)
│   ├── printer.js                  ← Entry: PdfPrinter; orchestrates layout, rendering, async remote images
│   ├── layoutBuilder.js            ← Heart of layout: page breaks, headers/footers, watermarks, layers, vertical align
│   ├── tableProcessor.js           ← Table width/span calc, row breaking, borders, header repetition
│   ├── docPreprocessor.js          ← Normalizes doc definition (shortcuts, nested structures)
│   ├── docMeasure.js               ← Computes sizes (text/images/tables) before positioning
│   ├── fontProvider.js             ← Maps font families to physical files, caches pdfkit font instances
│   ├── imageMeasure.js             ← Image dimension extraction (data URLs, local paths, VFS keys)
│   ├── svgMeasure.js               ← SVG dimension parsing
│   ├── elementWriter.js            ← Writes lines/vectors to pages
│   ├── pageElementWriter.js        ← Higher-level page writer with repeatable blocks, unbreakable sections
│   ├── documentContext.js          ← Tracks current page, position, margins, column state
│   ├── line.js                     ← Line model (inlines, width, height, leading/trailing cuts)
│   ├── textTools.js                ← Text splitting, inline building, width calculation
│   ├── textDecorator.js            ← Underline/strikethrough/overline helpers
│   ├── columnCalculator.js         ← Column width distribution (fixed/auto/star)
│   ├── styleContextStack.js        ← Style inheritance and overrides
│   ├── traversalTracker.js         ← Tracks node visits during layout
│   ├── helpers.js                  ← Utility functions (isArray, isString, pack, etc.)
│   ├── qrEnc.js                    ← QR code generation
│   ├── pdfKitEngine.js             ← Thin wrapper around pdfkit methods
│   ├── standardPageSizes.js        ← Predefined page size constants (A4, Letter, etc.)
│   │
│   ├── 📂 browser-extensions/      ← Browser-specific wrappers
│   │   ├── pdfMake.js              ← Browser facade: Document class, VFS binding, async helpers (open/print/download/getBase64)
│   │   ├── virtual-fs.js           ← In-memory file system for fonts/images in browser
│   │   ├── URLBrowserResolver.js   ← Fetches remote resources (fonts/images) and stores in VFS
│   │   └── tokenizer-shim.js       ← Browser shim for text tokenizer
│   │
│   └── 📂 3rd-party/               ← Vendored dependencies
│       ├── svg-to-pdfkit.js        ← SVG rendering (copied from npm package)
│       └── svg-to-pdfkit/          ← License and source for svg-to-pdfkit
│
├── 📦 build/                       ← Compiled bundles (generated; committed for npm distribution)
│   ├── pdfmake.js                  ← Browser UMD bundle (webpack output)
│   ├── pdfmake.min.js              ← Minified browser bundle
│   ├── vfs_fonts.js                ← Virtual file system with base64-encoded Roboto fonts
│   └── fonts/                      ← (Optional) standard fonts build artifacts
│
├── 📦 examples/                    ← Demonstration scripts (runnable with Node)
│   ├── basics.js                   ← Simple text/margins
│   ├── tables.js                   ← Table examples (spans, headers)
│   ├── images.js                   ← Image embedding
│   ├── lists.js                    ← Ordered/unordered lists
│   ├── svgs.js                     ← SVG rendering
│   ├── watermark.js                ← Watermark overlay
│   ├── toc.js                      ← Table of contents
│   ├── fonts/                      ← Roboto font files (TTF)
│   └── pdfs/                       ← Output directory for generated PDFs
│
├── 📦 tests/                       ← Mocha test suites
│   ├── printer.js                  ← Tests for PdfPrinter, remote images
│   ├── layoutBuilder.js            ← Layout engine tests
│   ├── tableProcessor.js           ← Table logic tests
│   ├── docMeasure.js               ← Measurement tests
│   ├── docPreprocessor.js          ← Preprocessing tests
│   ├── fontProvider.js             ← Font resolution tests
│   ├── integration/                ← End-to-end PDF generation tests
│   └── browser/                    ← Browser-specific tests (VFS resolution, polyfills)
│
├── 📦 dev-playground/              ← Local hot-reload dev server for testing doc definitions
│   ├── server.js                   ← Express server with live reload
│   ├── public/                     ← Static HTML/JS/CSS for playground UI
│   └── README.md                   ← Usage instructions
│
├── 📦 libs/                        ← Client-side libraries (FileSaver.js, etc.)
│
├── 📦 .github/                     ← GitHub workflows, Copilot instructions
│   └── copilot-instructions.md     ← AI agent working guide
│
├── 📄 package.json                 ← Dependencies, scripts, npm config
├── 📄 gulpfile.js                  ← Build orchestration (Gulp tasks for webpack, tests, vfs generation)
├── 📄 webpack.config.js            ← Browser bundle config (UMD, polyfills, source maps)
├── 📄 webpack-standardfonts.config.js ← Alternative build with embedded AFM standard fonts
├── 📄 build-vfs.js                 ← Script to encode font files into vfs_fonts.js
├── 📄 build-examples.js            ← Script to generate example PDFs
├── 📄 eslint.config.mjs            ← ESLint rules
├── 📄 .prettierrc.json             ← Prettier formatting config
├── 📄 CHANGELOG.md                 ← Version history
├── 📄 CONTRIBUTING.md              ← Contribution guidelines
├── 📄 README.md                    ← Quick start, features, FlowAccount customizations
└── 📄 LICENSE                      ← MIT license
```

---

## 🎯 Key Directories Explained

### `/src/` – Core Engine
All layout, measurement, and rendering logic lives here. Used by **both** Node (`require('./src/printer')`) and browser builds (webpack bundles it into `build/pdfmake.js`).

#### Entry Point
- **`printer.js`**: Creates `PdfPrinter` class; exposes `createPdfKitDocument()` and `createPdfKitDocumentAsync()`.

#### Layout Pipeline
1. **`docPreprocessor.js`**: Normalizes shortcuts (e.g., `'text'` → `{ text: 'text' }`)
2. **`docMeasure.js`**: Computes `_minWidth`, `_maxWidth`, `_height` for every node
3. **`layoutBuilder.js`**: Arranges nodes onto pages, handles page breaks, headers, footers, watermarks, layers, vertical alignment
4. **`tableProcessor.js`**: Special handling for tables (widths, spans, row breaks, borders)
5. **`elementWriter.js` + `pageElementWriter.js`**: Write lines/vectors/images to pdfkit document

#### Helpers
- **`fontProvider.js`**: Font resolution (bold/italics/normal)
- **`imageMeasure.js`** / **`svgMeasure.js`**: Dimension extraction
- **`textTools.js`**: Text splitting, inline building, width calculation
- **`columnCalculator.js`**: Column width distribution (auto/star/fixed)
- **`styleContextStack.js`**: Style inheritance
- **`documentContext.js`**: Tracks current position, page, margins

### `/src/browser-extensions/` – Browser Façade
- **`pdfMake.js`**: Browser entry; exports `createPdf()`, `addVirtualFileSystem()`, `addFonts()` helpers
- **`virtual-fs.js`**: In-memory file system for fonts/images
- **`URLBrowserResolver.js`**: Fetches remote URLs (fonts/images) and stores in VFS

### `/build/` – Compiled Bundles
Generated by `npm run build` (webpack). Committed for npm distribution.

- **`pdfmake.js`**: UMD browser bundle (includes polyfills for Buffer, process, streams)
- **`pdfmake.min.js`**: Minified version
- **`vfs_fonts.js`**: Base64-encoded Roboto fonts in CommonJS module

### `/examples/` – Demos
Runnable Node scripts demonstrating features. Output saved to `examples/pdfs/`.

### `/tests/` – Test Suites
Mocha tests covering unit logic and end-to-end PDF generation. Run via `npm test`.

### `/dev-playground/` – Local Dev Server
Express server with live reload for rapid docDefinition prototyping. Start with `npm run playground`.

---

## 📊 Data Flow

```
┌─────────────────────┐
│  User Document      │
│  Definition (JSON)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  docPreprocessor    │  ← Normalize shortcuts, recurse nested structures
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  docMeasure         │  ← Compute _minWidth, _maxWidth, _height for all nodes
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  layoutBuilder      │  ← Arrange nodes on pages, apply breaks, headers, footers
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  tableProcessor     │  ← (If table) Calculate widths, spans, row breaks, borders
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  elementWriter      │  ← Write lines/vectors to pdfkit document
│  pageElementWriter  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  pdfkit             │  ← Low-level PDF generation (streams PDF binary)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Output (file/blob) │
└─────────────────────┘
```

---

## 🔧 Build & Dev Workflow

### Install Dependencies
```bash
npm install
```

### Build Browser Bundle
```bash
npm run build
# Outputs: build/pdfmake.js, build/pdfmake.min.js
```

### Build VFS Fonts
```bash
npm run build:vfs
# Generates: build/vfs_fonts.js (base64-encoded Roboto fonts)
```

### Run Tests
```bash
npm test
# Runs: gulp default → test, build, buildFonts
```

### Dev Playground (Hot Reload)
```bash
npm run playground
# Opens: http://localhost:3000
# Auto-rebuilds on src changes (nodemon + webpack watch)
```

### Generate Example PDFs
```bash
npm run build:examples
# Runs all scripts in examples/, outputs to examples/pdfs/
```

---

## 📦 Published Artifacts (npm package)

When published to npm, the package includes:
- `src/` (Node entry: `require('@flowaccount/pdfmake')` → `src/printer.js`)
- `build/pdfmake.js` + `build/pdfmake.min.js` (browser bundles)
- `build/vfs_fonts.js` (Roboto fonts VFS)
- `README.md`, `LICENSE`, `CHANGELOG.md`

**Not included:** `tests/`, `examples/`, `dev-playground/`, `node_modules/`

---

## 🚀 Usage Patterns

### Node.js (Server-Side)
```js
const PdfPrinter = require('@flowaccount/pdfmake');
const fs = require('fs');

const fonts = {
  Roboto: {
    normal: 'fonts/Roboto-Regular.ttf',
    bold: 'fonts/Roboto-Medium.ttf',
    italics: 'fonts/Roboto-Italic.ttf',
    bolditalics: 'fonts/Roboto-MediumItalic.ttf'
  }
};

const printer = new PdfPrinter(fonts);
const docDefinition = { content: 'Hello world!' };

const pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('document.pdf'));
pdfDoc.end();
```

### Browser (Client-Side)
```html
<script src="node_modules/@flowaccount/pdfmake/build/pdfmake.js"></script>
<script src="node_modules/@flowaccount/pdfmake/build/vfs_fonts.js"></script>
<script>
  pdfMake.createPdf({ content: 'Hello world!' }).download('document.pdf');
</script>
```

### Browser (ES Module with Dynamic Import)
```ts
const pdfMakeModule = await import('@flowaccount/pdfmake/build/pdfmake');
const pdfMake = pdfMakeModule.default || pdfMakeModule;

const vfsModule = await import('@flowaccount/pdfmake/build/vfs_fonts');
const vfs = vfsModule.pdfMake?.vfs || vfsModule.vfs || vfsModule.default;

pdfMake.addVirtualFileSystem(vfs);
pdfMake.addFonts({
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
});

pdfMake.createPdf({
  content: 'Hello world!',
  defaultStyle: { font: 'Roboto' }
}).open();
```

---

## 🎨 FlowAccount-Specific Features

### 1. Remote Image URLs
```js
const docDefinition = {
  content: [
    { image: 'https://example.com/logo.png', width: 150 }
  ]
};

// Browser: auto-fetched before layout
pdfMake.createPdf(docDefinition).download();

// Node: async prefetch
await printer.resolveRemoteImages(docDefinition);
const pdfDoc = await printer.createPdfKitDocumentAsync(docDefinition);
```

### 2. Layers (Overlapping Content)
```js
{
  layers: [
    { text: 'Background', color: 'gray', fontSize: 60, opacity: 0.2 },
    { text: 'Foreground', fontSize: 20 }
  ]
}
```

### 3. Vertical Alignment in Tables
```js
{
  table: {
    body: [
      [
        { text: 'Top', verticalAlign: 'top' },
        { text: 'Middle', verticalAlign: 'middle' },
        { text: 'Bottom', verticalAlign: 'bottom' }
      ]
    ]
  }
}
```

### 4. Dynamic Header/Footer Measurement
Headers/footers are measured once; `pageMargins.top` / `pageMargins.bottom` adjusted automatically.

### 5. Remark Table Transformation
Legacy pattern: nodes at `docStructure[2][0]` with `remark` table + following detail node are merged into remark table headers for consistent page breaks.

### 6. `footerBreak` Logic
Nodes after the first `footerBreak: true` are skipped (prevents duplicate footer sections).

---

## 📚 Next Steps

This document covers the **folder structure and repository layout**. Future Confluence pages will dive into:

1. **Core Modules Deep Dive**
   - `printer.js` – Entry point, async image resolution
   - `layoutBuilder.js` – Page breaks, headers, footers, layers, vertical alignment
   - `tableProcessor.js` – Table width calculation, spans, borders
   - `docPreprocessor.js` – Normalization and recursion
   - `docMeasure.js` – Size calculation

2. **Browser Extensions**
   - `pdfMake.js` – Document class, async helpers (open/print/download)
   - `virtual-fs.js` – In-memory file system
   - `URLBrowserResolver.js` – Remote resource fetching

3. **Build Pipeline**
   - Webpack configuration (polyfills, UMD, source maps)
   - VFS generation (`build-vfs.js`)
   - Gulp tasks (test, build, buildFonts)

4. **Testing Strategy**
   - Unit tests (mocha)
   - Integration tests (PDF generation)
   - Browser tests (VFS resolution)

5. **Contributing Guide**
   - Code style (ESLint, Prettier)
   - Git workflow
   - Release process

---

**Document Version:** 1.0  
**Last Updated:** October 8, 2025  
**Maintainer:** FlowAccount Engineering
