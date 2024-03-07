# Changelog

## 0.3.0-beta.8 - 2024-03-07

- Removed unused brfs dependency

## 0.3.0-beta.7 - 2024-01-01

- Minimal supported version Node.js 16 LTS
- Added padding option for QR code
- Allow the document language to be specified
- Fixed cover image size inside table
- Fixed "Cannot read properties of undefined (reading 'bottomMost')" if table contains too few rows
- Fixed invalid source-maps in builded js file

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
- Support passing headers to request for loading font files and images via URL adresses

## 0.3.0-beta.1 - 2022-01-01

- Port code base to ES6+
- Unify interface for node and browser **(breaking change)**
- All methods return promise instead of using callback **(breaking change)**
- Change including virtual font storage in client-side **(breaking change)**
- Change parameters of `pageBreakBefore` function **(breaking change)**
- Support for loading font files and images via URL adresses (https:// or http:// protocol) in Node.js (client and server side now)
