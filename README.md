pdfmake [![Build Status](https://travis-ci.org/bpampuch/pdfmake.png?branch=master)](https://travis-ci.org/bpampuch/pdfmake) [![NPM version](https://badge.fury.io/js/pdfmake.png)](http://badge.fury.io/js/pdfmake) [![Bower version](https://badge.fury.io/bo/pdfmake.png)](http://badge.fury.io/bo/pdfmake)
=======

Client/server side PDF printing in pure JavaScript

Check out [the playground](http://bpampuch.github.io/pdfmake/playground.html) or... (coming soon - read the docs)

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
* page headers and footers,
* page dimensions and orientations,
* margins,
* custom page breaks,
* font embedding,
* support for complex, multi-level (nested) structures,
* helper methods for opening/printing/downloading the generated PDF.

## Getting Started (preliminary version)
The following refers to pdfmake 0.1.2 (not available yet at github).

This document will walk you through the basics of pdfmake and will show you how to create PDF files in the browser. If you're interested in server-side printing, read [getting started with pdfMake under NodeJS](NodeGettingStarted).

To begin with the default configuration, you should include two files:

* **pdfmake.min.js**,
* **vfs_fonts.js** - default font definition (it contains Roboto, you can however [use custom fonts instead](CustomFonts))

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

You can get both files using bower:
```
bower install pdfmake
```

or copy them directly from the build directory from the repository.

### Document-definition-object

pdfmake follows a declarative approach. It basically means, you'll never have to calculate positions manually or use commands like: ```writeText(text, x, y)```, ```moveDown``` etc..., as you would with a lot of other libraries.

The most fundamental concept to be mastered is the document-definition-object which can be as simple as:

```js
var docDefinition = { content: 'This is an sample PDF printed with pdfMake' };
```

or become pretty complex (having multi-level tables, images, lists, paragraphs, margins, styles etc...).

As soon as you have the document-definition-object, you're ready to create and open/print/download the PDF:

```js
// open the PDF in a new window
pdfMake.createPdf(docDefinition).open();

// print the PDF
pdfMake.createPdf(docDefinition).print();

// download the PDF
pdfMake.createPdf(docDefinition).download();
```

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
      italic: true,
      alignment: 'right'
    }
  }
};

```

To have a deeper understanding of styling in pdfmake check [this example](TODO) and [the resulting PDF](TODO).

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
        }
      ],
      // optional space between columns
      columnGap: 10
    },
    'This paragraph goes below all columns and has full width'
  ]
};

```

Column content is not limited to a simple text. It can actually contain any valid pdfmake element. See a [complete example](TODO) and [the resulting pdf](TODO)


* numbered and bulleted lists,
* tables and columns
 * auto/fixed/star-sized widths,
 * col-spans and row-spans,
 * headers automatically repeated in case of a page-break,
* images and vector graphics,
* page headers and footers,
* page dimensions and orientations,
* margins,
* custom page breaks,
* support for complex, multi-level (nested) structures,
* ability to open files directly in a print-dialog.


## License
MIT

-------

pdfmake is based on a truly amazing library pdfkit.org - credits to @devongovett
