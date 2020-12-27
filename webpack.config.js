var path = require('path');
var TerserPlugin = require('terser-webpack-plugin');
var StringReplacePlugin = require("string-replace-webpack-plugin");
var webpack = require('webpack');
var pkg = require('./package.json');

var banner = '/*! ' + pkg.name + ' v' + pkg.version + ', @license ' + pkg.license + ', @link ' + pkg.homepage + ' */';

module.exports = {
	mode: 'production',
	entry: {
		'pdfmake': './src/browser-extensions/pdfMake.js',
		'pdfmake.min': './src/browser-extensions/pdfMake.js'
	},
	output: {
		path: path.join(__dirname, './build'),
		filename: '[name].js',
		libraryTarget: 'umd',
		// Workaround https://github.com/webpack/webpack/issues/6642 until https://github.com/webpack/webpack/issues/6525 lands.
		globalObject: `typeof self !== 'undefined' ? self : this`
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
					]
				})
			},
			{
				test: /\.js$/,
				include: /(pdfkit|saslprep|unicode-trie|unicode-properties|dfa|linebreak|png-js)/,
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
									// TODO: after fix in babel remove corejs version and remove core-js dependency in package.json
									corejs: "3.0.0",
									loose: true
								}
							]
						],
						plugins: ["@babel/plugin-transform-modules-commonjs"]
					}
				}
			},
			{
				test: /pdfMake.js$/,
				loader: 'expose-loader',
				options: {
					exposes: 'pdfMake',
				},
				include: [path.join(__dirname, './src/browser-extensions')]
			},

			/* temporary bugfix for FileSaver: added hack for mobile device support, see https://github.com/bpampuch/pdfmake/issues/1664 */
			/* waiting to merge and release PR https://github.com/eligrey/FileSaver.js/pull/533 */
			{
				test: /FileSaver.min.js$/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: '"download"in HTMLAnchorElement.prototype',
							replacement: function () {
								return '(typeof HTMLAnchorElement !== "undefined" && "download" in HTMLAnchorElement.prototype)';
							}
						}
					]
				})
			},

			{ enforce: 'post', test: /fontkit[/\\]index.js$/, loader: "transform-loader?brfs" },
			{ enforce: 'post', test: /unicode-properties[/\\]index.js$/, loader: "transform-loader?brfs" },
			{ enforce: 'post', test: /linebreak[/\\]src[/\\]linebreaker.js/, loader: "transform-loader?brfs" }
		]
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				include: /\.min\.js$/,
				sourceMap: true,
				extractComments: false,
				terserOptions: {
					format: {
						preamble: banner,
						comments: false,
					},
					output: {
						preamble: banner,
						comments: false,
					},
					compress: {
						drop_console: true
					},
					keep_classnames: true,
					keep_fnames: true
				}
			})
		]
	},
	plugins: [
		new StringReplacePlugin(),
		new webpack.BannerPlugin({
			banner: banner,
			raw: true
		})
	],
	devtool: 'source-map'
};
