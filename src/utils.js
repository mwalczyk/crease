/**
 * Remove multiple items from an array simultaneously, for example:
 *
 *		let values = ['v1', 'v2', 'v3', 'v4', 'v5'];
 *		let removeIndices = [0, 2, 4];
 *
 * This would result in `values` becoming: ['v2', 'v4']
 * @param {*[]} array - an array of items to be deleted
 * @param {number[]} indices - an array containing all of the indices of the items that should be removed
 * @return {*[]} - the modified array
 */
export function removeValuesAtIndices(array, indices) {
	return array.filter((value, index) => {
		return indices.indexOf(index) == -1;
	});
}