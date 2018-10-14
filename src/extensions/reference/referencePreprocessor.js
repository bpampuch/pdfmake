/**
 * @mixin
 */
const ReferencePreprocessor = Base => class extends Base {

	constructor(...args) {
		super(...args);

		this.registerProperty(
			node => 'id' in node,
			node => this.preprocessReferenceId(node)
		);

		this.registerNodeType(
			node => 'pageReference' in node,
			node => this.preprocessPageReference(node)
		);

		this.registerNodeType(
			node => 'textReference' in node,
			node => this.preprocessTextReference(node)
		);

		this.nodeReferences = [];
	}

	preprocessReferenceId(node) {
		if (this.nodeReferences[node.id]) {
			if (!this.nodeReferences[node.id]._pseudo) {
				throw `Node id '${node.id}' already exists`;
			}

			this.nodeReferences[node.id]._nodeRef = this._getTextNodeForNodeRef(node);
			this.nodeReferences[node.id]._textNodeRef = node;
			this.nodeReferences[node.id]._pseudo = false;
		} else {
			this.nodeReferences[node.id] = {
				_nodeRef: this._getTextNodeForNodeRef(node),
				_textNodeRef: node
			};
		}

		return node;
	}

	preprocessPageReference(node) {
		if (!this.nodeReferences[node.pageReference]) {
			this.nodeReferences[node.pageReference] = {
				_nodeRef: {},
				_textNodeRef: {},
				_pseudo: true
			};
		}
		node.text = '00000'; // convert to text node
		node._pageRef = this.nodeReferences[node.pageReference];

		return node;
	}

	preprocessTextReference(node) {
		if (!this.nodeReferences[node.textReference]) {
			this.nodeReferences[node.textReference] = { _nodeRef: {}, _pseudo: true };
		}

		node.text = ''; // convert to text node
		node._textRef = this.nodeReferences[node.textReference];

		return node;
	}

	_getTextNodeForNodeRef(node) {
		if (this.parentTextNode) {
			return this.parentTextNode;
		}

		return node;
	}

};

export default ReferencePreprocessor;
