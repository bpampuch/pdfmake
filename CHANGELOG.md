# Changelog

## 0.2.0 - 2021-07-05

- Move to [@foliojs-fork](https://github.com/foliojs-fork) packages with up-to-date dependecies and security bug fixes and others. These are the libraries [@foliojs-fork/fontkit](https://github.com/foliojs-fork/fontkit), [@foliojs-fork/restructure](https://github.com/foliojs-fork/restructure), [@foliojs-fork/linebreak](https://github.com/foliojs-fork/linebreak) which are used in [@foliojs-fork/pdfkit](https://github.com/foliojs-fork/pdfkit).
- Upgrade Unicode Line Breaking Algorithm (UAX #14) to Unicode 12.0.0
- Introduced new `build-vfs.js` script to build virtual file system for fonts (see [documentation](https://pdfmake.github.io/docs/0.1/fonts/custom-fonts-client-side/vfs/)).
- Removed support Node.js 8 and 10. Minimum required version is 12 LTS.
- Removed support Internet Explorer 10. Supported only Internet Explorer 11.
- Removed gulp.
