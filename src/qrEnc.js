/*eslint no-unused-vars: ["error", {"args": "none"}]*/
/*eslint no-redeclare: "off"*/
/*eslint no-throw-literal: "off"*/

'use strict';
/* qr.js -- QR code generator in Javascript (revision 2011-01-19)
 * Written by Kang Seonghoon <public+qrjs@mearie.org>.
 *
 * This source code is in the public domain; if your jurisdiction does not
 * recognize the public domain the terms of Creative Commons CC0 license
 * apply. In the other words, you can always do what you want.
 */


// per-version information (cf. JIS X 0510:2004 pp. 30--36, 71)
//
// [0]: the degree of generator polynomial by ECC levels
// [1]: # of code blocks by ECC levels
// [2]: left-top positions of alignment patterns
//
// the number in this table (in particular, [0]) does not exactly match with
// the numbers in the specficiation. see augumenteccs below for the reason.
var VERSIONS = [
	null,
	[[10, 7, 17, 13], [1, 1, 1, 1], []],
	[[16, 10, 28, 22], [1, 1, 1, 1], [4, 16]],
	[[26, 15, 22, 18], [1, 1, 2, 2], [4, 20]],
	[[18, 20, 16, 26], [2, 1, 4, 2], [4, 24]],
	[[24, 26, 22, 18], [2, 1, 4, 4], [4, 28]],
	[[16, 18, 28, 24], [4, 2, 4, 4], [4, 32]],
	[[18, 20, 26, 18], [4, 2, 5, 6], [4, 20, 36]],
	[[22, 24, 26, 22], [4, 2, 6, 6], [4, 22, 40]],
	[[22, 30, 24, 20], [5, 2, 8, 8], [4, 24, 44]],
	[[26, 18, 28, 24], [5, 4, 8, 8], [4, 26, 48]],
	[[30, 20, 24, 28], [5, 4, 11, 8], [4, 28, 52]],
	[[22, 24, 28, 26], [8, 4, 11, 10], [4, 30, 56]],
	[[22, 26, 22, 24], [9, 4, 16, 12], [4, 32, 60]],
	[[24, 30, 24, 20], [9, 4, 16, 16], [4, 24, 44, 64]],
	[[24, 22, 24, 30], [10, 6, 18, 12], [4, 24, 46, 68]],
	[[28, 24, 30, 24], [10, 6, 16, 17], [4, 24, 48, 72]],
	[[28, 28, 28, 28], [11, 6, 19, 16], [4, 28, 52, 76]],
	[[26, 30, 28, 28], [13, 6, 21, 18], [4, 28, 54, 80]],
	[[26, 28, 26, 26], [14, 7, 25, 21], [4, 28, 56, 84]],
	[[26, 28, 28, 30], [16, 8, 25, 20], [4, 32, 60, 88]],
	[[26, 28, 30, 28], [17, 8, 25, 23], [4, 26, 48, 70, 92]],
	[[28, 28, 24, 30], [17, 9, 34, 23], [4, 24, 48, 72, 96]],
	[[28, 30, 30, 30], [18, 9, 30, 25], [4, 28, 52, 76, 100]],
	[[28, 30, 30, 30], [20, 10, 32, 27], [4, 26, 52, 78, 104]],
	[[28, 26, 30, 30], [21, 12, 35, 29], [4, 30, 56, 82, 108]],
	[[28, 28, 30, 28], [23, 12, 37, 34], [4, 28, 56, 84, 112]],
	[[28, 30, 30, 30], [25, 12, 40, 34], [4, 32, 60, 88, 116]],
	[[28, 30, 30, 30], [26, 13, 42, 35], [4, 24, 48, 72, 96, 120]],
	[[28, 30, 30, 30], [28, 14, 45, 38], [4, 28, 52, 76, 100, 124]],
	[[28, 30, 30, 30], [29, 15, 48, 40], [4, 24, 50, 76, 102, 128]],
	[[28, 30, 30, 30], [31, 16, 51, 43], [4, 28, 54, 80, 106, 132]],
	[[28, 30, 30, 30], [33, 17, 54, 45], [4, 32, 58, 84, 110, 136]],
	[[28, 30, 30, 30], [35, 18, 57, 48], [4, 28, 56, 84, 112, 140]],
	[[28, 30, 30, 30], [37, 19, 60, 51], [4, 32, 60, 88, 116, 144]],
	[[28, 30, 30, 30], [38, 19, 63, 53], [4, 28, 52, 76, 100, 124, 148]],
	[[28, 30, 30, 30], [40, 20, 66, 56], [4, 22, 48, 74, 100, 126, 152]],
	[[28, 30, 30, 30], [43, 21, 70, 59], [4, 26, 52, 78, 104, 130, 156]],
	[[28, 30, 30, 30], [45, 22, 74, 62], [4, 30, 56, 82, 108, 134, 160]],
	[[28, 30, 30, 30], [47, 24, 77, 65], [4, 24, 52, 80, 108, 136, 164]],
	[[28, 30, 30, 30], [49, 25, 81, 68], [4, 28, 56, 84, 112, 140, 168]]];

