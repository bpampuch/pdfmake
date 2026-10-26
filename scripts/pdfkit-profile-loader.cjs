// PDFKit embeds this profile; React Native cannot resolve an import.meta URL.
module.exports = function (source) {
	return source.replace(
		/new URL\(\s*['"]\.\/data\/sRGB_IEC61966_2_1\.icc['"],\s*import\.meta\.url\s*,?\s*\)\.href/g,
		"'pdfkit/builtin/sRGB_IEC61966_2_1.icc'"
	);
};
