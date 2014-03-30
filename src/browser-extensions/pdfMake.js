/* jslint node: true */
/* jslint browser: true */
/* global saveAs */
/* global BlobBuilder */
'use strict';

var PdfPrinter = require('../printer');

var defaultClientFonts = {
	Roboto: {
		normal: 'Roboto-Regular.ttf',
		bold: 'Roboto-Medium.ttf',
		italics: 'Roboto-Italic.ttf',
		bolditalics: 'Roboto-Italic.ttf'
	}
};

function Document(docDefinition, fonts, vfs) {
	this.docDefinition = docDefinition;
	this.fonts = fonts || defaultClientFonts;
	this.vfs = vfs;
}

Document.prototype._createDoc = function(callback, options) {
	var printer = new PdfPrinter(this.fonts);
	printer.fs.bindFS(this.vfs);

	printer.createPdfKitDocument(this.docDefinition, options).output(callback);
};

Document.prototype.open = function(message) {
	// we have to open the window immediately and store the reference
	// otherwise popup blockers will stop us
	var win = window.open('', '_blank');
	message = message || 'loading...';
	win.location.href = 'data:text/html;,<html><head><meta charset="utf-8"></head><body><h1 style="opacity: 0.5">' + message.replace(/&/, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</h1></body></html>';

	try {
		this._createDoc(function(outDoc) {
			win.location.href = 'data:application/pdf;base64,' + outDoc.toString('base64');
		});
	} catch(e) {
		win.close();
		return false;
	}
};


Document.prototype.print = function(timeout) {
	timeout = timeout || 2000;

	this._createDoc(function(outDoc) {
		var dataUrl = 'data:application/pdf;base64,' + outDoc.toString('base64');

		var iFrame = document.createElement('iframe');
		iFrame.style.display = 'none';
		iFrame.src = dataUrl;
		iFrame.onload = function() {
			setTimeout(function() {
				document.body.removeChild(iFrame);
			}, timeout);
		};

		document.body.appendChild(iFrame);
	}, { autoPrint: true });
};

Document.prototype.download = function(defaultFileName) {
	defaultFileName = defaultFileName || 'file.pdf';
	this._createDoc(function(outDoc) {
		saveAs(new Blob([outDoc], {type: 'application/pdf'}), defaultFileName);
	});
};

Document.prototype.getBase64 = function(result) {
	if (!result) throw 'getBase64 should be called with a callback argument';

	this._createDoc(function(outDoc) {
		result(outDoc.toString('base64'));
	});
};

Document.prototype.getDataUrl = function(result) {
	if (!result) throw 'getDataUrl should be called with a callback argument';
	this._createDoc(function(outDoc) { result('data:application/pdf;base64,' + outDoc.toString('base64')); });
};

Document.prototype.getBuffer = function(result) {
	if (!result) throw 'getBuffer should be called with a callback argument';
	this._createDoc(function(outDoc) { result(outDoc); });
};

module.exports = {
	createPdf: function(docDefinition) {
		return new Document(docDefinition, window.pdfMake.fonts, window.pdfMake.vfs);
	}
};
