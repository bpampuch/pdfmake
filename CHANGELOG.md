# Changelog

## 0.3.0 - 2026-01-01

- Reverted to the original `pdfkit` package, moving away from `@foliojs-fork`
- Drop support Internet Explorer 11 (Microsoft will not support from 2022)
- Minimal supported version Node.js 20 LTS
- Port code base to ES6+
- Unify interface for node and browser **(breaking change)**
- All methods return promise instead of using callback **(breaking change)**
- Change including virtual font storage in client-side **(breaking change)**
- Change parameters of `pageBreakBefore` function **(breaking change)**
- Support for loading font files and images via URL adresses (https:// or http:// protocol) in Node.js (client and server side now)
- Used fetch API for downloading fonts and images
- Attachments embedding
- Added `section` node
