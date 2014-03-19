var ColumnCalculator = require('./columnCalculator');

function TableProcessor(tableNode) {
  this.tableNode = tableNode;
}

TableProcessor.prototype.beginTable = function(writer) {
  var tableNode;
  var availableWidth;
  var self = this;

  tableNode = this.tableNode;
  this.offsets = tableNode._offsets;
  this.layout = tableNode._layout;

  availableWidth = writer.context.availableWidth - this.offsets.total;
  ColumnCalculator.buildColumnWidths(tableNode.table.widths, availableWidth);

  this.tableWidth = tableNode._offsets.total + getTableInnerContentWidth();
  this.rowSpanData = prepareRowSpanData();

  this.headerRows = tableNode.table.headerRows || 0;
  this.rowsWithoutPageBreak = this.headerRows + (tableNode.table.keepWithHeaderRows || 0);

  if (this.rowsWithoutPageBreak) {
    writer.beginUnbreakableBlock();
  }

  this.drawHorizontalLine(0, writer);

  function getTableInnerContentWidth() {
    var width = 0;

    tableNode.table.widths.forEach(function(w) {
      width += w._calcWidth;
    });

    return width;
  }

  function prepareRowSpanData() {
    var rsd = [];
    var x = 0;
    var lastWidth = 0;

    rsd.push({ left: 0, rowSpan: 0 });

    for(var i = 0, l = self.tableNode.table.body[0].length; i < l; i++) {
      var paddings = self.layout.paddingLeft(i, self.tableNode) + self.layout.paddingRight(i, self.tableNode);
      var lBorder = self.layout.vLineWidth(i, self.tableNode);
      lastWidth = paddings + lBorder + self.tableNode.table.widths[i]._calcWidth;
      rsd[rsd.length - 1].width = lastWidth;
      x += lastWidth;
      rsd.push({ left: x, rowSpan: 0, width: 0 });
    }

    return rsd;
  }
};

TableProcessor.prototype.beginRow = function(rowIndex, writer) {
  this.rowTopY = writer.context.y;
  this.reservedAtBottom = this.layout.hLineWidth(rowIndex + 1, this.tableNode) + this.layout.paddingBottom(rowIndex, this.tableNode);

  writer.context.availableHeight -= this.reservedAtBottom;

  writer.context.moveDown(this.layout.paddingTop(rowIndex, this.tableNode));
};

TableProcessor.prototype.drawHorizontalLine = function(lineIndex, writer, overrideY) {
  var lineWidth = this.layout.hLineWidth(lineIndex, this.tableNode);
  if (lineWidth) {
    var offset = lineWidth / 2;
    var currentLine = null;

    for(var i = 0, l = this.rowSpanData.length; i < l; i++) {
      var data = this.rowSpanData[i];
      var shouldDrawLine = !data.rowSpan;

      if (!currentLine && shouldDrawLine) {
        currentLine = { left: data.left, width: 0 };
      }

      if (shouldDrawLine) {
        currentLine.width += (data.width || 0);
      }

      var y = (overrideY || 0) + offset;

      if (!shouldDrawLine || i === l - 1) {
        if (currentLine) {
          writer.addVector({
            type: 'line',
            x1: currentLine.left,
            x2: currentLine.left + currentLine.width,
            y1: y,
            y2: y,
            lineWidth: lineWidth,
            lineColor: this.layout.hLineColor(lineIndex, this.tableNode)
          }, false, overrideY);
          currentLine = null;
        }
      }
    }

    writer.context.moveDown(lineWidth);
  }
};

TableProcessor.prototype.drawVerticalLine = function(x, y0, y1, vLineIndex, writer) {
  var width = this.layout.vLineWidth(vLineIndex, this.tableNode);
  if (width === 0) return;

  writer.addVector({
    type: 'line',
    x1: x + width/2,
    x2: x + width/2,
    y1: y0,
    y2: y1,
    lineWidth: width,
    lineColor: this.layout.vLineColor(vLineIndex, this.tableNode)
  }, false, true);
};

TableProcessor.prototype.endTable = function(writer) {
  writer.popFromRepeatables();
};

