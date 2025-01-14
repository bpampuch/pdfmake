import Printer from './Printer';
import virtualfs from './virtual-fs';
import { pack } from './helpers/tools';

class pdfmake {

	constructor() {
		this.virtualfs = virtualfs;
		this.urlResolver = null;
	}

	/**
	 * @param {object} docDefinition
	 * @param {?object} options
	 * @returns {object}
	 */
	createPdf(docDefinition, options = {}) {
		options.progressCallback = this.progressCallback;
		options.tableLayouts = this.tableLayouts;

		let printer = new Printer(this.fonts, this.virtualfs, this.urlResolver());
		const pdfDocumentPromise = printer.createPdfKitDocument(docDefinition, options);

		// Add a verification step to ensure the content is correctly embedded
		return pdfDocumentPromise.then(pdfDocument => {
			return new Promise((resolve, reject) => {
				pdfDocument.getBuffer().then(buffer => {
					if (buffer.byteLength === 0) {
						reject(new Error('Empty PDF content'));
					} else {
						resolve(this._transformToDocument(pdfDocument));
					}
				}).catch(reject);
			});
		});
	}

	setProgressCallback(callback) {
		this.progressCallback = callback;
	}

	addTableLayouts(tableLayouts) {
		this.tableLayouts = pack(this.tableLayouts, tableLayouts);
	}

	setTableLayouts(tableLayouts) {
		this.tableLayouts = tableLayouts;
	}

	clearTableLayouts() {
		this.tableLayouts = {};
	}

	addFonts(fonts) {
		this.fonts = pack(this.fonts, fonts);
	}

	setFonts(fonts) {
		this.fonts = fonts;
	}

	clearFonts() {
		this.fonts = {};
	}

	_transformToDocument(doc) {
		return doc;
	}

}

export default pdfmake;
