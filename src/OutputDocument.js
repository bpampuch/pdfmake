class OutputDocument {

	/**
	 * @param {Promise<object>} pdfDocumentPromise
	 */
	constructor(pdfDocumentPromise) {
		this.bufferSize = 1073741824;
		this.pdfDocumentPromise = pdfDocumentPromise;
		this.bufferPromise = null;
	}

	/**
	 * @returns {Promise<object>}
	 */
	getStream() {
		return this.pdfDocumentPromise;
	}

	/**
	 * @returns {Promise<Buffer>}
	 */
	getBuffer() {
		const getBufferInternal = (async () => {
			const stream = await this.getStream();
			return new Promise((resolve) => {
				let chunks = [];
				stream.on('readable', () => {
					let chunk;
					while ((chunk = stream.read(this.bufferSize)) !== null) {
						chunks.push(chunk);
					}
				});
				stream.on('end', () => {
					resolve(Buffer.concat(chunks));
				});
				stream.end();
			});
		});

		if (this.bufferPromise === null) {
			this.bufferPromise = getBufferInternal();
		}
		return this.bufferPromise;
	}

	/**
	 * @returns {Promise<string>}
	 */
	async getBase64() {
		const buffer = await this.getBuffer();
		return buffer.toString('base64');
	}

	/**
	 * @returns {Promise<string>}
	 */
	async getDataUrl() {
		const data = await this.getBase64();
		return 'data:application/pdf;base64,' + data;
	}

}

export default OutputDocument;