// mode constants (cf. Table 2 in JIS X 0510:2004 p. 16)
var MODE_TERMINATOR = 0;
var MODE_NUMERIC = 1, MODE_ALPHANUMERIC = 2, MODE_OCTET = 4, MODE_KANJI = 8;

// validation regexps
var NUMERIC_REGEXP = /^\d*$/;
var ALPHANUMERIC_REGEXP = /^[A-Za-z0-9 $%*+\-./:]*$/;
var ALPHANUMERIC_OUT_REGEXP = /^[A-Z0-9 $%*+\-./:]*$/;

// ECC levels (cf. Table 22 in JIS X 0510:2004 p. 45)
var ECCLEVEL_L = 1, ECCLEVEL_M = 0, ECCLEVEL_Q = 3, ECCLEVEL_H = 2;

// GF(2^8)-to-integer mapping with a reducing polynomial x^8+x^4+x^3+x^2+1
// invariant: GF256_MAP[GF256_INVMAP[i]] == i for all i in [1,256)
var GF256_MAP = [], GF256_INVMAP = [-1];
for (var i = 0, v = 1; i < 255; ++i) {
	GF256_MAP.push(v);
	GF256_INVMAP[v] = i;
	v = (v * 2) ^ (v >= 128 ? 0x11d : 0);
}

// generator polynomials up to degree 30
// (should match with polynomials in JIS X 0510:2004 Appendix A)
//
// generator polynomial of degree K is product of (x-\alpha^0), (x-\alpha^1),
// ..., (x-\alpha^(K-1)). by convention, we omit the K-th coefficient (always 1)
// from the result; also other coefficients are written in terms of the exponent
// to \alpha to avoid the redundant calculation. (see also calculateecc below.)
var GF256_GENPOLY = [[]];
for (var i = 0; i < 30; ++i) {
	var prevpoly = GF256_GENPOLY[i], poly = [];
	for (var j = 0; j <= i; ++j) {
		var a = (j < i ? GF256_MAP[prevpoly[j]] : 0);
		var b = GF256_MAP[(i + (prevpoly[j - 1] || 0)) % 255];
		poly.push(GF256_INVMAP[a ^ b]);
	}
	GF256_GENPOLY.push(poly);
}

// alphanumeric character mapping (cf. Table 5 in JIS X 0510:2004 p. 19)
var ALPHANUMERIC_MAP = {};
for (var i = 0; i < 45; ++i) {
	ALPHANUMERIC_MAP['0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'.charAt(i)] = i;
}

// mask functions in terms of row # and column #
// (cf. Table 20 in JIS X 0510:2004 p. 42)
/*jshint unused: false */
var MASKFUNCS = [
	function (i, j) {
		return (i + j) % 2 === 0;
	},
	function (i, j) {
		return i % 2 === 0;
	},
	function (i, j) {
		return j % 3 === 0;
	},
	function (i, j) {
		return (i + j) % 3 === 0;
	},
	function (i, j) {
		return (((i / 2) | 0) + ((j / 3) | 0)) % 2 === 0;
	},
	function (i, j) {
		return (i * j) % 2 + (i * j) % 3 === 0;
	},
	function (i, j) {
		return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
	},
	function (i, j) {
		return ((i + j) % 2 + (i * j) % 3) % 2 === 0;
	}];

