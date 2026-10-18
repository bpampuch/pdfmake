const assert = require('assert');
const { pack, offsetVector, convertToDynamicContent } = require('../../../js/helpers/tools');

describe('helpers/tools', function () {
	describe('pack', function () {
		it('should return an empty object when no objects are supplied', function () {
			assert.deepStrictEqual(pack(), {});
		});

		it('should merge own properties in order without mutating the inputs', function () {
			var first = { color: 'red', fontSize: 12 };
			var second = { color: 'blue', bold: false };
			assert.deepStrictEqual(pack(first, null, undefined, second), { color: 'blue', fontSize: 12, bold: false });
			assert.deepStrictEqual(first, { color: 'red', fontSize: 12 });
			assert.deepStrictEqual(second, { color: 'blue', bold: false });
		});

		it('should ignore inherited properties', function () {
			var source = Object.assign(Object.create({ inherited: true }), { own: 1 });
			assert.deepStrictEqual(pack(source), { own: 1 });
		});

		it('should replace nested objects rather than merge them', function () {
			var nested = { top: 5 };
			var result = pack({ margin: { left: 10 } }, { margin: nested });
			assert.strictEqual(result.margin, nested);
			assert.deepStrictEqual(result.margin, { top: 5 });
		});
	});

	describe('offsetVector', function () {
		['rect', 'ellipse'].forEach(function (type) {
			it('should translate a ' + type + ' without changing its dimensions or styling', function () {
				var vector = { type: type, x: 5, y: 10, w: 30, h: 40, r1: 15, r2: 20, color: 'red' };
				offsetVector(vector, -3, 7);
				assert.deepStrictEqual(vector, { type: type, x: 2, y: 17, w: 30, h: 40, r1: 15, r2: 20, color: 'red' });
			});
		});

		it('should translate both endpoints of a line', function () {
			var vector = { type: 'line', x1: 1, y1: 2, x2: 10, y2: 20, lineWidth: 2 };
			offsetVector(vector, 5, -3);
			assert.deepStrictEqual(vector, { type: 'line', x1: 6, y1: -1, x2: 15, y2: 17, lineWidth: 2 });
		});

		it('should translate every polyline point and preserve the closed path', function () {
			var vector = { type: 'polyline', points: [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 0 }], closePath: true };
			offsetVector(vector, 5, -3);
			assert.deepStrictEqual(vector.points, [{ x: 5, y: -3 }, { x: 15, y: 17 }, { x: 5, y: -3 }]);
			assert.equal(vector.closePath, true);
		});

		it('should accept empty polylines', function () {
			var vector = { type: 'polyline', points: [] };
			offsetVector(vector, 5, 10);
			assert.deepStrictEqual(vector.points, []);
		});
	});

	describe('convertToDynamicContent', function () {
		it('should create independent deep copies for every invocation', function () {
			var content = { stack: [{ text: 'header', margin: [1, 2, 3, 4] }] };
			var dynamic = convertToDynamicContent(content);
			var first = dynamic();
			assert.deepStrictEqual(first, content);
			first.stack[0].text = 'changed';
			first.stack[0].margin[0] = 99;
			first.stack.push({ text: 'extra' });
			var second = dynamic();
			assert.deepStrictEqual(second, { stack: [{ text: 'header', margin: [1, 2, 3, 4] }] });
			assert.deepStrictEqual(content, second);
			assert.notStrictEqual(second.stack[0], content.stack[0]);
		});

		it('should preserve string and array content', function () {
			assert.equal(convertToDynamicContent('footer')(), 'footer');
			assert.deepStrictEqual(convertToDynamicContent([{ text: 'footer' }])(), [{ text: 'footer' }]);
		});
	});
});
