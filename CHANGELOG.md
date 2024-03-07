# Changelog

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