// returns true when the version information has to be embeded.
var needsverinfo = function (ver) {
	return ver > 6;
};

// returns the size of entire QR code for given version.
var getsizebyver = function (ver) {
	return 4 * ver + 17;
};

// returns the number of bits available for code words in this version.
var nfullbits = function (ver) {
	/*
	 * |<--------------- n --------------->|
	 * |        |<----- n-17 ---->|        |
	 * +-------+                ///+-------+ ----
	 * |       |                ///|       |    ^
	 * |  9x9  |       @@@@@    ///|  9x8  |    |
	 * |       | # # # @5x5@ # # # |       |    |
	 * +-------+       @@@@@       +-------+    |
	 *       #                               ---|
	 *                                        ^ |
	 *       #                                |
	 *     @@@@@       @@@@@       @@@@@      | n
	 *     @5x5@       @5x5@       @5x5@   n-17
	 *     @@@@@       @@@@@       @@@@@      | |
	 *       #                                | |
	 * //////                                 v |
	 * //////#                               ---|
	 * +-------+       @@@@@       @@@@@        |
	 * |       |       @5x5@       @5x5@        |
	 * |  8x9  |       @@@@@       @@@@@        |
	 * |       |                                v
	 * +-------+                             ----
	 *
	 * when the entire code has n^2 modules and there are m^2-3 alignment
	 * patterns, we have:
	 * - 225 (= 9x9 + 9x8 + 8x9) modules for finder patterns and
	 *   format information;
	 * - 2n-34 (= 2(n-17)) modules for timing patterns;
	 * - 36 (= 3x6 + 6x3) modules for version information, if any;
	 * - 25m^2-75 (= (m^2-3)(5x5)) modules for alignment patterns
	 *   if any, but 10m-20 (= 2(m-2)x5) of them overlaps with
	 *   timing patterns.
	 */
	var v = VERSIONS[ver];
	var nbits = 16 * ver * ver + 128 * ver + 64; // finder, timing and format info.
	if (needsverinfo(ver))
		nbits -= 36; // version information
	if (v[2].length) { // alignment patterns
		nbits -= 25 * v[2].length * v[2].length - 10 * v[2].length - 55;
	}
	return nbits;
};

// returns the number of bits available for data portions (i.e. excludes ECC
// bits but includes mode and length bits) in this version and ECC level.
var ndatabits = function (ver, ecclevel) {
	var nbits = nfullbits(ver) & ~7; // no sub-octet code words
	var v = VERSIONS[ver];
	nbits -= 8 * v[0][ecclevel] * v[1][ecclevel]; // ecc bits
	return nbits;
};

// returns the number of bits required for the length of data.
// (cf. Table 3 in JIS X 0510:2004 p. 16)
var ndatalenbits = function (ver, mode) {
	switch (mode) {
		case MODE_NUMERIC:
			return (ver < 10 ? 10 : ver < 27 ? 12 : 14);
		case MODE_ALPHANUMERIC:
			return (ver < 10 ? 9 : ver < 27 ? 11 : 13);
		case MODE_OCTET:
			return (ver < 10 ? 8 : 16);
		case MODE_KANJI:
			return (ver < 10 ? 8 : ver < 27 ? 10 : 12);
	}
};

// returns the maximum length of data possible in given configuration.
var getmaxdatalen = function (ver, mode, ecclevel) {
	var nbits = ndatabits(ver, ecclevel) - 4 - ndatalenbits(ver, mode); // 4 for mode bits
	switch (mode) {
		case MODE_NUMERIC:
			return ((nbits / 10) | 0) * 3 + (nbits % 10 < 4 ? 0 : nbits % 10 < 7 ? 1 : 2);
		case MODE_ALPHANUMERIC:
			return ((nbits / 11) | 0) * 2 + (nbits % 11 < 6 ? 0 : 1);
		case MODE_OCTET:
			return (nbits / 8) | 0;
		case MODE_KANJI:
			return (nbits / 13) | 0;
	}
};

