class OutputDocument {

	/**
	 * @param {object} pdfDocument
	 */
	constructor(pdfDocument) {
		this.bufferSize = 9007199254740991;
		this.pdfDocument = pdfDocument;
	}

	/**
	 * @returns {object}
	 */
	getStream() {
		return this.pdfDocument;
	}

	/**
	 * @returns {Promise}
	 */
	getBuffer() {
		return new Promise((resolve, reject) => {
			try {
				let chunks = [];
				let result;
				this.getStream().on('readable', () => {
					let chunk;
					while ((chunk = this.getStream().read(this.bufferSize)) !== null) {
						chunks.push(chunk);
					}
				});
				this.getStream().on('end', () => {
					result = Buffer.concat(chunks);
					resolve(result);
				});
				this.getStream().end();
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * @returns {Promise}
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
	 * @returns {Promise}
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
