'use strict';

function VirtualFileSystem() {
	this.fileSystem = {};
	this.dataSystem = {};
}

VirtualFileSystem.prototype.readFileSync = function (filename) {
	filename = fixFilename(filename);

	var dataContent = this.dataSystem[filename];
	if (dataContent) {
		return new Buffer(dataContent, typeof dataContent === 'string' ? 'base64' : undefined);
	}

	var content = this.fileSystem[filename];
	if (content) {
		return content;
	}

	throw 'File \'' + filename + '\' not found in virtual file system';
};

VirtualFileSystem.prototype.writeFileSync = function (filename, content) {
	this.fileSystem[fixFilename(filename)] = content;
};

VirtualFileSystem.prototype.bindFS = function (data) {
	this.dataSystem = data || {};
};


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
