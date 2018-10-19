'use strict';

var isFunction = require('../helpers').isFunction;
var isUndefined = require('../helpers').isUndefined;
//var isNull = require('../helpers').isNull;
var pack = require('../helpers').pack;
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

var globalVfs;
var globalFonts;
var globalTableLayouts;

function Document(docDefinition, tableLayouts, fonts, vfs) {
	this.docDefinition = docDefinition;
	this.tableLayouts = tableLayouts || null;
	this.fonts = fonts || defaultClientFonts;
	this.vfs = vfs;
	this._remoteImagesPrefetched = false;
}

function canCreatePdf() {
	// Ensure the browser provides the level of support needed
	try {
		var arr = new Uint8Array(1);
		var proto = { foo: function () { return 42; } };
		Object.setPrototypeOf(proto, Uint8Array.prototype);
		Object.setPrototypeOf(arr, proto);
		return arr.foo() === 42;
	} catch (e) { // eslint-disable-line no-unused-vars
		return false;
	}
}

Document.prototype._createDoc = function (options, cb) {
	// If we have not prefetched remote images (http/https) embedded via images dict pointing directly to remote URLs
	// we can integrate with existing URLBrowserResolver flow which already downloads remote resources into the virtual FS.
	// However previous implementation only rewrote docDefinition.images entries to resolved URL (still remote). We enhance it by
	// actually fetching and storing the binary in virtual FS so imageMeasure can load it synchronously.
	var getExtendedUrl = function (url) {
		if (typeof url === 'object') {
			return { url: url.url, headers: url.headers };
		}

		return { url: url, headers: {} };
	};

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
				if (Array.isArray(this.fonts[font].normal)) { // TrueType Collection
					var urlNormalArr = getExtendedUrl(this.fonts[font].normal[0]);
					urlResolver.resolve(urlNormalArr.url, urlNormalArr.headers);
					this.fonts[font].normal[0] = urlNormalArr.url;
				} else {
					var urlNormal = getExtendedUrl(this.fonts[font].normal);
					urlResolver.resolve(urlNormal.url, urlNormal.headers);
					this.fonts[font].normal = urlNormal.url;
				}
			}
			if (this.fonts[font].bold) {
				if (Array.isArray(this.fonts[font].bold)) { // TrueType Collection
					var urlBoldArr = getExtendedUrl(this.fonts[font].bold[0]);
					urlResolver.resolve(urlBoldArr.url, urlBoldArr.headers);
					this.fonts[font].bold[0] = urlBoldArr.url;
				} else {
					var urlBold = getExtendedUrl(this.fonts[font].bold);
					urlResolver.resolve(urlBold.url, urlBold.headers);
					this.fonts[font].bold = urlBold.url;
				}
			}
			if (this.fonts[font].italics) {
				if (Array.isArray(this.fonts[font].italics)) { // TrueType Collection
					var urlItalicsArr = getExtendedUrl(this.fonts[font].italics[0]);
					urlResolver.resolve(urlItalicsArr.url, urlItalicsArr.headers);
					this.fonts[font].italics[0] = urlItalicsArr.url;
				} else {
					var urlItalics = getExtendedUrl(this.fonts[font].italics);
					urlResolver.resolve(urlItalics.url, urlItalics.headers);
					this.fonts[font].italics = urlItalics.url;
				}
			}
			if (this.fonts[font].bolditalics) {
				if (Array.isArray(this.fonts[font].bolditalics)) { // TrueType Collection
					var urlBoldItalicsArr = getExtendedUrl(this.fonts[font].bolditalics[0]);
					urlResolver.resolve(urlBoldItalicsArr.url, urlBoldItalicsArr.headers);
					this.fonts[font].bolditalics[0] = urlBoldItalicsArr.url;
				} else {
					var urlBoldItalics = getExtendedUrl(this.fonts[font].bolditalics);
					urlResolver.resolve(urlBoldItalics.url, urlBoldItalics.headers);
					this.fonts[font].bolditalics = urlBoldItalics.url;
				}
			}
		}
	}

	if (this.docDefinition.images) {
		for (var image in this.docDefinition.images) {
			if (this.docDefinition.images.hasOwnProperty(image)) {
				var originalVal = this.docDefinition.images[image];
				var urlImg = getExtendedUrl(originalVal);
				// only attempt remote fetch for http(s) plain string (not already dataURL)
				if (typeof urlImg.url === 'string' && (urlImg.url.toLowerCase().startsWith('http://') || urlImg.url.toLowerCase().startsWith('https://'))) {
					// schedule resolution (downloads into virtual FS). We keep dictionary value as the URL; imageMeasure will cause fs.existsSync to succeed and readFileSync returns binary buffer.
					urlResolver.resolve(urlImg.url, urlImg.headers);
					this.docDefinition.images[image] = urlImg.url; // leave as URL (acts as key for downloaded file)
				} else {
					// Non-remote: keep existing behavior (dataURL or path)
					this.docDefinition.images[image] = urlImg.url;
				}
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
		throw new Error('_getPages is an async method and needs a callback argument');
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
		throw new Error('Could not generate blob');
	}

	return blob;
};

Document.prototype._openWindow = function () {
	// we have to open the window immediately and store the reference
	// otherwise popup blockers will stop us
	var win = window.open('', '_blank');
	if (win === null) {
		throw new Error('Open PDF in new window blocked by browser');
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
 * Download the PDF.
 * @param {string|Function} defaultFileName filename or callback when omitted
 * @param {Function} [cb] callback invoked after save
 * @param {object} [options] pdf creation options
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
		throw new Error('getBase64 is an async method and needs a callback argument');
	}
	this.getBuffer(function (buffer) {
		cb(buffer.toString('base64'));
	}, options);
};

Document.prototype.getDataUrl = function (cb, options) {
	if (!cb) {
		throw new Error('getDataUrl is an async method and needs a callback argument');
	}
	this.getBuffer(function (buffer) {
		cb('data:application/pdf;base64,' + buffer.toString('base64'));
	}, options);
};

Document.prototype.getBlob = function (cb, options) {
	if (!cb) {
		throw new Error('getBlob is an async method and needs a callback argument');
	}
	var that = this;
	this.getBuffer(function (result) {
		var blob = that._bufferToBlob(result);
		cb(blob);
	}, options);
};

Document.prototype.getBuffer = function (cb, options) {
	if (!cb) {
		throw new Error('getBuffer is an async method and needs a callback argument');
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
			throw new Error('Your browser does not provide the level of support needed');
		}
		return new Document(
			docDefinition,
			tableLayouts || globalTableLayouts || global.pdfMake.tableLayouts,
			fonts || globalFonts || global.pdfMake.fonts,
			vfs || globalVfs || global.pdfMake.vfs
		);
	},
	addVirtualFileSystem: function (vfs) {
		globalVfs = vfs;
	},
	addFonts: function (fonts) {
		globalFonts = pack(globalFonts, fonts);
	},
	setFonts: function (fonts) {
		globalFonts = fonts;
	},
	clearFonts: function () {
		globalFonts = undefined;
	},
	addTableLayouts: function (tableLayouts) {
		globalTableLayouts = pack(globalTableLayouts, tableLayouts);
	},
	setTableLayouts: function (tableLayouts) {
		globalTableLayouts = tableLayouts;
	},
	clearTableLayouts: function () {
		globalTableLayouts = undefined;
	}
};
