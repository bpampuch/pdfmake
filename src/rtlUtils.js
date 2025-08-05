'use strict';

/**
 * RTL (Right-to-Left) utilities for handling Arabic, Persian (Farsi), and Urdu languages
 */

// Unicode ranges for Arabic script (includes Persian and Urdu characters)
var ARABIC_RANGE = [
	[0x0600, 0x06FF], // Arabic block
	[0x0750, 0x077F], // Arabic Supplement
	[0x08A0, 0x08FF], // Arabic Extended-A
	[0xFB50, 0xFDFF], // Arabic Presentation Forms-A
	[0xFE70, 0xFEFF]  // Arabic Presentation Forms-B
];

// Unicode ranges for Persian (Farsi) specific characters
var PERSIAN_RANGE = [
	[0x06A9, 0x06AF], // Persian Kaf, Gaf
	[0x06C0, 0x06C3], // Persian Heh, Teh Marbuta variants
	[0x06CC, 0x06CE], // Persian Yeh variants
	[0x06D0, 0x06D5], // Persian Yeh Barree, Arabic-Indic digits
	[0x200C, 0x200D]  // Zero Width Non-Joiner, Zero Width Joiner (used in Persian)
];

// Unicode ranges for Urdu specific characters
var URDU_RANGE = [
	[0x0679, 0x0679], // Urdu Tteh
	[0x067E, 0x067E], // Urdu Peh
	[0x0686, 0x0686], // Urdu Tcheh
	[0x0688, 0x0688], // Urdu Ddal
	[0x0691, 0x0691], // Urdu Rreh
	[0x0698, 0x0698], // Urdu Jeh
	[0x06A9, 0x06A9], // Urdu Keheh
	[0x06AF, 0x06AF], // Urdu Gaf
	[0x06BA, 0x06BA], // Urdu Noon Ghunna
	[0x06BE, 0x06BE], // Urdu Heh Doachashmee
	[0x06C1, 0x06C1], // Urdu Heh Goal
	[0x06D2, 0x06D2], // Urdu Yeh Barree
	[0x06D3, 0x06D3]  // Urdu Yeh Barree with Hamza
];

// Strong RTL characters (Arabic, Persian, Urdu)
var RTL_CHARS = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u200C-\u200D]/;

// Strong LTR characters (Latin, etc.)
var LTR_CHARS = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

/**
 * Check if a character is in Arabic script (includes Persian and Urdu)
 * @param {string} char - Single character to check
 * @return {boolean} - True if character is Arabic/Persian/Urdu
 */
function isArabicChar(char) {
	var code = char.charCodeAt(0);
	return ARABIC_RANGE.some(function(range) {
		return code >= range[0] && code <= range[1];
	});
}

/**
 * Check if a character is in Persian (Farsi) script
 * @param {string} char - Single character to check
 * @return {boolean} - True if character is Persian
 */
function isPersianChar(char) {
	var code = char.charCodeAt(0);
	return PERSIAN_RANGE.some(function(range) {
		return code >= range[0] && code <= range[1];
	}) || isArabicChar(char); // Persian uses Arabic base + extensions
}

/**
 * Check if a character is in Urdu script
 * @param {string} char - Single character to check
 * @return {boolean} - True if character is Urdu
 */
function isUrduChar(char) {
	var code = char.charCodeAt(0);
	return URDU_RANGE.some(function(range) {
		return code >= range[0] && code <= range[1];
	}) || isArabicChar(char); // Urdu uses Arabic base + extensions
}

/**
 * Check if a character requires RTL rendering
 * @param {string} char - Single character to check
 * @return {boolean} - True if character requires RTL
 */
function isRTLChar(char) {
	return RTL_CHARS.test(char);
}

/**
 * Check if a character is strongly LTR
 * @param {string} char - Single character to check
 * @return {boolean} - True if character is strongly LTR
 */
function isLTRChar(char) {
	return LTR_CHARS.test(char);
}

/**
 * Determine the predominant text direction of a string
 * @param {string} text - Text to analyze
 * @return {string} - 'rtl', 'ltr', or 'neutral'
 */
function getTextDirection(text) {
	if (!text || typeof text !== 'string') {
		return 'neutral';
	}

	var rtlCount = 0;
	var ltrCount = 0;

	for (var i = 0; i < text.length; i++) {
		var char = text.charAt(i);
		if (isRTLChar(char)) {
			rtlCount++;
		} else if (isLTRChar(char)) {
			ltrCount++;
		}
	}

	// If we have any strong directional characters
	if (rtlCount > 0 || ltrCount > 0) {
		if (rtlCount > ltrCount) {
			return 'rtl';
		} else if (ltrCount > rtlCount) {
			return 'ltr';
		} else {
			// Equal counts - slight preference for RTL if both exist
			return rtlCount > 0 ? 'rtl' : 'ltr';
		}
	}

	return 'neutral';
}

