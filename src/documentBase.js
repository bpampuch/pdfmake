export default class DocumentBase {

	constructor(pdfKitDocument) {
		this.bufferSize = 9007199254740991;
		this.pdfKitDocument = pdfKitDocument;
	}

	getStream() {
		return this.pdfKitDocument;
	}

	getBuffer(callback) {
		if (!callback) {
			throw 'getBuffer is an async method and needs a callback argument';
		}

		var chunks = [];
		var result;
		this.getStream().on('readable', () => {
			var chunk;
			while ((chunk = this.getStream().read(this.bufferSize)) !== null) {
				chunks.push(chunk);
			}
		});
		this.getStream().on('end', () => {
			result = Buffer.concat(chunks);
			callback(result, this.getStream()._pdfMakePages);
		});
		this.getStream().end();
	}

	getBase64(callback) {
		if (!callback) {
			throw 'getBase64 is an async method and needs a callback argument';
		}

		this.getBuffer((buffer) => {
			callback(buffer.toString('base64'));
		});
	}

	getDataUrl(callback) {
		if (!callback) {
			throw 'getDataUrl is an async method and needs a callback argument';
		}

		this.getBase64((data) => {
			callback('data:application/pdf;base64,' + data);
		});
	}

	setOpenActionAsPrint() {
		var printActionRef = this.pdfKitDoc.ref({
			Type: 'Action',
			S: 'Named',
			N: 'Print'
		});
		this.pdfKitDocument._root.data.OpenAction = printActionRef;
		printActionRef.end();
	}
}