# Changelog

## 0.3.5 - 2026-02-22

- Added `snakingColumns` property for columns to enable newspaper-like column flow
- Added outlines / bookmarks for `text` node
	- `outline` - set to `true` for add to bookmarks
	- `outlineText` (optional) - set custom bookmark text, otherwise text from node
	- `outlineExpanded` (optional) - set to `true` for expanded/opened bookmark
	- `outlineParentId` (optional) - parent bookmark `id`
- Added property `outlines` for ToC, which adds all items to outlines / bookmarks (any existing outline settings on texts are respected)

## 0.3.4 - 2026-02-13

- Added vertical alignment for table cells via `verticalAlignment` property, values: `top` (default), `middle`, `bottom`
- Fixed margin inheritance when styles are extended multiple times

## 0.3.3 - 2026-01-18

- Added properties for ToC:
	- `hideEmpty` - set to `true` if you can hide an empty ToC
	- `sortBy` - `'page'` (default) or `'title'`
	- `sortLocale` - custom locale to sort by property `sortBy`
- Added property `decorationThickness` for `text` to set width of the decoration line
- Added inherited/extends styles, use property `extends` in style with style name or array of string with style names
- Fixed margin override with 0 value
- Fixed margin override from multiple styles
- Fixed text decoration for superscript and subscript
- Fixed svg-to-pdfkit - TypeError: t.classList.contains is not a function

## 0.3.2 - 2026-01-11

- Fixed non-working `open()` and `print()` methods in browser
- Added SVG validation: width and height must be specified (in SVG string/element or `svg` node)
- Added support for image scaling with only `height` defined
- Added custom `markerColor` for each item of `ul` and `ol`

## 0.3.1 - 2026-01-07

- Added auto page height for multiple pages (for `section` or after custom page break)
- Added type validation for parameters in method `createPdf`
- Added support `SVGElement` object for `svg` node (`SVGElement` object is available only in browser)
- Updated svg-to-pdfkit library to the latest GitHub master commit
- Fixed a bug in the write method where it did not wait for the file write operation to complete
- Fixed SVG loading
- Fixed rendering SVG without viewBox

## 0.3.0 - 2026-01-01

- Reverted to the original `pdfkit` package, moving away from `@foliojs-fork`
- Drop support Internet Explorer 11 (Microsoft will not support from 2022)
- Minimal supported version Node.js 20 LTS
- Port code base to ES6+
- Unify interface for node and browser **(breaking change)**
- All methods return promise instead of using callback **(breaking change)**
- Change including virtual font storage in client-side **(breaking change)**
- Change parameters of `pageBreakBefore` function **(breaking change)**
- Support for loading font files and images via URL addresses (https:// or http:// protocol) in Node.js (client and server side now)
- Used fetch API for downloading fonts and images
- Attachments embedding
- Added `section` node
