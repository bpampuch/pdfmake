/* jslint node: true */
'use strict';

function pack() {
	var result = {};

	for (var i = 0, l = arguments.length; i < l; i++) {
		var obj = arguments[i];

		if (obj) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					result[key] = obj[key];
				}
			}
		}
	}

	return result;
}

function offsetVector(vector, x, y) {
	switch (vector.type) {
		case 'ellipse':
		case 'rect':
			vector.x += x;
			vector.y += y;
			break;
		case 'line':
			vector.x1 += x;
			vector.x2 += x;
			vector.y1 += y;
			vector.y2 += y;
			break;
		case 'polyline':
			for (var i = 0, l = vector.points.length; i < l; i++) {
				vector.points[i].x += x;
				vector.points[i].y += y;
			}
			break;
	}
}

function fontStringify(key, val) {
	if (key === 'font') {
		return 'font';
	}
	return val;
}

function isFunction(functionToCheck) {
	var getType = {};
	return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}


module.exports = {
	pack: pack,
	fontStringify: fontStringify,
	offsetVector: offsetVector,
	isFunction: isFunction
};
