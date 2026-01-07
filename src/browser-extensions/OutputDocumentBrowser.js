import OutputDocument from '../OutputDocument';
import { saveAs } from 'file-saver';

/**
 * @returns {Window}
 */
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
	 * @returns {Promise<Blob>}
	 */
	async getBlob() {
		const buffer = await this.getBuffer();
		return new Blob([buffer], { type: 'application/pdf' });
	}

	/**
	 * @param {string} filename
	 * @returns {Promise}
	 */
	async download(filename = 'file.pdf') {
		const blob = await this.getBlob();
		saveAs(blob, filename);
	}

	/**
	 * @param {Window} win
	 * @returns {Promise}
	 */
	async open(win = null) {
		if (!win) {
			win = openWindow();
		}
		const blob = await this.getBlob();
		try {
			let urlCreator = window.URL || window.webkitURL;
			let pdfUrl = urlCreator.createObjectURL(blob);
			win.location.href = pdfUrl;

			/* temporarily disabled
			if (win === window) {
				return;
			} else {
				setTimeout(() => {
					if (win.window === null) { // is closed by AdBlock
						window.location.href = pdfUrl; // open in actual window
					}
					return;
				}, 500);
			}
			*/
		} catch (e) {
			win.close();
			throw e;
		}
	}

	/**
	 * @param {Window} win
	 * @returns {Promise}
	 */
	async print(win = null) {
		const stream = await this.getStream();
		stream.setOpenActionAsPrint();
		await this.open(win);
	}
}

export default OutputDocumentBrowser;
