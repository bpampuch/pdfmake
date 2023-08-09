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
	target: ['web', 'es5'], // For Internet Explorer 11 support
	resolve: {
		alias: {
			fs: path.join(__dirname, './src/browser-extensions/virtual-fs-cjs.js')
		},
		fallback: {
			crypto: false,
			buffer: require.resolve('buffer/'),
			util: require.resolve('util/'),
			stream: require.resolve('stream-browserify'),
			zlib: require.resolve('browserify-zlib'),
			assert: require.resolve('assert/')
		}
	},
	module: {
		rules: [
			{
				enforce: 'pre',
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							[
								"@babel/preset-env",
								{
									targets: {
										"ie": "11"
									},
									modules: false,
									useBuiltIns: 'usage',
									// TODO: after fix in babel remove corejs version and remove core-js dependency in package.json
									corejs: "3.0.0",
									loose: true
								}
							]
						]
					}
				}
			},
			// for fs don't use babel _interopDefault command
			{
				enforce: 'pre',
				test: /pdfkit[/\\]js[/\\]/,
				use: {
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
				}
			},
			{
				test: /\.js$/,
				include: /(pdfkit|linebreak|fontkit|saslprep|restructure|unicode-trie|unicode-properties|dfa|buffer|png-js|crypto-js)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							[
								"@babel/preset-env",
								{
									targets: {
										"ie": "11"
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
				include: [path.join(__dirname, './src/browser-extensions')],
				use: {
					loader: 'expose-loader',
					options: {
						exposes: 'pdfMake',
					},
				}
			},
			/* temporary bugfix for FileSaver: added hack for mobile device support, see https://github.com/bpampuch/pdfmake/issues/1664 */
			/* waiting to merge and release PR https://github.com/eligrey/FileSaver.js/pull/533 */
			{
				test: /FileSaver.min.js$/,
				use: {
					loader: StringReplacePlugin.replace({
						replacements: [
							{
								pattern: '"download"in HTMLAnchorElement.prototype',
								replacement: function () {
									return '(typeof HTMLAnchorElement !== "undefined" && "download" in HTMLAnchorElement.prototype)';
								}
							}
						]
					})
				}
			},

			{
				enforce: 'post',
				test: /fontkit[/\\]index.js$/,
				use: {
					loader: "transform-loader?brfs"
				}
			},
			{
				enforce: 'post',
				test: /unicode-properties[/\\]index.js$/,
				use: {
					loader: "transform-loader?brfs"
				}
			},
			{
				enforce: 'post',
				test: /linebreak[/\\]src[/\\]linebreaker.js/,
				use: {
					loader: "transform-loader?brfs"
				}
			}
		]
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				include: /\.min\.js$/,
				extractComments: false,
				terserOptions: {
					format: {
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
		new webpack.ProvidePlugin({
			process: 'process/browser', // require "process" library, fix "process is not defined" error, source: https://stackoverflow.com/a/64553486
			Buffer: ['buffer', 'Buffer'] // require "buffer" library, fix "Buffer is not defined" error, source: https://github.com/webpack/changelog-v5/issues/10#issuecomment-615877593
		}),
		new StringReplacePlugin(),
		new webpack.BannerPlugin({
			banner: banner,
			raw: true
		})
	],
	devtool: 'source-map'
};
