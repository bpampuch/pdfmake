import pdfmakeBase from '../base';
import OutputDocumentBrowser from './OutputDocumentBrowser';
import URLBrowserResolver from './URLBrowserResolver';
import fs from 'fs';
import configurator from 'core-js/configurator';

// core-js: Polyfills will be used only if natives completely unavailable.
configurator({
  useNative: ['Promise']
});

let defaultClientFonts = {
	Roboto: {
		normal: 'Roboto-Regular.ttf',
		bold: 'Roboto-Medium.ttf',
		italics: 'Roboto-Italic.ttf',
		bolditalics: 'Roboto-MediumItalic.ttf'
	}
};

class pdfmake extends pdfmakeBase {
	constructor() {
		super();
		this.urlResolver = new URLBrowserResolver(this.virtualfs);
		this.fonts = defaultClientFonts;
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
