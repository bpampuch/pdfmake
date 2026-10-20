/**
 * Minimal Unicode Bidirectional Algorithm (UAX #9) implementation.
 *
 * Scope: enough of UAX #9 to correctly render mixed Hebrew/Arabic/Latin
 * paragraphs. Implemented rules:
 *   - Paragraph direction (P2/P3) - auto-detect or explicit
 *   - Character bidi class assignment (subset of Unicode classes)
 *   - W1..W7 - weak type resolution
 *   - N0 (basic), N1, N2 - neutral resolution
 *   - I1, I2 - implicit levels
 *   - L1, L2 - reordering
 *
 * Not implemented:
 *   - Explicit embedding controls (LRE/RLE/PDF, LRI/RLI/FSI/PDI). Most
 *     real-world content uses implicit ordering only; embeds can be added
 *     later if needed.
 *   - Arabic letter shaping (joining/contextual forms). Hebrew has no
 *     shaping requirements; Arabic shaping requires a separate pass and
 *     a font with the relevant OpenType lookups.
 *
 * The algorithm is good enough for Hebrew + Latin + digits and basic
 * Arabic letter ordering. For pure Hebrew this matches the reference
 * implementation; the omitted Arabic shaping shows up only as
 * isolated-form glyphs.
 */

// Bidi classes used by the resolution rules below.
// Strong: L (Left-to-Right), R (Right-to-Left), AL (Arabic Letter)
// Weak:   EN, ES, ET, AN, CS, NSM, BN
// Neutral:B (paragraph break), S (segment), WS (whitespace), ON (other neutral)

/**
 * @param {number} cp
 * @returns {string}
 */
const bidiTypeOf = (cp) => {
	// Quick ASCII fast-path
	if (cp < 0x80) {
		if (cp === 0x0A || cp === 0x0D || cp === 0x1C || cp === 0x1D || cp === 0x1E) return 'B';
		if (cp === 0x09 || cp === 0x0B) return 'S';
		if (cp === 0x0C || cp === 0x20) return 'WS';
		if (cp >= 0x30 && cp <= 0x39) return 'EN';
		if (cp === 0x2B || cp === 0x2D) return 'ES';
		if (cp === 0x23 || cp === 0x24 || cp === 0x25 || cp === 0x2A || cp === 0x2F) return 'ET';
		if (cp === 0x2C || cp === 0x2E || cp === 0x3A) return 'CS';
		if ((cp >= 0x41 && cp <= 0x5A) || (cp >= 0x61 && cp <= 0x7A)) return 'L';
		return 'ON';
	}

	// Hebrew block
	if (cp >= 0x0590 && cp <= 0x05FF) {
		// Combining marks 0x0591-0x05BD, 0x05BF, 0x05C1-0x05C2, 0x05C4-0x05C5, 0x05C7
		if ((cp >= 0x0591 && cp <= 0x05BD) || cp === 0x05BF || cp === 0x05C1 || cp === 0x05C2 || cp === 0x05C4 || cp === 0x05C5 || cp === 0x05C7) return 'NSM';
		return 'R';
	}

	// Arabic blocks (letters / supplements / extended-A / presentation forms)
	if (cp >= 0x0600 && cp <= 0x06FF) {
		// Common Arabic NSM combining marks
		if ((cp >= 0x0610 && cp <= 0x061A) ||
			(cp >= 0x064B && cp <= 0x065F) ||
			cp === 0x0670 ||
			(cp >= 0x06D6 && cp <= 0x06DC) ||
			(cp >= 0x06DF && cp <= 0x06E4) ||
			(cp >= 0x06E7 && cp <= 0x06E8) ||
			(cp >= 0x06EA && cp <= 0x06ED)) return 'NSM';
		// Arabic-Indic digits 0x0660-0x0669 and Extended Arabic-Indic 0x06F0-0x06F9
		if (cp >= 0x0660 && cp <= 0x0669) return 'AN';
		if (cp >= 0x06F0 && cp <= 0x06F9) return 'EN';
		// 0x0608, 0x060B, 0x060D, 0x061B, 0x061F and many letters → AL
		return 'AL';
	}
	if (cp >= 0x0700 && cp <= 0x074F) return 'AL'; // Syriac
	if (cp >= 0x0750 && cp <= 0x077F) return 'AL'; // Arabic Supplement
	if (cp >= 0x0780 && cp <= 0x07BF) return 'AL'; // Thaana
	if (cp >= 0x08A0 && cp <= 0x08FF) return 'AL'; // Arabic Extended-A
	if (cp >= 0xFB1D && cp <= 0xFB4F) return 'R'; // Hebrew presentation forms
	if (cp >= 0xFB50 && cp <= 0xFDFF) return 'AL'; // Arabic presentation forms-A
	if (cp >= 0xFE70 && cp <= 0xFEFF) return 'AL'; // Arabic presentation forms-B

	// Whitespace / common punctuation outside ASCII (best-effort)
	if (cp === 0x00A0 || cp === 0x2028 || cp === 0x2029 || (cp >= 0x2000 && cp <= 0x200A) || cp === 0x202F || cp === 0x205F || cp === 0x3000) return 'WS';

	// Currency symbols - classified as ET per UAX #9 so that adjacency to a
	// digit run (W5) folds them into the EN run. This makes a string like
	// "₪3.50" render as a single LTR group inside an RTL paragraph (the
	// currency sign visually to the left of the amount, the way Hebrew
	// readers expect prices to appear).
	if (cp === 0x00A2 || cp === 0x00A3 || cp === 0x00A4 || cp === 0x00A5 || (cp >= 0x20A0 && cp <= 0x20CF)) return 'ET';

	// Latin/Greek/Cyrillic/etc. - treat as L (best-effort default for letters)
	if ((cp >= 0x00C0 && cp <= 0x024F) || (cp >= 0x0370 && cp <= 0x03FF) || (cp >= 0x0400 && cp <= 0x04FF)) return 'L';

	return 'ON';
};

