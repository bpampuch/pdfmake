/**
 * @param {array} target
 * @param {array} otherArray
 */
export function addAll(target, otherArray) {
	otherArray.forEach(function (item) {
		target.push(item);
	});
}