// checks if the given data can be encoded in given mode, and returns
// the converted data for the further processing if possible. otherwise
// returns null.
//
// this function does not check the length of data; it is a duty of
// encode function below (as it depends on the version and ECC level too).
var validatedata = function (mode, data) {
	switch (mode) {
		case MODE_NUMERIC:
			if (!data.match(NUMERIC_REGEXP))
				return null;
			return data;

		case MODE_ALPHANUMERIC:
			if (!data.match(ALPHANUMERIC_REGEXP))
				return null;
			return data.toUpperCase();

		case MODE_OCTET:
			if (typeof data === 'string') { // encode as utf-8 string
				var newdata = [];
				for (var i = 0; i < data.length; ++i) {
					var ch = data.charCodeAt(i);
					if (ch < 0x80) {
						newdata.push(ch);
					} else if (ch < 0x800) {
						newdata.push(0xc0 | (ch >> 6),
							0x80 | (ch & 0x3f));
					} else if (ch < 0x10000) {
						newdata.push(0xe0 | (ch >> 12),
							0x80 | ((ch >> 6) & 0x3f),
							0x80 | (ch & 0x3f));
					} else {
						newdata.push(0xf0 | (ch >> 18),
							0x80 | ((ch >> 12) & 0x3f),
							0x80 | ((ch >> 6) & 0x3f),
							0x80 | (ch & 0x3f));
					}
				}
				return newdata;
			} else {
				return data;
			}
	}
};

// returns the code words (sans ECC bits) for given data and configurations.
// requires data to be preprocessed by validatedata. no length check is
// performed, and everything has to be checked before calling this function.
var encode = function (ver, mode, data, maxbuflen) {
	var buf = [];
	var bits = 0, remaining = 8;
	var datalen = data.length;

	// this function is intentionally no-op when n=0.
	var pack = function (x, n) {
		if (n >= remaining) {
			buf.push(bits | (x >> (n -= remaining)));
			while (n >= 8)
				buf.push((x >> (n -= 8)) & 255);
			bits = 0;
			remaining = 8;
		}
		if (n > 0)
			bits |= (x & ((1 << n) - 1)) << (remaining -= n);
	};

	var nlenbits = ndatalenbits(ver, mode);
	pack(mode, 4);
	pack(datalen, nlenbits);

	switch (mode) {
		case MODE_NUMERIC:
			for (var i = 2; i < datalen; i += 3) {
				pack(parseInt(data.substring(i - 2, i + 1), 10), 10);
			}
			pack(parseInt(data.substring(i - 2), 10), [0, 4, 7][datalen % 3]);
			break;

		case MODE_ALPHANUMERIC:
			for (var i = 1; i < datalen; i += 2) {
				pack(ALPHANUMERIC_MAP[data.charAt(i - 1)] * 45 +
					ALPHANUMERIC_MAP[data.charAt(i)], 11);
			}
			if (datalen % 2 == 1) {
				pack(ALPHANUMERIC_MAP[data.charAt(i - 1)], 6);
			}
			break;

		case MODE_OCTET:
			for (var i = 0; i < datalen; ++i) {
				pack(data[i], 8);
			}
			break;
	}

	// final bits. it is possible that adding terminator causes the buffer
	// to overflow, but then the buffer truncated to the maximum size will
	// be valid as the truncated terminator mode bits and padding is
	// identical in appearance (cf. JIS X 0510:2004 sec 8.4.8).
	pack(MODE_TERMINATOR, 4);
	if (remaining < 8)
		buf.push(bits);

	// the padding to fill up the remaining space. we should not add any
	// words when the overflow already occurred.
	while (buf.length + 1 < maxbuflen)
		buf.push(0xec, 0x11);
	if (buf.length < maxbuflen)
		buf.push(0xec);
	return buf;
};

// calculates ECC code words for given code words and generator polynomial.
//
// this is quite similar to CRC calculation as both Reed-Solomon and CRC use
// the certain kind of cyclic codes, which is effectively the division of
// zero-augumented polynomial by the generator polynomial. the only difference
// is that Reed-Solomon uses GF(2^8), instead of CRC's GF(2), and Reed-Solomon
// uses the different generator polynomial than CRC's.
var calculateecc = function (poly, genpoly) {
	var modulus = poly.slice(0);
	var polylen = poly.length, genpolylen = genpoly.length;
	for (var i = 0; i < genpolylen; ++i)
		modulus.push(0);
	for (var i = 0; i < polylen;) {
		var quotient = GF256_INVMAP[modulus[i++]];
		if (quotient >= 0) {
			for (var j = 0; j < genpolylen; ++j) {
				modulus[i + j] ^= GF256_MAP[(quotient + genpoly[j]) % 255];
			}
		}
	}
	return modulus.slice(polylen);
};