/**
 * Detects paragraph base direction per UAX #9 P2/P3:
 * use the first strong character (L → 0, R/AL → 1). Default 0 (LTR).
 *
 * @param {string} text
 * @returns {0|1}
 */
const detectBaseLevel = (text) => {
	for (let i = 0; i < text.length; i++) {
		const t = bidiTypeOf(text.charCodeAt(i));
		if (t === 'L') return 0;
		if (t === 'R' || t === 'AL') return 1;
	}
	return 0;
};

/**
 * Compute the resolved bidi level for each character in `text`, given a
 * paragraph base level (0 = LTR, 1 = RTL).
 *
 * @param {string} text
 * @param {0|1} baseLevel
 * @returns {{levels: Uint8Array, types: string[]}}
 */
const resolveLevels = (text, baseLevel) => {
	const len = text.length;
	const types = new Array(len);
	for (let i = 0; i < len; i++) {
		types[i] = bidiTypeOf(text.charCodeAt(i));
	}
	const origTypes = types.slice();

	// We process the entire string as one "level run" at base level
	// (no explicit embeds). Resolution rules W1..W7 / N1..N2 operate
	// inside this single isolating run sequence.

	const sor = (baseLevel & 1) ? 'R' : 'L';
	const eor = sor;

	// W1: NSM takes type of preceding char (or sor)
	let prev = sor;
	for (let i = 0; i < len; i++) {
		if (types[i] === 'NSM') {
			types[i] = prev;
		} else {
			prev = types[i];
		}
	}

	// W2: EN preceded by AL (looking past EN/AN/ET/CS/NSM/BN) becomes AN
	prev = sor;
	for (let i = 0; i < len; i++) {
		const t = types[i];
		if (t === 'L' || t === 'R' || t === 'AL') {
			prev = t;
		} else if (t === 'EN' && prev === 'AL') {
			types[i] = 'AN';
		}
	}

	// W3: AL → R
	for (let i = 0; i < len; i++) {
		if (types[i] === 'AL') types[i] = 'R';
	}

	// W4: a single ES/CS between two ENs becomes EN; a single CS between
	// two ANs becomes AN.
	for (let i = 1; i < len - 1; i++) {
		const t = types[i];
		if (t === 'ES' && types[i - 1] === 'EN' && types[i + 1] === 'EN') {
			types[i] = 'EN';
		} else if (t === 'CS') {
			if (types[i - 1] === 'EN' && types[i + 1] === 'EN') types[i] = 'EN';
			else if (types[i - 1] === 'AN' && types[i + 1] === 'AN') types[i] = 'AN';
		}
	}

	// W5: a sequence of ETs adjacent to an EN becomes EN
	for (let i = 0; i < len; i++) {
		if (types[i] === 'ET') {
			let j = i;
			while (j < len && types[j] === 'ET') j++;
			const before = i > 0 ? types[i - 1] : sor;
			const after = j < len ? types[j] : eor;
			if (before === 'EN' || after === 'EN') {
				for (let k = i; k < j; k++) types[k] = 'EN';
			}
			i = j - 1;
		}
	}

	// W6: remaining ES, ET, CS → ON
	for (let i = 0; i < len; i++) {
		const t = types[i];
		if (t === 'ES' || t === 'ET' || t === 'CS') types[i] = 'ON';
	}

	// W7: EN preceded by L (looking past EN/AN/ET/CS/NSM/BN - already resolved)
	// becomes L
	prev = sor;
	for (let i = 0; i < len; i++) {
		const t = types[i];
		if (t === 'L' || t === 'R') {
			prev = t;
		} else if (t === 'EN' && prev === 'L') {
			types[i] = 'L';
		}
	}

	// N0 (paired brackets) - skipped; falls through to N1/N2.

	// N1, N2: resolve neutrals (B, S, WS, ON). For Ni rules, EN/AN count as R.
	// Walk runs of neutrals, look at strong type on each side (with EN/AN counted
	// as R). If both sides agree, assign that. Otherwise use embedding direction.
	const isNeutral = (t) => t === 'B' || t === 'S' || t === 'WS' || t === 'ON';
	const strongOf = (t) => {
		if (t === 'L') return 'L';
		if (t === 'R' || t === 'EN' || t === 'AN') return 'R';
		return null;
	};
	for (let i = 0; i < len; i++) {
		if (isNeutral(types[i])) {
			let j = i;
			while (j < len && isNeutral(types[j])) j++;
			let left = sor;
			for (let k = i - 1; k >= 0; k--) {
				const s = strongOf(types[k]);
				if (s) { left = s; break; }
			}
			let right = eor;
			for (let k = j; k < len; k++) {
				const s = strongOf(types[k]);
				if (s) { right = s; break; }
			}
			let resolved;
			if (left === right) {
				resolved = left;
			} else {
				resolved = (baseLevel & 1) ? 'R' : 'L'; // N2 → embedding direction
			}
			for (let k = i; k < j; k++) types[k] = resolved;
			i = j - 1;
		}
	}

	// I1, I2: assign levels.
	const levels = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		const t = types[i];
		let level;
		if ((baseLevel & 1) === 0) {
			// even (LTR) base
			if (t === 'R') level = 1;
			else if (t === 'AN' || t === 'EN') level = 2;
			else level = 0;
		} else {
			// odd (RTL) base
			if (t === 'L' || t === 'AN' || t === 'EN') level = 2;
			else level = 1;
		}
		levels[i] = level;
	}

	// L1: trailing whitespace and segment/paragraph separators reset to base level.
	// Use the original (pre-resolution) types to detect WS/B/S, since W6/N rules
	// may have changed them.
	for (let i = len - 1; i >= 0; i--) {
		const origType = origTypes[i];
		if (origType === 'WS' || origType === 'B' || origType === 'S') {
			levels[i] = baseLevel;
		} else {
			break;
		}
	}
	// Also: any sequence of WS/B/S preceding a B/S (segment) - for our use we just
	// reset trailing WS, which is the common case in line-rendered text.

	return { levels, types };
};

