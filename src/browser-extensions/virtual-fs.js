class VirtualFileSystem {
	constructor() {
		this.fileSystem = {};
		this.dataSystem = {};
	}

	readFileSync(filename) {
		filename = fixFilename(filename);

		let dataContent = this.dataSystem[filename];
		if (dataContent) {
			return Buffer.from(dataContent, typeof dataContent === 'string' ? 'base64' : undefined);
		}

		let content = this.fileSystem[filename];
		if (content) {
			return content;
		}

		throw `File '${filename}' not found in virtual file system`;
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

export default new VirtualFileSystem();
