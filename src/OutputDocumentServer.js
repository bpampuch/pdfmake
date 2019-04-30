import OutputDocument from './OutputDocument';
import fs from 'fs';

class OutputDocumentServer extends OutputDocument {

	/**
	 * @param {string} filename
	 */
	write(filename) {
		this.getStream().pipe(fs.createWriteStream(filename));
		this.getStream().end();
	}

}

export default OutputDocumentServer;
