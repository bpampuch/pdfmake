import { isString, isNumber, isValue, isEmptyObject } from './helpers/variableType';
import { stringifyNode } from './helpers/node';

const convertValueToString = value => {
	if (isString(value)) {
		return value.replace(/\t/g, '    '); // expand tab as spaces
	} else if (isNumber(value) || typeof value === 'boolean') {
		return value.toString();
	} else if (!isValue(value) || isEmptyObject(value)) {
		return '';
	}

	// TODO: throw exception ?

	return value;
};

class DocPreprocessor {
	preprocessDocument(docStructure) {
		this.documentRoot = docStructure;
		this.parentNode = null;
		this.tocs = [];
		this.nodeReferences = [];
		return this.preprocessNode(docStructure, true);
	}

	preprocessBlock(node) {
		this.documentRoot = node;
		this.parentNode = null;
		this.tocs = [];
		this.nodeReferences = [];
		return this.preprocessNode(node);
	}

	preprocessNode(node, isSectionAllowed = false) {
		return this.preprocessNodeAt(node, isSectionAllowed, this.currentPath || 'content');
	}

	preprocessNodeAt(node, isSectionAllowed, path) {
		const previousPath = this.currentPath;
		this.currentPath = path;
		try {
			return this.preprocessNodeInternal(node, isSectionAllowed);
		} catch (caught) {
			const error = caught instanceof Error ? caught : new Error(String(caught));
			if (!error.path) {
				error.path = path;
				error.code = 'PDFMAKE_INVALID_DOCUMENT';
				error.phase = 'preprocess';
				error.message += `\nDocument path: ${path}`;
			}
			throw error;
		} finally {
			this.currentPath = previousPath;
		}
	}

	preprocessNodeInternal(node, isSectionAllowed = false) {
		// expand shortcuts and casting values
		if (Array.isArray(node)) {
			node = { stack: node };
		} else if (isString(node) || isNumber(node) || typeof node === 'boolean' || !isValue(node) || isEmptyObject(node)) { // text node defined as value
			node = { text: convertValueToString(node) };
		} else if ('text' in node) { // cast value in text property
			node.text = convertValueToString(node.text);
		}

		if (node.section) {
			if (!isSectionAllowed) {
				throw new Error(`Incorrect document structure, section node is only allowed at the root level of document structure: ${stringifyNode(node)}`);
			}

			return this.preprocessSection(node);
		} else if (node.columns) {
			return this.preprocessColumns(node);
		} else if (node.stack) {
			return this.preprocessVerticalContainer(node, isSectionAllowed);
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
		} else if (node.svg) {
			return this.preprocessSVG(node);
		} else if (node.canvas) {
			return this.preprocessCanvas(node);
		} else if (node.qr) {
			return this.preprocessQr(node);
		} else if (node.attachment) {
			return this.preprocessAttachment(node);
		} else if (node.pageReference || node.textReference) {
			return this.preprocessText(node);
		} else {
			throw new Error(`Unrecognized document structure: ${stringifyNode(node)}`);
		}
	}

	preprocessSection(node) {
		node.section = this.preprocessNodeAt(node.section, false, `${this.currentPath}.section`);

		return node;
	}

	preprocessColumns(node) {
		let columns = node.columns;
		if (!Array.isArray(columns)) throw new Error('columns must be an array of content nodes.');

		for (let i = 0, l = columns.length; i < l; i++) {
			columns[i] = this.preprocessNodeAt(columns[i], false, `${this.currentPath}.columns[${i}]`);
		}

		return node;
	}

	preprocessVerticalContainer(node, isSectionAllowed) {
		let items = node.stack;
		if (!Array.isArray(items)) throw new Error('stack must be an array of content nodes.');

		for (let i = 0, l = items.length; i < l; i++) {
			const path = this.currentPath || 'content';
			items[i] = this.preprocessNodeAt(items[i], isSectionAllowed, path === 'content' && Array.isArray(this.documentRoot) ? `${path}[${i}]` : `${path}.stack[${i}]`);
		}

		return node;
	}

	preprocessList(node) {
		let items = node.ul || node.ol;
		if (!Array.isArray(items)) throw new Error('List items must be an array.');

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.preprocessNodeAt(items[i], false, `${this.currentPath}.${node.ul ? 'ul' : 'ol'}[${i}]`);
		}