// auguments ECC code words to given code words. the resulting words are
// ready to be encoded in the matrix.
//
// the much of actual augumenting procedure follows JIS X 0510:2004 sec 8.7.
// the code is simplified using the fact that the size of each code & ECC
// blocks is almost same; for example, when we have 4 blocks and 46 data words
// the number of code words in those blocks are 11, 11, 12, 12 respectively.
var augumenteccs = function (poly, nblocks, genpoly) {
	var subsizes = [];
	var subsize = (poly.length / nblocks) | 0, subsize0 = 0;
	var pivot = nblocks - poly.length % nblocks;
	for (var i = 0; i < pivot; ++i) {
		subsizes.push(subsize0);
		subsize0 += subsize;
	}
	for (var i = pivot; i < nblocks; ++i) {
		subsizes.push(subsize0);
		subsize0 += subsize + 1;
	}
	subsizes.push(subsize0);

	var eccs = [];
	for (var i = 0; i < nblocks; ++i) {
		eccs.push(calculateecc(poly.slice(subsizes[i], subsizes[i + 1]), genpoly));
	}

	var result = [];
	var nitemsperblock = (poly.length / nblocks) | 0;
	for (var i = 0; i < nitemsperblock; ++i) {
		for (var j = 0; j < nblocks; ++j) {
			result.push(poly[subsizes[j] + i]);
		}
	}
	for (var j = pivot; j < nblocks; ++j) {
		result.push(poly[subsizes[j + 1] - 1]);
	}
	for (var i = 0; i < genpoly.length; ++i) {
		for (var j = 0; j < nblocks; ++j) {
			result.push(eccs[j][i]);
		}
	}
	return result;
};

// auguments BCH(p+q,q) code to the polynomial over GF(2), given the proper
// genpoly. the both input and output are in binary numbers, and unlike
// calculateecc genpoly should include the 1 bit for the highest degree.
//
// actual polynomials used for this procedure are as follows:
// - p=10, q=5, genpoly=x^10+x^8+x^5+x^4+x^2+x+1 (JIS X 0510:2004 Appendix C)
// - p=18, q=6, genpoly=x^12+x^11+x^10+x^9+x^8+x^5+x^2+1 (ibid. Appendix D)
var augumentbch = function (poly, p, genpoly, q) {
	var modulus = poly << q;
	for (var i = p - 1; i >= 0; --i) {
		if ((modulus >> (q + i)) & 1)
			modulus ^= genpoly << i;
	}
	return (poly << q) | modulus;
};

