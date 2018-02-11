import {isFunction} from '../helpers';
import PdfPrinter from '../printer';
import {saveAs} from 'file-saver';

var defaultClientFonts = {
	Roboto: {
		normal: 'Roboto-Regular.ttf',
		bold: 'Roboto-Medium.ttf',
		italics: 'Roboto-Italic.ttf',
		bolditalics: 'Roboto-MediumItalic.ttf'
	}
};

class Document {
	constructor(docDefinition, tableLayouts, fonts, vfs) {
		this.docDefinition = docDefinition;
		this.tableLayouts = tableLayouts || null;
		this.fonts = fonts || defaultClientFonts;
		this.vfs = vfs;
	}

	_createDoc(options = {}, callback) {
		if (this.tableLayouts) {
			options.tableLayouts = this.tableLayouts;
		}

		var printer = new PdfPrinter(this.fonts);
		require('fs').bindFS(this.vfs); // bind virtual file system to file system

		var doc = printer.createPdfKitDocument(this.docDefinition, options);
		var chunks = [];
		var result;

		doc.on('readable', () => {
			var chunk;
			while ((chunk = doc.read(9007199254740991)) !== null) {
				chunks.push(chunk);
			}
		});
		doc.on('end', () => {
			result = Buffer.concat(chunks);
			callback(result, doc._pdfMakePages);
		});
		doc.end();
	}

	_getPages(options, cb) {
		if (!cb) {
			throw '_getPages is an async method and needs a callback argument';
		}
		this._createDoc(options, (ignoreBuffer, pages) => {
			cb(pages);
		});
	}

	_bufferToBlob(buffer) {
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
	}

	_openWindow() {
		// we have to open the window immediately and store the reference
		// otherwise popup blockers will stop us
		var win = window.open('', '_blank');
		if (win === null) {
			throw 'Open PDF in new window blocked by browser';
		}

		return win;
	}

	_openPdf(options, win) {
		if (!win) {
			win = this._openWindow();
		}
		try {
			this.getBlob((result) => {
				var urlCreator = window.URL || window.webkitURL;
				var pdfUrl = urlCreator.createObjectURL(result);
				win.location.href = pdfUrl;
			}, options);
		} catch (e) {
			win.close();
			throw e;
		}
	}

	open(options = {}, win) {
		options.autoPrint = false;
		win = win || null;

		this._openPdf(options, win);
	}

	print(options = {}, win) {
		options.autoPrint = true;
		win = win || null;

		this._openPdf(options, win);
	}

	download(defaultFileName, cb, options) {
		if (isFunction(defaultFileName)) {
			cb = defaultFileName;
			defaultFileName = null;
		}

		defaultFileName = defaultFileName || 'file.pdf';
		this.getBlob((result) => {
			saveAs(result, defaultFileName);

			if (isFunction(cb)) {
				cb();
			}
		}, options);
	}

	getBase64(cb, options) {
		if (!cb) {
			throw 'getBase64 is an async method and needs a callback argument';
		}
		this.getBuffer((buffer) => {
			cb(buffer.toString('base64'));
		}, options);
	}

	getDataUrl(cb, options) {
		if (!cb) {
			throw 'getDataUrl is an async method and needs a callback argument';
		}
		this.getBuffer((buffer) => {
			cb('data:application/pdf;base64,' + buffer.toString('base64'));
		}, options);
	}

	getBlob(cb, options) {
		if (!cb) {
			throw 'getBlob is an async method and needs a callback argument';
		}
		this.getBuffer((result) => {
			var blob = this._bufferToBlob(result);
			cb(blob);
		}, options);
	}

	getBuffer(cb, options) {
		if (!cb) {
			throw 'getBuffer is an async method and needs a callback argument';
		}
		this._createDoc(options, (buffer) => {
			cb(buffer);
		});
	}
}

function canCreatePdf() {
	// Ensure the browser provides the level of support needed
	if (!Object.keys) {
		return false;
	}
	return true;
}

export default {
	createPdf(docDefinition) {
		if (!canCreatePdf()) {
			throw 'Your browser does not provide the level of support needed';
		}
		return new Document(docDefinition, global.pdfMake.tableLayouts, global.pdfMake.fonts, global.pdfMake.vfs);
	}
};
