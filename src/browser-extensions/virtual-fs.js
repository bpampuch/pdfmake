/* jslint node: true */
'use strict';

function VirtualFileSystem() {
	this.fileSystem = {};
	this.baseSystem = {};
}

VirtualFileSystem.prototype.readFileSync = function (filename) {
	filename = fixFilename(filename);

	var base64content = this.baseSystem[filename];
	if (base64content) {
		return new Buffer(base64content, 'base64');
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
	this.baseSystem = data || {};
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
