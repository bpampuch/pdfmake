# Changelog

## 0.2.2 - 2021-08-02

- Fixed compatibility with Internet Explorer 11

## 0.2.1 - 2021-08-02

- Upgrade Unicode Line Breaking Algorithm (UAX #14) to Unicode 13.0.0
- Updated [@foliojs-fork/pdfkit](https://github.com/foliojs-fork/pdfkit) to version 0.12.3.
- Updated [@foliojs-fork/linebreak](https://github.com/foliojs-fork/linebreak) to version 1.11.1.

## 0.2.0 - 2021-07-05

- Move to [@foliojs-fork](https://github.com/foliojs-fork) packages with up-to-date dependecies and security bug fixes and others. These are the libraries [@foliojs-fork/fontkit](https://github.com/foliojs-fork/fontkit), [@foliojs-fork/restructure](https://github.com/foliojs-fork/restructure), [@foliojs-fork/linebreak](https://github.com/foliojs-fork/linebreak) which are used in [@foliojs-fork/pdfkit](https://github.com/foliojs-fork/pdfkit).
- Upgrade Unicode Line Breaking Algorithm (UAX #14) to Unicode 12.0.0
- Introduced new `build-vfs.js` script to build virtual file system for fonts (see [documentation](https://pdfmake.github.io/docs/0.1/fonts/custom-fonts-client-side/vfs/)).
- Removed support Node.js 8 and 10. Minimum required version is 12 LTS.
- Removed support Internet Explorer 10. Supported only Internet Explorer 11.
- Removed gulp.
