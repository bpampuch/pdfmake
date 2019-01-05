const assert = require('assert');

const { stringifyNode } = require('../../../js/helpers/node');

describe('helpers/node', function () {

	describe('stringifyNode', function () {
		it('should be correctly stringify node', function () {
			var node = { text: 'Text', font: 'XXX', fontSize: 12 };

			var result = stringifyNode(node);
			assert.equal(result, '{"text":"Text","font":"font","fontSize":12}');
		});
	});

});