/**
 * Apply rule L2: produce a visual-order mapping (visual index → logical index)
 * by reversing maximal runs of equal-or-greater levels, from highest level
 * down to lowest odd level.
 *
 * @param {Uint8Array} levels
 * @returns {number[]} mapping[visualIndex] = logicalIndex
 */
const visualOrder = (levels) => {
	const len = levels.length;
	const order = new Array(len);
	for (let i = 0; i < len; i++) order[i] = i;

	if (len === 0) return order;

	let maxLevel = 0;
	let minOdd = 255;
	for (let i = 0; i < len; i++) {
		const l = levels[i];
		if (l > maxLevel) maxLevel = l;
		if ((l & 1) && l < minOdd) minOdd = l;
	}
	if (minOdd > maxLevel) return order; // no RTL runs

	for (let level = maxLevel; level >= minOdd; level--) {
		let i = 0;
		while (i < len) {
			if (levels[i] >= level) {
				let j = i;
				while (j < len && levels[j] >= level) j++;
				// reverse order[i..j-1]
				for (let a = i, b = j - 1; a < b; a++, b--) {
					const tmp = order[a];
					order[a] = order[b];
					order[b] = tmp;
				}
				i = j;
			} else {
				i++;
			}
		}
	}
	return order;
};

/**
 * Quick check: does the string contain any RTL strong character?
 *
 * @param {string} text
 * @returns {boolean}
 */
