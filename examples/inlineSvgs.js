/**
 * For perfect alignment of svg beside text (especially in the case of math symbols) where the 
 * SVG is like text, set the height of the SVG same as font size of the document
 */
var fonts = {
  Roboto: {
    normal: 'fonts/Roboto-Regular.ttf',
    bold: 'fonts/Roboto-Medium.ttf',
    italics: 'fonts/Roboto-Italic.ttf',
    bolditalics: 'fonts/Roboto-MediumItalic.ttf'
  }
};

var pdfmake = require('../js/index');
pdfmake.setFonts(fonts);

var docDefinition = {
  content: [
    {
      text: [{ text: 'Hello hello hello hello hello hello hello hello hellohello hello hello hello hello hellohello hello hello hello hello hellohello hello hello hello hello hellohello hellohello hello hello hello hello hello hello hello hello hello hello hello', style: 'em' }, {
        svg: '<svg xmlns:xlink="http://www.w3.org/1999/xlink" width="4.261ex" height="3.009ex" style="vertical-align: -0.671ex;" viewBox="0 -1006.6 1834.5 1295.7" role="img" focusable="false" xmlns="http://www.w3.org/2000/svg" aria-labelledby="MathJax-SVG-1-Title"><title id="MathJax-SVG-1-Title">Equation</title><defs aria-hidden="true"><path stroke-width="1" id="E1-MJMAIN-34" d="M462 0Q444 3 333 3Q217 3 199 0H190V46H221Q241 46 248 46T265 48T279 53T286 61Q287 63 287 115V165H28V211L179 442Q332 674 334 675Q336 677 355 677H373L379 671V211H471V165H379V114Q379 73 379 66T385 54Q393 47 442 46H471V0H462ZM293 211V545L74 212L183 211H293Z"></path><path stroke-width="1" id="E1-MJMAIN-35" d="M164 157Q164 133 148 117T109 101H102Q148 22 224 22Q294 22 326 82Q345 115 345 210Q345 313 318 349Q292 382 260 382H254Q176 382 136 314Q132 307 129 306T114 304Q97 304 95 310Q93 314 93 485V614Q93 664 98 664Q100 666 102 666Q103 666 123 658T178 642T253 634Q324 634 389 662Q397 666 402 666Q410 666 410 648V635Q328 538 205 538Q174 538 149 544L139 546V374Q158 388 169 396T205 412T256 420Q337 420 393 355T449 201Q449 109 385 44T229 -22Q148 -22 99 32T50 154Q50 178 61 192T84 210T107 214Q132 214 148 197T164 157Z"></path><path stroke-width="1" id="E1-MJMAIN-221A" d="M95 178Q89 178 81 186T72 200T103 230T169 280T207 309Q209 311 212 311H213Q219 311 227 294T281 177Q300 134 312 108L397 -77Q398 -77 501 136T707 565T814 786Q820 800 834 800Q841 800 846 794T853 782V776L620 293L385 -193Q381 -200 366 -200Q357 -200 354 -197Q352 -195 256 15L160 225L144 214Q129 202 113 190T95 178Z"></path></defs><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="matrix(1 0 0 -1 0 0)" aria-hidden="true"> <use xlink:href="#E1-MJMAIN-221A" x="0" y="33"></use><rect stroke="none" width="1001" height="60" x="833" y="774"></rect><g transform="translate(833,0)"> <use xlink:href="#E1-MJMAIN-34"></use> <use xlink:href="#E1-MJMAIN-35" x="500" y="0"></use></g></g></svg>',
        width: 30,
        height: 12
      }, { text: ' World world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world world ', style: 'em' }
        , { text: 'Hello hello hello hello hello hello hello hello hello hello hello hello hellohello hello hello hello hello hellohello hello hello hello hello hellohello hello hello hello hello hellohello hellohello hello hello hello hello hello hello hello hello hello hello hello', style: 'em' }, {
        svg: '<svg xmlns:xlink="http://www.w3.org/1999/xlink" width="4.261ex" height="3.009ex" style="vertical-align: -0.671ex;" viewBox="0 -1006.6 1834.5 1295.7" role="img" focusable="false" xmlns="http://www.w3.org/2000/svg" aria-labelledby="MathJax-SVG-1-Title"><title id="MathJax-SVG-1-Title">Equation</title><defs aria-hidden="true"><path stroke-width="1" id="E1-MJMAIN-34" d="M462 0Q444 3 333 3Q217 3 199 0H190V46H221Q241 46 248 46T265 48T279 53T286 61Q287 63 287 115V165H28V211L179 442Q332 674 334 675Q336 677 355 677H373L379 671V211H471V165H379V114Q379 73 379 66T385 54Q393 47 442 46H471V0H462ZM293 211V545L74 212L183 211H293Z"></path><path stroke-width="1" id="E1-MJMAIN-35" d="M164 157Q164 133 148 117T109 101H102Q148 22 224 22Q294 22 326 82Q345 115 345 210Q345 313 318 349Q292 382 260 382H254Q176 382 136 314Q132 307 129 306T114 304Q97 304 95 310Q93 314 93 485V614Q93 664 98 664Q100 666 102 666Q103 666 123 658T178 642T253 634Q324 634 389 662Q397 666 402 666Q410 666 410 648V635Q328 538 205 538Q174 538 149 544L139 546V374Q158 388 169 396T205 412T256 420Q337 420 393 355T449 201Q449 109 385 44T229 -22Q148 -22 99 32T50 154Q50 178 61 192T84 210T107 214Q132 214 148 197T164 157Z"></path><path stroke-width="1" id="E1-MJMAIN-221A" d="M95 178Q89 178 81 186T72 200T103 230T169 280T207 309Q209 311 212 311H213Q219 311 227 294T281 177Q300 134 312 108L397 -77Q398 -77 501 136T707 565T814 786Q820 800 834 800Q841 800 846 794T853 782V776L620 293L385 -193Q381 -200 366 -200Q357 -200 354 -197Q352 -195 256 15L160 225L144 214Q129 202 113 190T95 178Z"></path></defs><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="matrix(1 0 0 -1 0 0)" aria-hidden="true"> <use xlink:href="#E1-MJMAIN-221A" x="0" y="33"></use><rect stroke="none" width="1001" height="60" x="833" y="774"></rect><g transform="translate(833,0)"> <use xlink:href="#E1-MJMAIN-34"></use> <use xlink:href="#E1-MJMAIN-35" x="500" y="0"></use></g></g></svg>',
        width: 30,
        height: 12
      }, { text: ' World world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world world ', style: 'em' }
      ]
    },
  ],
  styles: {
    em: { bold: true, fontSize: 12, lineHeight: 2 }
  }
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/inlineSvgs.pdf');

console.log(new Date() - now);