'use strict';

var isFunction = require('../helpers').isFunction;
var isUndefined = require('../helpers').isUndefined;
var isNull = require('../helpers').isNull;
var FileSaver = require('file-saver');
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
	if (!Object.keys || typeof Uint16Array === 'undefined') {
		return false;
	}
	return true;
}

Document.prototype._createDoc = function (options, cb) {
	options = options || {};
	if (this.tableLayouts) {
		options.tableLayouts = this.tableLayouts;
	}

	var PdfPrinter = require('../printer');

	var printer = new PdfPrinter(this.fonts);
	require('fs').bindFS(this.vfs); // bind virtual file system to file system

	if (!isFunction(cb)) {
		var doc = printer.createPdfKitDocument(this.docDefinition, options);

		return doc;
	}

	var URLBrowserResolver = require('./URLBrowserResolver');
	var urlResolver = new URLBrowserResolver(require('fs'));

	for (var font in this.fonts) {
		if (this.fonts.hasOwnProperty(font)) {
			if (this.fonts[font].normal) {
				urlResolver.resolve(this.fonts[font].normal);
			}
			if (this.fonts[font].bold) {
				urlResolver.resolve(this.fonts[font].bold);
			}
			if (this.fonts[font].italics) {
				urlResolver.resolve(this.fonts[font].italics);
			}
			if (this.fonts[font].bolditalics) {
				urlResolver.resolve(this.fonts[font].bolditalics);
			}
		}
	}

	if (this.docDefinition.images) {
		for (var image in this.docDefinition.images) {
			if (this.docDefinition.images.hasOwnProperty(image)) {
				urlResolver.resolve(this.docDefinition.images[image]);
			}
		}
	}

	var _this = this;

	urlResolver.resolved().then(function () {
		var doc = printer.createPdfKitDocument(_this.docDefinition, options);

		cb(doc);
	}, function (result) {
		throw result;
	});
};

Document.prototype._flushDoc = function (doc, callback) {
	var chunks = [];
	var result;

	doc.on('readable', function () {
		var chunk;
		while ((chunk = doc.read(9007199254740991)) !== null) {
			chunks.push(chunk);
		}
	});
	doc.on('end', function () {
		result = Buffer.concat(chunks);
		callback(result, doc._pdfMakePages);
	});
	doc.end();
};

Document.prototype._getPages = function (options, cb) {
	if (!cb) {
		throw '_getPages is an async method and needs a callback argument';
	}
	var _this = this;

	this._createDoc(options, function (doc) {
		_this._flushDoc(doc, function (ignoreBuffer, pages) {
			cb(pages);
		});
	});
};

Document.prototype._bufferToBlob = function (buffer) {
	var blob;
	try {
		blob = new Blob([buffer], { type: 'application/pdf' });
	} catch (e) {
		// Old browser which can't handle it without making it an byte array (ie10)
		if (e.name === 'InvalidStateError') {
			var byteArray = new Uint8Array(buffer);
			blob = new Blob([byteArray.buffer], { type: 'application/pdf' });
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

Document.prototype._openPdf = function (options, win) {
	if (!win) {
		win = this._openWindow();
	}
	try {
		this.getBlob(function (result) {
			var urlCreator = window.URL || window.webkitURL;
			var pdfUrl = urlCreator.createObjectURL(result);
			win.location.href = pdfUrl;

			/* temporarily disabled
			if (win !== window) {
				setTimeout(function () {
					if (isNull(win.window)) { // is closed by AdBlock
						window.location.href = pdfUrl; // open in actual window
					}
				}, 500);
			}
			*/
		}, options);
	} catch (e) {
		win.close();
		throw e;
	}
};

Document.prototype.open = function (options, win) {
	options = options || {};
	options.autoPrint = false;
	win = win || null;

	this._openPdf(options, win);
};


Document.prototype.print = function (options, win) {
	options = options || {};
	options.autoPrint = true;
	win = win || null;

	this._openPdf(options, win);
};

/**
 * download(defaultFileName = 'file.pdf', cb = null, options = {})
 * or
 * download(cb, options = {})
 */
Document.prototype.download = function (defaultFileName, cb, options) {
	if (isFunction(defaultFileName)) {
		if (!isUndefined(cb)) {
			options = cb;
		}
		cb = defaultFileName;
		defaultFileName = null;
	}

	defaultFileName = defaultFileName || 'file.pdf';
	this.getBlob(function (result) {
		saveAs(result, defaultFileName);

		if (isFunction(cb)) {
			cb();
		}
	}, options);
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

Document.prototype.getBlob = function (cb, options) {
	if (!cb) {
		throw 'getBlob is an async method and needs a callback argument';
	}
	var that = this;
	this.getBuffer(function (result) {
		var blob = that._bufferToBlob(result);
		cb(blob);
	}, options);
};

Document.prototype.getBuffer = function (cb, options) {
	if (!cb) {
		throw 'getBuffer is an async method and needs a callback argument';
	}

	var _this = this;

	this._createDoc(options, function (doc) {
		_this._flushDoc(doc, function (buffer) {
			cb(buffer);
		});
	});
};

Document.prototype.getStream = function (options, cb) {
	if (!isFunction(cb)) {
		var doc = this._createDoc(options);
		return doc;
	}

	this._createDoc(options, function (doc) {
		cb(doc);
	});
};

module.exports = {
	createPdf: function (docDefinition, tableLayouts, fonts, vfs) {
		if (!canCreatePdf()) {
			throw 'Your browser does not provide the level of support needed';
		}
		return new Document(
			docDefinition,
			tableLayouts || global.pdfMake.tableLayouts,
			fonts || global.pdfMake.fonts,
			vfs || global.pdfMake.vfs
		);
	}
};