/**
 * Check if text contains any RTL characters
 * @param {string} text - Text to check
 * @return {boolean} - True if text contains RTL characters
 */
function containsRTL(text) {
	if (!text || typeof text !== 'string') {
		return false;
	}
	return RTL_CHARS.test(text);
}

/**
 * Check if text is primarily Arabic, Persian, or Urdu
 * @param {string} text - Text to check
 * @return {boolean} - True if text is primarily Arabic/Persian/Urdu
 */
function isArabicText(text) {
	if (!text || typeof text !== 'string') {
		return false;
	}

	var rtlCount = 0;
	var totalStrongChars = 0;

	for (var i = 0; i < text.length; i++) {
		var char = text.charAt(i);
		if (isArabicChar(char) || isPersianChar(char) || isUrduChar(char)) {
			rtlCount++;
			totalStrongChars++;
		} else if (isRTLChar(char) || isLTRChar(char)) {
			totalStrongChars++;
		}
	}

	// If we have any strong characters and RTL represents at least 30% 
	// (lowered threshold for mixed text)
	return totalStrongChars > 0 && (rtlCount / totalStrongChars) >= 0.3;
}

/**
 * Process RTL text for proper display
 * For modern PDF libraries, we rely on the underlying engine for BiDi processing
 * We should NOT reverse word order manually - that breaks Arabic text
 * @param {string} text - Text to process
 * @return {string} - Text (unchanged for proper BiDi handling)
 */
function reverseRTLText(text) {
	if (!text || typeof text !== 'string') {
		return text;
	}

	// DO NOT reverse Arabic text word order!
	// Arabic text should maintain its natural word order
	// Only the display direction (alignment) should be RTL
	// The PDF engine handles proper BiDi rendering
	return text;
}

/**
 * Apply RTL processing to text if needed
 * @param {string} text - Original text
 * @param {string} direction - Explicit direction override ('rtl', 'ltr', or null)
 * @return {Object} - { text: processedText, isRTL: boolean }
 */
function processRTLText(text, direction) {
	if (!text || typeof text !== 'string' || getTextDirection(text) !== 'rtl') {
		return { text: text, isRTL: false };
	}

	var isRTL = false;

	if (direction === 'rtl') {
		isRTL = true;
	} else if (direction === 'ltr') {
		isRTL = false;
	} else {
		// Auto-detect direction
		var textDir = getTextDirection(text);
		isRTL = textDir === 'rtl';
	}

	// Keep original text - no word reversal needed
	// The PDF engine handles proper BiDi rendering
	return {
		text: text,
		isRTL: isRTL
	};
}

/**
 * Reverse table row cells for RTL layout
 * @param {Array} row - Table row array
 * @return {Array} - Reversed row array
 */
function reverseTableRow(row) {
	if (!Array.isArray(row)) {
		return row;
	}
	return row.slice().reverse();
}

/**
 * Process table for RTL layout if supportRTL is enabled
 * @param {Object} tableNode - Table definition object
 * @return {Object} - Processed table node
 */
function processRTLTable(tableNode) {
	if (!tableNode || !tableNode.supportRTL || !tableNode.table || !tableNode.table.body) {
		return tableNode;
	}

	// Don't clone the entire object - just modify the table data in place
	// Reverse each row in the table body for RTL layout
	tableNode.table.body = tableNode.table.body.map(function(row) {
		return reverseTableRow(row);
	});

	// Also reverse the widths array if it exists
	if (tableNode.table.widths && Array.isArray(tableNode.table.widths)) {
		tableNode.table.widths = tableNode.table.widths.slice().reverse();
	}

	return tableNode;
}

/**
 * Apply automatic RTL detection and formatting to any text element
 * @param {Object|string} element - Text element or string
 * @return {Object} - Enhanced element with RTL properties
 */
function autoApplyRTL(element) {
	if (!element) return element;

	// Handle string elements
	if (typeof element === 'string') {
		var direction = getTextDirection(element);
		if (direction === 'rtl') {
			return {
				text: element,
				alignment: 'right',
				font: 'Nillima' // Use Arabic font for RTL text
			};
		}
		return element;
	}

	// Handle object elements
	if (typeof element === 'object' && element.text) {
		var textDirection = getTextDirection(element.text);
		
		if (textDirection === 'rtl') {
			// Auto-apply RTL properties if not already set
			if (!element.alignment) {
				element.alignment = 'right';
			}
			if (!element.font && isArabicText(element.text)) {
				element.font = 'Nillima';
			}
		} else if (textDirection === 'ltr') {
			// Auto-apply LTR properties if not already set
			if (!element.alignment) {
				element.alignment = 'left';
			}
			if (!element.font) {
				element.font = 'Roboto';
			}
		}
	}

	return element;
}

