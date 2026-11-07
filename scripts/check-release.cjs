const assert = require('node:assert/strict');
const { version } = require('../package.json');
const tag = process.argv[2] || process.env.RELEASE_TAG;
assert.ok(tag, 'Pass the release tag as an argument or RELEASE_TAG');
assert.ok(tag === version || tag === `v${version}`, `Tag ${tag} does not match package version ${version}`);
console.log(`Release tag matches pdfmake ${version}`);
