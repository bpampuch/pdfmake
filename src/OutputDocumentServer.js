import OutputDocument from './OutputDocument';
import fs from 'fs';

class OutputDocumentServer extends OutputDocument {

	/**
	 * @param {string} filename
	 * @returns {Promise}
	 */
	async write(filename) {
		const stream = await this.getStream();
		const writeStream = fs.createWriteStream(filename);

		const streamEnded = new Promise((resolve, reject) => {
			stream.on('end', resolve);
			stream.on('error', reject);
		});

		const writeClosed = new Promise((resolve, reject) => {
			writeStream.on('close', resolve);
			writeStream.on('error', reject);
		});

		stream.pipe(writeStream);
		stream.end();

		await Promise.all([streamEnded, writeClosed]);
	}

}

export default OutputDocumentServer;
