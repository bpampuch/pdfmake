import OutputDocument from '../OutputDocument';
import { isFunction } from '../helpers/variableType';
import { saveAs } from 'file-saver';

const bufferToBlob = buffer => {
	let blob;
	try {
		blob = new Blob([buffer], { type: 'application/pdf' });
	} catch (e) {
		// Old browser which can't handle it without making it an byte array (ie10)
		if (e.name === 'InvalidStateError') {
			let byteArray = new Uint8Array(buffer);
			blob = new Blob([byteArray.buffer], { type: 'application/pdf' });
		}
	}

	if (!blob) {
		throw new Error('Could not generate blob');
	}

	return blob;
};

const openWindow = () => {
	// we have to open the window immediately and store the reference
	// otherwise popup blockers will stop us
	let win = window.open('', '_blank');
	if (win === null) {
		throw new Error('Open PDF in new window blocked by browser');
	}

	return win;
};

class OutputDocumentBrowser extends OutputDocument {
	getBlob(callback) {
		if (!callback) {
			throw new Error('getBlob is an async method and needs a callback argument');
		}

		this.getBuffer(buffer => {
			let blob = bufferToBlob(buffer);
			callback(blob);
		});
	}

	download(fileName = 'file.pdf', callback) {
		this.getBlob(blob => {
			saveAs(blob, fileName);

			if (isFunction(callback)) {
				callback();
			}
		});
	}

	open(win = null) {
		if (!win) {
			win = openWindow();
		}
		try {
			this.getBlob(result => {
				let urlCreator = window.URL || window.webkitURL;
				let pdfUrl = urlCreator.createObjectURL(result);
				win.location.href = pdfUrl;
			});
		} catch (e) {
			win.close();
			throw e;
		}
	}

	print(win = null) {
		this.getStream().setOpenActionAsPrint();
		this.open(win);
	}
}

export default OutputDocumentBrowser;
