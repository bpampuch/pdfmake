import {isString, isNumber, isBoolean, isArray, isUndefined, fontStringify} from './helpers';

class DocPreprocessor {
	preprocessDocument(docStructure) {
		this.parentNode = null;
		this.tocs = [];
		this.nodeReferences = [];
		return this.preprocessNode(docStructure);
	}

	preprocessNode(node) {
		if (node.columns) {
			return this.preprocessColumns(node);
//		} else if (node.stack) {
//			return this.preprocessVerticalContainer(node);
		} else if (node.ul) {
			return this.preprocessList(node);
		} else if (node.ol) {
			return this.preprocessList(node);
		} else if (node.table) {
			return this.preprocessTable(node);
//		} else if (node.text !== undefined) {
//			return this.preprocessText(node);
		} else if (node.toc) {
			return this.preprocessToc(node);
//		} else if (node.image) {
//			return this.preprocessImage(node);
//		} else if (node.canvas) {
//			return this.preprocessCanvas(node);
		} else if (node.qr) {
			return this.preprocessQr(node);
//		} else if (node.pageReference || node.textReference) {
//			return this.preprocessText(node);
		} else {
			throw `Unrecognized document structure: ${JSON.stringify(node, fontStringify)}`;
		}
	}

	preprocessColumns(node) {
		let columns = node.columns;

		for (let i = 0, l = columns.length; i < l; i++) {
			columns[i] = this.preprocessNode(columns[i]);
		}

		return node;
	}

	preprocessList(node) {
		let items = node.ul || node.ol;

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.preprocessNode(items[i]);
		}

		return node;
	}

	preprocessTable(node) {
		let col;
		let row;
		let cols;
		let rows;

		for (col = 0, cols = node.table.body[0].length; col < cols; col++) {
			for (row = 0, rows = node.table.body.length; row < rows; row++) {
				let rowData = node.table.body[row];
				let data = rowData[col];
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

			for (let i = 0, l = node.tocItem.length; i < l; i++) {
				if (!isString(node.tocItem[i])) {
					node.tocItem[i] = '_default_';
				}

				let tocItemId = node.tocItem[i];

				if (!this.tocs[tocItemId]) {
					this.tocs[tocItemId] = {toc: {_items: [], _pseudo: true}};
				}

				let tocItemRef = {
					_nodeRef: this._getNodeForNodeRef(node),
					_textNodeRef: node
				};
				this.tocs[tocItemId].toc._items.push(tocItemRef);
			}
		}
		// ...
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

	preprocessQr(node) {
		return node;
	}

}

export default DocPreprocessor;
