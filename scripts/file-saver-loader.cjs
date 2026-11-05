// Preserve the existing mobile FileSaver workaround without a legacy Webpack plugin.
module.exports = function (source) {
	const needle = '"download"in HTMLAnchorElement.prototype';
	if (!source.includes(needle)) {
		throw new Error('FileSaver changed: review the HTMLAnchorElement compatibility workaround');
	}
	return source.replace(needle, '(typeof HTMLAnchorElement !== "undefined" && "download" in HTMLAnchorElement.prototype)');
};
