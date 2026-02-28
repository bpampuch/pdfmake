const pdfmakeBase = require('./base').default;
const OutputDocumentServer = require('./OutputDocumentServer').default;

class pdfmake extends pdfmakeBase {
	constructor() {
		super();
	}

	_transformToDocument(doc) {
		return new OutputDocumentServer(doc);
	}
}

module.exports = new pdfmake();
