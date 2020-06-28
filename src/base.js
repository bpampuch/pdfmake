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

		let printer = new Printer(this.fonts, this.virtualfs, this.urlResolver);
		const pdfDocumentPromise = printer.createPdfKitDocument(docDefinition, options);

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
