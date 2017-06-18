# pdfmake [![Build Status][travis_img]][travis_url] [![GitHub][github_img]][github_url] [![npm][npm_img]][npm_url] [![Bower][bower_img]][bower_url] [![Packagist][packagist_img]][packagist_url] [![CDNJS][cdnjs_img]][cndjs_url]

[travis_img]: https://travis-ci.org/bpampuch/pdfmake.png?branch=master
[travis_url]: https://travis-ci.org/bpampuch/pdfmake

[github_img]: https://img.shields.io/github/release/bpampuch/pdfmake.svg
[github_url]: https://github.com/bpampuch/pdfmake/releases/latest

[npm_img]: https://img.shields.io/npm/v/pdfmake.svg?colorB=0E7FBF
[npm_url]: https://www.npmjs.com/package/pdfmake

[bower_img]: https://img.shields.io/bower/v/pdfmake.svg?colorB=0E7FBF
[bower_url]: https://github.com/bpampuch/pdfmake

[packagist_img]: https://img.shields.io/packagist/v/bpampuch/pdfmake.svg?colorB=0E7FBF
[packagist_url]: https://packagist.org/packages/bpampuch/pdfmake

[cdnjs_img]: https://img.shields.io/cdnjs/v/pdfmake.svg?colorB=0E7FBF
[cndjs_url]: https://cdnjs.com/libraries/pdfmake


Client/server side PDF printing in pure JavaScript