		return node;
	}

	preprocessTable(node) {
		if (!node.table || !Array.isArray(node.table.body) || !node.table.body.length || !Array.isArray(node.table.body[0]) || !node.table.body[0].length) {
			throw new Error('table.body must be a non-empty array of non-empty row arrays.');
		}
		const columnCount = node.table.body[0].length;
		for (let rowIndex = 0; rowIndex < node.table.body.length; rowIndex++) {
			const data = node.table.body[rowIndex];
			if (!Array.isArray(data) || data.length !== columnCount) {
				const error = new Error(`Malformed table row: expected ${columnCount} cells, including placeholders for spans.`);
				error.path = `${this.currentPath}.table.body[${rowIndex}]`;
				error.code = 'PDFMAKE_INVALID_DOCUMENT';
				error.phase = 'preprocess';
				error.message += `\nDocument path: ${error.path}`;
				throw error;
			}
		}
		let col;
		let row;
		let cols;
		let rows;

		for (col = 0, cols = node.table.body[0].length; col < cols; col++) {
			for (row = 0, rows = node.table.body.length; row < rows; row++) {
				let rowData = node.table.body[row];
				let data = rowData[col];
				if (data === undefined) {
					const error = new Error('Malformed table row: a cell is undefined. Use an empty string or an empty object for a blank cell.');
					error.path = `${this.currentPath}.table.body[${row}][${col}]`;
					error.code = 'PDFMAKE_INVALID_DOCUMENT';
					error.phase = 'preprocess';
					error.message += `\nDocument path: ${error.path}`;
					throw error;
				}
				if (data !== undefined) {
					if (data === null) { // transform to object
						data = '';
					}
					if (!data._span) {
						rowData[col] = this.preprocessNodeAt(data, false, `${this.currentPath}.table.body[${row}][${col}]`);
					}
				}
			}
		}

		return node;
	}

	preprocessText(node) {
		if (node.tocItem) {
			if (!Array.isArray(node.tocItem)) {
				node.tocItem = [node.tocItem];
			}

			for (let i = 0, l = node.tocItem.length; i < l; i++) {
				if (!isString(node.tocItem[i])) {
					node.tocItem[i] = '_default_';
				}

				let tocItemId = node.tocItem[i];

				if (!this.tocs[tocItemId]) {
					this.tocs[tocItemId] = { toc: { _items: [], _pseudo: true } };
				}

				if (!node.id) {
					node.id = `toc-${tocItemId}-${this.tocs[tocItemId].toc._items.length}`;
				}

				let tocItemRef = {
					_nodeRef: this._getNodeForNodeRef(node),
					_textNodeRef: node
				};
				this.tocs[tocItemId].toc._items.push(tocItemRef);
			}
		}

		if (node.id) {
			if (this.nodeReferences[node.id]) {
				if (!this.nodeReferences[node.id]._pseudo) {
					throw new Error(`Node id '${node.id}' already exists`);
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
			node.linkToDestination = node.pageReference;
			node._pageRef = this.nodeReferences[node.pageReference];
		}

		if (node.textReference) {
			if (!this.nodeReferences[node.textReference]) {
				this.nodeReferences[node.textReference] = { _nodeRef: {}, _pseudo: true };
			}

			node.text = '';
			node.linkToDestination = node.textReference;
			node._textRef = this.nodeReferences[node.textReference];
		}

		if (node.text && node.text.text) {
			node.text = [this.preprocessNodeAt(node.text, false, `${this.currentPath}.text`)];
		} else if (Array.isArray(node.text)) {
			let isSetParentNode = false;
			if (this.parentNode === null) {
				this.parentNode = node;
				isSetParentNode = true;
			}

			for (let i = 0, l = node.text.length; i < l; i++) {
				node.text[i] = this.preprocessNodeAt(node.text[i], false, `${this.currentPath}.text[${i}]`);
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
				throw new Error(`TOC '${node.toc.id}' already exists`);
			}

			node.toc._items = this.tocs[node.toc.id].toc._items;
		}

		this.tocs[node.toc.id] = node;

		return node;
	}

	preprocessImage(node) {
		if ((node.image.type !== undefined) && (node.image.data !== undefined) && (node.image.type === 'Buffer') && Array.isArray(node.image.data)) {
			node.image = Buffer.from(node.image.data);
		}
		return node;
	}

	preprocessCanvas(node) {
		return node;
	}

	preprocessSVG(node) {
		return node;
	}

	preprocessQr(node) {
		return node;
	}

	preprocessAttachment(node) {
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
