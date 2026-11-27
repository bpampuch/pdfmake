/**
 * Builds the structure tree of a tagged PDF (docDefinition.tagged: true).
 *
 * pdfkit has the structure API (struct, markStructureContent, addStructure),
 * but without it a "tagged" document only has an empty tree. The renderer
 * calls begin / end around each drawn item:
 * - a text line belongs to the structure element of its node (node.role,
 *   'P' by default; consecutive lines of one node share one element),
 * - an image or SVG is a 'Figure' with the node's alt text (node.alt),
 * - vectors (rules, borders, backgrounds) and watermarks are artifacts,
 * - role: 'Artifact' marks any node as decoration (e.g. headers, footers).
 * Nothing is done when the document is not tagged.
 */
class StructureTagger {
	constructor(pdfDocument) {
		this.pdfDocument = pdfDocument;
		this.enabled = !!(pdfDocument && pdfDocument.options && pdfDocument.options.tagged === true);
		this.root = null;
		this.current = null;
		this.currentNode = null;
	}

	ensureRoot() {
		if (!this.root) {
			this.root = this.pdfDocument.struct('Document');
			this.pdfDocument.addStructure(this.root);
		}
		return this.root;
	}

	/**
	 * Starts marked content for one drawn item.
	 *
	 * @param {string} role structure type (H1, P, Figure, ...) or 'Artifact'
	 * @param {object} [node] the source node: lines of the same node share one element
	 * @param {string} [alt] alternate text of a figure
	 * @returns {boolean} whether end() must be called
	 */
	begin(role, node, alt) {
		if (!this.enabled) {
			return false;
		}
		if (!role || role === 'Artifact') {
			this.pdfDocument.markContent('Artifact');
			return true;
		}
		let root = this.ensureRoot();
		if (!this.current || !node || node !== this.currentNode) {
			this.closeCurrent();
			this.current = this.pdfDocument.struct(role, alt ? { alt: String(alt) } : {});
			root.add(this.current);
			this.currentNode = node || null;
		}
		this.current.add(this.pdfDocument.markStructureContent(role));
		return true;
	}

	end(started) {
		if (started) {
			this.pdfDocument.endMarkedContent();
		}
	}

	/**
	 * A Link structure element for a link annotation, inside the current element.
	 *
	 * @param {object} options annotation options; gets structParent and Contents
	 * @returns {object|null} the element, to end() after the annotation is written
	 */
	link(options) {
		if (!this.enabled || !options || options.Subtype !== 'Link' || options.structParent) {
			return null;
		}
		let element = this.pdfDocument.struct('Link');
		(this.current || this.ensureRoot()).add(element);
		options.structParent = element;
		if (options.Contents === undefined) {
			let uri = options.A && options.A.data && options.A.data.URI;
			options.Contents = new String(uri ? String(uri) : 'Link to another page');
		}
		return element;
	}

	closeCurrent() {
		if (this.current) {
			this.current.end();
			this.current = null;
			this.currentNode = null;
		}
	}

	finish() {
		if (!this.enabled) {
			return;
		}
		this.closeCurrent();
		if (this.root) {
			this.root.end();
		}
	}
}

export default StructureTagger;
