import PdfMakeBase from './base';
import DocumentNode from './documentNode';

class PdfMake extends PdfMakeBase {

	_transformToDocument(doc) {
		return new DocumentNode(doc);
	}

}

export default new PdfMake();