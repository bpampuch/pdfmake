# Changelog

## 0.3.0-beta.18 - 2025-05-09

- Added `section` node
- Fixed crash that occurred when using automatic page height
- Fixed text overflow with some non-wrappable texts

## 0.3.0-beta.17 - 2025-04-29

- Fixed DoS via repeatedly redirect URL in file embedding

## 0.3.0-beta.16 - 2025-04-26

- Update pdfkit to 0.17.0
- Update Roboto font (version 3.011)
- Fixed URL resolving for same URL in browser
- Fixed sharing URL resolver for not available URLs

## 0.3.0-beta.15 - 2025-01-01

- Reverted to the original `pdfkit` package, moving away from `@foliojs-fork`
- Update pdfkit to 0.16.0
- Fixed a potential issue in the minimized library when detecting the orientation of JPEG images

## 0.3.0-beta.14 - 2024-12-23

- Fixed big size pdfmake bundle for browser

## 0.3.0-beta.13 - 2024-12-15

- Update pdfkit to 0.15.2
- Fixed speed in Node.js if is fetching URL for image or font redirected
- Fixed aspect ratio for image with exif orientation tag
- Fixed font size calculation for watermark if is page orientation is changed

## 0.3.0-beta.12 - 2024-11-03

- Added support PDF/A and PDF/UA (see [documentation](https://pdfmake.github.io/docs/0.3/document-definition-object/pdfa/))
- Added support `link`, `linkToPage` and `linkToDestination` for SVG
- Update pdfkit to 0.15.1
- Fixed bug with how page breaks provoked by cells with rowspan were handled
- Fixed find where previous cell started with row span and col span combination
- Fixed calculating correctly the 'y' at the end of a rowSpan with dontBreakRows

## 0.3.0-beta.11 - 2024-10-09

- Fixed drawing top horizontal line of the table with page break

## 0.3.0-beta.10 - 2024-09-22

- Drop support Internet Explorer 11 (Microsoft will not support from 2022)
- Minimal supported version Node.js 18 LTS
- Update Roboto font (version 3.010)
- Fixed page break in a column group
- Fixed saving margins in an unbreakable block
- Fixed fillColor items in unbreakable blocks
- Fixed calculating correctly the 'y' at the end of a rowSpan with dontBreakRows
- Fixed margins (top/bottom) of nodes and row height are considered for breaking page
- Fixed margins after page break
- Fixed margins of nodes with relativePosition or absolutePosition are ignored and don't interfere with the regular flow of the layout

## 0.3.0-beta.9 - 2024-08-09

- Fixed and validates input values headerRows and keepWithHeaderRows
- Fixed numbering nested ordered lists
- Speed up StyleContextStack.autopush() for large tables
- Fixed widths of table columns with percentages
- Fixed storing the correct context in the ending cell of a row span when there were nested column groups (columns or tables)

## 0.3.0-beta.8 - 2024-03-07

- Removed unused brfs dependency

## 0.3.0-beta.7 - 2024-01-01

- Minimal supported version Node.js 16 LTS
- Added padding option for QR code
- Allow the document language to be specified
- Fixed cover image size inside table
- Fixed "Cannot read properties of undefined (reading 'bottomMost')" if table contains too few rows
- Fixed invalid source-maps in built js file

## 0.3.0-beta.6 - 2023-11-09

- Update pdfkit to 0.14.0
- Update Roboto font (version 3.008)

## 0.3.0-beta.5 - 2023-02-19

- Fixed document buffer size. Node.js 18+ allow max 1 GiB.

## 0.3.0-beta.4 - 2022-12-17

- Minimal supported version Node.js 14 LTS
- Fixed theoretical vulnerability CVE-2022-46161 (**It was never part of version released as npm package or cdnjs or bower or packagist!**)

## 0.3.0-beta.3 - 2022-10-09

- Updated Roboto font (version 3.005)
- Fixed calculating auto page height
- Fixed TrueType Collection loading from URL
- Fixed refetching fonts from URL

## 0.3.0-beta.2 - 2022-04-01

- Attachments embedding
- Support passing headers to request for loading font files and images via URL addresses

## 0.3.0-beta.1 - 2022-01-01

- Port code base to ES6+
- Unify interface for node and browser **(breaking change)**
- All methods return promise instead of using callback **(breaking change)**
- Change including virtual font storage in client-side **(breaking change)**
- Change parameters of `pageBreakBefore` function **(breaking change)**
- Support for loading font files and images via URL adresses (https:// or http:// protocol) in Node.js (client and server side now)
