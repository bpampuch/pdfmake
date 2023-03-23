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
		if (this.bufferPromise === null) {
			this.bufferPromise = new Promise((resolve, reject) => {
				this.getStream().then(stream => {

					let chunks = [];
					let result;
					stream.on('readable', () => {
						let chunk;
						while ((chunk = stream.read(this.bufferSize)) !== null) {
							chunks.push(chunk);
						}
					});
					stream.on('end', () => {
						result = Buffer.concat(chunks);
						resolve(result);
					});
					stream.end();

				}, result => {
					reject(result);
				});
			});
		}

		return this.bufferPromise;
	}

	/**
	 * @returns {Promise<string>}
	 */
	getBase64() {
		return new Promise((resolve, reject) => {
			this.getBuffer().then(buffer => {
				resolve(buffer.toString('base64'));
			}, result => {
				reject(result);
			});
		});
	}

	/**
	 * @returns {Promise<string>}
	 */
	getDataUrl() {
		return new Promise((resolve, reject) => {
			this.getBase64().then(data => {
				resolve('data:application/pdf;base64,' + data);
			}, result => {
				reject(result);
			});
		});
	}

}

export default OutputDocument;
