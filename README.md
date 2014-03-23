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
* ability to open files directly in a print-dialog.

## Getting Started (preliminary version)
This section refers to pdfmake 0.1.2 (not pushed to the git repository yet).

For current version see [the examples](https://github.com/bpampuch/pdfmake/tree/master/examples) or open [playground](http://bpampuch.github.io/pdfmake/playground.html). 

This document will walk you through the basics of pdfmake and will show you how to create PDF files in the browser. If you prefer server-side printing, [read this](NodeGettingStarted).

To begin with the default configuration, you should include **pdfmake** and **vfs_fonts**:

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

You can get these files using bower:
```
bower install pdfmake
```

or yeoman
```
TODO
```

or copy them directly from the build directory from the repository.

### Document-definition-object

pdfmake follows a declarative approach. It basically means, you'll never have to calculate positions manually or use commands like: ```writeText(text, x, y)``` or ```moveDown``` as you would with a lot of other libraries.

The most fundamental concept to be mastered is the document-definition-object which can be as simple as:

```js
var doc = { content: 'Some text' }
```

or get pretty complex (having multi-level tables, images, lists, paragraphs, margins, styles etc...).

As soon as you have the document-definition-object ready, you create an instance of PdfPrinter and call ```createPdfKitDocument```

```js
var printer = new PdfPrinter();
var doc = printer.createPdfKitDocument(doc);

// to make this demo simple, we'll just open the document in the same tab
doc.output(function(data) {
	var dataUrl = 'data:application/pdf;base64,' + data.toString('base64');
	window.open(dataUrl); 
});
```




## License
MIT

-------

pdfmake is based on a truly amazing library pdfkit.org - credits to @devongovett
