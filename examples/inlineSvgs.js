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
  },
  Times: {
    normal: "Times-Roman",
    bold: "Times-Bold",
    italics: "Times-Italic",
    bolditalics: "Times-BoldItalic"
  }
};

var pdfmake = require('../js/index');
pdfmake.setFonts(fonts);

const a = `<svg xmlns:xlink="http://www.w3.org/1999/xlink" width="4.759ex" height="2.509ex" style="vertical-align: -0.671ex;" viewBox="0 -791.3 2048.9 1080.4" role="img" focusable="false" xmlns="http://www.w3.org/2000/svg" aria-labelledby="MathJax-SVG-1-Title"><title id="MathJax-SVG-1-Title">Equation</title><defs aria-hidden="true"><path stroke-width="1" id="E1-MJMATHI-48" d="M228 637Q194 637 192 641Q191 643 191 649Q191 673 202 682Q204 683 219 683Q260 681 355 681Q389 681 418 681T463 682T483 682Q499 682 499 672Q499 670 497 658Q492 641 487 638H485Q483 638 480 638T473 638T464 637T455 637Q416 636 405 634T387 623Q384 619 355 500Q348 474 340 442T328 395L324 380Q324 378 469 378H614L615 381Q615 384 646 504Q674 619 674 627T617 637Q594 637 587 639T580 648Q580 650 582 660Q586 677 588 679T604 682Q609 682 646 681T740 680Q802 680 835 681T871 682Q888 682 888 672Q888 645 876 638H874Q872 638 869 638T862 638T853 637T844 637Q805 636 794 634T776 623Q773 618 704 340T634 58Q634 51 638 51Q646 48 692 46H723Q729 38 729 37T726 19Q722 6 716 0H701Q664 2 567 2Q533 2 504 2T458 2T437 1Q420 1 420 10Q420 15 423 24Q428 43 433 45Q437 46 448 46H454Q481 46 514 49Q520 50 522 50T528 55T534 64T540 82T547 110T558 153Q565 181 569 198Q602 330 602 331T457 332H312L279 197Q245 63 245 58Q245 51 253 49T303 46H334Q340 38 340 37T337 19Q333 6 327 0H312Q275 2 178 2Q144 2 115 2T69 2T48 1Q31 1 31 10Q31 12 34 24Q39 43 44 45Q48 46 59 46H65Q92 46 125 49Q139 52 144 61Q147 65 216 339T285 628Q285 635 228 637Z"></path><path stroke-width="1" id="E1-MJMAIN-32" d="M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z"></path><path stroke-width="1" id="E1-MJMATHI-4F" d="M740 435Q740 320 676 213T511 42T304 -22Q207 -22 138 35T51 201Q50 209 50 244Q50 346 98 438T227 601Q351 704 476 704Q514 704 524 703Q621 689 680 617T740 435ZM637 476Q637 565 591 615T476 665Q396 665 322 605Q242 542 200 428T157 216Q157 126 200 73T314 19Q404 19 485 98T608 313Q637 408 637 476Z"></path></defs><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="matrix(1 0 0 -1 0 0)" aria-hidden="true"> <use xlink:href="#E1-MJMATHI-48" x="0" y="0"></use> <use transform="scale(0.707)" xlink:href="#E1-MJMAIN-32" x="1175" y="-213"></use> <use xlink:href="#E1-MJMATHI-4F" x="1285" y="0"></use></g></svg>`
var docDefinition = {
  content: [
    {
      text: [{ text: 'Hello hello hello hello hello hello hello hello hellohello hello hello hello hello hellohello hello hello hello hello hellohello hello hello hello hello hellohello hellohello hello hello hello hello hello hello hello hello hello hello hello', style: 'em' }, {
        svg: '<svg xmlns:xlink="http://www.w3.org/1999/xlink" width="4.261ex" height="3.009ex" style="vertical-align: -0.671ex;" viewBox="0 -1006.6 1834.5 1295.7" role="img" focusable="false" xmlns="http://www.w3.org/2000/svg" aria-labelledby="MathJax-SVG-1-Title"><title id="MathJax-SVG-1-Title">Equation</title><defs aria-hidden="true"><path stroke-width="1" id="E1-MJMAIN-34" d="M462 0Q444 3 333 3Q217 3 199 0H190V46H221Q241 46 248 46T265 48T279 53T286 61Q287 63 287 115V165H28V211L179 442Q332 674 334 675Q336 677 355 677H373L379 671V211H471V165H379V114Q379 73 379 66T385 54Q393 47 442 46H471V0H462ZM293 211V545L74 212L183 211H293Z"></path><path stroke-width="1" id="E1-MJMAIN-35" d="M164 157Q164 133 148 117T109 101H102Q148 22 224 22Q294 22 326 82Q345 115 345 210Q345 313 318 349Q292 382 260 382H254Q176 382 136 314Q132 307 129 306T114 304Q97 304 95 310Q93 314 93 485V614Q93 664 98 664Q100 666 102 666Q103 666 123 658T178 642T253 634Q324 634 389 662Q397 666 402 666Q410 666 410 648V635Q328 538 205 538Q174 538 149 544L139 546V374Q158 388 169 396T205 412T256 420Q337 420 393 355T449 201Q449 109 385 44T229 -22Q148 -22 99 32T50 154Q50 178 61 192T84 210T107 214Q132 214 148 197T164 157Z"></path><path stroke-width="1" id="E1-MJMAIN-221A" d="M95 178Q89 178 81 186T72 200T103 230T169 280T207 309Q209 311 212 311H213Q219 311 227 294T281 177Q300 134 312 108L397 -77Q398 -77 501 136T707 565T814 786Q820 800 834 800Q841 800 846 794T853 782V776L620 293L385 -193Q381 -200 366 -200Q357 -200 354 -197Q352 -195 256 15L160 225L144 214Q129 202 113 190T95 178Z"></path></defs><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="matrix(1 0 0 -1 0 0)" aria-hidden="true"> <use xlink:href="#E1-MJMAIN-221A" x="0" y="33"></use><rect stroke="none" width="1001" height="60" x="833" y="774"></rect><g transform="translate(833,0)"> <use xlink:href="#E1-MJMAIN-34"></use> <use xlink:href="#E1-MJMAIN-35" x="500" y="0"></use></g></g></svg>',
        width: 60,
        height: 21
      }, { text: ' World world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world world ', style: 'em' }
        , { text: 'Hello hello hello hello hello heffr fkewrfewv llo hello hello hello hello hello hello hellohello hello hello hello hello hellohello hello hello hello hello hellohello hello hello hello hello hellohello hellohello hello hello hello hello hello hello hello hello hello bndfjef  hello hello H', style: 'em' }, {
        svg: a, width: 60,
        height: 21
      }, { text: ' World world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world worldWorld world world ', style: 'em' }
      ]
    },
  ],
  styles: {
    em: { italics: true, font: "Times", fontSize: 20, lineHeight: 2 }
  }
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/inlineSvgs.pdf');

console.log(new Date() - now);