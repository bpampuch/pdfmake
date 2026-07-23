// Renders a Hebrew/RTL test PDF using the new `rtl: true` style and
// auto-bidi for mixed Hebrew/Latin/digit content.
//
// Run from repo root after `npm run build:node`:
//   node examples/rtl_hebrew.js
//
// Output: examples/pdfs/rtl_hebrew.pdf
//
// The example needs a Hebrew-capable font; Roboto (pdfmake's bundled font)
// has no Hebrew glyphs. We download Heebo (SIL-OFL-1.1, Google Fonts) on
// first run and cache it under node_modules/.cache/ - the conventional
// build-tool cache location (webpack, eslint, etc. all use it), which is
// already ignored via the existing `node_modules` rule in .gitignore. So
// subsequent runs (and CI) are offline-only after the first fetch.

var fs = require('fs');
var path = require('path');
var https = require('https');

var FONT_CACHE_DIR = path.join(__dirname, '..', 'node_modules', '.cache', 'pdfmake-examples');
var HEEBO_PATH = path.join(FONT_CACHE_DIR, 'Heebo.ttf');
// Variable TTF from the Google Fonts repository (raw blob via the
// usercontent CDN, which is what github.com/.../raw/... redirects to).
var HEEBO_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/heebo/Heebo%5Bwght%5D.ttf';

function fetchTo(url, dest) {
	return new Promise(function (resolve, reject) {
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		var tmp = dest + '.partial';
		var file = fs.createWriteStream(tmp);
		var req = https.get(url, function (res) {
			// Follow redirects (raw.githubusercontent.com or github.com → CDN)
			if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				file.close();
				try { fs.unlinkSync(tmp); } catch { /* ignore */ }
				fetchTo(res.headers.location, dest).then(resolve, reject);
				return;
			}
			if (res.statusCode !== 200) {
				file.close();
				try { fs.unlinkSync(tmp); } catch { /* ignore */ }
				reject(new Error('Font download failed: HTTP ' + res.statusCode + ' for ' + url));
				return;
			}
			res.pipe(file);
			file.on('finish', function () {
				file.close(function () {
					fs.renameSync(tmp, dest);
					resolve(dest);
				});
			});
		});
		req.on('error', function (err) {
			try { file.close(); fs.unlinkSync(tmp); } catch { /* ignore */ }
			reject(err);
		});
	});
}

async function ensureFont() {
	if (fs.existsSync(HEEBO_PATH) && fs.statSync(HEEBO_PATH).size > 0) return HEEBO_PATH;
	console.log('Downloading Heebo from ' + HEEBO_URL + ' ...');
	await fetchTo(HEEBO_URL, HEEBO_PATH);
	console.log('Cached at ' + HEEBO_PATH);
	return HEEBO_PATH;
}

