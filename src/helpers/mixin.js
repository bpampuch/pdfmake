/**
 * Inspired by: http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/
 */

export default function (base) {
	return new MixinBuilder(base);
}

class MixinBuilder {

	constructor(base) {
		this.base = base || class { };
	}

	with(...mixins) {
		return mixins.reduce((c, m) => m(c), this.base);
	}
}
