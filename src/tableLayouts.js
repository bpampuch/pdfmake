/*eslint no-unused-vars: ["error", {"args": "none"}]*/

export {
	tableLayouts,
	defaultTableLayout
};

const tableLayouts = {
	noBorders: {
		hLineWidth(i) {
			return 0;
		},
		vLineWidth(i) {
			return 0;
		},
		paddingLeft(i) {
			return i && 4 || 0;
		},
		paddingRight(i, node) {
			return (i < node.table.widths.length - 1) ? 4 : 0;
		}
	},
	headerLineOnly: {
		hLineWidth(i, node) {
			if (i === 0 || i === node.table.body.length) {
				return 0;
			}
			return (i === node.table.headerRows) ? 2 : 0;
		},
		vLineWidth(i) {
			return 0;
		},
		paddingLeft(i) {
			return i === 0 ? 0 : 8;
		},
		paddingRight(i, node) {
			return (i === node.table.widths.length - 1) ? 0 : 8;
		}
	},
	lightHorizontalLines: {
		hLineWidth(i, node) {
			if (i === 0 || i === node.table.body.length) {
				return 0;
			}
			return (i === node.table.headerRows) ? 2 : 1;
		},
		vLineWidth(i) {
			return 0;
		},
		hLineColor(i) {
			return i === 1 ? 'black' : '#aaa';
		},
		paddingLeft(i) {
			return i === 0 ? 0 : 8;
		},
		paddingRight(i, node) {
			return (i === node.table.widths.length - 1) ? 0 : 8;
		}
	}
};

const defaultTableLayout = {
	hLineWidth(i, node) {
		return 1;
	},
	vLineWidth(i, node) {
		return 1;
	},
	hLineColor(i, node) {
		return 'black';
	},
	vLineColor(i, node) {
		return 'black';
	},
	hLineStyle(i, node) {
		return null;
	},
	vLineStyle(i, node) {
		return null;
	},
	paddingLeft(i, node) {
		return 4;
	},
	paddingRight(i, node) {
		return 4;
	},
	paddingTop(i, node) {
		return 2;
	},
	paddingBottom(i, node) {
		return 2;
	},
	fillColor(i, node) {
		return null;
	},
	fillOpacity(i, node) {
		return 1;
	},
	defaultBorder: true
};
