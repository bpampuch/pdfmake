import Printer from './Printer';
import virtualfs, { VirtualFileSystem } from './virtual-fs';
import { pack } from './helpers/tools';
import { isObject } from './helpers/variableType';
import URLResolver from './URLResolver';

class pdfmake {

	constructor() {
		this.sharedVirtualfs = virtualfs;
		this.urlResourceCaching = false;
		this.urlAccessPolicy = undefined;
		this.localAccessPolicy = undefined;
	}

	/**
	 * @param {object} docDefinition
	 * @param {?object} options
	 * @returns {object}
	 */
	createPdf(docDefinition, options = {}) {
		if (!isObject(docDefinition)) {
			throw new Error("Parameter 'docDefinition' has an invalid type. Object expected.");
		}

		if (!isObject(options)) {
			throw new Error("Parameter 'options' has an invalid type. Object expected.");
		}

		options.progressCallback = this.progressCallback;
		options.tableLayouts = this.tableLayouts;

		const isServer = typeof process !== 'undefined' && process?.versions?.node;
		if (typeof this.urlAccessPolicy === 'undefined' && isServer) {
			console.warn(
				'No URL access policy defined. Consider using setUrlAccessPolicy() to restrict external resource downloads.'
			);
		}
		if (typeof this.localAccessPolicy === 'undefined' && isServer) {
			console.warn(
				'No local access policy defined. Consider using setLocalAccessPolicy() to restrict local file system access.'
			);
		}

		const documentVirtualfs = new VirtualFileSystem(this.sharedVirtualfs);
		let urlResolver = new URLResolver(documentVirtualfs, this.sharedVirtualfs);
		urlResolver.setUrlAccessPolicy(this.urlAccessPolicy);

		let printer = new Printer(this.fonts, documentVirtualfs, urlResolver, this.localAccessPolicy, this.urlResourceCaching);
		const pdfDocumentPromise = printer.createPdfKitDocument(docDefinition, options);

		return this._transformToDocument(pdfDocumentPromise);
	}

	/**
	 * @param {(url: string) => boolean} callback
	 */
	setUrlAccessPolicy(callback) {
		if (callback !== undefined && typeof callback !== 'function') {
			throw new Error("Parameter 'callback' has an invalid type. Function or undefined expected.");
		}

		this.urlAccessPolicy = callback;
	}

	/**
	 * @param {boolean} enabled
	 */
	setUrlResourceCaching(enabled) {
		if (typeof enabled !== 'boolean') {
			throw new Error("Parameter 'enabled' has an invalid type. Boolean expected.");
		}

		this.urlResourceCaching = enabled;
	}

	clearUrlResourceCache() {
		for (const filename of Object.keys(this.sharedVirtualfs.storage)) {
			if (/^https?:\/\//i.test(filename)) {
				this.sharedVirtualfs.unlinkSync(filename);
			}
		}
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