TableProcessor.prototype.endRow = function(rowIndex, writer, pageBreaks) {
    var i;
    var self = this;

    writer.context.moveDown(this.layout.paddingBottom(rowIndex, this.tableNode));

    var endingPage = writer.context.page;
    var endingY = writer.context.y;

    var xs = getLineXs();

    var ys = [];

    var hasBreaks = pageBreaks && pageBreaks.length > 0;

    ys.push({
      y0: this.rowTopY,
      page: hasBreaks ? pageBreaks[0].prevPage : endingPage
    });

    if (hasBreaks) {
      for(i = 0, l = pageBreaks.length; i < l; i++) {
        var pageBreak = pageBreaks[i];
        ys[ys.length - 1].y1 = pageBreak.prevY;

        ys.push({y0: pageBreak.y, page: pageBreak.prevPage + 1});
      }
    }

    ys[ys.length - 1].y1 = endingY;

    for(var yi = 0, yl = ys.length; yi < yl; yi++) {
      var willBreak = yi < ys.length - 1;

      var y1 = ys[yi].y0;
      var y2 = ys[yi].y1;
      if (writer.context.page != ys[yi].page) {
        writer.context.page = ys[yi].page;

        //TODO: buggy, availableHeight should be updated on every pageChanged event
        // TableProcessor should be pageChanged listener, instead of processRow
        this.reservedAtBottom = 0;
      }

      for(i = 0, l = xs.length; i < l; i++) {
        var topOffset = this.layout.hLineWidth(rowIndex, this.tableNode);
        var bottomOffset = this.layout.hLineWidth(rowIndex + 1, this.tableNode);
        this.drawVerticalLine(xs[i].x, y1 - topOffset, y2 + bottomOffset, xs[i].index, writer);
      }

      if (willBreak) {
        this.drawHorizontalLine(rowIndex + 1, writer, y2);
      }
    }

    writer.context.page = endingPage;
    writer.context.y = endingY;

    var row = this.tableNode.table.body[rowIndex];
    for(i = 0, l = row.length; i < l; i++) {
      if (row[i].rowSpan) {
        this.rowSpanData[i].rowSpan = row[i].rowSpan;

        // fix colSpans
        if (row[i].colSpan && row[i].colSpan > 1) {
          for(var j = 1; j < row[i].colSpan; j++) {
            this.tableNode.table.body[rowIndex + j][i]._colSpan = row[i].colSpan;
          }
        }
      }

      if(this.rowSpanData[i].rowSpan > 0) {
        this.rowSpanData[i].rowSpan--;
      }
    }

    this.drawHorizontalLine(rowIndex + 1, writer);

    if(this.headerRows && rowIndex === this.headerRows - 1) {
      this.headerRepeatable = writer.unbreakableBlockToRepeatable();
    }

    if(this.headerRepeatable && (rowIndex === (this.rowsWithoutPageBreak - 1) || rowIndex === this.tableNode.table.body.length - 1)) {
      writer.commitUnbreakableBlock();
      writer.pushToRepeatables(this.headerRepeatable);
      this.headerRepeatable = null;
    }

    writer.context.availableHeight += this.reservedAtBottom;

    //prepareRowSpanDataForCurrentRow
    // update availableHeight -= dolny padding + krawedz
    // this.drawVerticalLine

    //TODO: page breaks
    // if (pageBreaks && pageBreaks.length > 0) {
    //   y2 = pageBreaks[0].prevY;
    //   page = pageBreaks[0].prevPage;
    // }
    //
    // //TODO: horizontal lines at the end of each page
    // if (pageBreaks && pageBreaks.length > 0) {
    //   y2 = pageBreaks[0].prevY;
    // }
    //
    // this.drawVerticalLine(0, this.rowTopY, writer);
    //
    // for(var i = 0, l = this.rowSpanData.length; i < l; i++) {
    //   var data = this.rowSpanData[i];
    //
    //   this.draw
    // }
    // var y = this.rowTopY;
    // for(var i = 0, l = pageBreaks.length; i < l; i++) {
    //
    // }
    // var topOffset = this.rowTopY - writer.context.y;

    function getLineXs() {
      var result = [];
      var cols = 0;

      for(var i = 0, l = self.tableNode.table.body[rowIndex].length; i < l; i++) {
        if (!cols) {
          result.push({ x: self.rowSpanData[i].left, index: i});

          var item = self.tableNode.table.body[rowIndex][i];
          cols = (item._colSpan || item.colSpan || 0);
        }
        if (cols > 0) {
          cols--;
        }
      }

      result.push({ x: self.rowSpanData[self.rowSpanData.length - 1].left, index: self.rowSpanData.length});

      return result;
    }
};

