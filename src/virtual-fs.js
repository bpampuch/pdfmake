const normalizeFilename = filename => {
	if (filename.indexOf(__dirname) === 0) {
		filename = filename.substring(__dirname.length);
	}

	if (filename.indexOf('/') === 0) {
		filename = filename.substring(1);
	}

	return filename;
};

class VirtualFileSystem {
	constructor() {
		this.storage = {};
	}

	/**
	 * @param {string} filename
	 * @returns {boolean}
	 */
	existsSync(filename) {
		const normalizedFilename = normalizeFilename(filename);
		return typeof this.storage[normalizedFilename] !== 'undefined';
	}

	/**
	 * @param {string} filename
	 * @param {?string|?object} options
	 * @returns {string|Buffer}
	 */
	readFileSync(filename, options) {
		const normalizedFilename = normalizeFilename(filename);
		const encoding = typeof options === 'object' ? options.encoding : options;

		if (!this.existsSync(normalizedFilename)) {
			throw new Error(`File '${normalizedFilename}' not found in virtual file system`);
		}

		const buffer = this.storage[normalizedFilename];
		if (encoding) {
			return buffer.toString(encoding);
		}

		return buffer;
	}

	/**
	 * @param {string} filename
	 * @param {string|Buffer} content
	 * @param {?string|?object} options
	 */
	writeFileSync(filename, content, options) {
		const normalizedFilename = normalizeFilename(filename);
		const encoding = typeof options === 'object' ? options.encoding : options;

		if (!content && !options) {
			throw new Error('No content');
		}

		this.storage[normalizedFilename] = encoding || typeof content === 'string' ? new Buffer(content, encoding) : content;
	}

}

export default new VirtualFileSystem();
