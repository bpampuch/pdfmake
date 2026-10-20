import OutputDocument from './OutputDocument';
import fs from 'fs';
import { pipeline } from 'stream/promises';

class OutputDocumentServer extends OutputDocument {

	/**
	 * @param {string} filename
	 * @returns {Promise}
	 */
	async write(filename) {
		const stream = await this.getStream();
		const writeStream = fs.createWriteStream(filename);

		const completed = pipeline(stream, writeStream);
		try {
			stream.end();
		} catch (error) {
			stream.destroy(error);
		}
		await completed;
	}

}

export default OutputDocumentServer;