// creates the base matrix for given version. it returns two matrices, one of
// them is the actual one and the another represents the "reserved" portion
// (e.g. finder and timing patterns) of the matrix.
//
// some entries in the matrix may be undefined, rather than 0 or 1. this is
// intentional (no initialization needed!), and putdata below will fill
// the remaining ones.
var makebasematrix = function (ver) {
	var v = VERSIONS[ver], n = getsizebyver(ver);
	var matrix = [], reserved = [];
	for (var i = 0; i < n; ++i) {
		matrix.push([]);
		reserved.push([]);
	}

	var blit = function (y, x, h, w, bits) {
		for (var i = 0; i < h; ++i) {
			for (var j = 0; j < w; ++j) {
				matrix[y + i][x + j] = (bits[i] >> j) & 1;
				reserved[y + i][x + j] = 1;
			}
		}
	};

	// finder patterns and a part of timing patterns
	// will also mark the format information area (not yet written) as reserved.
	blit(0, 0, 9, 9, [0x7f, 0x41, 0x5d, 0x5d, 0x5d, 0x41, 0x17f, 0x00, 0x40]);
	blit(n - 8, 0, 8, 9, [0x100, 0x7f, 0x41, 0x5d, 0x5d, 0x5d, 0x41, 0x7f]);
	blit(0, n - 8, 9, 8, [0xfe, 0x82, 0xba, 0xba, 0xba, 0x82, 0xfe, 0x00, 0x00]);

	// the rest of timing patterns
	for (var i = 9; i < n - 8; ++i) {
		matrix[6][i] = matrix[i][6] = ~i & 1;
		reserved[6][i] = reserved[i][6] = 1;
	}

	// alignment patterns
	var aligns = v[2], m = aligns.length;
	for (var i = 0; i < m; ++i) {
		var minj = (i === 0 || i === m - 1 ? 1 : 0), maxj = (i === 0 ? m - 1 : m);
		for (var j = minj; j < maxj; ++j) {
			blit(aligns[i], aligns[j], 5, 5, [0x1f, 0x11, 0x15, 0x11, 0x1f]);
		}
	}

	// version information
	if (needsverinfo(ver)) {
		var code = augumentbch(ver, 6, 0x1f25, 12);
		var k = 0;
		for (var i = 0; i < 6; ++i) {
			for (var j = 0; j < 3; ++j) {
				matrix[i][(n - 11) + j] = matrix[(n - 11) + j][i] = (code >> k++) & 1;
				reserved[i][(n - 11) + j] = reserved[(n - 11) + j][i] = 1;
			}
		}
	}

	return { matrix: matrix, reserved: reserved };
};

// fills the data portion (i.e. unmarked in reserved) of the matrix with given
// code words. the size of code words should be no more than available bits,
// and remaining bits are padded to 0 (cf. JIS X 0510:2004 sec 8.7.3).
var putdata = function (matrix, reserved, buf) {
	var n = matrix.length;
	var k = 0, dir = -1;
	for (var i = n - 1; i >= 0; i -= 2) {
		if (i == 6)
			--i; // skip the entire timing pattern column
		var jj = (dir < 0 ? n - 1 : 0);
		for (var j = 0; j < n; ++j) {
			for (var ii = i; ii > i - 2; --ii) {
				if (!reserved[jj][ii]) {
					// may overflow, but (undefined >> x)
					// is 0 so it will auto-pad to zero.
					matrix[jj][ii] = (buf[k >> 3] >> (~k & 7)) & 1;
					++k;
				}
			}
			jj += dir;
		}
		dir = -dir;
	}
	return matrix;
};

// XOR-masks the data portion of the matrix. repeating the call with the same
// arguments will revert the prior call (convenient in the matrix evaluation).
var maskdata = function (matrix, reserved, mask) {
	var maskf = MASKFUNCS[mask];
	var n = matrix.length;
	for (var i = 0; i < n; ++i) {
		for (var j = 0; j < n; ++j) {
			if (!reserved[i][j])
				matrix[i][j] ^= maskf(i, j);
		}
	}
	return matrix;
};

// puts the format information.
var putformatinfo = function (matrix, reserved, ecclevel, mask) {
	var n = matrix.length;
	var code = augumentbch((ecclevel << 3) | mask, 5, 0x537, 10) ^ 0x5412;
	for (var i = 0; i < 15; ++i) {
		var r = [0, 1, 2, 3, 4, 5, 7, 8, n - 7, n - 6, n - 5, n - 4, n - 3, n - 2, n - 1][i];
		var c = [n - 1, n - 2, n - 3, n - 4, n - 5, n - 6, n - 7, n - 8, 7, 5, 4, 3, 2, 1, 0][i];
		matrix[r][8] = matrix[8][c] = (code >> i) & 1;
		// we don't have to mark those bits reserved; always done
		// in makebasematrix above.
	}
	return matrix;
};

