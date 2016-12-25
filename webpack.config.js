var path = require('path');
var StringReplacePlugin = require("string-replace-webpack-plugin");


module.exports = {
	entry: './src/browser-extensions/pdfMake.js',
	output: {
		path: path.join(__dirname, './build'),
		filename: 'pdfmake.js',
		libraryTarget: 'umd'
	},
	resolve: {
		alias: {
			fs: path.join(__dirname, './src/browser-extensions/virtual-fs.js')
		}
	},
	module: {
		loaders: [
			{test: /\.json$/, loader: 'json'},
			{test: /pdfMake.js$/, loader: 'expose?pdfMake', include: [path.join(__dirname, './src/browser-extensions')]},
			{test: /pdfkit[\/\\]js[\/\\]mixins[\/\\]fonts.js$/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: 'return this.font(\'Helvetica\');',
							replacement: function () {
								return '';
							}
						}
					]})
			},
			{test: /fontkit[\/\\]index.js$/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: /fs\./g,
							replacement: function () {
								return 'require(\'fs\').';
							}
						}
					]})
			},
			{test: /readable-stream[\/\\]/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: 'stream.read()',
							replacement: function () {
								return 'stream.read(9007199254740991)';
							}
						}
					]})
			},
			/* hack for IE 10 */
			{test: /brotli[\/\\]dec[\/\\]/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: /const /g,
							replacement: function () {
								return 'var ';
							}
						}
					]})
			}
		],
		postLoaders: [
			{test: /fontkit[\/\\]/, loader: "transform?brfs"},
			{test: /unicode-properties[\/\\]/, loader: "transform?brfs"},
			{test: /linebreak[\/\\]/, loader: "transform?brfs"}
		]
	},
	plugins: [
		new StringReplacePlugin()
	]
};
