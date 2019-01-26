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
			{test: /pdfMake.js$/, loader: 'expose-loader?pdfMake', include: [path.join(__dirname, './src/browser-extensions')]},
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