// evaluates the resulting matrix and returns the score (lower is better).
// (cf. JIS X 0510:2004 sec 8.8.2)
//
// the evaluation procedure tries to avoid the problematic patterns naturally
// occuring from the original matrix. for example, it penaltizes the patterns
// which just look like the finder pattern which will confuse the decoder.
// we choose the mask which results in the lowest score among 8 possible ones.
//
// note: zxing seems to use the same procedure and in many cases its choice
// agrees to ours, but sometimes it does not. practically it doesn't matter.
var evaluatematrix = function (matrix) {
	// N1+(k-5) points for each consecutive row of k same-colored modules,
	// where k >= 5. no overlapping row counts.
	var PENALTY_CONSECUTIVE = 3;
	// N2 points for each 2x2 block of same-colored modules.
	// overlapping block does count.
	var PENALTY_TWOBYTWO = 3;
	// N3 points for each pattern with >4W:1B:1W:3B:1W:1B or
	// 1B:1W:3B:1W:1B:>4W, or their multiples (e.g. highly unlikely,
	// but 13W:3B:3W:9B:3W:3B counts).
	var PENALTY_FINDERLIKE = 40;
	// N4*k points for every (5*k)% deviation from 50% black density.
	// i.e. k=1 for 55~60% and 40~45%, k=2 for 60~65% and 35~40%, etc.
	var PENALTY_DENSITY = 10;

	var evaluategroup = function (groups) { // assumes [W,B,W,B,W,...,B,W]
		var score = 0;
		for (var i = 0; i < groups.length; ++i) {
			if (groups[i] >= 5)
				score += PENALTY_CONSECUTIVE + (groups[i] - 5);
		}
		for (var i = 5; i < groups.length; i += 2) {
			var p = groups[i];
			if (groups[i - 1] == p && groups[i - 2] == 3 * p && groups[i - 3] == p &&
				groups[i - 4] == p && (groups[i - 5] >= 4 * p || groups[i + 1] >= 4 * p)) {
				// this part differs from zxing...
				score += PENALTY_FINDERLIKE;
			}
		}
		return score;
	};

	var n = matrix.length;
	var score = 0, nblacks = 0;
	for (var i = 0; i < n; ++i) {
		var row = matrix[i];
		var groups;

		// evaluate the current row
		groups = [0]; // the first empty group of white
		for (var j = 0; j < n;) {
			var k;
			for (k = 0; j < n && row[j]; ++k)
				++j;
			groups.push(k);
			for (k = 0; j < n && !row[j]; ++k)
				++j;
			groups.push(k);
		}
		score += evaluategroup(groups);

		// evaluate the current column
		groups = [0];
		for (var j = 0; j < n;) {
			var k;
			for (k = 0; j < n && matrix[j][i]; ++k)
				++j;
			groups.push(k);
			for (k = 0; j < n && !matrix[j][i]; ++k)
				++j;
			groups.push(k);
		}
		score += evaluategroup(groups);

		// check the 2x2 box and calculate the density
		var nextrow = matrix[i + 1] || [];
		nblacks += row[0];
		for (var j = 1; j < n; ++j) {
			var p = row[j];
			nblacks += p;
			// at least comparison with next row should be strict...
			if (row[j - 1] == p && nextrow[j] === p && nextrow[j - 1] === p) {
				score += PENALTY_TWOBYTWO;
			}
		}
	}

	score += PENALTY_DENSITY * ((Math.abs(nblacks / n / n - 0.5) / 0.05) | 0);
	return score;
};

// returns the fully encoded QR code matrix which contains given data.
// it also chooses the best mask automatically when mask is -1.
var generate = function (data, ver, mode, ecclevel, mask) {
	var v = VERSIONS[ver];
	var buf = encode(ver, mode, data, ndatabits(ver, ecclevel) >> 3);
	buf = augumenteccs(buf, v[1][ecclevel], GF256_GENPOLY[v[0][ecclevel]]);

	var result = makebasematrix(ver);
	var matrix = result.matrix, reserved = result.reserved;
	putdata(matrix, reserved, buf);

	if (mask < 0) {
		// find the best mask
		maskdata(matrix, reserved, 0);
		putformatinfo(matrix, reserved, ecclevel, 0);
		var bestmask = 0, bestscore = evaluatematrix(matrix);
		maskdata(matrix, reserved, 0);
		for (mask = 1; mask < 8; ++mask) {
			maskdata(matrix, reserved, mask);
			putformatinfo(matrix, reserved, ecclevel, mask);
			var score = evaluatematrix(matrix);
			if (bestscore > score) {
				bestscore = score;
				bestmask = mask;
			}
			maskdata(matrix, reserved, mask);
		}
		mask = bestmask;
	}

	maskdata(matrix, reserved, mask);
	putformatinfo(matrix, reserved, ecclevel, mask);
	return matrix;
};

