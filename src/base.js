import Printer from './Printer';
import { pack } from './helpers/tools';

class pdfmake {

	/**
	 * @param {object} docDefinition
	 * @param {?object} options
	 * @returns {Promise<object>}
	 */
	createPdf(docDefinition, options = {}) {
		const pdfDocumentPromise = new Promise((resolve, reject) => {
			try {
				options.progressCallback = this.progressCallback;
				options.tableLayouts = this.tableLayouts;

				let printer = new Printer(this.fonts);
				let doc = printer.createPdfKitDocument(docDefinition, options);
				resolve(doc);
			} catch (e) {
				reject(e);
			}
		});

		return this._transformToDocument(pdfDocumentPromise);
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