/**
 * Process list items for RTL support including bullet positioning
 * @param {Array|Object} listItems - ul/ol content
 * @return {Array|Object} - Processed list with RTL support
 */
function processRTLList(listItems) {
	if (!listItems) return listItems;

	function processListItem(item) {
		if (typeof item === 'string') {
			var direction = getTextDirection(item);
			if (direction === 'rtl') {
				return {
					text: item,
					alignment: 'right',
					font: 'Nillima',
					markerColor: '#2c5282'
				};
			}
			return item;
		}

		if (typeof item === 'object') {
			// Process the main text
			if (item.text) {
				var textDirection = getTextDirection(item.text);
				if (textDirection === 'rtl') {
					if (!item.alignment) item.alignment = 'right';
					if (!item.font && isArabicText(item.text)) item.font = 'Nillima';
					if (!item.markerColor) item.markerColor = '#2c5282';
				}
			}

			// Process nested ul/ol recursively
			if (item.ul) {
				item.ul = processRTLList(item.ul);
			}
			if (item.ol) {
				item.ol = processRTLList(item.ol);
			}
		}

		return item;
	}

	if (Array.isArray(listItems)) {
		return listItems.map(processListItem);
	}

	return processListItem(listItems);
}

/**
 * Process table for automatic RTL detection and layout
 * @param {Object} tableNode - Table definition object
 * @return {Object} - Processed table node
 */
function processAutoRTLTable(tableNode) {
	if (!tableNode || !tableNode.table || !tableNode.table.body) {
		return tableNode;
	}

	// Check if table contains RTL content
	var hasRTLContent = false;
	var rtlCellCount = 0;
	var totalCells = 0;

	tableNode.table.body.forEach(function(row) {
		if (Array.isArray(row)) {
			row.forEach(function(cell) {
				totalCells++;
				var cellText = typeof cell === 'string' ? cell : (cell && cell.text ? cell.text : '');
				if (containsRTL(cellText)) {
					rtlCellCount++;
				}
			});
		}
	});

	// If more than 30% of cells contain RTL content, treat as RTL table
	hasRTLContent = totalCells > 0 && (rtlCellCount / totalCells) >= 0.3;

	if (hasRTLContent) {
		// Reverse table columns for RTL layout
		tableNode.table.body = tableNode.table.body.map(function(row) {
			return reverseTableRow(row);
		});

		// Reverse widths if defined
		if (tableNode.table.widths && Array.isArray(tableNode.table.widths)) {
			tableNode.table.widths = tableNode.table.widths.slice().reverse();
		}

		// Auto-apply RTL styles to cells
		tableNode.table.body = tableNode.table.body.map(function(row) {
			if (Array.isArray(row)) {
				return row.map(function(cell) {
					return autoApplyRTL(cell);
				});
			}
			return row;
		});
	} else {
		// For non-RTL tables, still auto-apply font and alignment per cell
		tableNode.table.body = tableNode.table.body.map(function(row) {
			if (Array.isArray(row)) {
				return row.map(function(cell) {
					return autoApplyRTL(cell);
				});
			}
			return row;
		});
	}

	return tableNode;
}

/**
 * Process any document element for automatic RTL detection
 * @param {Object|Array|string} element - Document element
 * @return {Object|Array|string} - Processed element
 */
function processAutoRTLElement(element) {
	if (!element) return element;

	// Handle arrays (like content arrays)
	if (Array.isArray(element)) {
		return element.map(processAutoRTLElement);
	}

	// Handle text elements
	if (typeof element === 'string' || (element && element.text)) {
		element = autoApplyRTL(element);
	}

	// Handle tables
	if (element && element.table) {
		element = processAutoRTLTable(element);
	}

	// Handle lists
	if (element && element.ul) {
		element.ul = processRTLList(element.ul);
	}
	if (element && element.ol) {
		element.ol = processRTLList(element.ol);
	}

	// Handle columns
	if (element && element.columns && Array.isArray(element.columns)) {
		element.columns = element.columns.map(processAutoRTLElement);
	}

	return element;
}

module.exports = {
	isArabicChar: isArabicChar,
	isPersianChar: isPersianChar,
	isUrduChar: isUrduChar,
	isRTLChar: isRTLChar,
	isLTRChar: isLTRChar,
	getTextDirection: getTextDirection,
	containsRTL: containsRTL,
	isArabicText: isArabicText,
	reverseRTLText: reverseRTLText,
	processRTLText: processRTLText,
	reverseTableRow: reverseTableRow,
	processRTLTable: processRTLTable,
	autoApplyRTL: autoApplyRTL,
	processRTLList: processRTLList,
	processAutoRTLTable: processAutoRTLTable,
	processAutoRTLElement: processAutoRTLElement
};
