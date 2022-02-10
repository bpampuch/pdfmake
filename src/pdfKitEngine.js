'use strict';

function _interopDefault(ex) {
	return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex;
}

var PdfKit = _interopDefault(require('@foliojs-fork/pdfkit'));

function getEngineInstance() {
	return PdfKit;
}

function createPdfDocument(options) {
	options = options || {};
	return new PdfKit(options);
}

module.exports = {
	getEngineInstance: getEngineInstance,
	createPdfDocument: createPdfDocument
};
