import Printer from './Printer';
import virtualfs, { VirtualFileSystem } from './virtual-fs';
import { pack } from './helpers/tools';
import { isObject } from './helpers/variableType';
import URLResolver, { defaultUrlProtocols, fetchUrl } from './URLResolver';

class pdfmake {

	constructor() {
		this.sharedVirtualfs = virtualfs;
		this.urlResourceCaching = false;
		this.urlResourceConcurrency = 5;
		this.urlAccessPolicy = undefined;
		this.urlProtocols = new Map(defaultUrlProtocols);
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
		let urlResolver = new URLResolver(documentVirtualfs, this.sharedVirtualfs, this.urlResourceConcurrency, this.urlProtocols);
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
	 * @param {string} protocol
	 * @param {(url: string, headers: object, validateUrlAccessPolicy: Function) => Promise<{buffer: (ArrayBuffer|Uint8Array), url: string}>} [handler]
	 */
	registerUrlProtocol(protocol, handler = fetchUrl) {
		if (typeof protocol !== 'string' || !/^[a-z][a-z\d+.-]*:?$/i.test(protocol)) {
			throw new Error("Parameter 'protocol' has an invalid value. URL scheme expected.");
		}
		if (typeof handler !== 'function') {
			throw new Error("Parameter 'handler' has an invalid type. Function expected.");
		}

		this.urlProtocols.set(protocol.replace(/:$/, '').toLowerCase(), handler);
	}

	/**
	 * @param {string} protocol
	 */
	unregisterUrlProtocol(protocol) {
		if (typeof protocol !== 'string' || !/^[a-z][a-z\d+.-]*:?$/i.test(protocol)) {
			throw new Error("Parameter 'protocol' has an invalid value. URL scheme expected.");
		}

		protocol = protocol.replace(/:$/, '').toLowerCase();
		this.urlProtocols.delete(protocol);
		for (const filename of Object.keys(this.sharedVirtualfs.storage)) {
			if (filename.toLowerCase().startsWith(protocol + ':')) {
				this.sharedVirtualfs.unlinkSync(filename);
			}
		}
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

	/**
	 * @param {number} concurrency
	 */
	setUrlResourceConcurrency(concurrency) {
		if (!Number.isInteger(concurrency) || concurrency < 1) {
			throw new Error("Parameter 'concurrency' must be a positive integer.");
		}

		this.urlResourceConcurrency = concurrency;
	}

	clearUrlResourceCache() {
		for (const filename of Object.keys(this.sharedVirtualfs.storage)) {
			const protocol = /^([a-z][a-z\d+.-]*):/i.exec(filename);
			if (protocol && this.urlProtocols.has(protocol[1].toLowerCase())) {
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