// var pageBreaks = renderRow()   // - zwraca gdzie na poszczegolnych stronach sie zakonczyl
// // moveDown (top padding)
// // processRow
// // moveDown - bottom padding
//
// endRow(pageBreaks);
//   if (pageBreaks)
//     foreach(pageEnd && pageBeginning)
//       drawHorizontalLine(page, y);
//
//   drawHorizontalLine();
//   drawVerticalLines();
//     // dla kazdego idziemy i jesli nie colSpan to rysujemy
//     // while (pageBreaks)
//     //   draw od zapamietanego y do pageBreak
//     //   zapamietany y = pageBreak.nextStart
//     //   pageBreak.pop()
//     // od zapamietanego do rowEnd
//
//   if(drawingHeader && fullHeaderDrawn)
//     headerBlock = unbreakableToRepeatale();
//
//   if (headerBlock && (keepTogetherFinished || tableFinished))
//     commit()
//     pushToRepeatables
//
//   prepareRowSpanDataForCurrentRow
//   // update availableHeight -= dolny padding + krawedz
//
//
//

//
// function TableProcessor() {
// }
//
// beginTable();
// // build widths
// // get total width
// // howmany rows to be kept together ? beginUnbreakableBlock
//
//   drawHorizontalLine();
//   // jaka wysokosc linii, idac po kolejnych
//   // moveDown(height)
//   // continuity helper przesuwamy i rysujemy beginLine extendLine
//   // currentLine = null
//   // if (!currentLine && shouldDrawLine) beginLine(rowStart)
//   // if (shouldDrawLine) extendLine(rowStart + rowWidth)
//   // else {
//   //  if (currentLine) lines.push(currentLine)
//   //  currentLine = null
//   // }
//
// beginRow()
// // mark row beginning
// // update availableHeight (na podstawie dolnego padding i krawedzi)
//
// var pageBreaks = renderRow()   // - zwraca gdzie na poszczegolnych stronach sie zakonczyl
// // moveDown (top padding)
// // processRow
// // moveDown - bottom padding
//
// endRow(pageBreaks);
//   if (pageBreaks)
//     foreach(pageEnd && pageBeginning)
//       drawHorizontalLine(page, y);
//
//   drawHorizontalLine();
//   drawVerticalLines();
//     // dla kazdego idziemy i jesli nie colSpan to rysujemy
//     // while (pageBreaks)
//     //   draw od zapamietanego y do pageBreak
//     //   zapamietany y = pageBreak.nextStart
//     //   pageBreak.pop()
//     // od zapamietanego do rowEnd
//
//   if(drawingHeader && fullHeaderDrawn)
//     headerBlock = unbreakableToRepeatale();
//
//   if (headerBlock && (keepTogetherFinished || tableFinished))
//     commit()
//     pushToRepeatables
//
//   // update availableHeight -= dolny padding + krawedz
// function TableProcessor() {
// }
//
// beginTable();
// // build widths
// // get total width
// // howmany rows to be kept together ? beginUnbreakableBlock
//
//   drawHorizontalLine();
//   // jaka wysokosc linii, idac po kolejnych
//   // moveDown(height)
//   // continuity helper przesuwamy i rysujemy beginLine extendLine
//   // currentLine = null
//   // if (!currentLine && shouldDrawLine) beginLine(rowStart)
//   // if (shouldDrawLine) extendLine(rowStart + rowWidth)
//   // else {
//   //  if (currentLine) lines.push(currentLine)
//   //  currentLine = null
//   // }
//
// beginRow()
// // mark row beginning
// // update availableHeight (na podstawie dolnego padding i krawedzi)
//
// var pageBreaks = renderRow()   // - zwraca gdzie na poszczegolnych stronach sie zakonczyl
// // moveDown (top padding)
// // processRow
// // moveDown - bottom padding
//
// endRow(pageBreaks);
//   if (pageBreaks)
//     foreach(pageEnd && pageBeginning)
//       drawHorizontalLine(page, y);
//
//   drawHorizontalLine();
//   drawVerticalLines();
//     // dla kazdego idziemy i jesli nie colSpan to rysujemy
//     // while (pageBreaks)
//     //   draw od zapamietanego y do pageBreak
//     //   zapamietany y = pageBreak.nextStart
//     //   pageBreak.pop()
//     // od zapamietanego do rowEnd
//
//   if(drawingHeader && fullHeaderDrawn)
//     headerBlock = unbreakableToRepeatale();
//
//   if (headerBlock && (keepTogetherFinished || tableFinished))
//     commit()
//     pushToRepeatables
//
//   // update availableHeight -= dolny padding + krawedz


module.exports = TableProcessor;
