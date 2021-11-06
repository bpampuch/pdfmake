const fs = require('fs');

const vfsBefore = "var vfs = ";
const vfsAfter = "; var _global = typeof window === 'object' ? window : typeof global === 'object' ? global : typeof self === 'object' ? self : this; if (typeof _global.pdfMake !== 'undefined' && typeof _global.pdfMake.addVirtualFileSystem !== 'undefined') { _global.pdfMake.addVirtualFileSystem(vfs); } if (typeof module !== 'undefined') { module.exports = vfs; }";
const sourcePath = process.argv[2];
const vfsFilename = process.argv[3] ? process.argv[3] : './build/vfs_fonts.js';

var vfs = {};

if (sourcePath === undefined) {
	console.error('Usage: node build-vfs.js path [filename]');
	console.log('');
	console.log('Parameters:');
	console.log('  path      Source path with fonts.');
	console.log('  filename  Optional. Output vfs file. Default: ./build/vfs_fonts.js');
	console.log('');
	console.log('Examples:');
	console.log('  node build-vfs.js "examples/fonts"');
	console.log('  node build-vfs.js "examples/fonts" "./build/vfs_fonts.js"');
	return;
}

if (!fs.existsSync(sourcePath)) {
	console.error('Source path "' + sourcePath + '" not found.');
	return;
}

console.log('Source path:', sourcePath);
console.log('');

var files = fs.readdirSync(sourcePath);

files.forEach(function (file) {
	var fileBase64 = fs.readFileSync(sourcePath + '/' + file).toString('base64');
	console.log('FILE:', file);

	vfs[file] = fileBase64;
});

const vfsFileContent = vfsBefore + JSON.stringify(vfs, null, 2) + vfsAfter;
fs.writeFileSync(vfsFilename, vfsFileContent);

console.log('');
console.log('Builded ' + files.length + ' files to ' + vfsFilename + '.');
