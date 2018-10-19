// Browser shim for @flowaccount/node-icu-tokenizer
// The original package depends on native bindings resolved via 'bindings' which
// pulls in Node core modules (path) not polyfilled by default in webpack 5.
// For browser builds we degrade gracefully: tokenize() will produce a single
// token spanning the whole input so existing logic that iterates tokens still works.

'use strict';

class BrowserTokenizer {
	tokenize(str) {
		if (typeof str !== 'string') { return []; }
		return [ { token: str, type: 'TEXT', start: 0, end: str.length } ];
	}
}

module.exports = BrowserTokenizer;