const hasRTL = (text) => {
	if (!text) return false;
	for (let i = 0; i < text.length; i++) {
		const t = bidiTypeOf(text.charCodeAt(i));
		if (t === 'R' || t === 'AL') return true;
	}
	return false;
};

/**
 * Bidi_Mirroring table (subset of Unicode BidiMirroring.txt). Maps a character
 * to its mirror counterpart. Used by L4: chars at an odd bidi level whose
 * Bidi_Mirrored property is Yes must be rendered with the mirrored glyph.
 *
 * fontkit reverses the *order* of glyphs for RTL runs but does not substitute
 * mirrored shapes - so we substitute the codepoints ourselves before they
 * reach pdfkit. The font's regular glyph for the mirror char is what gets
 * drawn, which gives the correct visual.
 */
const MIRROR_PAIRS = {
	// ASCII brackets
	0x0028: 0x0029, 0x0029: 0x0028, // ( )
	0x005B: 0x005D, 0x005D: 0x005B, // [ ]
	0x007B: 0x007D, 0x007D: 0x007B, // { }
	0x003C: 0x003E, 0x003E: 0x003C, // < >
	// Latin-1 / common
	0x00AB: 0x00BB, 0x00BB: 0x00AB, // « »
	// General punctuation
	0x2039: 0x203A, 0x203A: 0x2039, // ‹ ›
	0x201C: 0x201D, 0x201D: 0x201C, // “ ” (loose: rendered direction differs)
	0x2018: 0x2019, 0x2019: 0x2018, // ‘ ’
	// Mathematical / misc bracket pairs
	0x27E8: 0x27E9, 0x27E9: 0x27E8, // ⟨ ⟩
	0x27EA: 0x27EB, 0x27EB: 0x27EA, // ⟪ ⟫
	0x2308: 0x2309, 0x2309: 0x2308, // ⌈ ⌉
	0x230A: 0x230B, 0x230B: 0x230A, // ⌊ ⌋
};

/**
 * Substitute mirror-paired characters in a string. Callers should only invoke
 * this on substrings that resolved to an odd bidi level (UAX #9 L4).
 *
 * @param {string} text
 * @returns {string}
 */
const mirrorChars = (text) => {
	if (!text) return text;
	let out = '';
	let changed = false;
	for (let i = 0; i < text.length; i++) {
		const cp = text.charCodeAt(i);
		const m = MIRROR_PAIRS[cp];
		if (m !== undefined) {
			out += String.fromCharCode(m);
			changed = true;
		} else {
			out += text[i];
		}
	}
	return changed ? out : text;
};

/**
 * Reverses an RTL run while keeping non-spacing combining marks attached to
 * their base character. Without this, NSM (Hebrew niqqud / Arabic harakat)
 * would end up positioned over the wrong base after PDF emission.
 *
 * @param {string} text
 * @returns {string}
 */
const reverseRtlText = (text) => {
	if (!text) return text;
	const clusters = [];
	let current = '';
	for (let i = 0; i < text.length; i++) {
		const t = bidiTypeOf(text.charCodeAt(i));
		if (t === 'NSM' && current) {
			current += text[i];
		} else {
			if (current) clusters.push(current);
			current = text[i];
		}
	}
	if (current) clusters.push(current);
	clusters.reverse();
	return clusters.join('');
};

