# Changelog

## 0.3.11 - 2026-06-12

- Updated pdfkit to 0.19.1 (fixed RGB JPEG embedded as DeviceGray, bug introduced in 0.19.0)

## 0.3.10 - 2026-06-07

- Updated pdfkit to 0.19.0

## 0.3.9 - 2026-05-23

- Fixed table rowSpan cell height in last column

## 0.3.8 - 2026-05-06

- Added server-side method `setLocalAccessPolicy()` for defining a custom access policy for local file

	Example:
	```js
	pdfmake.setLocalAccessPolicy((path) => {
		// check allowed local file path
		return path.startsWith("fonts/");
	});
	```
- Improved URL Access Policy (`setUrlAccessPolicy` method); URLs are now validated even before each redirection in Node.js and after final redirection in browser (browsers do not support validation before redirection)
- Fixed extra blank page when using headerRows, dontBreakRows and cell pageBreak together
- Fixed rendering of an invalid color name - previously it used the last valid color; now it defaults to black
- Fixed dontBreakRows rowSpan ending offset across pages
- Added dynamic `pageMargins`

## 0.3.7 - 2026-03-17

- Updated pdfkit to 0.18.0

## 0.3.6 - 2026-03-10

- Added `setUrlAccessPolicy()` for defining a custom access policy for external URLs before download
	(addresses a potential server vulnerability **CVE-2026-26801**)

	Example:
	```js
	pdfmake.setUrlAccessPolicy((url) => {
		// check allowed domain
		return url.startsWith("https://example.com/");
	});
	```
	For details see [documentation](https://pdfmake.github.io/docs/0.3/getting-started/server-side/methods/#url-access-policy)
- Added validation for image height and width values

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
