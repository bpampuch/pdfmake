import OutputDocument from './OutputDocument';
import fs from 'fs';

class OutputDocumentServer extends OutputDocument {

	/**
	 * @param {string} filename
	 * @returns {Promise}
	 */
	async write(filename) {
		const stream = await this.getStream();
		return new Promise((resolve) => {
			stream.pipe(fs.createWriteStream(filename));
			stream.on('end', resolve);
			stream.end();
		});
	}

}

export default OutputDocumentServer;
