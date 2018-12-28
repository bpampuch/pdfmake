import { isString, isNumber, isBoolean, isArray, isUndefined, isValue, isEmptyObject } from './helpers/variableType';
import { stringifyNode } from './helpers/node';

const convertValueToString = value => {
	if (isString(value)) {
		return value;
	} else if (isNumber(value) || isBoolean(value)) {
		return value.toString();
	} else if (!isValue(value) || isEmptyObject(value)) {
		return '';
	}

	// TODO: throw exception ?

	return value;
};

class DocPreprocessor {
	preprocessDocument(docStructure) {
		this.parentNode = null;
		this.tocs = [];
		this.nodeReferences = [];
		return this.preprocessNode(docStructure);
	}

	preprocessNode(node) {
		// expand shortcuts and casting values
		if (isArray(node)) {
			node = { stack: node };
		} else if (isString(node) || isNumber(node) || isBoolean(node) || !isValue(node) || isEmptyObject(node)) { // text node defined as value
			node = { text: convertValueToString(node) };
		} else if ('text' in node) { // cast value in text property
			node.text = convertValueToString(node.text);
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
		} else if (node.pageReference || node.textReference) {
			return this.preprocessText(node);
		} else {
			throw `Unrecognized document structure: ${stringifyNode(node)}`;
		}
	}

	preprocessColumns(node) {
		var columns = node.columns;

		for (var i = 0, l = columns.length; i < l; i++) {
			columns[i] = this.preprocessNode(columns[i]);
		}

		return node;
	}

	preprocessVerticalContainer(node) {
		var items = node.stack;

		for (var i = 0, l = items.length; i < l; i++) {
			items[i] = this.preprocessNode(items[i]);
		}

		return node;
	}

	preprocessList(node) {
		var items = node.ul || node.ol;

		for (var i = 0, l = items.length; i < l; i++) {
			items[i] = this.preprocessNode(items[i]);
		}

		return node;
	}

	preprocessTable(node) {
		var col;
		var row;
		var cols;
		var rows;

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
	}

	preprocessText(node) {
		if (node.tocItem) {
			if (!isArray(node.tocItem)) {
				node.tocItem = [node.tocItem];
			}

			for (var i = 0, l = node.tocItem.length; i < l; i++) {
				if (!isString(node.tocItem[i])) {
					node.tocItem[i] = '_default_';
				}

				var tocItemId = node.tocItem[i];

				if (!this.tocs[tocItemId]) {
					this.tocs[tocItemId] = { toc: { _items: [], _pseudo: true } };
				}

				var tocItemRef = {
					_nodeRef: this._getNodeForNodeRef(node),
					_textNodeRef: node
				};
				this.tocs[tocItemId].toc._items.push(tocItemRef);
			}
		}

		if (node.id) {
			if (this.nodeReferences[node.id]) {
				if (!this.nodeReferences[node.id]._pseudo) {
					throw `Node id '${node.id}' already exists`;
				}

				this.nodeReferences[node.id]._nodeRef = this._getNodeForNodeRef(node);
				this.nodeReferences[node.id]._textNodeRef = node;
				this.nodeReferences[node.id]._pseudo = false;
			} else {
				this.nodeReferences[node.id] = {
					_nodeRef: this._getNodeForNodeRef(node),
					_textNodeRef: node
				};
			}
		}

		if (node.pageReference) {
			if (!this.nodeReferences[node.pageReference]) {
				this.nodeReferences[node.pageReference] = {
					_nodeRef: {},
					_textNodeRef: {},
					_pseudo: true
				};
			}
			node.text = '00000';
			node._pageRef = this.nodeReferences[node.pageReference];
		}

		if (node.textReference) {
			if (!this.nodeReferences[node.textReference]) {
				this.nodeReferences[node.textReference] = { _nodeRef: {}, _pseudo: true };
			}

			node.text = '';
			node._textRef = this.nodeReferences[node.textReference];
		}

		if (node.text && node.text.text) {
			node.text = [this.preprocessNode(node.text)];
		} else if (isArray(node.text)) {
			var isSetParentNode = false;
			if (this.parentNode === null) {
				this.parentNode = node;
				isSetParentNode = true;
			}

			for (var i = 0, l = node.text.length; i < l; i++) {
				node.text[i] = this.preprocessNode(node.text[i]);
			}

			if (isSetParentNode) {
				this.parentNode = null;
			}
		}

		return node;
	}

	preprocessToc(node) {
		if (!node.toc.id) {
			node.toc.id = '_default_';
		}

		node.toc.title = node.toc.title ? this.preprocessNode(node.toc.title) : null;
		node.toc._items = [];

		if (this.tocs[node.toc.id]) {
			if (!this.tocs[node.toc.id].toc._pseudo) {
				throw `TOC '${node.toc.id}' already exists`;
			}

			node.toc._items = this.tocs[node.toc.id].toc._items;
		}

		this.tocs[node.toc.id] = node;

		return node;
	}

	preprocessImage(node) {
		if (!isUndefined(node.image.type) && !isUndefined(node.image.data) && (node.image.type === 'Buffer') && isArray(node.image.data)) {
			node.image = Buffer.from(node.image.data);
		}
		return node;
	}

	preprocessCanvas(node) {
		return node;
	}

	preprocessQr(node) {
		return node;
	}

	_getNodeForNodeRef(node) {
		if (this.parentNode) {
			return this.parentNode;
		}

		return node;
	}
}

export default DocPreprocessor;
