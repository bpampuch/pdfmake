var path = require('path');
var StringReplacePlugin = require("string-replace-webpack-plugin");
var webpack = require('webpack');
var pkg = require('./package.json');

var banner = '/*! ' + pkg.name + ' v' + pkg.version + ', @license ' + pkg.license + ', @link ' + pkg.homepage + ' */';

module.exports = {
	entry: {
		'pdfmake': './src/browser-extensions/pdfMake.js',
		'pdfmake.min': './src/browser-extensions/pdfMake.js'
	},
	output: {
		path: path.join(__dirname, './build'),
		filename: '[name].js',
		libraryTarget: 'umd'
	},
	resolve: {
		alias: {
			fs: path.join(__dirname, './src/browser-extensions/virtual-fs.js')
		}
	},
	node: {
		// Prevent webpack from injecting setImmediate polyfill, which includes a "new Function" through a global polyfill - which cannot be used in a CSP environment with sane defaults
		setImmediate: false
	},
	module: {
		rules: [
			// for fs don't use babel _interopDefault command
			{
				enforce: 'pre',
				test: /pdfkit[/\\]js[/\\]/,
				loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: "import fs from 'fs';",
							replacement: function () {
								return "var fs = require('fs');";
							}
						}
					]})
			},
			{
				test: /\.js$/,
				include: /(pdfkit|saslprep)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							[
								"@babel/preset-env",
								{
									targets: {
										"ie": "10"
									},
									modules: false,
									useBuiltIns: 'usage',
									loose: true
								}
							]
						],
						plugins: ["@babel/plugin-transform-modules-commonjs"]
					}
				}
			},
			{test: /pdfMake.js$/, loader: 'expose-loader?pdfMake', include: [path.join(__dirname, './src/browser-extensions')]},

			/* Can be removed after new pdfkit release */
			/* waiting to release included PR https://github.com/foliojs/pdfkit/pull/934 */
			{test: /pdfkit[/\\]js[/\\]/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: 'return this.font(\'Helvetica\');',
							replacement: function () {
								return '';
							}
						}
					]})
			},
			{test: /fontkit[/\\]index.js$/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: /fs\./g,
							replacement: function () {
								return 'require(\'fs\').';
							}
						}
					]})
			},

			/* temporary bugfix for pdfkit version 0.9.0 - issue https://github.com/foliojs/pdfkit/issues/923 */
			/* waiting to release included PR https://github.com/foliojs/pdfkit/pull/925 */
			{test: /pdfkit[/\\]js[/\\]/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: "stringBuffer = swapBytes(new Buffer(",
							replacement: function () {
								return "stringBuffer = swapBytes(Buffer.from(";
							}
						}
					]})
			},
			{test: /pdfkit[/\\]js[/\\]/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: "stringBuffer = new Buffer(string, 'ascii');",
							replacement: function () {
								return "stringBuffer = Buffer.from(string.valueOf(), 'ascii');";
							}
						}
					]})
			},
			/* *** */

			/* temporary bugfix for FileSaver: added hack for mobile device support, see https://github.com/bpampuch/pdfmake/issues/1664 */
			/* waiting to merge and release PR https://github.com/eligrey/FileSaver.js/pull/533 */
			{test: /FileSaver.min.js$/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: '"download"in HTMLAnchorElement.prototype',
							replacement: function () {
								return '(typeof HTMLAnchorElement !== "undefined" && "download" in HTMLAnchorElement.prototype)';
							}
						}
					]})
			},

			{enforce: 'post', test: /fontkit[/\\]index.js$/, loader: "transform-loader?brfs"},
			{enforce: 'post', test: /unicode-properties[/\\]index.js$/, loader: "transform-loader?brfs"},
			{enforce: 'post', test: /linebreak[/\\]src[/\\]linebreaker.js/, loader: "transform-loader?brfs"}
		]
	},
	plugins: [
		new StringReplacePlugin(),

		new webpack.optimize.UglifyJsPlugin({
			include: /\.min\.js$/,
			sourceMap: true,
			uglifyOptions: {
				compress: {
					drop_console: true
				},
				mangle: {
					reserved: ['HeadTable', 'NameTable', 'CmapTable', 'HheaTable', 'MaxpTable', 'HmtxTable', 'PostTable', 'OS2Table', 'LocaTable', 'GlyfTable']
				}
			}
		}),

		new webpack.BannerPlugin({
			banner: banner,
			raw: true
		})
	],
	devtool: 'source-map'
};
