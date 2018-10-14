import { processAllExtenstionsByCondition, processFirstExtenstionsByCondition } from './helpers/extensionsRunner';
import TextInlines from './textInlines';
import StyleContextStack from './styleContextStack';

class DocMeasurer {

	constructor(fontProvider, styleDictionary, defaultStyle) {
		this.nodeTypes = [];
		this.properties = [];

		this.textInlines = new TextInlines(fontProvider);
		this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);
	}

	registerNodeType(condition, callback) {
		this.nodeTypes.push({
			condition: condition,
			callback: callback
		});
	}

	registerProperty(condition, callback) {
		this.properties.push({
			condition: condition,
			callback: callback
		});
	}

	measureDocument(docStructure) {
		return this.measureNode(docStructure);
	}

	measureNode(node) {
		node = processFirstExtenstionsByCondition(this.nodeTypes, node);
		node = processAllExtenstionsByCondition(this.properties, node);

		return node;
	}

}

export default DocMeasurer;
