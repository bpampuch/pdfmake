import PdfMakeBase from '../base';
import DocumentBrowser from './documentBrowser';

let defaultClientFonts = {
	Roboto: {
		normal: 'Roboto-Regular.ttf',
		bold: 'Roboto-Medium.ttf',
		italics: 'Roboto-Italic.ttf',
		bolditalics: 'Roboto-MediumItalic.ttf'
	}
};

class PdfMake extends PdfMakeBase {

	createPdf(docDefinition) {
		if (!this._isBrowserSupported()) {
			throw 'Your browser does not provide the level of support needed';
		}

		return super.createPdf(docDefinition);
	}

	addVirtualFileSystem(vfs) {
		require('fs').bindFS(vfs); // bind virtual file system to file system
	}

	_transformToDocument(doc) {
		return new DocumentBrowser(doc);
	}

	_isBrowserSupported() {
		// Ensure the browser provides the level of support needed
		if (!Object.keys) {
			return false;
		}
		return true;
	}

}

export default new PdfMake();