import OutputDocument from '../OutputDocument';
//import { isNull } from '../helpers/variableType';
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

	/**
	 * @returns {Promise}
	 */
	getBlob() {
		return new Promise((resolve, reject) => {
			this.getBuffer().then(buffer => {
				let blob = bufferToBlob(buffer);
				resolve(blob);
			}, result => {
				reject(result);
			});
		});
	}

	/**
	 * @param {string} filename
	 * @returns {Promise}
	 */
	download(filename = 'file.pdf') {
		return new Promise((resolve, reject) => {
			this.getBlob().then(blob => {
				saveAs(blob, filename);
				resolve();
			}, result => {
				reject(result);
			});
		});
	}

	/**
	 * @param {Window} win
	 * @returns {Promise}
	 */
	open(win = null) {
		return new Promise((resolve, reject) => {
			if (!win) {
				win = openWindow();
			}
			this.getBlob().then(blob => {
				try {
					let urlCreator = window.URL || window.webkitURL;
					let pdfUrl = urlCreator.createObjectURL(blob);
					win.location.href = pdfUrl;

					//
					resolve();
					/* temporarily disabled
					if (win === window) {
						resolve();
					} else {
						setTimeout(() => {
							if (isNull(win.window)) { // is closed by AdBlock
								window.location.href = pdfUrl; // open in actual window
							}
							resolve();
						}, 500);
					}
					*/
				} catch (e) {
					win.close();
					throw e;
				}
			}, result => {
				reject(result);
			});
		});
	}

	/**
	 * @param {Window} win
	 * @returns {Promise}
	 */
	print(win = null) {
		this.getStream().setOpenActionAsPrint();
		return this.open(win);
	}

}

export default OutputDocumentBrowser;
