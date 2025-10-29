## pdfmake_flowaccount – AI Assistant Working Guide

Concise, project-specific rules to help AI agents contribute effectively. Focus on existing patterns; do not introduce new architectural styles.

### 1. Big Picture
This is a forked/customized build of pdfmake (client/server PDF generation). Core flow:
Document Definition (user input) -> Preprocess (`docPreprocessor`) -> Measure (`docMeasure`) -> Layout (`layoutBuilder` orchestrating columns, tables, lists, images, vectors, text) -> Page model (lines/items) -> Render (`printer` using `pdfkit`) -> Delivery (browser wrapper `src/browser-extensions/pdfMake.js` or Node piping).
Key responsibilities:
- `printer.js` (PdfPrinter): entry; sets metadata, page size/orientation, registers default table layouts, invokes `LayoutBuilder`, renders pages (vectors, lines, images, verticalAlign wrappers, watermark) with pdfkit.
- `layoutBuilder.js`: heart of layout; walks node tree, applies page breaks, headers/footers, background, watermarks, vertical alignment, multi-pass pageBreakBefore logic, custom remark/table tweaks.
- `docPreprocessor.js`: normalizes input (shortcuts: arrays → stack, strings → text objects), recurses into nested constructs (columns, stack, lists, tables, toc, images, canvas, qr).
- `docMeasure.js` (not modified here but integral): computes sizes for text, images, tables before positioning.
- `tableProcessor.js`: handles table width calc, spans, borders, header repetition, row breaking logic and drawing horizontal/vertical lines & fills.
- `fontProvider.js`: maps style (bold/italics) to physical font files, caches pdfkit font instances.
- `browser-extensions/pdfMake.js`: browser façade adding async helpers (open/print/download/getBase64/getDataUrl) and binding virtual FS for fonts/images.

### 2. Build & Dev Workflow
- Build bundle: `npm run build` (gulp `build` task -> webpack -> produces `build/pdfmake.js`, minified + sourcemap, adds banner). Gulp also strips sourceMappingURL comments pre-uglify.
- Do NOT commit changes in `build/` (see `CONTRIBUTING.md`). Generated artifacts only.
- Tests: `npm test` runs gulp default (currently `gulp` runs tasks: `test`, `build`, `buildFonts`; lint is disabled). Test sources expected under `tests` (none shown here) copied to `test-env` with exposed internal methods.
- Font virtual file system: `gulp buildFonts` encodes `examples/fonts/*.*` into `build/vfs_fonts.js` (base64). For custom fonts, mirror this pipeline.
- Dev playground (manual testing): `cd dev-playground && npm install && npm install -g nodemon; nodemon ./dev-playground/server.js` from repo root to auto-restart on src changes.

### 3. Project-Specific Conventions & Patterns
- Page size normalization: `fixPageSize` swaps width/height for orientation; special `'auto'` height sets Infinity to layout one tall page then backfills actual height.
- Margins: Accept number | [h,v] | [l,t,r,b]; converted early (`fixPageMargins`) into object form; always reference normalized shape in new code.
- Fonts: Always supply family present in provided descriptor; throw explicit error if missing (keep pattern in `fontProvider.js`). Use `Roboto` key names (normal/bold/italics/bolditalics) for client default.
- Table layouts: Register additional layouts via `options.tableLayouts` passed into `createPdfKitDocument`; default layouts: `noBorders`, `headerLineOnly`, `lightHorizontalLines`. Reuse builder registration rather than hard-coding in rendering.
- Table processing: Borders/fills decided per cell before drawing lines; row/col spans adjusted so vertical lines draw once. Maintain order: beginTable -> per row (beginRow -> processRow -> endRow) -> endTable.
- Page breaks: Custom pre-pass `pageBreakBefore` (if provided) works on linear node list; any new node attributes used there must be added to `nodeInfo` construction list in `layoutBuilder.layoutDocument` for availability.
- Unbreakable blocks: Use `node.unbreakable=true` to force keep-together. Commit order matters—respect existing vertical align handling (`beginVerticalAlign`/`endVerticalAlign`).
- Vertical alignment inside rows/layers: Achieved by wrapping start/end markers pushed on `verticalAlignItemStack`; if adding new container types, replicate pattern (capture begin object, compute `viewHeight` after row height known).
- Watermarks: Binary-search font size to fit ~80% diagonal; supply `watermark.text` (string or object). Preserve algorithm if extending.
- TOC items: Text nodes with `tocItem` push into preprocessor `tocs`; line rendering later patch-in page numbers (`renderLine`). If extending TOC, ensure `_tocItemRef` contract is honored.
- Remark / summary custom logic: Custom FlowAccount modifications exist (e.g., remark table page-break adjustments, footerBreak). When refactoring, keep those branches—tagged comments like `//----------Remark Table Page Break by Beam----------` and `^^modify by tak^^` indicate required business behavior.
- Async browser API: Always route via `Document.getBuffer/getBlob/getBase64/getDataUrl` and never assume synchronous completion.

### 4. When Adding or Modifying Code
- Prefer modifying existing processors (`processNode` branches) rather than injecting ad-hoc logic in render phase.
- For new node types: add in ALL stages—preprocess, measure, process (layout), render; throw early if unrecognized to maintain explicit model.
- Maintain non-mutating copies when passing dynamic header/footer/background functions (see cloning in `addDynamicRepeatable`).
- Keep error messaging descriptive (pattern: throw string or Error with clear context; match existing usage for consistency).

### 5. Example: Adding a Custom Table Layout
1. Define layout object with hLineWidth/vLineWidth/padding callbacks.
2. Pass via `pdfMake.createPdf(docDefinition, { tableLayouts: { myLayout: { ... } } })` (browser) or `printer.createPdfKitDocument(docDefinition, { tableLayouts: { ... } })` (Node).
3. Reference in docDefinition: `{ table: { ... }, layout: 'myLayout' }`.

### 6. Common Pitfalls
- Forgetting to update `nodeInfo` when relying on new property inside `pageBreakBefore` leads to non-triggering breaks.
- Adding fonts without populating all four style variants can throw at runtime when bold/italics requested.
- Mutating `build/` outputs manually causes divergence—always rebuild instead.
- In tables, misaligned `rowSpan/colSpan` indices produce thrown errors (explicit check in `getEndingCell`).

### 7. Quick Reference Key Files
`src/printer.js`, `src/layoutBuilder.js`, `src/tableProcessor.js`, `src/docPreprocessor.js`, `src/fontProvider.js`, `src/browser-extensions/pdfMake.js`.

---
Questions or unclear conventions? Ask for clarification—update this file only with patterns already present in code.