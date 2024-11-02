# Changelog

## 0.2.15 - 2024-11-02

- Added support PDF/A and PDF/UA (see [documentation](https://pdfmake.github.io/docs/0.1/document-definition-object/pdfa/))
- Changed Virtual file system (VFS) format for better compatibility with frameworks (backwards compatibility preserved). **For compatibility with frameworks, rebuild VFS required!**
- Browser: Added methods for fonts (`addFonts`, `setFonts`, `clearFonts`)
- Browser: Added methods for table layouts (`addTableLayouts`, `setTableLayouts`, `clearTableLayouts`)
- Added support `link`, `linkToPage` and `linkToDestination` for SVG
- Update pdfkit to 0.15.1
- Fixed bug with how page breaks provoked by cells with rowspan were handled
- Fixed find where previous cell started with row span and col span combination
- Fixed calculating correctly the 'y' at the end of a rowSpan with dontBreakRows

## 0.2.14 - 2024-10-09

- Fixed drawing top horizontal line of the table with page break
- Fixed uncaught Error when rowSpan and dontBreakRows combined

## 0.2.13 - 2024-09-22

- Minimal supported version Node.js 18 LTS
- Update Roboto font (version 3.010)
- Fixed page break in a column group
- Fixed saving margins in an unbreakable block
- Fixed fillColor items in unbreakable blocks
- Fixed calculating correctly the 'y' at the end of a rowSpan with dontBreakRows
- Fixed margins (top/bottom) of nodes and row height are considered for breaking page
- Fixed margins after page break
- Fixed margins of nodes with relativePosition or absolutePosition are ignored and don't interfere with the regular flow of the layout

## 0.2.12 - 2024-08-14

- Fixed error message of bad image definition

## 0.2.11 - 2024-08-09

- Fixed and validates input values headerRows and keepWithHeaderRows
- Fixed numbering nested ordered lists
- Speed up StyleContextStack.autopush() for large tables
- Fixed widths of table columns with percentages
- Fixed storing the correct context in the ending cell of a row span when there were nested column groups (columns or tables)

## 0.2.10 - 2024-03-07

- Removed unused brfs dependency

## 0.2.9 - 2024-01-01

- Added padding option for QR code
- Allow the document language to be specified
- Fixed cover image size inside table
- Fixed "Cannot read properties of undefined (reading 'bottomMost')" if table contains too few rows
- Fixed invalid source-maps in builded js file

## 0.2.8 - 2023-11-09

- Update pdfkit to 0.14.0
- Update Roboto font (version 3.008)

## 0.2.7 - 2022-12-17

- Fixed theoretical vulnerability CVE-2022-46161 (**It was never part of version released as npm package or cdnjs or bower or packagist!**)

## 0.2.6 - 2022-10-09

- Updated Roboto font (version 3.005)
- Fixed calculating auto page height
- Fixed TrueType Collection loading from URL
- Fixed refetching fonts from URL

## 0.2.5 - 2022-04-01

- Support passing headers to request for loading font files and images via URL adresses

## 0.2.4 - 2021-11-10

- Fixed destination path argument in VFS build script.
- Fixed error "Object.isExtensible is not a function" (bug is in core-js version 3.19.1).

## 0.2.3 - 2021-11-06

- Updated [@foliojs-fork/pdfkit](https://github.com/foliojs-fork/pdfkit) to version 0.13.0.
- Tiling pattern support.
- svg-to-pdfkit package moved as built-in. Solve not used installation of pdfkit.
- Fixed passing document metadata.

## 0.2.2 - 2021-08-02

- Fixed compatibility with Internet Explorer 11.

## 0.2.1 - 2021-08-02

- Upgrade Unicode Line Breaking Algorithm (UAX #14) to Unicode 13.0.0.
- Updated [@foliojs-fork/pdfkit](https://github.com/foliojs-fork/pdfkit) to version 0.12.3.
- Updated [@foliojs-fork/linebreak](https://github.com/foliojs-fork/linebreak) to version 1.11.1.

## 0.2.0 - 2021-07-05

- Move to [@foliojs-fork](https://github.com/foliojs-fork) packages with up-to-date dependecies and security bug fixes and others. These are the libraries [@foliojs-fork/fontkit](https://github.com/foliojs-fork/fontkit), [@foliojs-fork/restructure](https://github.com/foliojs-fork/restructure), [@foliojs-fork/linebreak](https://github.com/foliojs-fork/linebreak) which are used in [@foliojs-fork/pdfkit](https://github.com/foliojs-fork/pdfkit).
- Upgrade Unicode Line Breaking Algorithm (UAX #14) to Unicode 12.0.0
- Introduced new `build-vfs.js` script to build virtual file system for fonts (see [documentation](https://pdfmake.github.io/docs/0.1/fonts/custom-fonts-client-side/vfs/)).
- Removed support Node.js 8 and 10. Minimum required version is 12 LTS.
- Removed support Internet Explorer 10. Supported only Internet Explorer 11.
- Removed gulp.
