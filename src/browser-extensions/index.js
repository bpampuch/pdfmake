import pdfmakeBase from '../base';
import OutputDocumentBrowser from './OutputDocumentBrowser'; // TODO: Lazy loading for support on unsupported browsers (see issue https://github.com/bpampuch/pdfmake/issues/1663)
import fs from 'fs';

let defaultClientFonts = {
	Roboto: {
		normal: 'Roboto-Regular.ttf',
		bold: 'Roboto-Medium.ttf',
		italics: 'Roboto-Italic.ttf',
		bolditalics: 'Roboto-MediumItalic.ttf'
	}
};

const isBrowserSupported = () => {
	// Ensure the browser provides the level of support needed
	if (!Object.keys || typeof Uint16Array === 'undefined') {
		return false;
	}
	return true;
};

class pdfmake extends pdfmakeBase {
	constructor() {
		super();
		this.fonts = defaultClientFonts;
	}

	createPdf(docDefinition) {
		if (!isBrowserSupported()) {
			throw new Error('Your browser does not provide the level of support needed');
		}

		return super.createPdf(docDefinition);
	}

	addVirtualFileSystem(vfs) {
		fs.bindFS(vfs); // bind virtual file system to file system
	}

	_transformToDocument(doc) {
		return new OutputDocumentBrowser(doc);
	}
}

export default new pdfmake();
