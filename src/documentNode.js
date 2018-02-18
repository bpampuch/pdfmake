import DocumentBase from './documentBase';
import fs from 'fs';

export default class DocumentNode extends DocumentBase {

	write(filename) {
		this.getStream().pipe(fs.createWriteStream(filename));
		this.getStream().end();
	}

}