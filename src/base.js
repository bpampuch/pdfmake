import {pack} from './helpers';
import PdfPrinter from './printer';

export default class PdfMake {

	setProgressCallback(callback) {
		this.progressCallback = callback;
	}

	addTableLayouts(tableLayouts) {
		this.tableLayouts = pack(this.tableLayouts, tableLayouts);
	}

	clearTableLayouts() {
		this.tableLayouts = {};
	}

	addFonts(fonts) {
		this.fonts = pack(this.fonts, fonts);
	}

	clearFonts() {
		this.fonts = {};
	}

	createPdf(docDefinition) {
		var options = {};
		options.progressCallback = this.progressCallback;
		options.tableLayouts = this.tableLayouts;

		var printer = new PdfPrinter(this.fonts);
		var doc = printer.createPdfKitDocument(docDefinition, options);

		return this._transformToDocument(doc);
	}

	_transformToDocument(doc) {
		return doc;
	}

}