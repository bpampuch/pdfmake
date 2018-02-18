import {isFunction} from '../helpers';
import DocumentBase from '../documentBase';
import {saveAs} from 'file-saver';

export default class DocumentBrowser extends DocumentBase {

	getBlob(callback) {
		if (!callback) {
			throw 'getBlob is an async method and needs a callback argument';
		}

		this.getBuffer((buffer) => {
			let blob = this._bufferToBlob(buffer);
			callback(blob);
		});
	}

	download(fileName = 'file.pdf', callback) {
		this.getBlob((blob) => {
			saveAs(blob, fileName);

			if (isFunction(callback)) {
				callback();
			}
		});
	}

	open(win = null) {
		if (!win) {
			win = this._openWindow();
		}
		try {
			this.getBlob((result) => {
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
		this.setOpenActionAsPrint();
		this.open(win);
	}

	_bufferToBlob(buffer) {
		let blob;
		try {
			blob = new Blob([buffer], {type: 'application/pdf'});
		} catch (e) {
			// Old browser which can't handle it without making it an byte array (ie10)
			if (e.name === 'InvalidStateError') {
				let byteArray = new Uint8Array(buffer);
				blob = new Blob([byteArray.buffer], {type: 'application/pdf'});
			}
		}

		if (!blob) {
			throw 'Could not generate blob';
		}

		return blob;
	}

	_openWindow() {
		// we have to open the window immediately and store the reference
		// otherwise popup blockers will stop us
		let win = window.open('', '_blank');
		if (win === null) {
			throw 'Open PDF in new window blocked by browser';
		}

		return win;
	}

}