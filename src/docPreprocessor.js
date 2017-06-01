/* jslint node: true */
'use strict';

var fontStringify = require('./helpers').fontStringify;

function DocPreprocessor() {

}

DocPreprocessor.prototype.preprocessDocument = function (docStructure) {
	this.tocs = [];
	return this.preprocessNode(docStructure);
};

DocPreprocessor.prototype.preprocessNode = function (node) {
	// expand shortcuts and casting values
	if (Array.isArray(node)) {
		node = {stack: node};
	} else if (typeof node === 'string' || node instanceof String) {
		node = {text: node};
	} else if (typeof node === 'number' || typeof node === 'boolean') {
		node = {text: node.toString()};
	} else if (node === null) {
		node = {text: ''};
	} else if (Object.keys(node).length === 0) { // empty object
		node = {text: ''};
	}

	if (node.columns) {
		return this.preprocessColumns(node);
	} else if (node.stack) {
		return this.preprocessVerticalContainer(node);
	} else if (node.ul) {
		return this.preprocessList(node);
	} else if (node.ol) {
		return this.preprocessList(node);
	} else if (node.table) {
		return this.preprocessTable(node);
	} else if (node.text !== undefined) {
		return this.preprocessText(node);
	} else if (node.toc) {
		return this.preprocessToc(node);
	} else if (node.image) {
		return this.preprocessImage(node);
	} else if (node.canvas) {
		return this.preprocessCanvas(node);
	} else if (node.qr) {
		return this.preprocessQr(node);
	} else {
		throw 'Unrecognized document structure: ' + JSON.stringify(node, fontStringify);
	}
};

DocPreprocessor.prototype.preprocessColumns = function (node) {
	var columns = node.columns;

	for (var i = 0, l = columns.length; i < l; i++) {
		columns[i] = this.preprocessNode(columns[i]);
	}

	return node;
};

DocPreprocessor.prototype.preprocessVerticalContainer = function (node) {
	var items = node.stack;

	for (var i = 0, l = items.length; i < l; i++) {
		items[i] = this.preprocessNode(items[i]);
	}

	return node;
};

DocPreprocessor.prototype.preprocessList = function (node) {
	var items = node.ul || node.ol;

	for (var i = 0, l = items.length; i < l; i++) {
		items[i] = this.preprocessNode(items[i]);
	}

	return node;
};

DocPreprocessor.prototype.preprocessTable = function (node) {
	var col, row, cols, rows;

	for (col = 0, cols = node.table.body[0].length; col < cols; col++) {
		for (row = 0, rows = node.table.body.length; row < rows; row++) {
			var rowData = node.table.body[row];
			var data = rowData[col];
			if (data !== undefined) {
				if (data === null) { // transform to object
					data = '';
				}
				if (!data._span) {
					rowData[col] = this.preprocessNode(data);
				}
			}
		}
	}

	return node;
};

DocPreprocessor.prototype.preprocessText = function (node) {
	if (node.tocItem) {
		if (!Array.isArray(node.tocItem)) {
			node.tocItem = [node.tocItem];
		}

		for (var i = 0, l = node.tocItem.length; i < l; i++) {
			if (!(typeof node.tocItem[i] === 'string' || node.tocItem[i] instanceof String)) {
				node.tocItem[i] = '_default_';
			}

			var tocItemId = node.tocItem[i];

			if (!this.tocs[tocItemId]) {
				this.tocs[tocItemId] = {toc: {_items: [], _pseudo: true}};
			}

			this.tocs[tocItemId].toc._items.push(node);
		}
	}

	return node;
};

DocPreprocessor.prototype.preprocessToc = function (node) {
	if (!node.toc.id) {
		node.toc.id = '_default_';
	}

	node.toc.title = node.toc.title ? this.preprocessNode(node.toc.title) : null;
	node.toc._items = [];

	if (this.tocs[node.toc.id]) {
		if (!this.tocs[node.toc.id].toc._pseudo) {
			throw "TOC '" + node.toc.id + "' already exists";
		}

		node.toc._items = this.tocs[node.toc.id].toc._items;
	}

	this.tocs[node.toc.id] = node;

	return node;
};

DocPreprocessor.prototype.preprocessImage = function (node) {
	return node;
};

DocPreprocessor.prototype.preprocessCanvas = function (node) {
	return node;
};

DocPreprocessor.prototype.preprocessQr = function (node) {
	return node;
};

module.exports = DocPreprocessor;