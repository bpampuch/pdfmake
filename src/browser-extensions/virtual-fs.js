class VirtualFileSystem {
	constructor() {
		this.fileSystem = {};
		this.dataSystem = {};
	}

	readFileSync(filename, options = null) {
		filename = fixFilename(filename);

		let dataContent = this.dataSystem[filename];
		if (typeof dataContent === 'string' && options === 'utf8') {
			return dataContent;
		}

		if (dataContent) {
			return new Buffer(dataContent, typeof dataContent === 'string' ? 'base64' : undefined);
		}

		let content = this.fileSystem[filename];
		if (content) {
			return content;
		}

		throw new Error(`File '${filename}' not found in virtual file system`);
	}

	writeFileSync(filename, content) {
		this.fileSystem[fixFilename(filename)] = content;
	}

	bindFS(data) {
		this.dataSystem = data || {};
	}
}


function fixFilename(filename) {
	if (filename.indexOf(__dirname) === 0) {
		filename = filename.substring(__dirname.length);
	}

	if (filename.indexOf('/') === 0) {
		filename = filename.substring(1);
	}

	return filename;
}

module.exports = new VirtualFileSystem();
