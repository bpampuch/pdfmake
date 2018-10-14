var assert = require('assert');
var fs = require('fs');

// TODO: refactor importing class with extended mixins
const mixin = require('../../../../js/helpers/mixin').default;
const DocNormalizer = require('../../../../js/docNormalizer').default;
const ContainerNormalizer = require('../../../../js/extensions/container/containerNormalizer').default;
const ImageNormalizer = require('../../../../js/extensions/image/imageNormalizer').default;

const DocNormalizerClass = mixin(DocNormalizer).with(ContainerNormalizer, ImageNormalizer);

describe('ImageNormalizer', function () {

	const normalizer = new DocNormalizerClass();

	it('should support image Buffer conversion in static document definition (eg. header, footer)', function () {
		var ddContentStatic = [
			{
				image: fs.readFileSync("tests/images/sampleImage.jpg")
			}
		];

		var ddContent = JSON.parse(JSON.stringify(ddContentStatic));

		var result = normalizer.normalizeNode(ddContent);

		assert.equal(result.stack[0].image instanceof Buffer, true);
	});

});
