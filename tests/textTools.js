'use strict';

var assert = require('assert');
var rewire = require("rewire");

var TextTools = rewire('../js/textTools');
var StyleContextStack = require('../js/styleContextStack').default;
var DocPreprocessor = require('../js/docPreprocessor').default;

var sampleTestProvider = {
	provideFont: function (familyName, bold, italics) {
		return {
			widthOfString: function (text, size) {
				return text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1);
			},
			lineHeight: function (size) {
				return size;
			}
		};
	}
};



var textTools = new TextTools.default(sampleTestProvider);

describe('TextTools', function () {

	var plainTextArrayWithoutNewLines = [
		'Imię: ',
		'Jan   ',
		'   Nazwisko:',
		' Nowak Dodatkowe informacje:'
	];

	var mixedTextArrayWithoutNewLinesNoWrapLongest = [
		'Imię: ',
		'Jan   ',
		'   Nazwisko:',
		{text: ' Nowak Dodatkowe informacje:', noWrap: true}
	];

	var mixedTextArrayWithoutNewLinesNoWrapShortest = [
		'Imię: ',
		{text: 'Jan   ', noWrap: true},
		'   Nazwisko:',
		' Nowak Dodatkowe informacje:'
	];

	var plainTextArrayWithoutNewLinesWhichRequiresTrimming = [
		'                          Imię: ',
		'Jan   ',
		'   Nazwisko:',
		' Nowak Dodatkowe informacje: '
	];

	var textArrayWithNewLines = [
		'This',
		' is a sample\n',
		'text having two lines'
	];

	var textArrayWithNewLinesWhichRequiresTrimming = [
		' This',
		' is a sample  \n',
		'         text having two lines       '
	];

	var textWithLeadingIndent = {
		text:
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut porttitor risus sapien, at commodo eros suscipit ' +
			'nec. Pellentesque pretium, justo eleifend pulvinar malesuada, lorem arcu pellentesque ex, ac congue arcu erat ' +
			'id nunc. Morbi facilisis pulvinar nunc, quis laoreet ligula rutrum ut. Mauris at ante imperdiet, vestibulum ' +
			'libero nec, iaculis justo. Mauris aliquam congue ligula vel convallis. Duis iaculis ornare nulla, id finibus ' +
			'sapien commodo quis. Sed semper sagittis urna. Nunc aliquam aliquet placerat. Maecenas ac arcu auctor, ' +
			'bibendum nisl non, bibendum odio. Proin semper lacus faucibus, pretium neque nec, viverra sem. ',
		leadingIndent: 10
	};

	var textWithLeadingSpaces = [
		{text: '    This is a paragraph', preserveLeadingSpaces: true}
	];

	var styleStack = new StyleContextStack({
		header: {
			fontSize: 150,
			font: 'Roboto'
		},
		small: {
			fontSize: 8
		}
	},
		{
			fontSize: 15,
			bold: false,
			font: 'Helvetica'
		});
	var styleStackNoWrap = new StyleContextStack({}, {noWrap: true});

	describe('buildInlines', function () {

	});

	describe('sizeOfString', function () {

	});
});
