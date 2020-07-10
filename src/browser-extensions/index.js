import pdfmakeBase from '../base';
import OutputDocumentBrowser from './OutputDocumentBrowser'; // TODO: Lazy loading for support on unsupported browsers (see issue https://github.com/bpampuch/pdfmake/issues/1663)
import URLBrowserResolver from './URLBrowserResolver';
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
		this.urlResolver = new URLBrowserResolver(this.virtualfs);
		this.fonts = defaultClientFonts;
	}

	createPdf(docDefinition) {
		if (!isBrowserSupported()) {
			throw new Error('Your browser does not provide the level of support needed');
		}

		return super.createPdf(docDefinition);
	}

	addFontContainer(fontContainer) {
		this.addVirtualFileSystem(fontContainer.vfs);
		this.addFonts(fontContainer.fonts);
	}

	addVirtualFileSystem(vfs) {
		for (let key in vfs) {
			if (vfs.hasOwnProperty(key)) {
				let data;
				let encoding;
				if (typeof vfs[key] === 'object') {
					data = vfs[key].data;
					encoding = vfs[key].encoding || 'base64';
				} else {
					data = vfs[key];
					encoding = 'base64';
				}
				fs.writeFileSync(key, data, encoding);
			}
		}
	}

	_transformToDocument(doc) {
		return new OutputDocumentBrowser(doc);
	}
}

export default new pdfmake();
