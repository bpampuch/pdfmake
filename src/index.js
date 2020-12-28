const pdfmakeBase = require('./base').default;
const OutputDocumentServer = require('./OutputDocumentServer').default;
const URLResolver = require('./URLResolver').default;

class pdfmake extends pdfmakeBase {
	constructor() {
		super();
		this.urlResolver = new URLResolver(this.virtualfs);
	}

	_transformToDocument(doc) {
		return new OutputDocumentServer(doc);
	}
}

module.exports = new pdfmake();