Check out [the playground](http://bpampuch.github.io/pdfmake/playground.html) and [examples](https://github.com/bpampuch/pdfmake/tree/master/examples).

### Features

* line-wrapping,
* text-alignments (left, right, centered, justified),
* numbered and bulleted lists,
* tables and columns
  * auto/fixed/star-sized widths,
  * col-spans and row-spans,
  * headers automatically repeated in case of a page-break,
* images and vector graphics,
* convenient styling and style inheritance,
* page headers and footers:
  * static or dynamic content,
  * access to current page number and page count,
* background-layer,
* page dimensions and orientations,
* margins,
* custom page breaks,
* font embedding,
* support for complex, multi-level (nested) structures,
* table of contents,
* helper methods for opening/printing/downloading the generated PDF,
* setting of PDF metadata (e.g. author, subject).

## Getting Started

This document will walk you through the basics of pdfmake and will show you how to create PDF files in the browser. If you're interested in server-side printing check the examples folder.

To begin with the default configuration, you should include two files:

* **pdfmake.min.js**,
* **vfs_fonts.js** - default font definition (it contains Roboto, you can however [use custom fonts instead](https://github.com/bpampuch/pdfmake/wiki/Custom-Fonts---client-side))

```html
<!doctype html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>my first pdfmake example</title>
  <script src='build/pdfmake.min.js'></script>
  <script src='build/vfs_fonts.js'></script>
</head>
<body>
...
```

You can get both files using npm (server-side and client-side):
```
npm install pdfmake
```
 * for server-side use `require('pdfmake');`
 * for client-side use `require('pdfmake/build/pdfmake.js');` and `require('pdfmake/build/vfs_fonts.js');`

or bower (client-side):
```
bower install pdfmake
```

or copy them directly from the build directory from the repository. Otherwise you can always [build it from sources](#building-from-sources).

### Supported browsers

See [issue](https://github.com/bpampuch/pdfmake/issues/800).

### Document-definition-object

pdfmake follows a declarative approach. It basically means, you'll never have to calculate positions manually or use commands like: ```writeText(text, x, y)```, ```moveDown``` etc..., as you would with a lot of other libraries.

The most fundamental concept to be mastered is the document-definition-object which can be as simple as:

```js
var docDefinition = { content: 'This is an sample PDF printed with pdfMake' };
```

or become pretty complex (having multi-level tables, images, lists, paragraphs, margins, styles etc...).

As soon as you have the document-definition-object, you're ready to create and download/open/print the PDF:
```js
pdfMake.createPdf(docDefinition).download();

pdfMake.createPdf(docDefinition).open();

pdfMake.createPdf(docDefinition).print();
```
Details in the next chapters.

#### Download the PDF
```js
pdfMake.createPdf(docDefinition).download();
```
Parameters:
* `defaultFileName` _(optional)_ - file name
* `cb` _(optional)_ - callback function
* `options` _(optional)_

#### Open the PDF in a new window
```js
pdfMake.createPdf(docDefinition).open();
```
Parameters:
* `options` _(optional)_
* `win` _(optional)_ - window (when an asynchronous operation)

Name can be defined only by using metadata `title` property (see [Document metadata](#document-metadata)).

Asynchronous example:
```js
$scope.generatePdf = function() {
  // create the window before the callback
  var win = window.open('', '_blank');
  $http.post('/someUrl', data).then(function(response) {
    // pass the "win" argument
    pdfMake.createPdf(docDefinition).open({}, win);
  });
};
```

#### Print the PDF
```js
pdfMake.createPdf(docDefinition).print();
```
Parameters:
* `options` _(optional)_
* `win` _(optional)_ - window (when an asynchronous operation)

Asynchronous example:
```js
$scope.generatePdf = function() {
  // create the window before the callback
  var win = window.open('', '_blank');
  $http.post('/someUrl', data).then(function(response) {
    // pass the "win" argument
    pdfMake.createPdf(docDefinition).print({}, win);
  });
};
```

#### Put the PDF into your own page as URL data
```js
const pdfDocGenerator = pdfMake.createPdf(docDefinition);
pdfDocGenerator.getDataUrl((dataUrl) => {
	const targetElement = document.querySelector('#iframeContainer');
	const iframe = document.createElement('iframe');
	iframe.src = dataUrl;
	targetElement.appendChild(iframe);
});
```
Parameters:
* `cb` - callback function
* `options` _(optional)_

#### Get the PDF as base64 data
```js
const pdfDocGenerator = pdfMake.createPdf(docDefinition);
pdfDocGenerator.getBase64((data) => {
	alert(data);
});
```
Parameters:
* `cb` - callback function
* `options` _(optional)_

#### Get the PDF as buffer
```js
const pdfDocGenerator = pdfMake.createPdf(docDefinition);
pdfDocGenerator.getBuffer((buffer) => {
	// ...
});
```
Parameters:
* `cb` - callback function
* `options` _(optional)_

#### Using javascript frameworks
For Ionic and Angular see [issue](https://github.com/bpampuch/pdfmake/issues/1030).

#### Server side

see [examples](https://github.com/bpampuch/pdfmake/tree/master/examples) and [dev-playground server script](https://github.com/bpampuch/pdfmake/blob/master/dev-playground/server.js)

#### Styling
pdfmake makes it possible to style any paragraph or its part:

```js
var docDefinition = {
  content: [
    // if you don't need styles, you can use a simple string to define a paragraph
    'This is a standard paragraph, using default style',

    // using a { text: '...' } object lets you set styling properties
    { text: 'This paragraph will have a bigger font', fontSize: 15 },

    // if you set the value of text to an array instead of a string, you'll be able
    // to style any part individually
    {
      text: [
        'This paragraph is defined as an array of elements to make it possible to ',
        { text: 'restyle part of it and make it bigger ', fontSize: 15 },
        'than the rest.'
      ]
    }
  ]
};
```

#### Style dictionaries
It's also possible to define a dictionary of reusable styles:

```js
var docDefinition = {
  content: [
    { text: 'This is a header', style: 'header' },
    'No styling here, this is a standard paragraph',
    { text: 'Another text', style: 'anotherStyle' },
    { text: 'Multiple styles applied', style: [ 'header', 'anotherStyle' ] }
  ],

  styles: {
    header: {
      fontSize: 22,
      bold: true
    },
    anotherStyle: {
      italics: true,
      alignment: 'right'
    }
  }
};

```

To have a deeper understanding of styling in pdfmake, style inheritance and local-style-overrides check STYLES1, STYLES2 and STYLES3 examples in playground.

#### Columns

By default paragraphs are rendered as a vertical stack of elements (one below another). It is possible however to divide available space into columns.

```js
var docDefinition = {
  content: [
    'This paragraph fills full width, as there are no columns. Next paragraph however consists of three columns',
    {
      columns: [
        {
          // auto-sized columns have their widths based on their content
          width: 'auto',
          text: 'First column'
        },
        {
          // star-sized columns fill the remaining space
          // if there's more than one star-column, available width is divided equally
          width: '*',
          text: 'Second column'
        },
        {
          // fixed width
          width: 100,
          text: 'Third column'
        },
        {
          // % width
          width: '20%',
          text: 'Fourth column'
        }
      ],
      // optional space between columns
      columnGap: 10
    },
    'This paragraph goes below all columns and has full width'
  ]
};

```

Column content is not limited to a simple text. It can actually contain any valid pdfmake element. Make sure to look at the COLUMNS example in playground.

#### Tables

Conceptually tables are similar to columns. They can however have headers, borders and cells spanning over multiple columns/rows.

```js
var docDefinition = {
  content: [
    {
      layout: 'lightHorizontalLines', // optional
      table: {
        // headers are automatically repeated if the table spans over multiple pages
        // you can declare how many rows should be treated as headers
        headerRows: 1,
        widths: [ '*', 'auto', 100, '*' ],

        body: [
          [ 'First', 'Second', 'Third', 'The last one' ],
          [ 'Value 1', 'Value 2', 'Value 3', 'Value 4' ],
          [ { text: 'Bold value', bold: true }, 'Val 2', 'Val 3', 'Val 4' ]
        ]
      }
    }
  ]
};
```

##### Own table layouts

Own table layouts must be defined before calling `pdfMake.createPdf(docDefinition)`.
```js
pdfMake.tableLayouts = {
  exampleLayout: {
    hLineWidth: function (i, node) {
      if (i === 0 || i === node.table.body.length) {
        return 0;
      }
      return (i === node.table.headerRows) ? 2 : 1;
    },
    vLineWidth: function (i) {
      return 0;
    },
    hLineColor: function (i) {
      return i === 1 ? 'black' : '#aaa';
    },
    paddingLeft: function (i) {
      return i === 0 ? 0 : 8;
    },
    paddingRight: function (i, node) {
      return (i === node.table.widths.length - 1) ? 0 : 8;
    }
  }
};

// download the PDF
pdfMake.createPdf(docDefinition).download();
```

All concepts related to tables are covered by TABLES example in playground.

#### Lists

pdfMake supports both numbered and bulleted lists:

```js
var docDefinition = {
  content: [
    'Bulleted list example:',
    {
      // to treat a paragraph as a bulleted list, set an array of items under the ul key
      ul: [
        'Item 1',
        'Item 2',
        'Item 3',
        { text: 'Item 4', bold: true },
      ]
    },

    'Numbered list example:',
    {
      // for numbered lists set the ol key
      ol: [
        'Item 1',
        'Item 2',
        'Item 3'
      ]
    }
  ]
};
```

#### Headers and footers

Page headers and footers in pdfmake can be: *static* or *dynamic*.

They use the same syntax:

```js
var docDefinition = {
  header: 'simple text',

  footer: {
    columns: [
      'Left part',
      { text: 'Right part', alignment: 'right' }
    ]
  },

  content: (...)
};
```

For dynamically generated content (including page numbers, page count and page size) you can pass a function to the header or footer:

```js
var docDefinition = {
  footer: function(currentPage, pageCount) { return currentPage.toString() + ' of ' + pageCount; },
  header: function(currentPage, pageCount, pageSize) {
    // you can apply any logic and return any valid pdfmake element

    return [
      { text: 'simple text', alignment: (currentPage % 2) ? 'left' : 'right' },
      { canvas: [ { type: 'rect', x: 170, y: 32, w: pageSize.width - 170, h: 40 } ] }
    ]
  },
  (...)
};
```

#### Background-layer

The background-layer will be added on every page.

```js
var docDefinition = {
  background: 'simple text',

  content: (...)
};
```

It may contain any other object as well (images, tables, ...) or be dynamically generated:

```js
var docDefinition = {
  background: function(currentPage) {
    return 'simple text on page ' + currentPage
  },

  content: (...)
};
```

#### Margins

Any element in pdfMake can have a margin:

```js
(...)
// margin: [left, top, right, bottom]
{ text: 'sample', margin: [ 5, 2, 10, 20 ] },

// margin: [horizontal, vertical]
{ text: 'another text', margin: [5, 2] },

// margin: equalLeftTopRightBottom
{ text: 'last one', margin: 5 }
(...)
```

#### Stack of paragraphs

You could have figured out by now (from the examples), that if you set the ```content``` key to an array, the  document becomes a stack of paragraphs.

You'll quite often reuse this structure in a nested element, like in the following example:
```js
var docDefinition = {
  content: [
    'paragraph 1',
    'paragraph 2',
    {
      columns: [
        'first column is a simple text',
        [
          // second column consists of paragraphs
          'paragraph A',
          'paragraph B',
          'these paragraphs will be rendered one below another inside the column'
        ]
      ]
    }
  ]
};
```

The problem with an array is that you cannot add styling properties to it (to change fontSize for example).

The good news is - array is just a shortcut in pdfMake for { stack: [] }, so if you want to restyle the whole stack, you can do it using the expanded definition:
```js
var docDefinition = {
  content: [
    'paragraph 1',
    'paragraph 2',
    {
      columns: [
        'first column is a simple text',
        {
          stack: [
            // second column consists of paragraphs
            'paragraph A',
            'paragraph B',
            'these paragraphs will be rendered one below another inside the column'
          ],
          fontSize: 15
        }
      ]
    }
  ]
};
```

#### Images

This is simple. Just use the ```{ image: '...' }``` node type.

JPEG and PNG formats are supported.

```js
var docDefinition = {
  content: [
    {
      // you'll most often use dataURI images on the browser side
      // if no width/height/fit is provided, the original size will be used
      image: 'data:image/jpeg;base64,...encodedContent...'
    },
    {
      // if you specify width, image will scale proportionally
      image: 'data:image/jpeg;base64,...encodedContent...',
      width: 150
    },
    {
      // if you specify both width and height - image will be stretched
      image: 'data:image/jpeg;base64,...encodedContent...',
      width: 150,
      height: 150
    },
    {
      // you can also fit the image inside a rectangle
      image: 'data:image/jpeg;base64,...encodedContent...',
      fit: [100, 100]
    },
    {
      // if you reuse the same image in multiple nodes,
      // you should put it to to images dictionary and reference it by name
      image: 'mySuperImage'
    },
    {
      // under NodeJS (or in case you use virtual file system provided by pdfmake)
      // you can also pass file names here
      image: 'myImageDictionary/image1.jpg'
    }
  ],

  images: {
    mySuperImage: 'data:image/jpeg;base64,...content...'
  }
};
```

#### Links

To add external or internal links, use the following syntax:
```
{text: 'google', link: 'http://google.com'}
{text:'Go to page 2', linkToPage: 2}
```

#### Table of contents

```js
var docDefinition = {
  content: [
    {
      toc: {
        // id: 'mainToc'  // optional
        title: {text: 'INDEX', style: 'header'}
      }
    },
    {
      text: 'This is a header',
      style: 'header',
      tocItem: true, // or tocItem: 'mainToc' if is used id in toc
      // or tocItem: ['mainToc', 'subToc'] for multiple tocs
    }
  ]
}
```


#### Page dimensions, orientation and margins

```js
var docDefinition = {
  // a string or { width: number, height: number }
  pageSize: 'A5',

  // by default we use portrait, you can change it to landscape if you wish
  pageOrientation: 'landscape',

  // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
  pageMargins: [ 40, 60, 40, 60 ],
};
```

If you set ```pageSize``` to a string, you can use one of the following values:
* '4A0', '2A0', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10',
* 'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10',
* 'C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10',
* 'RA0', 'RA1', 'RA2', 'RA3', 'RA4',
* 'SRA0', 'SRA1', 'SRA2', 'SRA3', 'SRA4',
* 'EXECUTIVE', 'FOLIO', 'LEGAL', 'LETTER', 'TABLOID'

To change page orientation within a document, add a page break with the new page orientation.

```js
{
  pageOrientation: 'portrait',
  content: [
    {text: 'Text on Portrait'},
    {text: 'Text on Landscape', pageOrientation: 'landscape', pageBreak: 'before'},
    {text: 'Text on Landscape 2', pageOrientation: 'portrait', pageBreak: 'after'},
    {text: 'Text on Portrait 2'},
  ]
}
```

#### Document Metadata

PDF documents can have various metadata associated with them, such as the title, or author
of the document. You can add that information by adding it to the document definition

```js
var docDefinition = {
  info: {
	title: 'awesome Document',
	author: 'john doe',
	subject: 'subject of document',
	keywords: 'keywords for document',
  },
  content:  'This is an sample PDF printed with pdfMake'
}
```

Standard properties:
* **title** - the title of the document
* **author** - the name of the author
* **subject** - the subject of the document
* **keywords** - keywords associated with the document
* **creator** - the creator of the document (default is 'pdfmake')
* **producer** - the producer of the document (default is 'pdfmake')
* **creationDate** - the date the document was created (added automatically by pdfmake)
* **modDate** - the date the document was last modified
* **trapped** - the trapped flag in a PDF document indicates whether the document has been "trapped"

Custom properties:

You can add custom properties. Key of property not contain spaces.


#### Compression

Compression of PDF is enabled by default, use `compress: false` for disable:

```js
var docDefinition = {
  compress: false,

  content: (...)
};
```

## Building from sources

```
git clone https://github.com/bpampuch/pdfmake.git
cd pdfmake
npm install # or: yarn
git submodule update --init  libs/FileSaver.js
npm run build # or: yarn run build
```

## Coming soon
Hmmm... let me know what you need ;)

The goal is quite simple - make pdfmake useful for a looooooooot of people and help building responsive HTML5 apps with printing support.

There's one thing on the roadmap for v2 (no deadline however) - make the library hackable, so you can write plugins to:
* extend document-definition-model (with things like { chart: ... }),
* add syntax translators (like the provided [ ... ] -> { stack: [ ... ] }
* build custom DSLs on top of document-definition-model (this is actually possible at the moment).


## License
MIT

## Authors
* [@bpampuch](https://github.com/bpampuch) (founder)
* [@liborm85](https://github.com/liborm85)

pdfmake is based on a truly amazing library [pdfkit](https://github.com/devongovett/pdfkit) (credits to [@devongovett](https://github.com/devongovett)).

Thanks to all contributors.
