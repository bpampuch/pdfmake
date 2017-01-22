/* jslint node: true */
/* jslint browser: true */
'use strict';

var PdfPrinter = require('../printer');
var FileSaver = require('../../libs/FileSaver.js/FileSaver');
var saveAs = FileSaver.saveAs;

var defaultClientFonts = {
	Roboto: {
		normal: 'Roboto-Regular.ttf',
		bold: 'Roboto-Medium.ttf',
		italics: 'Roboto-Italic.ttf',
		bolditalics: 'Roboto-MediumItalic.ttf'
	}
};

function Document(docDefinition, tableLayouts, fonts, vfs) {
	this.docDefinition = docDefinition;
	this.tableLayouts = tableLayouts || null;
	this.fonts = fonts || defaultClientFonts;
	this.vfs = vfs;
}

function canCreatePdf() {
	// Ensure the browser provides the level of support needed
	if (!Object.keys) {
		return false;
	}
	return true;
}

Document.prototype._createDoc = function (options, callback) {
	options = options || {};
	if (this.tableLayouts) {
		options.tableLayouts = this.tableLayouts;
	}

	var printer = new PdfPrinter(this.fonts);
	printer.fs.bindFS(this.vfs);

	var doc = printer.createPdfKitDocument(this.docDefinition, options);
	var chunks = [];
	var result;

	doc.on('data', function (chunk) {
		chunks.push(chunk);
	});
	doc.on('end', function () {
		result = Buffer.concat(chunks);
		callback(result, doc._pdfMakePages);
	});
	doc.end();
};

Document.prototype._getPages = function (options, cb) {
	if (!cb) {
		throw 'getBuffer is an async method and needs a callback argument';
	}
	this._createDoc(options, function (ignoreBuffer, pages) {
		cb(pages);
	});
};

Document.prototype._bufferToBlob = function (buffer) {
	var blob;
	try {
		blob = new Blob([buffer], {type: 'application/pdf'});
	} catch (e) {
		// Old browser which can't handle it without making it an byte array (ie10)
		if (e.name === 'InvalidStateError') {
			var byteArray = new Uint8Array(buffer);
			blob = new Blob([byteArray.buffer], {type: 'application/pdf'});
		}
	}

	if (!blob) {
		throw 'Could not generate blob';
	}

	return blob;
};

Document.prototype._openWindow = function () {
	// we have to open the window immediately and store the reference
	// otherwise popup blockers will stop us
	var win = window.open('', '_blank');
	if (win === null) {
		throw 'Open PDF in new window blocked by browser';
	}

	return win;
};

Document.prototype.open = function () {
	var win = this._openWindow();

	try {
		var that = this;
		this.getBuffer(function (result) {
			var blob = that._bufferToBlob(result);
			var urlCreator = window.URL || window.webkitURL;
			var pdfUrl = urlCreator.createObjectURL(blob);
			win.location.href = pdfUrl;
		}, {autoPrint: false});
	} catch (e) {
		win.close();
		throw e;
	}
};


Document.prototype.print = function () {
	var win = this._openWindow();

	try {
		var that = this;
		this.getBuffer(function (result) {
			var blob = that._bufferToBlob(result);
			var urlCreator = window.URL || window.webkitURL;
			var pdfUrl = urlCreator.createObjectURL(blob);
			win.location.href = pdfUrl;
		}, {autoPrint: true});
	} catch (e) {
		win.close();
		throw e;
	}
};

Document.prototype.download = function (defaultFileName, cb) {
	if (typeof defaultFileName === 'function') {
		cb = defaultFileName;
		defaultFileName = null;
	}

	defaultFileName = defaultFileName || 'file.pdf';
	var that = this;
	this.getBuffer(function (result) {
		var blob = that._bufferToBlob(result);
		saveAs(blob, defaultFileName);

		if (typeof cb === 'function') {
			cb();
		}
	});
};

Document.prototype.getBase64 = function (cb, options) {
	if (!cb) {
		throw 'getBase64 is an async method and needs a callback argument';
	}
	this.getBuffer(function (buffer) {
		cb(buffer.toString('base64'));
	}, options);
};

Document.prototype.getDataUrl = function (cb, options) {
	if (!cb) {
		throw 'getDataUrl is an async method and needs a callback argument';
	}
	this.getBuffer(function (buffer) {
		cb('data:application/pdf;base64,' + buffer.toString('base64'));
	}, options);
};

Document.prototype.getBuffer = function (cb, options) {
	if (!cb) {
		throw 'getBuffer is an async method and needs a callback argument';
	}
	this._createDoc(options, function (buffer) {
		cb(buffer);
	});
};

module.exports = {
	createPdf: function (docDefinition) {
		if (!canCreatePdf()) {
			throw 'Your browser does not provide the level of support needed';
		}
		return new Document(docDefinition, window.pdfMake.tableLayouts, window.pdfMake.fonts, window.pdfMake.vfs);
	}
};