/**
 * Apply UAX#9 visual reordering to a built Line (with inlines in logical
 * order). Splits inlines that span multiple bidi levels, reverses RTL
 * runs, reorders inlines to visual order and recomputes their `x`
 * positions.
 *
 * @param {object} line - Line instance from src/Line.js
 * @param {object} textInlines - TextInlines helper, used to recompute split
 *                               inline widths.
 * @param {object} [opts]
 * @param {boolean} [opts.forceRtlBase=false] - paragraph base direction is RTL
 * @returns {void}
 */
const applyBidiToLine = (line, textInlines, opts = {}) => {
	if (!line || !line.inlines || line.inlines.length === 0) return;

	const inlines = line.inlines;

	// Quick exit: if there is no RTL strong char in any inline AND no rtl flag,
	// nothing to reorder.
	let anyRtlChar = false;
	let anyRtlFlag = false;
	for (let i = 0; i < inlines.length; i++) {
		if (inlines[i].rtl) anyRtlFlag = true;
		if (!anyRtlChar && hasRTL(inlines[i].text)) anyRtlChar = true;
	}
	if (!anyRtlChar && !anyRtlFlag && !opts.forceRtlBase) return;

	// Paragraph base direction: explicit `rtl: true` on any inline wins;
	// otherwise auto-detect from first strong char.
	let baseLevel;
	if (opts.forceRtlBase || anyRtlFlag) {
		baseLevel = 1;
	} else {
		let combined = '';
		for (let i = 0; i < inlines.length; i++) combined += inlines[i].text || '';
		baseLevel = detectBaseLevel(combined);
	}

	// Build full logical text + char→inline map.
	let fullText = '';
	const charToInline = [];
	for (let i = 0; i < inlines.length; i++) {
		const t = inlines[i].text || '';
		for (let j = 0; j < t.length; j++) {
			charToInline.push(i);
			fullText += t[j];
		}
	}
	if (fullText.length === 0) return;

	const { levels } = resolveLevels(fullText, baseLevel);

	// Per-char "is strong RTL" flag - used to predict whether fontkit will
	// apply RTL glyph ordering to a segment. fontkit only reverses runs that
	// contain a strong-RTL char, and it merges adjacent neutrals into the
	// nearest strong run *asymmetrically* (trailing neutrals join the Hebrew
	// run, leading neutrals stay LTR). To get predictable behavior, we
	// pre-split into homogeneous segments.
	const isStrongRtlChar = new Array(fullText.length);
	for (let i = 0; i < fullText.length; i++) {
		const t = bidiTypeOf(fullText.charCodeAt(i));
		isStrongRtlChar[i] = (t === 'R' || t === 'AL');
	}

	// Build segments - each segment is a maximal run of chars that share the
	// same source inline AND the same bidi level AND the same strong-RTL
	// status. Each segment becomes one inline in the output.
	const segments = []; // { inlineIdx, level, start, end (exclusive) }
	let segStart = 0;
	for (let i = 1; i <= fullText.length; i++) {
		const last = i === fullText.length;
		const sameInline = !last && charToInline[i] === charToInline[i - 1];
		const sameLevel = !last && levels[i] === levels[i - 1];
		const sameStrong = !last && isStrongRtlChar[i] === isStrongRtlChar[i - 1];
		if (last || !sameInline || !sameLevel || !sameStrong) {
			segments.push({
				inlineIdx: charToInline[segStart],
				level: levels[segStart],
				start: segStart,
				end: i,
			});
			segStart = i;
		}
	}

	// Materialize new inlines (logical order) from segments.
	const logicalInlines = new Array(segments.length);
	for (let s = 0; s < segments.length; s++) {
		const seg = segments[s];
		const orig = inlines[seg.inlineIdx];
		const segText = fullText.substring(seg.start, seg.end);
		let inline;
		if (segText === orig.text && (s === 0 || segments[s - 1].inlineIdx !== seg.inlineIdx) &&
			(s === segments.length - 1 || segments[s + 1].inlineIdx !== seg.inlineIdx)) {
			// Whole original inline survived intact - reuse it.
			inline = orig;
		} else {
			inline = Object.assign({}, orig);
			inline.text = segText;
			if (textInlines) {
				inline.width = textInlines.widthOfText(segText, inline);
			}
			// Only the first sub-segment of an inline keeps the leadingCut,
			// only the last sub-segment keeps the trailingCut.
			const isFirstSubseg = s === 0 || segments[s - 1].inlineIdx !== seg.inlineIdx;
			const isLastSubseg = s === segments.length - 1 || segments[s + 1].inlineIdx !== seg.inlineIdx;
			if (!isFirstSubseg) inline.leadingCut = 0;
			if (!isLastSubseg) inline.trailingCut = 0;
		}
		inline._bidiLevel = seg.level;
		logicalInlines[s] = inline;
	}

	// L2 - reorder inlines into visual order.
	let maxL = 0, minOdd = 255;
	for (let i = 0; i < logicalInlines.length; i++) {
		const l = logicalInlines[i]._bidiLevel;
		if (l > maxL) maxL = l;
		if ((l & 1) && l < minOdd) minOdd = l;
	}
	const visual = logicalInlines.slice();
	if (minOdd <= maxL) {
		for (let level = maxL; level >= minOdd; level--) {
			let i = 0;
			while (i < visual.length) {
				if (visual[i]._bidiLevel >= level) {
					let j = i;
					while (j < visual.length && visual[j]._bidiLevel >= level) j++;
					// reverse [i, j)
					for (let a = i, b = j - 1; a < b; a++, b--) {
						const tmp = visual[a];
						visual[a] = visual[b];
						visual[b] = tmp;
					}
					i = j;
				} else {
					i++;
				}
			}
		}
	}

	// Note: we deliberately do NOT reverse characters within RTL-level inlines.
	// pdfkit/fontkit performs OpenType shaping and applies the script's natural
	// right-to-left glyph ordering for each text() call. Reversing here would
	// double-reverse and produce mirrored glyphs. Inline-level reordering above
	// (so words appear in the correct visual position across inlines) is the
	// part fontkit cannot do - each text() call is independent.
	//
	// However - leadingCut/trailingCut were computed from the *logical* text.
	// fontkit's runtime reversal flips that: the logical-trailing whitespace of
	// an RTL inline becomes its visual-leading whitespace. Swap the cuts on
	// RTL-level inlines so that the line's edge cuts (taken from visual[0] and
	// visual[length-1] below) reflect what actually appears at the visual edges.
	for (let i = 0; i < visual.length; i++) {
		if (visual[i]._bidiLevel & 1) {
			const lc = visual[i].leadingCut || 0;
			const tc = visual[i].trailingCut || 0;
			if (lc !== tc) {
				visual[i].leadingCut = tc;
				visual[i].trailingCut = lc;
			}
			// L4: mirror paired punctuation in RTL-level runs so brackets etc.
			// open in the correct visual direction once fontkit lays them out.
			visual[i].text = mirrorChars(visual[i].text);
			// fontkit applies RTL glyph ordering only when an inline contains
			// a strong-RTL char. A neutral-only inline that resolved to an odd
			// level (because of its surroundings) - for example " - " between
			// two Hebrew words after TextBreaker has split them - is left in
			// logical order by fontkit, which then collides with the
			// already-reversed neighbours. Reverse it ourselves so the visual
			// flow is consistent.
			if (!hasRTL(visual[i].text)) {
				visual[i].text = reverseRtlText(visual[i].text);
			}
		}
	}

	// Recompute layout positions in the new visual order.
	const newLeadingCut = visual[0].leadingCut || 0;
	const newTrailingCut = visual[visual.length - 1].trailingCut || 0;
	let cum = 0;
	for (let i = 0; i < visual.length; i++) {
		visual[i].x = cum - newLeadingCut;
		cum += visual[i].width;
	}

	line.inlines = visual;
	line.leadingCut = newLeadingCut;
	line.trailingCut = newTrailingCut;
	line.inlineWidths = cum;
};

export {
	bidiTypeOf,
	detectBaseLevel,
	resolveLevels,
	visualOrder,
	hasRTL,
	reverseRtlText,
	mirrorChars,
	applyBidiToLine,
};
