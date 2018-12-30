const pdfmakeBase = require('./base').default;
const OutputDocumentNode = require('./OutputDocumentNode').default;

class pdfmake extends pdfmakeBase {
	_transformToDocument(doc) {
		return new OutputDocumentNode(doc);
	}
}

module.exports = new pdfmake();
