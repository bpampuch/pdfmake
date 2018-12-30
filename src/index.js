const pdfmakeBase = require('./base').default;
const OutputDocumentServer = require('./OutputDocumentServer').default;

class pdfmake extends pdfmakeBase {
	_transformToDocument(doc) {
		return new OutputDocumentServer(doc);
	}
}

module.exports = new pdfmake();