async function main() {
	await ensureFont();

	var pdfmake = require('../js/index');

	// Heebo is a variable font; pdfkit will embed the default instance for any
	// of the four slots. The example's content uses bold only as an emphasis
	// hint - RTL layout itself doesn't depend on having distinct bold glyphs.
	pdfmake.addFonts({
		Heebo: {
			normal: HEEBO_PATH,
			bold: HEEBO_PATH,
			italics: HEEBO_PATH,
			bolditalics: HEEBO_PATH,
		},
	});

	// Both policies must be set explicitly to silence pdfmake's default stderr
	// warnings - build:examples treats any stderr output from an example as a
	// failure.
	pdfmake.setUrlAccessPolicy(function (url) { return url.startsWith('https://'); });
	pdfmake.setLocalAccessPolicy(function () { return true; });

	var docDefinition = {
		defaultStyle: { font: 'Heebo', fontSize: 12 },
		content: [
			{ text: 'pdfmake - RTL / Hebrew demo', style: 'h' },

			{ text: '1. Pure Hebrew paragraph (rtl: true, default alignment becomes right):', style: 'caption' },
			{
				text: 'שלום עולם. זוהי פסקה בעברית עם כמה מילים כדי לבדוק שבירת שורות וסידור ימין - לשמאל.',
				rtl: true,
				margin: [0, 0, 0, 12],
			},

			{ text: '2. Hebrew with embedded English (rtl: true) - Latin stays upright, line wraps work:', style: 'caption' },
			{
				text: 'בדיקה ארוכה לבחינת שילוב של עברית, אנגלית וספרות. המילה English צריכה להישאר בכיוון שלה גם כשהיא מופיעה באמצע משפט עברי, וגם המספר 12345 צריך להיכתב משמאל לימין כספרות רגילות. בנוסף, נבדוק מה קורה כשיש כמה איים של LTR בתוך פסקה אחת - למשל המילים pdfmake, JavaScript ו־TypeScript באותו משפט עברי, יחד עם הספרות 2026 ושנת 1948. שורה זו אמורה לגלוש למספר שורות, וכל מילה לטינית צריכה להישאר בקצה ה־visual שלה הנכון, גם בקצה השורה.',
				rtl: true,
				margin: [0, 0, 0, 12],
			},

			{ text: '3. LTR paragraph with embedded Hebrew (no rtl flag) - Hebrew reorders correctly:', style: 'caption' },
			{
				text: 'Here is some Hebrew embedded inline: שלום עולם, in the middle of an English sentence.',
				margin: [0, 0, 0, 12],
			},

			{ text: '4. Pure Hebrew, explicit center alignment:', style: 'caption' },
			{
				text: 'פסקה ממורכזת בעברית.',
				rtl: true,
				alignment: 'center',
				margin: [0, 0, 0, 12],
			},

			{ text: '4b. Hebrew with brackets and quotes (bidi mirroring):', style: 'caption' },
			{
				text: 'דוגמה לסוגריים: (טקסט בסוגריים) וגם [סוגריים מרובעים] וגם {מסולסלים}, ולסיום «גרשיים».',
				rtl: true,
				margin: [0, 0, 0, 12],
			},

			{ text: '5. Hebrew styled with bold + larger size:', style: 'caption' },
			{
				text: [
					{ text: 'כותרת: ', bold: true, fontSize: 16 },
					{ text: 'מסמך לדוגמה' },
				],
				rtl: true,
				margin: [0, 0, 0, 12],
			},

			{ text: '6. Multi-line wrapping in Hebrew (long paragraph):', style: 'caption' },
			{
				text: 'לורם איפסום בעברית: זוהי פסקה ארוכה במיוחד שמטרתה לבדוק שבירת שורות אוטומטית של pdfmake כאשר הטקסט הוא ימין-לשמאל. כל מילה אמורה להיכנס במקומה הנכון, ושורות חדשות צריכות להתחיל בקצה הימני של עמוד המסמך. אם הכל עובד, הפסקה הזו תיראה כמו טקסט עברי רגיל.',
				rtl: true,
				margin: [0, 0, 0, 12],
			},

			{ text: '7. RTL table - declared columns [name, description, price] appear visually right-to-left:', style: 'caption' },
			{
				rtl: true,
				table: {
					headerRows: 1,
					widths: [80, '*', 60],
					body: [
						[
							{ text: 'שם', bold: true, alignment: 'center' },
							{ text: 'תיאור', bold: true, alignment: 'center' },
							{ text: 'מחיר', bold: true, alignment: 'center' },
						],
						[
							{ text: 'תפוח' },
							{ text: 'פרי אדום או ירוק, מתוק וטעים' },
							{ text: '₪3.50' },
						],
						[
							{ text: 'בננה' },
							{ text: 'פרי טרופי צהוב' },
							{ text: '₪2.00' },
						],
						[
							{ text: 'תפוז' },
							{ text: 'פרי הדר עסיסי, מקור מצוין לויטמין C' },
							{ text: '₪4.20' },
						],
					],
				},
			},

			{ text: '8. RTL ordered list - numbers on the right:', style: 'caption' },
			{
				rtl: true,
				ol: [
					'תפוח אדום, מתוק וקריר',
					'בננה טרופית מבושלת בשמש',
					'תפוז עסיסי מהגליל',
				],
			},

			{ text: '8b. RTL nested ordered list - sub-list markers should be indented inward:', style: 'caption' },
			{
				rtl: true,
				ol: [
					'תפוח אדום',
					{ text: 'פרי עם תת-רשימה', ol: ['תת-פריט ראשון', 'תת-פריט שני', 'תת-פריט שלישי ארוך יותר'] },
					'בננה טרופית',
					{ text: 'עוד פריט עם תת-רשימה', ol: ['תפוז', 'אשכולית', 'לימון', 'מלון', 'אבטיח', 'תות', 'פטל', 'אוכמנית', 'דובדבן', 'מנגו'] },
					'תפוז עסיסי',
				],
			},

			{ text: '9. RTL bullet list:', style: 'caption' },
			{
				rtl: true,
				ul: [
					'נקודה ראשונה ברשימה',
					'נקודה שנייה ברשימה - מעט ארוכה יותר כדי שנראה גם גלישה של שורות על מנת שנוכל לראות ר"ת וגם איך נראית השורה השניה בפסקה כזו',
					'נקודה שלישית עם English ו־12345 בתוכה',
				],
			},

			{ text: '10. RTL paragraph with justify alignment - both edges should align to margins:', style: 'caption' },
			{
				rtl: true,
				alignment: 'justify',
				text: 'פסקה עברית ארוכה במיוחד לבחינת יישור דו־צדדי (justify). ההיגיון של justify הוא להוסיף רווחים מאוזנים בין מילים כך ששני הקצוות של כל שורה נוגעים בדיוק בשוליים - ימין ושמאל. בעברית, הקצה הימני הוא תחילת הפסקה הלוגית, והקצה השמאלי הוא הסוף הלוגי שלה. כשהפסקה ארוכה דיה כדי להישבר למספר שורות, אפשר לראות שכל שורה (מלבד האחרונה) משתרעת לכל רוחב הפסקה ללא רווח עודף בקצוות. השורה האחרונה של פסקה ב־justify לא מותחת - היא נשארת ביישור הטבעי של הפסקה (ימין, במקרה שלנו). אם הכל עובד נכון, נראה שהמילים מפוזרות באופן אחיד, ושאין מצב שבו מילה אחת באמצע השורה נשארת תקועה בקצה תחת רווח עודף. לורם איפסום בעברית: דוגמה דוגמה דוגמה דוגמה דוגמה דוגמה דוגמה דוגמה דוגמה דוגמה.',
				margin: [0, 0, 0, 12],
			},

			{ text: '11. RTL table of contents - titles on the right, page numbers on the left:', style: 'caption', pageBreak: 'before' },
			{ rtl: true, toc: { title: { text: 'תוכן עניינים', style: 'h' } } },
			{ text: 'פרק ראשון', style: 'h', tocItem: true, pageBreak: 'before' },
			{ rtl: true, text: 'תוכן הפרק הראשון.' },
			{ text: 'פרק שני', style: 'h', tocItem: true, pageBreak: 'before' },
			{ rtl: true, text: 'תוכן הפרק השני.' },
		],
		styles: {
			h: { fontSize: 18, bold: true, margin: [0, 0, 0, 12] },
			caption: { fontSize: 10, italics: true, color: '#555', margin: [0, 8, 0, 4] },
		},
	};

	var outPath = path.join(__dirname, 'pdfs', 'rtl_hebrew.pdf');
	await pdfmake.createPdf(docDefinition).write(outPath);
	console.log('Wrote ' + outPath);
}

main().catch(function (err) {
	console.error(err);
	process.exit(1);
});
