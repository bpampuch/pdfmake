var path = require('path');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
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
										"ie": "10"
									},
									modules: false,
									useBuiltIns: 'usage',
									loose: true
								}
							]
						]
					}
				}
			},
			{
				enforce: 'pre',
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
						]
					}
				}
			},
			// Workaround for @babel/preset-env bug in useBuiltIns: 'usage' (always use import instead of require)
			{
				test: /\.js$/,
				include: /saslprep/,
				loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: /import "([\S]*)";/g,
							replacement: function (match, p1) {
								return 'require("' + p1 + '");';
							}
						}
					]
				})
			},
			{ test: /pdfMake.js$/, loader: 'expose-loader?pdfMake', include: [path.join(__dirname, './src/browser-extensions')] },
			{
				test: /pdfkit[/\\]js[/\\]/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: 'return this.font(\'Helvetica\');',
							replacement: function () {
								return '';
							}
						}
					]
				})
			},
			{
				test: /fontkit[/\\]index.js$/, loader: StringReplacePlugin.replace({
					replacements: [
						{
							pattern: /fs\./g,
							replacement: function () {
								return 'require(\'fs\').';
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
			new UglifyJsPlugin({
				include: /\.min\.js$/,
				sourceMap: true,
				uglifyOptions: {
					output: {
						comments: /^! pdfmake/
					},
					compress: {
						drop_console: true
					},
					mangle: {
						reserved: ['HeadTable', 'NameTable', 'CmapTable', 'HheaTable', 'MaxpTable', 'HmtxTable', 'PostTable', 'OS2Table', 'LocaTable', 'GlyfTable']
					}
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
