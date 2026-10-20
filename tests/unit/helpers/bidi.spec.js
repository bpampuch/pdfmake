const assert = require('assert');

const {
	bidiTypeOf,
	detectBaseLevel,
	resolveLevels,
	visualOrder,
	hasRTL,
	reverseRtlText,
	mirrorChars,
	applyBidiToLine,
} = require('../../../js/helpers/bidi');

describe('helpers/bidi', function () {

	describe('bidiTypeOf', function () {
		it('classifies Latin letters as L', function () {
			assert.strictEqual(bidiTypeOf('A'.charCodeAt(0)), 'L');
			assert.strictEqual(bidiTypeOf('z'.charCodeAt(0)), 'L');
		});
		it('classifies Hebrew letters as R', function () {
			assert.strictEqual(bidiTypeOf('א'.charCodeAt(0)), 'R');
			assert.strictEqual(bidiTypeOf('ת'.charCodeAt(0)), 'R');
		});
		it('classifies Arabic letters as AL', function () {
			assert.strictEqual(bidiTypeOf('ا'.charCodeAt(0)), 'AL');
			assert.strictEqual(bidiTypeOf('ي'.charCodeAt(0)), 'AL');
		});
		it('classifies ASCII digits as EN', function () {
			assert.strictEqual(bidiTypeOf('0'.charCodeAt(0)), 'EN');
			assert.strictEqual(bidiTypeOf('9'.charCodeAt(0)), 'EN');
		});
		it('classifies whitespace as WS', function () {
			assert.strictEqual(bidiTypeOf(0x20), 'WS');
		});
		it('classifies Hebrew niqqud as NSM', function () {
			assert.strictEqual(bidiTypeOf(0x05B7), 'NSM'); // patah
		});
		it('classifies currency symbols as ET', function () {
			assert.strictEqual(bidiTypeOf(0x20AA), 'ET'); // ₪
			assert.strictEqual(bidiTypeOf(0x20AC), 'ET'); // €
			assert.strictEqual(bidiTypeOf(0x00A3), 'ET'); // £
			assert.strictEqual(bidiTypeOf('$'.charCodeAt(0)), 'ET');
		});
	});

	describe('detectBaseLevel', function () {
		it('returns 0 for LTR-first text', function () {
			assert.strictEqual(detectBaseLevel('Hello שלום'), 0);
		});
		it('returns 1 for RTL-first text', function () {
			assert.strictEqual(detectBaseLevel('שלום world'), 1);
		});
		it('skips neutrals when looking for first strong', function () {
			assert.strictEqual(detectBaseLevel('  שלום'), 1);
			assert.strictEqual(detectBaseLevel('   Hello'), 0);
		});
		it('defaults to 0 when no strong char', function () {
			assert.strictEqual(detectBaseLevel('1234'), 0);
			assert.strictEqual(detectBaseLevel('   '), 0);
		});
	});

	describe('hasRTL', function () {
		it('detects Hebrew', function () {
			assert.strictEqual(hasRTL('Hello שלום'), true);
		});
		it('detects Arabic', function () {
			assert.strictEqual(hasRTL('hello مرحبا'), true);
		});
		it('returns false for pure Latin', function () {
			assert.strictEqual(hasRTL('Hello world 123'), false);
		});
	});

	describe('resolveLevels', function () {
		it('assigns level 0 to all chars in pure LTR text', function () {
			const { levels } = resolveLevels('hello', 0);
			for (let i = 0; i < levels.length; i++) {
				assert.strictEqual(levels[i], 0);
			}
		});

		it('assigns level 1 to Hebrew chars in LTR base', function () {
			const text = 'a שב c';
			const { levels } = resolveLevels(text, 0);
			// a → 0, ' ' → 0, ש → 1, ב → 1, ' ' → 0, c → 0
			assert.deepStrictEqual(Array.from(levels), [0, 0, 1, 1, 0, 0]);
		});

		it('assigns level 2 to Latin chars in RTL base', function () {
			const text = 'ש ab ת';
			const { levels } = resolveLevels(text, 1);
			// ש → 1, ' ' → 1, a → 2, b → 2, ' ' → 1, ת → 1
			assert.deepStrictEqual(Array.from(levels), [1, 1, 2, 2, 1, 1]);
		});

		it('treats digits as EN, level 2 in LTR base when after R', function () {
			const text = 'ש12';
			const { levels } = resolveLevels(text, 0);
			// ש → 1, 1 → 2 (EN in LTR base), 2 → 2
			assert.deepStrictEqual(Array.from(levels), [1, 2, 2]);
		});
	});

	describe('visualOrder', function () {
		it('is identity for all-LTR text', function () {
			const order = visualOrder(new Uint8Array([0, 0, 0, 0]));
			assert.deepStrictEqual(order, [0, 1, 2, 3]);
		});
		it('reverses an embedded RTL run inside LTR base', function () {
			// "ab שב cd" - levels [0,0,0,1,1,0,0,0]
			const order = visualOrder(new Uint8Array([0, 0, 0, 1, 1, 0, 0, 0]));
			assert.deepStrictEqual(order, [0, 1, 2, 4, 3, 5, 6, 7]);
		});
		it('reverses entire run in RTL base', function () {
			// All level 1
			const order = visualOrder(new Uint8Array([1, 1, 1]));
			assert.deepStrictEqual(order, [2, 1, 0]);
		});
	});

	describe('mirrorChars', function () {
		it('swaps ASCII brackets', function () {
			assert.strictEqual(mirrorChars('()[]{}'), ')(][}{');
		});
		it('swaps quotation marks', function () {
			assert.strictEqual(mirrorChars('«»‹›'), '»«›‹');
		});
		it('leaves Hebrew letters untouched', function () {
			assert.strictEqual(mirrorChars('שלום'), 'שלום');
		});
		it('leaves text without mirrors as-is (same string ref)', function () {
			const s = 'plain text';
			assert.strictEqual(mirrorChars(s), s);
		});
	});

	describe('reverseRtlText', function () {
		it('reverses simple text', function () {
			assert.strictEqual(reverseRtlText('שלום'), 'םולש');
		});
		it('keeps NSM combining marks attached to base', function () {
			// "שָׁ" = שׁ (shin) + ָ (qamatz, NSM) + ׁ (shin dot, NSM)? Use simpler: ש + ָ
			const base = 'ש';
			const nsm = 'ָ'; // qamatz
			const text = base + nsm + 'ל' + nsm; // logical: ש+nsm + ל+nsm
			const reversed = reverseRtlText(text);
			// expected clusters reversed: [ל+nsm, ש+nsm] joined → ל+nsm+ש+nsm
			assert.strictEqual(reversed, 'ל' + nsm + 'ש' + nsm);
		});
	});

	describe('applyBidiToLine', function () {
		// Build a fake line with fake inlines for layout-only testing.
		// We bypass the real TextInlines by passing a fake widthOfText.
		const fakeTextInlines = {
			widthOfText: (text) => text.length * 10,
		};

		const makeLine = (texts, opts = {}) => {
			const inlines = texts.map(t => ({
				text: t,
				width: t.length * 10,
				leadingCut: 0,
				trailingCut: 0,
				rtl: opts.rtl,
			}));
			return { inlines };
		};

		it('is no-op for pure-LTR text', function () {
			const line = makeLine(['Hello ', 'world']);
			applyBidiToLine(line, fakeTextInlines);
			assert.strictEqual(line.inlines[0].text, 'Hello ');
			assert.strictEqual(line.inlines[1].text, 'world');
		});

		// We DO NOT reverse characters within an inline - fontkit handles that
		// during glyph shaping. We only reorder the inlines themselves so that
		// words appear in the correct visual position across separate text()
		// calls.

		it('does not reverse text within Hebrew inline (fontkit handles glyph order)', function () {
			const line = makeLine(['Hello ', 'שלום', ' world']);
			applyBidiToLine(line, fakeTextInlines);
			assert.strictEqual(line.inlines.length, 3);
			assert.strictEqual(line.inlines[0].text, 'Hello ');
			assert.strictEqual(line.inlines[1].text, 'שלום');
			assert.strictEqual(line.inlines[2].text, ' world');
		});

		it('reorders inlines into visual order for pure RTL paragraph', function () {
			// Each inline gets split per script: "שלום " → ["שלום", " "].
			// Visual order reverses everything → leftmost is עולם, rightmost שלום.
			const line = makeLine(['שלום ', 'עולם'], { rtl: true });
			applyBidiToLine(line, fakeTextInlines);
			assert.strictEqual(line.inlines.length, 3);
			assert.strictEqual(line.inlines[0].text, 'עולם');
			assert.strictEqual(line.inlines[1].text, ' ');
			assert.strictEqual(line.inlines[2].text, 'שלום');
		});

		it('keeps Latin embedded LTR between RTL words at the right visual slot', function () {
			const line = makeLine(['שלום ', 'hello', ' עולם'], { rtl: true });
			applyBidiToLine(line, fakeTextInlines);
			// Per-script split + visual L→R: עולם, " ", hello, " ", שלום
			assert.strictEqual(line.inlines.length, 5);
			assert.strictEqual(line.inlines[0].text, 'עולם');
			assert.strictEqual(line.inlines[1].text, ' ');
			assert.strictEqual(line.inlines[2].text, 'hello');
			assert.strictEqual(line.inlines[3].text, ' ');
			assert.strictEqual(line.inlines[4].text, 'שלום');
		});

		it('recomputes x positions in visual order', function () {
			const line = makeLine(['שלום ', 'hello'], { rtl: true });
			applyBidiToLine(line, fakeTextInlines);
			assert.strictEqual(line.inlines[0].x, 0);
			assert.strictEqual(line.inlines[1].x, line.inlines[0].width);
		});

		it('manually reverses neutral-only RTL-level inlines (fontkit would not)', function () {
			// "ימין - לשמאל" splits into ["ימין ", "- ", "לשמאל"]. After per-script
			// segmentation we get [ימין, " ", "- ", לשמאל]. The middle neutral-only
			// segments are manually reversed since fontkit won't apply RTL to them.
			const line = makeLine(['ימין ', '- ', 'לשמאל'], { rtl: true });
			applyBidiToLine(line, fakeTextInlines);
			assert.strictEqual(line.inlines.length, 4);
			assert.strictEqual(line.inlines[0].text, 'לשמאל');
			assert.strictEqual(line.inlines[1].text, ' -'); // "- " reversed
			assert.strictEqual(line.inlines[2].text, ' ');
			assert.strictEqual(line.inlines[3].text, 'ימין');
		});

		it('mirrors brackets in RTL-level inline text', function () {
			// "(שלום)" splits per-script into ["(", "שלום", ")"]. Visual reorder
			// flips the order; mirror substitutes the brackets.
			const line = makeLine(['(שלום)'], { rtl: true });
			applyBidiToLine(line, fakeTextInlines);
			assert.strictEqual(line.inlines.length, 3);
			assert.strictEqual(line.inlines[0].text, '('); // mirrored ")"
			assert.strictEqual(line.inlines[1].text, 'שלום');
			assert.strictEqual(line.inlines[2].text, ')'); // mirrored "("
		});

		it('keeps currency-symbol+amount as one LTR run inside RTL', function () {
			// "₪3.50" in an RTL paragraph should render with ₪ visually to the
			// left of the digits (W5 folds the ET into the EN run, so the whole
			// thing is one level-2 inline that fontkit emits LTR).
			const line = makeLine(['₪3.50'], { rtl: true });
			applyBidiToLine(line, fakeTextInlines);
			assert.strictEqual(line.inlines.length, 1);
			assert.strictEqual(line.inlines[0].text, '₪3.50');
		});
	});

});