// the public interface is trivial; the options available are as follows:
//
// - version: an integer in [1,40]. when omitted (or -1) the smallest possible
//   version is chosen.
// - mode: one of 'numeric', 'alphanumeric', 'octet'. when omitted the smallest
//   possible mode is chosen.
// - eccLevel: one of 'L', 'M', 'Q', 'H'. defaults to 'L'.
// - mask: an integer in [0,7]. when omitted (or -1) the best mask is chosen.
//

function generateFrame(data, options) {
	var MODES = {
		'numeric': MODE_NUMERIC, 'alphanumeric': MODE_ALPHANUMERIC,
		'octet': MODE_OCTET
	};
	var ECCLEVELS = {
		'L': ECCLEVEL_L, 'M': ECCLEVEL_M, 'Q': ECCLEVEL_Q,
		'H': ECCLEVEL_H
	};

	options = options || {};
	var ver = options.version || -1;
	var ecclevel = ECCLEVELS[(options.eccLevel || 'L').toUpperCase()];
	var mode = options.mode ? MODES[options.mode.toLowerCase()] : -1;
	var mask = 'mask' in options ? options.mask : -1;

	if (mode < 0) {
		if (typeof data === 'string') {
			if (data.match(NUMERIC_REGEXP)) {
				mode = MODE_NUMERIC;
			} else if (data.match(ALPHANUMERIC_OUT_REGEXP)) {
				// while encode supports case-insensitive encoding, we restrict the data to be uppercased when auto-selecting the mode.
				mode = MODE_ALPHANUMERIC;
			} else {
				mode = MODE_OCTET;
			}
		} else {
			mode = MODE_OCTET;
		}
	} else if (!(mode == MODE_NUMERIC || mode == MODE_ALPHANUMERIC ||
		mode == MODE_OCTET)) {
		throw 'invalid or unsupported mode';
	}

	data = validatedata(mode, data);
	if (data === null)
		throw 'invalid data format';

	if (ecclevel < 0 || ecclevel > 3)
		throw 'invalid ECC level';

	if (ver < 0) {
		for (ver = 1; ver <= 40; ++ver) {
			if (data.length <= getmaxdatalen(ver, mode, ecclevel))
				break;
		}
		if (ver > 40)
			throw 'too large data for the Qr format';
	} else if (ver < 1 || ver > 40) {
		throw 'invalid Qr version! should be between 1 and 40';
	}

	if (mask != -1 && (mask < 0 || mask > 8))
		throw 'invalid mask';
	//console.log('version:', ver, 'mode:', mode, 'ECC:', ecclevel, 'mask:', mask )
	return generate(data, ver, mode, ecclevel, mask);
}


// options
// - modulesize: a number. this is a size of each modules in pixels, and
//   defaults to 5px.
// - margin: a number. this is a size of margin in *modules*, and defaults to
//   4 (white modules). the specficiation mandates the margin no less than 4
//   modules, so it is better not to alter this value unless you know what
//   you're doing.
function buildCanvas(data, options) {

	var canvas = [];
	var background = options.background || '#fff';
	var foreground = options.foreground || '#000';
	//var margin = options.margin || 4;
	var matrix = generateFrame(data, options);
	var n = matrix.length;
	var modSize = Math.floor(options.fit ? options.fit / n : 5);
	var size = n * modSize;

	canvas.push({
		type: 'rect',
		x: 0, y: 0, w: size, h: size, lineWidth: 0, color: background
	});

	for (var i = 0; i < n; ++i) {
		for (var j = 0; j < n; ++j) {
			if (matrix[i][j]) {
				canvas.push({
					type: 'rect',
					x: modSize * j,
					y: modSize * i,
					w: modSize,
					h: modSize,
					lineWidth: 0,
					color: foreground
				});
			}
		}
	}

	return {
		canvas: canvas,
		size: size
	};

}

function measure(node) {
	var cd = buildCanvas(node.qr, node);
	node._canvas = cd.canvas;
	node._width = node._height = node._minWidth = node._maxWidth = node._minHeight = node._maxHeight = cd.size;
	return node;
}

export default {
	measure: measure
};
