import OutputDocument from './OutputDocument';
import fs from 'fs';

class OutputDocumentServer extends OutputDocument {

	/**
	 * @param {string} filename
	 * @returns {Promise}
	 */
	write(filename) {
		return new Promise((resolve, reject) => {
			this.getStream().then(stream => {
				stream.pipe(fs.createWriteStream(filename));
				stream.on('end', () => {
					resolve();
				});
				stream.end();
			}, result => {
				reject(result);
			});
		});
	}

}

export default OutputDocumentServer;
