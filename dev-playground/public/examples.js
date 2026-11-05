export const examples = [
  { id: 'welcome', title: '01 · First document', docs: 'getting-started/client-side/', source: `// Define a fresh document in dd. Ctrl/⌘ + Enter to run.
var dd = {
  content: [
    { text: 'Make something clear.', fontSize: 30, bold: true, color: '#08786b', margin: [0, 0, 0, 16] },
    'A paragraph, a table, a report. Start here and make it yours.',
    { text: 'Built with pdfmake', italics: true, color: '#667d73', margin: [0, 20, 0, 0] }
  ]
};` },
  { id: 'invoice', title: '02 · Invoice', docs: 'guides/invoice/', source: `var items = [
  ['Design services', 2, 125],
  ['Document review', 1, 75]
];
var total = items.reduce((sum, row) => sum + row[1] * row[2], 0);
var dd = {
  info: { title: 'Invoice INV-001' },
  footer: (page, pages) => ({ text: 'Page ' + page + ' of ' + pages, alignment: 'center', fontSize: 9 }),
  content: [
    { text: 'INVOICE', style: 'title' },
    { columns: ['Example Studio', { text: 'INV-001', alignment: 'right' }], margin: [0, 0, 0, 24] },
    { layout: 'lightHorizontalLines', table: {
      headerRows: 1, widths: ['*', 'auto', 'auto'],
      body: [['Service', 'Qty', 'EUR'], ...items.map(row => [row[0], row[1], row[2].toFixed(2)])]
    } },
    { text: 'Total: ' + total.toFixed(2) + ' EUR', bold: true, alignment: 'right', margin: [0, 20, 0, 0] }
  ],
  styles: { title: { fontSize: 28, bold: true, color: '#08786b', margin: [0, 0, 0, 12] } }
};` },
  { id: 'tables', title: '03 · Tables & repeating headers', docs: 'document-definition-object/tables/', source: `var rows = Array.from({ length: 65 }, (_, i) => [
  'Item ' + (i + 1), 'A row that can continue across pages', String(i + 1)
]);
var dd = {
  content: [
    { text: 'A longer table', fontSize: 24, bold: true, margin: [0, 0, 0, 16] },
    { layout: 'lightHorizontalLines', table: {
      headerRows: 1, widths: [70, '*', 40],
      body: [[{ text: 'Item', bold: true }, { text: 'Description', bold: true }, { text: 'Qty', bold: true }], ...rows]
    } }
  ]
};` },
  { id: 'styles', title: '04 · Text & named styles', docs: 'document-definition-object/styling/', source: `var dd = {
  content: [
    { text: 'Style with intent', style: 'heading' },
    { text: ['One paragraph with ', { text: 'bold', bold: true }, ' and ', { text: 'italic', italics: true }, ' inline text.'] },
    { text: 'A reusable note style.', style: 'note' },
    { ul: ['Readable defaults', 'Small style dictionaries', 'Consistent spacing'], margin: [0, 12, 0, 0] }
  ],
  defaultStyle: { fontSize: 12, lineHeight: 1.3 },
  styles: {
    heading: { fontSize: 26, bold: true, color: '#08786b', margin: [0, 0, 0, 18] },
    note: { fontSize: 10, color: '#536771', margin: [0, 12, 0, 0] }
  }
};` },
  { id: 'columns', title: '05 · Columns & stacks', docs: 'document-definition-object/columns/', source: `var dd = {
  content: [
    { text: 'Two perspectives', fontSize: 26, bold: true, margin: [0, 0, 0, 20] },
    { columnGap: 24, columns: [
      { width: '*', stack: [{ text: 'The essentials', bold: true }, 'This column takes an equal share of the available width.', { ul: ['Text', 'Lists', 'Nested blocks'] }] },
      { width: '*', stack: [{ text: 'The details', bold: true }, 'Use fixed widths, auto widths or star widths to describe your layout.'] }
    ] }
  ]
};` },
  { id: 'spans', title: '06 · Merged table cells', docs: 'document-definition-object/tables/', source: `var dd = {
  content: [{ table: {
    widths: ['*', '*', '*'],
    body: [
      [{ text: 'A shared heading', colSpan: 3, bold: true, fillColor: '#e4f2eb' }, {}, {}],
      [{ text: 'Two rows', rowSpan: 2 }, 'A', 'B'],
      [{}, 'C', 'D']
    ]
  } }]
};` },
  { id: 'pages', title: '07 · Headers, footers & page breaks', docs: 'document-definition-object/headers-footers/', source: `var dd = {
  pageSize: 'A4', pageMargins: [40, 60, 40, 60],
  header: { text: 'EXAMPLE REPORT', margin: [40, 20, 0, 0], color: '#536771', fontSize: 9 },
  footer: (page, pages) => ({ text: page + ' / ' + pages, alignment: 'center', fontSize: 9 }),
  content: [
    { text: 'Chapter one', fontSize: 26, bold: true },
    'Start on the first page.',
    { text: 'Chapter two', pageBreak: 'before', fontSize: 26, bold: true },
    'This block begins on a new page.'
  ]
};` },
  { id: 'vectors', title: '08 · SVG & QR codes', docs: 'document-definition-object/svgs/', source: `var dd = {
  content: [
    { text: 'Small vectors. Sharp output.', fontSize: 24, bold: true, margin: [0, 0, 0, 20] },
    { svg: '<svg width="240" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="100" rx="12" fill="#08786b"/><circle cx="120" cy="50" r="30" fill="#e4f2eb"/></svg>', width: 240 },
    { qr: 'https://pdfmake.github.io/docs/0.3/', fit: 110, margin: [0, 24, 0, 12] },
    'The QR code encodes a URL; it does not fetch it.'
  ]
};` },
  { id: 'images', title: '09 · Embedded images', docs: 'document-definition-object/images/', source: `var dd = {
  images: { pixel: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAF0lEQVR4nGPgqMgmCTGMahjVkD1sNQAAjRnrAVbW+rcAAAAASUVORK5CYII=' },
  content: [
    { text: 'One resource, several uses', fontSize: 24, bold: true, margin: [0, 0, 0, 18] },
    'Use the images dictionary to reuse embedded PNG or JPEG data.',
    { image: 'pixel', width: 30, margin: [0, 15, 0, 15] },
    { image: 'pixel', fit: [60, 60] }
  ]
};` },
  { id: 'lists', title: '10 · Lists & links', docs: 'document-definition-object/lists/', source: `var dd = {
  content: [
    { text: 'A clear sequence', fontSize: 26, bold: true },
    { ol: ['Configure fonts', 'Build a fresh definition', 'Await the output'], margin: [0, 16, 0, 20] },
    { ul: ['No manual text positioning', { stack: ['Nested choices', { ul: ['Tables', 'Columns', 'Stacks'] }] }] },
    { text: 'Read the reference', link: 'https://pdfmake.github.io/docs/0.3/', color: '#08786b', margin: [0, 20, 0, 0] }
  ]
};` }
];
