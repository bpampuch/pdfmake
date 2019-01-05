import Printer from './Printer';
import { pack } from './helpers/tools';

class pdfmake {
	createPdf(docDefinition) {
		let options = {};
		options.progressCallback = this.progressCallback;
		options.tableLayouts = this.tableLayouts;
		// TODO: options.bufferPages

		let printer = new Printer(this.fonts);
		let doc = printer.createPdfKitDocument(docDefinition, options);

		return this._transformToDocument(doc);
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
