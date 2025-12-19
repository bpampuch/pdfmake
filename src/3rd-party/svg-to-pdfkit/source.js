var SVGtoPDF = function(doc, svg, x, y, options) {
    "use strict";

    const NamedColors = {aliceblue: [240,248,255], antiquewhite: [250,235,215], aqua: [0,255,255], aquamarine: [127,255,212], azure: [240,255,255], beige: [245,245,220], bisque: [255,228,196], black: [0,0,0], blanchedalmond: [255,235,205], blue: [0,0,255], blueviolet: [138,43,226], brown: [165,42,42], burlywood: [222,184,135], cadetblue: [95,158,160], chartreuse: [127,255,0],
      chocolate: [210,105,30], coral: [255,127,80], cornflowerblue: [100,149,237], cornsilk: [255,248,220], crimson: [220,20,60], cyan: [0,255,255], darkblue: [0,0,139], darkcyan: [0,139,139], darkgoldenrod: [184,134,11], darkgray: [169,169,169], darkgrey: [169,169,169], darkgreen: [0,100,0], darkkhaki: [189,183,107], darkmagenta: [139,0,139], darkolivegreen: [85,107,47],
      darkorange: [255,140,0], darkorchid: [153,50,204], darkred: [139,0,0], darksalmon: [233,150,122], darkseagreen: [143,188,143], darkslateblue: [72,61,139], darkslategray: [47,79,79], darkslategrey: [47,79,79], darkturquoise: [0,206,209], darkviolet: [148,0,211], deeppink: [255,20,147], deepskyblue: [0,191,255], dimgray: [105,105,105], dimgrey: [105,105,105],
      dodgerblue: [30,144,255], firebrick: [178,34,34], floralwhite: [255,250,240], forestgreen: [34,139,34], fuchsia: [255,0,255], gainsboro: [220,220,220], ghostwhite: [248,248,255], gold: [255,215,0], goldenrod: [218,165,32], gray: [128,128,128], grey: [128,128,128], green: [0,128,0], greenyellow: [173,255,47], honeydew: [240,255,240], hotpink: [255,105,180],
      indianred: [205,92,92], indigo: [75,0,130], ivory: [255,255,240], khaki: [240,230,140], lavender: [230,230,250], lavenderblush: [255,240,245], lawngreen: [124,252,0], lemonchiffon: [255,250,205], lightblue: [173,216,230], lightcoral: [240,128,128], lightcyan: [224,255,255], lightgoldenrodyellow: [250,250,210], lightgray: [211,211,211], lightgrey: [211,211,211],
      lightgreen: [144,238,144], lightpink: [255,182,193], lightsalmon: [255,160,122], lightseagreen: [32,178,170], lightskyblue: [135,206,250], lightslategray: [119,136,153], lightslategrey: [119,136,153], lightsteelblue: [176,196,222], lightyellow: [255,255,224], lime: [0,255,0], limegreen: [50,205,50], linen: [250,240,230], magenta: [255,0,255], maroon: [128,0,0],
      mediumaquamarine: [102,205,170], mediumblue: [0,0,205], mediumorchid: [186,85,211], mediumpurple: [147,112,219], mediumseagreen: [60,179,113], mediumslateblue: [123,104,238], mediumspringgreen: [0,250,154], mediumturquoise: [72,209,204], mediumvioletred: [199,21,133], midnightblue: [25,25,112], mintcream: [245,255,250], mistyrose: [255,228,225], moccasin: [255,228,181],
      navajowhite: [255,222,173], navy: [0,0,128], oldlace: [253,245,230], olive: [128,128,0], olivedrab: [107,142,35], orange: [255,165,0], orangered: [255,69,0], orchid: [218,112,214], palegoldenrod: [238,232,170], palegreen: [152,251,152], paleturquoise: [175,238,238], palevioletred: [219,112,147], papayawhip: [255,239,213], peachpuff: [255,218,185], peru: [205,133,63],
      pink: [255,192,203], plum: [221,160,221], powderblue: [176,224,230], purple: [128,0,128], rebeccapurple: [102,51,153], red: [255,0,0], rosybrown: [188,143,143], royalblue: [65,105,225], saddlebrown: [139,69,19], salmon: [250,128,114], sandybrown: [244,164,96], seagreen: [46,139,87], seashell: [255,245,238], sienna: [160,82,45], silver: [192,192,192], skyblue: [135,206,235],
      slateblue: [106,90,205], slategray: [112,128,144], slategrey: [112,128,144], snow: [255,250,250], springgreen: [0,255,127], steelblue: [70,130,180], tan: [210,180,140], teal: [0,128,128], thistle: [216,191,216], tomato: [255,99,71], turquoise: [64,224,208], violet: [238,130,238], wheat: [245,222,179], white: [255,255,255], whitesmoke: [245,245,245], yellow: [255,255,0]};
    const DefaultColors = {black: [NamedColors.black, 1], white: [NamedColors.white, 1], transparent: [NamedColors.black, 0]};
    const Entities = {quot: 34, amp: 38, lt: 60, gt: 62, apos: 39, OElig: 338, oelig: 339, Scaron: 352, scaron: 353, Yuml: 376, circ: 710, tilde: 732, ensp: 8194, emsp: 8195, thinsp: 8201, zwnj: 8204, zwj: 8205, lrm: 8206, rlm: 8207, ndash: 8211, mdash: 8212, lsquo: 8216, rsquo: 8217, sbquo: 8218, ldquo: 8220, rdquo: 8221, bdquo: 8222, dagger: 8224, Dagger: 8225, permil: 8240, lsaquo: 8249,
      rsaquo: 8250, euro: 8364, nbsp: 160, iexcl: 161, cent: 162, pound: 163, curren: 164, yen: 165, brvbar: 166, sect: 167, uml: 168, copy: 169, ordf: 170, laquo: 171, not: 172, shy: 173, reg: 174, macr: 175, deg: 176, plusmn: 177, sup2: 178, sup3: 179, acute: 180, micro: 181, para: 182, middot: 183, cedil: 184, sup1: 185, ordm: 186, raquo: 187, frac14: 188, frac12: 189, frac34: 190,
      iquest: 191, Agrave: 192, Aacute: 193, Acirc: 194, Atilde: 195, Auml: 196, Aring: 197, AElig: 198, Ccedil: 199, Egrave: 200, Eacute: 201, Ecirc: 202, Euml: 203, Igrave: 204, Iacute: 205, Icirc: 206, Iuml: 207, ETH: 208, Ntilde: 209, Ograve: 210, Oacute: 211, Ocirc: 212, Otilde: 213, Ouml: 214, times: 215, Oslash: 216, Ugrave: 217, Uacute: 218, Ucirc: 219, Uuml: 220, Yacute: 221,
      THORN: 222, szlig: 223, agrave: 224, aacute: 225, acirc: 226, atilde: 227, auml: 228, aring: 229, aelig: 230, ccedil: 231, egrave: 232, eacute: 233, ecirc: 234, euml: 235, igrave: 236, iacute: 237, icirc: 238, iuml: 239, eth: 240, ntilde: 241, ograve: 242, oacute: 243, ocirc: 244, otilde: 245, ouml: 246, divide: 247, oslash: 248, ugrave: 249, uacute: 250, ucirc: 251, uuml: 252,
      yacute: 253, thorn: 254, yuml: 255, fnof: 402, Alpha: 913, Beta: 914, Gamma: 915, Delta: 916, Epsilon: 917, Zeta: 918, Eta: 919, Theta: 920, Iota: 921, Kappa: 922, Lambda: 923, Mu: 924, Nu: 925, Xi: 926, Omicron: 927, Pi: 928, Rho: 929, Sigma: 931, Tau: 932, Upsilon: 933, Phi: 934, Chi: 935, Psi: 936, Omega: 937, alpha: 945, beta: 946, gamma: 947, delta: 948, epsilon: 949,
      zeta: 950, eta: 951, theta: 952, iota: 953, kappa: 954, lambda: 955, mu: 956, nu: 957, xi: 958, omicron: 959, pi: 960, rho: 961, sigmaf: 962, sigma: 963, tau: 964, upsilon: 965, phi: 966, chi: 967, psi: 968, omega: 969, thetasym: 977, upsih: 978, piv: 982, bull: 8226, hellip: 8230, prime: 8242, Prime: 8243, oline: 8254, frasl: 8260, weierp: 8472, image: 8465, real: 8476,
      trade: 8482, alefsym: 8501, larr: 8592, uarr: 8593, rarr: 8594, darr: 8595, harr: 8596, crarr: 8629, lArr: 8656, uArr: 8657, rArr: 8658, dArr: 8659, hArr: 8660, forall: 8704, part: 8706, exist: 8707, empty: 8709, nabla: 8711, isin: 8712, notin: 8713, ni: 8715, prod: 8719, sum: 8721, minus: 8722, lowast: 8727, radic: 8730, prop: 8733, infin: 8734, ang: 8736, and: 8743, or: 8744,
      cap: 8745, cup: 8746, int: 8747, there4: 8756, sim: 8764, cong: 8773, asymp: 8776, ne: 8800, equiv: 8801, le: 8804, ge: 8805, sub: 8834, sup: 8835, nsub: 8836, sube: 8838, supe: 8839, oplus: 8853, otimes: 8855, perp: 8869, sdot: 8901, lceil: 8968, rceil: 8969, lfloor: 8970, rfloor: 8971, lang: 9001, rang: 9002, loz: 9674, spades: 9824, clubs: 9827, hearts: 9829, diams: 9830};
    const PathArguments = {A: 7, a: 7, C: 6, c: 6, H: 1, h: 1, L: 2, l: 2, M: 2, m: 2, Q: 4, q: 4, S: 4, s: 4, T: 2, t: 2, V: 1, v: 1, Z: 0, z: 0};
    const PathFlags = {A3: true, A4: true, a3: true, a4: true};
    const Properties = {
      'color':              {inherit: true, initial: undefined},
      'visibility':         {inherit: true, initial: 'visible', values: {'hidden': 'hidden', 'collapse': 'hidden', 'visible':'visible'}},
      'fill':               {inherit: true, initial: DefaultColors.black},
      'stroke':             {inherit: true, initial: 'none'},
      'stop-color':         {inherit: false, initial: DefaultColors.black},
      'fill-opacity':       {inherit: true, initial: 1},
      'stroke-opacity':     {inherit: true, initial: 1},
      'stop-opacity':       {inherit: false, initial: 1},
      'fill-rule':          {inherit: true, initial: 'nonzero', values: {'nonzero':'nonzero', 'evenodd':'evenodd'}},
      'clip-rule':          {inherit: true, initial: 'nonzero', values: {'nonzero':'nonzero', 'evenodd':'evenodd'}},
      'stroke-width':       {inherit: true, initial: 1},
      'stroke-dasharray':   {inherit: true, initial: []},
      'stroke-dashoffset':  {inherit: true, initial: 0},
      'stroke-miterlimit':  {inherit: true, initial: 4},
      'stroke-linejoin':    {inherit: true, initial: 'miter', values: {'miter':'miter', 'round':'round', 'bevel':'bevel'}},
      'stroke-linecap':     {inherit: true, initial: 'butt', values: {'butt':'butt', 'round':'round', 'square':'square'}},
      'font-size':          {inherit: true, initial: 16, values: {'xx-small':9, 'x-small':10, 'small':13, 'medium':16, 'large':18, 'x-large':24, 'xx-large':32}},
      'font-family':        {inherit: true, initial: 'sans-serif'},
      'font-weight':        {inherit: true, initial: 'normal', values: {'600':'bold', '700':'bold', '800':'bold', '900':'bold', 'bold':'bold', 'bolder':'bold', '500':'normal', '400':'normal', '300':'normal', '200':'normal', '100':'normal', 'normal':'normal', 'lighter':'normal'}},
      'font-style':         {inherit: true, initial: 'normal', values: {'italic':'italic', 'oblique':'italic', 'normal':'normal'}},
      'text-anchor':        {inherit: true, initial: 'start', values: {'start':'start', 'middle':'middle', 'end':'end'}},
      'direction':          {inherit: true, initial: 'ltr', values: {'ltr':'ltr', 'rtl':'rtl'}},
      'dominant-baseline':  {inherit: true, initial: 'baseline', values: {'auto':'baseline', 'baseline':'baseline', 'before-edge':'before-edge', 'text-before-edge':'before-edge', 'middle':'middle', 'central':'central', 'after-edge':'after-edge', 'text-after-edge':'after-edge', 'ideographic':'ideographic', 'alphabetic':'alphabetic', 'hanging':'hanging', 'mathematical':'mathematical'}},
      'alignment-baseline': {inherit: false, initial: undefined, values: {'auto':'baseline', 'baseline':'baseline', 'before-edge':'before-edge', 'text-before-edge':'before-edge', 'middle':'middle', 'central':'central', 'after-edge':'after-edge', 'text-after-edge':'after-edge', 'ideographic':'ideographic', 'alphabetic':'alphabetic', 'hanging':'hanging', 'mathematical':'mathematical'}},
      'baseline-shift':     {inherit: true, initial: 'baseline', values: {'baseline':'baseline', 'sub':'sub', 'super':'super'}},
      'word-spacing':       {inherit: true, initial: 0, values: {normal:0}},
      'letter-spacing':     {inherit: true, initial: 0, values: {normal:0}},
      'text-decoration':    {inherit: false, initial: 'none', values: {'none':'none', 'underline':'underline', 'overline':'overline', 'line-through':'line-through'}},
      'xml:space':          {inherit: true, initial: 'default', css: 'white-space', values: {'preserve':'preserve', 'default':'default', 'pre':'preserve', 'pre-line':'preserve', 'pre-wrap':'preserve', 'nowrap': 'default'}},
      'marker-start':       {inherit: true, initial: 'none'},
      'marker-mid':         {inherit: true, initial: 'none'},
      'marker-end':         {inherit: true, initial: 'none'},
      'opacity':            {inherit: false, initial: 1},
      'transform':          {inherit: false, initial: [1, 0, 0, 1, 0, 0]},
      'display':            {inherit: false, initial: 'inline', values: {'none':'none', 'inline':'inline', 'block':'inline'}},
      'clip-path':          {inherit: false, initial: 'none'},
      'mask':               {inherit: false, initial: 'none'},
      'overflow':           {inherit: false, initial: 'hidden', values: {'hidden':'hidden', 'scroll':'hidden', 'visible':'visible'}}
    };

    function docBeginGroup(bbox) {
      let group = new (function PDFGroup() {})();
      group.name = 'G' + (doc._groupCount = (doc._groupCount || 0) + 1);
      group.resources = doc.ref();
      group.xobj = doc.ref({
        Type: 'XObject',
        Subtype: 'Form',
        FormType: 1,
        BBox: bbox,
        Group: {S: 'Transparency', CS: 'DeviceRGB', I: true, K: false},
        Resources: group.resources
      });
      group.xobj.write('');
      group.savedMatrix = doc._ctm;
      group.savedPage = doc.page;
      groupStack.push(group);
      doc._ctm = [1, 0, 0, 1, 0, 0];
      doc.page = {
        width: doc.page.width, height: doc.page.height,
        write: function(data) {group.xobj.write(data);},
        fonts: {}, xobjects: {}, ext_gstates: {}, patterns: {}
      };
      return group;
    }
    function docEndGroup(group) {
      if (group !== groupStack.pop()) {throw('Group not matching');}
      if (Object.keys(doc.page.fonts).length) {group.resources.data.Font = doc.page.fonts;}
      if (Object.keys(doc.page.xobjects).length) {group.resources.data.XObject = doc.page.xobjects;}
      if (Object.keys(doc.page.ext_gstates).length) {group.resources.data.ExtGState = doc.page.ext_gstates;}
      if (Object.keys(doc.page.patterns).length) {group.resources.data.Pattern = doc.page.patterns;}
      group.resources.end();
      group.xobj.end();
      doc._ctm = group.savedMatrix;
      doc.page = group.savedPage;
    }
    function docInsertGroup(group) {
      doc.page.xobjects[group.name] = group.xobj;
      doc.addContent('/' + group.name + ' Do');
    }
    function docApplyMask(group, clip) {
      let name = 'M' + (doc._maskCount = (doc._maskCount || 0) + 1);
      let gstate = doc.ref({
        Type: 'ExtGState', CA: 1, ca: 1, BM: 'Normal',
        SMask: {S: 'Luminosity', G: group.xobj, BC: (clip ? [0, 0, 0] : [1, 1, 1])}
      });
      gstate.end();
      doc.page.ext_gstates[name] = gstate;
      doc.addContent('/' + name + ' gs');
    }
    function docCreatePattern(group, dx, dy, matrix) {
      let pattern = new (function PDFPattern() {})();
      pattern.group = group;
      pattern.dx = dx;
      pattern.dy = dy;
      pattern.matrix = matrix || [1, 0, 0, 1, 0, 0];
      return pattern;
    }
    function docUsePattern(pattern, stroke) {
      let name = 'P' + (doc._patternCount = (doc._patternCount || 0) + 1);
      let ref = doc.ref({
        Type: 'Pattern', PatternType: 1, PaintType: 1, TilingType: 2,
        BBox: [0, 0, pattern.dx, pattern.dy], XStep: pattern.dx, YStep: pattern.dy,
        Matrix: multiplyMatrix(doc._ctm, pattern.matrix),
        Resources: {
          ProcSet: ['PDF', 'Text', 'ImageB', 'ImageC', 'ImageI'],
          XObject: (function() {let temp = {}; temp[pattern.group.name] = pattern.group.xobj; return temp;})()
        }
      });
      ref.write('/' + pattern.group.name + ' Do');
      ref.end();
      doc.page.patterns[name] = ref;
      if (stroke) {
        doc.addContent('/Pattern CS');
        doc.addContent('/' + name + ' SCN');
      } else {
        doc.addContent('/Pattern cs');
        doc.addContent('/' + name + ' scn');
      }
    }
    function docBeginText(font, size) {
      if (!doc.page.fonts[font.id]) {doc.page.fonts[font.id] = font.ref();}
      doc.addContent('BT').addContent('/' + font.id + ' ' + size + ' Tf');
    }
    function docSetTextMatrix(a, b, c, d, e, f) {
      doc.addContent(validateNumber(a) + ' ' + validateNumber(b) + ' ' + validateNumber(-c) + ' '  + validateNumber(-d) + ' ' + validateNumber(e) + ' ' + validateNumber(f) + ' Tm');
    }
    function docSetTextMode(fill, stroke) {
      let mode = fill && stroke ? 2 : stroke ? 1 : fill ? 0 : 3;
      doc.addContent(mode + ' Tr');
    }
    function docWriteGlyph(glyph) {
      doc.addContent('<' + glyph + '> Tj');
    }
    function docEndText() {
      doc.addContent('ET');
    }
    function docFillColor(color) {
      if (color[0].constructor.name === 'PDFPattern') {
        doc.fillOpacity(color[1]);
        docUsePattern(color[0], false);
      } else {
        doc.fillColor(color[0], color[1]);
      }
    }
    function docStrokeColor(color) {
      if (color[0].constructor.name === 'PDFPattern') {
        doc.strokeOpacity(color[1]);
        docUsePattern(color[0], true);
      } else {
        doc.strokeColor(color[0], color[1]);
      }
    }
    function docInsertLink(x, y, w, h, url) {
      let ref = doc.ref({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [x, y, w, h],
        Border: [0, 0, 0],
        A: {
          S: 'URI',
          URI: new String(url)
        }
      });
      ref.end();
      links.push(ref);
    }
    function parseXml(xml) {
      let SvgNode = function(tag, type, value, error) {
        this.error = error;
        this.nodeName = tag;
        this.nodeValue = value;
        this.nodeType = type;
        this.attributes = Object.create(null);
        this.childNodes = [];
        this.parentNode = null;
        this.id = '';
        this.textContent = '';
        this.classList = [];
      };
      SvgNode.prototype.getAttribute = function(attr) {
        return this.attributes[attr] != null ? this.attributes[attr] : null;
      };
      SvgNode.prototype.getElementById = function(id) {
        let result = null;
        (function recursive(node) {
          if (result) {return;}
          if (node.nodeType === 1) {
            if (node.id === id) {result = node;}
            for (let i = 0; i < node.childNodes.length; i++) {
              recursive(node.childNodes[i]);
            }
          }
        })(this);
        return result;
      };
      SvgNode.prototype.getElementsByTagName = function(tag) {
        let result = [];
        (function recursive(node) {
          if (node.nodeType === 1) {
            if (node.nodeName === tag) {result.push(node);}
            for (let i = 0; i < node.childNodes.length; i++) {
              recursive(node.childNodes[i]);
            }
          }
        })(this);
        return result;
      };
      let parser = new StringParser(xml.trim()), result, child, error = false; 
      let recursive = function() {
        let temp, child;
        if (temp = parser.match(/^<([\w:.-]+)\s*/, true)) { // Opening tag
          let node = new SvgNode(temp[1], 1, null, error);
          while (temp = parser.match(/^([\w:.-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?\s*/, true)) { // Attribute
            let attr = temp[1], value = decodeEntities(temp[2] || temp[3] || '');
            if (!node.attributes[attr]) {
              node.attributes[attr] = value;
              if (attr === 'id') {node.id = value;}
              if (attr === 'class') {node.classList = value.split(' ');}
            } else {
              warningCallback('parseXml: duplicate attribute "' + attr + '"');
              error = true;
            }
          }
          if (parser.match(/^>/)) { // End of opening tag
            while (child = recursive()) {
              node.childNodes.push(child);
              child.parentNode = node;
              node.textContent += (child.nodeType === 3 || child.nodeType === 4 ? child.nodeValue : child.textContent);
            }
            if (temp = parser.match(/^<\/([\w:.-]+)\s*>/, true)) { // Closing tag
              if (temp[1] === node.nodeName) {
                return node;
              } else {
                warningCallback('parseXml: tag not matching, opening "' + node.nodeName + '" & closing "' + temp[1] + '"');
                error = true;
                return node;
              }
            } else {
              warningCallback('parseXml: tag not matching, opening "' + node.nodeName + '" & not closing');
              error = true;
              return node;
            }
          } else if (parser.match(/^\/>/)) { // Self-closing tag
            return node;
          } else {
            warningCallback('parseXml: tag could not be parsed "' + node.nodeName + '"');
            error = true;
          }
        } else if (temp = parser.match(/^<!--[\s\S]*?-->/)) { // Comment
          return new SvgNode(null, 8, temp, error);
        } else if (temp = parser.match(/^<\?[\s\S]*?\?>/)) { // Processing instructions
          return new SvgNode(null, 7, temp, error);
        } else if (temp = parser.match(/^<!DOCTYPE\s*([\s\S]*?)>/)) { // Doctype
          return new SvgNode(null, 10, temp, error);
        } else if (temp = parser.match(/^<!\[CDATA\[([\s\S]*?)\]\]>/, true)) { // Cdata node
          return new SvgNode('#cdata-section', 4, temp[1], error);
        } else if (temp = parser.match(/^([^<]+)/, true)) { // Text node
          return new SvgNode('#text', 3, decodeEntities(temp[1]), error);
        }
      };
      while (child = recursive()) {
        if (child.nodeType === 1 && !result) {
          result = child;
        } else if (child.nodeType === 1 || (child.nodeType === 3 && child.nodeValue.trim() !== '')) {
          warningCallback('parseXml: data after document end has been discarded');
        }
      }
      if (parser.matchAll()) {
        warningCallback('parseXml: parsing error');
      }
      return result;
    };
    function decodeEntities(str) {
      return(str.replace(/&(?:#([0-9]+)|#[xX]([0-9A-Fa-f]+)|([0-9A-Za-z]+));/g, function(mt, m0, m1, m2) {
        if (m0) {return String.fromCharCode(parseInt(m0, 10));}
        else if (m1) {return String.fromCharCode(parseInt(m1, 16));}
        else if (m2 && Entities[m2]) {return String.fromCharCode(Entities[m2]);}
        else {return mt;}
      }));
    }
    function parseColor(raw) {
      let temp, result;
      raw = (raw || '').trim();
      if (temp = NamedColors[raw]) {
        result = [temp.slice(), 1];
      } else if (temp = raw.match(/^rgba\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9.]+)\s*\)$/i)) {
        temp[1] = parseInt(temp[1]); temp[2] = parseInt(temp[2]); temp[3] = parseInt(temp[3]); temp[4] = parseFloat(temp[4]);
        if (temp[1] < 256 && temp[2] < 256 && temp[3] < 256 && temp[4] <= 1) {
          result = [temp.slice(1, 4), temp[4]];
        }
      } else if (temp = raw.match(/^rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/i)) {
        temp[1] = parseInt(temp[1]); temp[2] = parseInt(temp[2]); temp[3] = parseInt(temp[3]);
        if (temp[1] < 256 && temp[2] < 256 && temp[3] < 256) {
          result = [temp.slice(1, 4), 1];
        }
      } else if (temp = raw.match(/^rgb\(\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/i)) {
        temp[1] = 2.55 * parseFloat(temp[1]); temp[2] = 2.55 * parseFloat(temp[2]); temp[3] = 2.55 * parseFloat(temp[3]);
        if (temp[1] < 256 && temp[2] < 256 && temp[3] < 256) {
          result = [temp.slice(1, 4), 1];
        }
      } else if (temp = raw.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)) {
        result = [[parseInt(temp[1], 16), parseInt(temp[2], 16), parseInt(temp[3], 16)], 1];
      } else if (temp = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)) {
        result = [[0x11 * parseInt(temp[1], 16), 0x11 * parseInt(temp[2], 16), 0x11 * parseInt(temp[3], 16)], 1];
      }
      return colorCallback ? colorCallback(result, raw) : result;
    }
    function opacityToColor(color, opacity, isMask) {
      let newColor = color[0].slice(),
          newOpacity = color[1] * opacity;
      if (isMask) {
        for (let i = 0; i < color.length; i++) {
          newColor[i] *= newOpacity;
        }
        return [newColor, 1];
      } else {
        return [newColor, newOpacity];
      }
    }
    function multiplyMatrix() {
      function multiply(a, b) {
        return [ a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3],
                 a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5] ];
      }
      let result = arguments[0];
      for (let i = 1; i < arguments.length; i++) {
        result = multiply(result, arguments[i]);
      }
      return result;
    }
    function transformPoint(p, m) {
      return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
    }
    function getGlobalMatrix() {
      let ctm = doc._ctm;
      for (let i = groupStack.length - 1; i >= 0; i--) {
        ctm = multiplyMatrix(groupStack[i].savedMatrix, ctm);
      }
      return ctm;
    }
    function getPageBBox() {
      return new SvgShape().M(0, 0).L(doc.page.width, 0).L(doc.page.width, doc.page.height).L(0, doc.page.height)
                           .transform(inverseMatrix(getGlobalMatrix())).getBoundingBox();
    }
    function inverseMatrix(m) {
      let dt = m[0] * m[3] - m[1] * m[2];
      return [m[3] / dt, -m[1] / dt, -m[2] / dt, m[0] / dt, (m[2]*m[5] - m[3]*m[4]) / dt, (m[1]*m[4] - m[0]*m[5]) / dt];
    }
    function validateMatrix(m) {
      let m0 = validateNumber(m[0]), m1 = validateNumber(m[1]), m2 = validateNumber(m[2]),
          m3 = validateNumber(m[3]), m4 = validateNumber(m[4]), m5 = validateNumber(m[5]);
      if (isNotEqual(m0 * m3 - m1 * m2, 0)) {
        return [m0, m1, m2, m3, m4, m5];
      }
    }
    function solveEquation(curve) {
      let a = curve[2] || 0, b = curve[1] || 0, c = curve[0] || 0;
      if (isEqual(a, 0) && isEqual(b, 0)) {
        return [];
      } else if (isEqual(a, 0)) {
        return [(-c) / b];
      } else {
        let d = b * b - 4 * a * c;
        if (isNotEqual(d, 0) && d > 0) {
          return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
        } else if (isEqual(d, 0)) {
          return [(-b) / (2 * a)];
        } else {
          return [];
        }
      }
    }
    function getCurveValue(t, curve) {
      return (curve[0] || 0) + (curve[1] || 0) * t + (curve[2] || 0) * t * t + (curve[3] || 0) * t * t * t;
    }
    function isEqual(number, ref) {
      return Math.abs(number - ref) < 1e-10;
    }
    function isNotEqual(number, ref) {
      return Math.abs(number - ref) >= 1e-10;
    }
    function validateNumber(n) {
      return n > -1e21 && n < 1e21 ? Math.round(n * 1e6) / 1e6 : 0;
    }
    function isArrayLike(v) {
      return typeof v === 'object' && v !== null && typeof v.length === 'number';
    }
    function parseTranform(v) {
      let parser = new StringParser((v || '').trim()), result = [1, 0, 0, 1, 0, 0], temp;
      while (temp = parser.match(/^([A-Za-z]+)\s*[(]([^(]+)[)]/, true)) {
        let func = temp[1], nums = [], parser2 = new StringParser(temp[2].trim()), temp2;
        while (temp2 = parser2.matchNumber()) {
          nums.push(Number(temp2));
          parser2.matchSeparator();
        }
        if (func === 'matrix' && nums.length === 6) {
          result = multiplyMatrix(result, [nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]]);
        } else if (func === 'translate' && nums.length === 2) {
          result = multiplyMatrix(result, [1, 0, 0, 1, nums[0], nums[1]]);
        } else if (func === 'translate' && nums.length === 1) {
          result = multiplyMatrix(result, [1, 0, 0, 1, nums[0], 0]);
        } else if (func === 'scale' && nums.length === 2) {
          result = multiplyMatrix(result, [nums[0], 0, 0, nums[1], 0, 0]);
        } else if (func === 'scale' && nums.length === 1) {
          result = multiplyMatrix(result, [nums[0], 0, 0, nums[0], 0, 0]);
        } else if (func === 'rotate' && nums.length === 3) {
          let a = nums[0] * Math.PI / 180;
          result = multiplyMatrix(result, [1, 0, 0, 1, nums[1], nums[2]], [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0], [1, 0, 0, 1, -nums[1], -nums[2]]);
        } else if (func === 'rotate' && nums.length === 1) {
          let a = nums[0] * Math.PI / 180;
          result = multiplyMatrix(result, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
        } else if (func === 'skewX' && nums.length === 1) {
          let a = nums[0] * Math.PI / 180;
          result = multiplyMatrix(result, [1, 0, Math.tan(a), 1, 0, 0]);
        } else if (func === 'skewY' && nums.length === 1) {
          let a = nums[0] * Math.PI / 180;
          result = multiplyMatrix(result, [1, Math.tan(a), 0, 1, 0, 0]);
        } else {return;}
        parser.matchSeparator();
      }
      if (parser.matchAll()) {return;}
      return result;
    }
    function parseAspectRatio(aspectRatio, availWidth, availHeight, elemWidth, elemHeight, initAlign) {
      let temp = (aspectRatio || '').trim().match(/^(none)$|^x(Min|Mid|Max)Y(Min|Mid|Max)(?:\s+(meet|slice))?$/) || [],
          ratioType = temp[1] || temp[4] || 'meet',
          xAlign = temp[2] || 'Mid',
          yAlign = temp[3] || 'Mid',
          scaleX = availWidth / elemWidth,
          scaleY = availHeight / elemHeight,
          dx = {'Min':0, 'Mid':0.5, 'Max':1}[xAlign] - (initAlign || 0),
          dy = {'Min':0, 'Mid':0.5, 'Max':1}[yAlign] - (initAlign || 0);
      if (ratioType === 'slice') {
        scaleY = scaleX = Math.max(scaleX, scaleY);
      } else if (ratioType === 'meet') {
        scaleY = scaleX = Math.min(scaleX, scaleY);
      }
      return [scaleX, 0, 0, scaleY, dx * (availWidth - elemWidth * scaleX), dy * (availHeight - elemHeight * scaleY)];
    }
    function parseStyleAttr(v) {
      let result = Object.create(null);
      v = (v || '').trim().split(/;/);
      for (let i = 0; i < v.length; i++) {
        let key = (v[i].split(':')[0] || '').trim(),
            value = (v[i].split(':')[1] || '').trim();
        if (key) {
          result[key] = value;
        }
      }
      if (result['marker']) {
        if (!result['marker-start']) {result['marker-start'] = result['marker'];}
        if (!result['marker-mid']) {result['marker-mid'] = result['marker'];}
        if (!result['marker-end']) {result['marker-end'] = result['marker'];}
      }
      if (result['font']) {
        let fontFamily = null, fontSize = null, fontStyle = "normal", fontWeight = "normal", fontVariant = "normal";
        let parts = result['font'].split(/\s+/);
        for (let i = 0; i < parts.length; i++) {
          switch (parts[i]) {
            case "normal":
              break;
            case "italic": case "oblique":
              fontStyle = parts[i];
              break;
            case "small-caps":
              fontVariant = parts[i];
              break;
            case "bold": case "bolder": case "lighter": case "100": case "200": case "300":
            case "400": case "500": case "600": case "700": case "800": case "900":
              fontWeight = parts[i];
              break;
            default:
              if (!fontSize) {
                fontSize = parts[i].split('/')[0];
              } else {
                if (!fontFamily) {
                  fontFamily = parts[i];
                } else {
                  fontFamily += ' ' + parts[i];
                }
              }
              break;
          }
        }
        if (!result['font-style']) {result['font-style'] = fontStyle;}
        if (!result['font-variant']) {result['font-variant'] = fontVariant;}
        if (!result['font-weight']) {result['font-weight'] = fontWeight;}
        if (!result['font-size']) {result['font-size'] = fontSize;}
        if (!result['font-family']) {result['font-family'] = fontFamily;}
      }
      return result;
    }
    function parseSelector(v) {
      let parts = v.split(/(?=[.#])/g), ids = [], classes = [], tags = [], temp;
      for (let i = 0; i < parts.length; i++) {
        if (temp = parts[i].match(/^[#]([_A-Za-z0-9-]+)$/)) {
          ids.push(temp[1]);
        } else if (temp = parts[i].match(/^[.]([_A-Za-z0-9-]+)$/)) {
          classes.push(temp[1]);
        } else if (temp = parts[i].match(/^([_A-Za-z0-9-]+)$/)) {
          tags.push(temp[1]);
        } else if (parts[i] !== '*') {
          return;
        }
      }
      return {
        tags: tags, ids: ids, classes: classes,
        specificity: ids.length * 10000 + classes.length * 100 + tags.length
      };
    }
    function parseStyleSheet(v) {
      let parser = new StringParser(v.trim()), rules = [], rule;
      while (rule = parser.match(/^\s*([^\{\}]*?)\s*\{([^\{\}]*?)\}/, true)) {
        let selectors = rule[1].split(/\s*,\s*/g),
            css = parseStyleAttr(rule[2]);
        for (let i = 0; i < selectors.length; i++) {
          let selector = parseSelector(selectors[i]);
          if (selector) {
            rules.push({selector: selector, css:css});
          }
        }
      }
      return rules;
    }
    function matchesSelector(elem, selector) {
      if (elem.nodeType !== 1) {return false;}
      for (let i = 0; i < selector.tags.length; i++) {
        if (selector.tags[i] !== elem.nodeName) {return false;}
      }
      for (let i = 0; i < selector.ids.length; i++) {
        if (selector.ids[i] !== elem.id) {return false;}
      }
      for (let i = 0; i < selector.classes.length; i++) {
        if (elem.classList.indexOf(selector.classes[i]) === -1) {return false;}
      }
      return true;
    }
    function getStyle(elem) {
      let result = Object.create(null);
      let specificities = Object.create(null);
      for (let i = 0; i < styleRules.length; i++) {
        let rule = styleRules[i];
        if (matchesSelector(elem, rule.selector)) {
          for (let key in rule.css) {
            if (!(specificities[key] > rule.selector.specificity)) {
              result[key] = rule.css[key];
              specificities[key] = rule.selector.specificity;
            }
          }
        }
      }
      return result;
    }
    function combineArrays(array1, array2) {
      return array1.concat(array2.slice(array1.length));
    }
    function getAscent(font, size) {
      return Math.max(font.ascender, (font.bbox[3] || font.bbox.maxY) * (font.scale || 1)) * size / 1000;
    }
    function getDescent(font, size) {
      return Math.min(font.descender, (font.bbox[1] || font.bbox.minY) * (font.scale || 1)) * size / 1000;
    }
    function getXHeight(font, size) {
      return (font.xHeight || 0.5 * (font.ascender - font.descender)) * size / 1000;
    }
    function getBaseline(font, size, baseline, shift) {
      let dy1, dy2;
      switch (baseline) {
        case 'middle': dy1 = 0.5 * getXHeight(font, size); break;
        case 'central': dy1 = 0.5 * (getDescent(font, size) + getAscent(font, size)); break;
        case 'after-edge': case 'text-after-edge': dy1 = getDescent(font, size); break;
        case 'alphabetic': case 'auto': case 'baseline': dy1 = 0; break;
        case 'mathematical': dy1 = 0.5 * getAscent(font, size); break;
        case 'hanging': dy1 = 0.8 * getAscent(font, size); break;
        case 'before-edge': case 'text-before-edge': dy1 = getAscent(font, size); break;
        default: dy1 = 0; break;
      }
      switch (shift) {
        case 'baseline': dy2 = 0; break;
        case 'super': dy2 = 0.6 * size; break;
        case 'sub': dy2 = -0.6 * size; break;
        default: dy2 = shift; break;
      }
      return dy1 - dy2;
    }
    function getTextPos(font, size, text) {
      let encoded = font.encode('' + text), hex = encoded[0], pos = encoded[1], data = [];
      for (let i = 0; i < hex.length; i++) {
        let unicode = font.unicode ? font.unicode[parseInt(hex[i], 16)] : [text.charCodeAt(i)];
        data.push({
          glyph: hex[i],
          unicode: unicode,
          width: pos[i].advanceWidth * size / 1000,
          xOffset: pos[i].xOffset * size / 1000,
          yOffset: pos[i].yOffset * size / 1000,
          xAdvance: pos[i].xAdvance * size / 1000,
          yAdvance: pos[i].yAdvance * size / 1000
        });
      }
      return data;
    }
    function createSVGElement(obj, inherits) {
      switch (obj.nodeName) {
        case 'use': return new SvgElemUse(obj, inherits);
        case 'symbol': return new SvgElemSymbol(obj, inherits);
        case 'g': return new SvgElemGroup(obj, inherits);
        case 'a': return new SvgElemLink(obj, inherits);
        case 'svg': return new SvgElemSvg(obj, inherits);
        case 'image': return new SVGElemImage(obj, inherits);
        case 'rect': return new SvgElemRect(obj, inherits);
        case 'circle': return new SvgElemCircle(obj, inherits);
        case 'ellipse': return new SvgElemEllipse(obj, inherits);
        case 'line': return new SvgElemLine(obj, inherits);
        case 'polyline': return new SvgElemPolyline(obj, inherits);
        case 'polygon': return new SvgElemPolygon(obj, inherits);
        case 'path': return new SvgElemPath(obj, inherits);
        case 'text': return new SvgElemText(obj, inherits);
        case 'tspan': return new SvgElemTspan(obj, inherits);
        case 'textPath': return new SvgElemTextPath(obj, inherits);
        case '#text': case '#cdata-section': return new SvgElemTextNode(obj, inherits);
        default: return new SvgElem(obj, inherits);
      }
    }

    var StringParser = function(str) {
      this.match = function(exp, all) {
        let temp = str.match(exp);
        if (!temp || temp.index !== 0) {return;}
        str = str.substring(temp[0].length);
        return (all ? temp : temp[0]);
      };
      this.matchSeparator = function() {
        return this.match(/^(?:\s*,\s*|\s*|)/);
      };
      this.matchSpace = function() {
        return this.match(/^(?:\s*)/);
      };
      this.matchLengthUnit = function() {
        return this.match(/^(?:px|pt|cm|mm|in|pc|em|ex|%|)/);
      };
      this.matchNumber = function() {
        return this.match(/^(?:[-+]?(?:[0-9]+[.][0-9]+|[0-9]+[.]|[.][0-9]+|[0-9]+)(?:[eE][-+]?[0-9]+)?)/);
      };
      this.matchAll = function() {
        return this.match(/^[\s\S]+/);
      };
    };

    var BezierSegment = function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
      let divisions = 6 * precision;
      let equationX = [p1x, -3 * p1x + 3 * c1x, 3 * p1x - 6 * c1x + 3 * c2x, -p1x + 3 * c1x - 3 * c2x + p2x];
      let equationY = [p1y, -3 * p1y + 3 * c1y, 3 * p1y - 6 * c1y + 3 * c2y, -p1y + 3 * c1y - 3 * c2y + p2y];
      let derivativeX = [-3 * p1x + 3 * c1x, 6 * p1x - 12 * c1x + 6 * c2x, -3 * p1x + 9 * c1x - 9 * c2x + 3 * p2x];
      let derivativeY = [-3 * p1y + 3 * c1y, 6 * p1y - 12 * c1y + 6 * c2y, -3 * p1y + 9 * c1y - 9 * c2y + 3 * p2y];
      let lengthMap = [0];
      for (let i = 1; i <= divisions; i++) {
        let t = (i - 0.5) / divisions;
        let dx = getCurveValue(t, derivativeX) / divisions,
            dy = getCurveValue(t, derivativeY) / divisions,
            l = Math.sqrt(dx * dx + dy * dy);
        lengthMap[i] = lengthMap[i - 1] + l;
      }
      this.totalLength = lengthMap[divisions];
      this.startPoint = [p1x, p1y, isEqual(p1x, c1x) && isEqual(p1y, c1y) ? Math.atan2(c2y - c1y, c2x - c1x) : Math.atan2(c1y - p1y, c1x - p1x)];
      this.endPoint = [p2x, p2y, isEqual(c2x, p2x) && isEqual(c2y, p2y) ? Math.atan2(c2y - c1y, c2x - c1x) : Math.atan2(p2y - c2y, p2x - c2x)];
      this.getBoundingBox = function() {
        let temp;
        let minX = getCurveValue(0, equationX), minY = getCurveValue(0, equationY),
            maxX = getCurveValue(1, equationX), maxY = getCurveValue(1, equationY);
        if (minX > maxX) {temp = maxX; maxX = minX; minX = temp;}
        if (minY > maxY) {temp = maxY; maxY = minY; minY = temp;}
        let rootsX = solveEquation(derivativeX);
        for (let i = 0; i < rootsX.length; i++) {
          if (rootsX[i] >= 0 && rootsX[i] <= 1) {
            let x = getCurveValue(rootsX[i], equationX);
            if (x < minX) {minX = x;}
            if (x > maxX) {maxX = x;}
          }
        }
        let rootsY = solveEquation(derivativeY);
        for (let i = 0; i < rootsY.length; i++) {
          if (rootsY[i] >= 0 && rootsY[i] <= 1) {
            let y = getCurveValue(rootsY[i], equationY);
            if (y < minY) {minY = y;}
            if (y > maxY) {maxY = y;}
          }
        }
        return [minX, minY, maxX, maxY];
      };
      this.getPointAtLength = function(l) {
        if (isEqual(l, 0)) {return this.startPoint;}
        if (isEqual(l, this.totalLength)) {return this.endPoint;}
        if (l < 0 || l > this.totalLength) {return;}
        for (let i = 1; i <= divisions; i++) {
          let l1 = lengthMap[i-1], l2 = lengthMap[i];
          if (l1 <= l && l <= l2) {
            let t = (i - (l2 - l) / (l2 - l1)) / divisions,
                x = getCurveValue(t, equationX), y = getCurveValue(t, equationY),
                dx = getCurveValue(t, derivativeX), dy = getCurveValue(t, derivativeY);
            return [x, y, Math.atan2(dy, dx)];
          }
        }
      };
    };

    var LineSegment = function(p1x, p1y, p2x, p2y) {
      this.totalLength = Math.sqrt((p2x - p1x) * (p2x - p1x) + (p2y - p1y) * (p2y - p1y));
      this.startPoint = [p1x, p1y, Math.atan2(p2y - p1y, p2x - p1x)];
      this.endPoint = [p2x, p2y, Math.atan2(p2y - p1y, p2x - p1x)];
      this.getBoundingBox = function() {
        return [Math.min(this.startPoint[0], this.endPoint[0]), Math.min(this.startPoint[1], this.endPoint[1]),
                Math.max(this.startPoint[0], this.endPoint[0]), Math.max(this.startPoint[1], this.endPoint[1])];
      };
      this.getPointAtLength = function(l) {
        if (l >= 0 && l <= this.totalLength) {
          let r = l / this.totalLength || 0,
              x = this.startPoint[0] + r * (this.endPoint[0] - this.startPoint[0]),
              y = this.startPoint[1] + r * (this.endPoint[1] - this.startPoint[1]);
          return [x, y, this.startPoint[2]];
        }
      };
    };

    var SvgShape = function() {
      this.pathCommands = [];
      this.pathSegments = [];
      this.startPoint = null;
      this.endPoint = null;
      this.totalLength = 0;
      let startX = 0, startY = 0, currX = 0, currY = 0, lastCom, lastCtrlX, lastCtrlY;
      this.move = function(x, y) {
        startX = currX = x; startY = currY = y;
        return null;
      };
      this.line = function(x, y) {
        let segment = new LineSegment(currX, currY, x, y);
        currX = x; currY = y;
        return segment;
      };
      this.curve = function(c1x, c1y, c2x, c2y, x, y) {
        let segment = new BezierSegment(currX, currY, c1x, c1y, c2x, c2y, x, y);
        currX = x; currY = y;
        return segment;
      };
      this.close = function() {
        let segment = new LineSegment(currX, currY, startX, startY);
        currX = startX; currY = startY;
        return segment;
      };
      this.addCommand = function(data) {
        this.pathCommands.push(data);
        let segment = this[data[0]].apply(this, data.slice(3));
        if (segment) {
          segment.hasStart = data[1];
          segment.hasEnd = data[2];
          this.startPoint = this.startPoint || segment.startPoint;
          this.endPoint = segment.endPoint;
          this.pathSegments.push(segment);
          this.totalLength += segment.totalLength;
        }
      };
      this.M = function(x, y) {
        this.addCommand(['move', true, true, x, y]);
        lastCom = 'M';
        return this;
      };
      this.m = function(x, y) {
        return this.M(currX + x, currY + y);
      };
      this.Z = this.z = function() {
        this.addCommand(['close', true, true]);
        lastCom = 'Z';
        return this;
      };
      this.L = function(x, y) {
        this.addCommand(['line', true, true, x, y]);
        lastCom = 'L';
        return this;
      };
      this.l = function(x, y) {
        return this.L(currX + x, currY + y);
      };
      this.H = function(x) {
        return this.L(x, currY);
      };
      this.h = function(x) {
        return this.L(currX + x, currY);
      };
      this.V = function(y) {
        return this.L(currX, y);
      };
      this.v = function(y) {
        return this.L(currX, currY + y);
      };
      this.C = function(c1x, c1y, c2x, c2y, x, y) {
        this.addCommand(['curve', true, true, c1x, c1y, c2x, c2y, x, y]);
        lastCom = 'C'; lastCtrlX = c2x; lastCtrlY = c2y;
        return this;
      };
      this.c = function(c1x, c1y, c2x, c2y, x, y) {
        return this.C(currX + c1x, currY + c1y, currX + c2x, currY + c2y, currX + x, currY + y);
      };
      this.S = function(c1x, c1y, x, y) {
        return this.C(currX + (lastCom === 'C' ? currX - lastCtrlX : 0), currY + (lastCom === 'C' ? currY - lastCtrlY : 0), c1x, c1y, x, y);
      };
      this.s = function(c1x, c1y, x, y) {
        return this.C(currX + (lastCom === 'C' ? currX - lastCtrlX : 0), currY + (lastCom === 'C' ? currY - lastCtrlY : 0), currX + c1x, currY + c1y, currX + x, currY + y);
      };
      this.Q = function(cx, cy, x, y) {
        let c1x = currX + 2 / 3 * (cx - currX), c1y = currY + 2 / 3 * (cy - currY),
            c2x = x + 2 / 3 * (cx - x), c2y = y + 2 / 3 * (cy - y);
        this.addCommand(['curve', true, true, c1x, c1y, c2x, c2y, x, y]);
        lastCom = 'Q'; lastCtrlX = cx; lastCtrlY = cy;
        return this;
      };
      this.q = function(c1x, c1y, x, y) {
        return this.Q(currX + c1x, currY + c1y, currX + x, currY + y);
      };
      this.T = function(x, y) {
        return this.Q(currX + (lastCom === 'Q' ? currX - lastCtrlX : 0), currY + (lastCom === 'Q' ? currY - lastCtrlY : 0), x, y);
      };
      this.t = function(x, y) {
        return this.Q(currX + (lastCom === 'Q' ? currX - lastCtrlX : 0), currY + (lastCom === 'Q' ? currY - lastCtrlY : 0), currX + x, currY + y);
      };
      this.A = function(rx, ry, fi, fa, fs, x, y) {
        if (isEqual(rx, 0) || isEqual(ry, 0)) {
          this.addCommand(['line', true, true, x, y]);
        } else {
          fi = fi * (Math.PI / 180);
          rx = Math.abs(rx);
          ry = Math.abs(ry);
          fa = 1 * !!fa;
          fs = 1 * !!fs;
          let x1 = Math.cos(fi) * (currX - x) / 2 + Math.sin(fi) * (currY - y) / 2,
              y1 = Math.cos(fi) * (currY - y) / 2 - Math.sin(fi) * (currX - x) / 2,
              lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
          if (lambda > 1) {
            rx *= Math.sqrt(lambda);
            ry *= Math.sqrt(lambda);
          }
          let r = Math.sqrt(Math.max(0, rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) / (rx * rx * y1 * y1 + ry * ry * x1 * x1)),
              x2 = (fa === fs ? -1 : 1) * r * rx * y1 / ry,
              y2 = (fa === fs ? 1 : -1) * r * ry * x1 / rx;
          let cx = Math.cos(fi) * x2 - Math.sin(fi) * y2 + (currX + x) / 2,
              cy = Math.sin(fi) * x2 + Math.cos(fi) * y2 + (currY + y) / 2,
              th1 = Math.atan2((y1 - y2) / ry, (x1 - x2) / rx),
              th2 = Math.atan2((-y1 - y2) / ry, (-x1 - x2) / rx);
          if (fs === 0 && th2 - th1 > 0) {
            th2 -= 2 * Math.PI;
          } else if (fs === 1 && th2 - th1 < 0) {
            th2 += 2 * Math.PI;
          }
          let segms = Math.ceil(Math.abs(th2 - th1) / (Math.PI / precision));
          for (let i = 0; i < segms; i++) {
            let th3 = th1 + i * (th2 - th1) / segms,
                th4 = th1 + (i + 1) * (th2 - th1) / segms,
                t = 4/3 * Math.tan((th4 - th3) / 4);
            let c1x = cx + Math.cos(fi) * rx * (Math.cos(th3) - t * Math.sin(th3)) - Math.sin(fi) * ry * (Math.sin(th3) + t * Math.cos(th3)),
                c1y = cy + Math.sin(fi) * rx * (Math.cos(th3) - t * Math.sin(th3)) + Math.cos(fi) * ry * (Math.sin(th3) + t * Math.cos(th3)),
                c2x = cx + Math.cos(fi) * rx * (Math.cos(th4) + t * Math.sin(th4)) - Math.sin(fi) * ry * (Math.sin(th4) - t * Math.cos(th4)),
                c2y = cy + Math.sin(fi) * rx * (Math.cos(th4) + t * Math.sin(th4)) + Math.cos(fi) * ry * (Math.sin(th4) - t * Math.cos(th4)),
                endX = cx + Math.cos(fi) * rx * Math.cos(th4) - Math.sin(fi) * ry * Math.sin(th4),
                endY = cy + Math.sin(fi) * rx * Math.cos(th4) + Math.cos(fi) * ry * Math.sin(th4);
            this.addCommand(['curve', (i === 0), (i === segms - 1), c1x, c1y, c2x, c2y, endX, endY]);
          }
        }
        lastCom = 'A';
        return this;
      };
      this.a = function(rx, ry, fi, fa, fs, x, y) {
        return this.A(rx, ry, fi, fa, fs, currX + x, currY + y);
      };
      this.path = function(d) {
        let command, value, temp,
            parser = new StringParser((d || '').trim());
        while (command = parser.match(/^[astvzqmhlcASTVZQMHLC]/)) {
          parser.matchSeparator();
          let values = [];
          while (value = (PathFlags[command + values.length] ? parser.match(/^[01]/) : parser.matchNumber())) {
            parser.matchSeparator();
            if (values.length === PathArguments[command]) {
              this[command].apply(this, values);
              values = [];
              if (command === 'M') {command = 'L';}
              else if (command === 'm') {command = 'l';}
            }
            values.push(Number(value));
          }
          if (values.length === PathArguments[command]) {
            this[command].apply(this, values);
          } else {
            warningCallback('SvgPath: command ' + command + ' with ' + values.length + ' numbers'); return;
          }
        }
        if (temp = parser.matchAll()) {
          warningCallback('SvgPath: unexpected string ' + temp);
        }
        return this;
      };
      this.getBoundingBox = function() {
        let bbox = [Infinity, Infinity, -Infinity, -Infinity];
        function addBounds(bbox1) {
          if (bbox1[0] < bbox[0]) {bbox[0] = bbox1[0];}
          if (bbox1[2] > bbox[2]) {bbox[2] = bbox1[2];}
          if (bbox1[1] < bbox[1]) {bbox[1] = bbox1[1];}
          if (bbox1[3] > bbox[3]) {bbox[3] = bbox1[3];}
        }
        for (let i = 0; i < this.pathSegments.length; i++) {
          addBounds(this.pathSegments[i].getBoundingBox());
        }
        if (bbox[0] === Infinity) {bbox[0] = 0;}
        if (bbox[1] === Infinity) {bbox[1] = 0;}
        if (bbox[2] === -Infinity) {bbox[2] = 0;}
        if (bbox[3] === -Infinity) {bbox[3] = 0;}
        return bbox;
      };
      this.getPointAtLength = function(l) {
        if (l >= 0 && l <= this.totalLength) {
          let temp;
          for (let i = 0; i < this.pathSegments.length; i++) {
            if (temp = this.pathSegments[i].getPointAtLength(l)) {
              return temp;
            }
            l -= this.pathSegments[i].totalLength;
          }
          return this.endPoint;
        }
      };
      this.transform = function(m) {
        this.pathSegments = [];
        this.startPoint = null;
        this.endPoint = null;
        this.totalLength = 0;
        for (let i = 0; i < this.pathCommands.length; i++) {
          let data = this.pathCommands.shift();
          for (let j = 3; j < data.length; j+=2) {
            let p = transformPoint([data[j], data[j + 1]], m)
            data[j] = p[0];
            data[j + 1] = p[1];
          }
          this.addCommand(data);
        }
        return this;        
      };
      this.mergeShape = function(shape) {
        for (let i = 0; i < shape.pathCommands.length; i++) {
          this.addCommand(shape.pathCommands[i].slice());
        }
        return this;
      };
      this.clone = function() {
        return new SvgShape().mergeShape(this);
      };
      this.insertInDocument = function() {
        for (let i = 0; i < this.pathCommands.length; i++) {
          let command = this.pathCommands[i][0], values = this.pathCommands[i].slice(3);
          switch(command) {
            case 'move':  doc.moveTo(values[0], values[1]);  break;
            case 'line':  doc.lineTo(values[0], values[1]);  break;
            case 'curve':  doc.bezierCurveTo(values[0], values[1], values[2], values[3], values[4], values[5]);  break;
            case 'close':  doc.closePath();  break;
          }
        }
      };
      this.getSubPaths = function() {
        let subPaths = [], shape = new SvgShape();
        for (let i = 0; i < this.pathCommands.length; i++) {
          let data = this.pathCommands[i], command = this.pathCommands[i][0];
          if (command === 'move' && i !== 0) {
            subPaths.push(shape);
            shape = new SvgShape();
          }
          shape.addCommand(data);
        }
        subPaths.push(shape);
        return subPaths;
      };
      this.getMarkers = function() {
        let markers = [], subPaths = this.getSubPaths();
        for (let i = 0; i < subPaths.length; i++) {
          let subPath = subPaths[i], subPathMarkers = [];
          for (let j = 0; j < subPath.pathSegments.length; j++) {
            let segment = subPath.pathSegments[j];
            if (isNotEqual(segment.totalLength, 0) || j === 0 || j === subPath.pathSegments.length - 1) {
              if (segment.hasStart) {
                let startMarker = segment.getPointAtLength(0), prevEndMarker = subPathMarkers.pop();
                if (prevEndMarker) {startMarker[2] = 0.5 * (prevEndMarker[2] + startMarker[2]);}
                subPathMarkers.push(startMarker);
              }
              if (segment.hasEnd) {
                let endMarker = segment.getPointAtLength(segment.totalLength);
                subPathMarkers.push(endMarker);
              }
            }
          }
          markers = markers.concat(subPathMarkers);
        }
        return markers;
      };
    };

    var SvgElem = function(obj, inherits) {
      let styleCache = Object.create(null);
      let childrenCache = null;
      this.name = obj.nodeName;
      this.isOuterElement = obj === svg || !obj.parentNode;
      this.inherits = inherits || (!this.isOuterElement ? createSVGElement(obj.parentNode, null) : null);
      this.stack = (this.inherits ? this.inherits.stack.concat(obj) : [obj]);
      this.style = parseStyleAttr(typeof obj.getAttribute === 'function' && obj.getAttribute('style'));
      this.css = useCSS ? getComputedStyle(obj) : getStyle(obj);
      this.allowedChildren = [];
      this.attr = function(key) {
        if (typeof obj.getAttribute === 'function') {
          return obj.getAttribute(key);
        }
      };
      this.resolveUrl = function(value) {
        let temp = (value || '').match(/^\s*(?:url\("(.*)#(.*)"\)|url\('(.*)#(.*)'\)|url\((.*)#(.*)\)|(.*)#(.*))\s*$/) || [];
        let file = temp[1] || temp[3] || temp[5] || temp[7],
            id = temp[2] || temp[4] || temp[6] || temp[8];
        if (id) {
          if (!file) {
            let svgObj = svg.getElementById(id);
            if (svgObj) {
              if (this.stack.indexOf(svgObj) === -1) {
                return svgObj;
              } else {
                warningCallback('SVGtoPDF: loop of circular references for id "' + id + '"');
                return;
              }
            }
          }
          if (documentCallback) {
            let svgs = documentCache[file];
            if (!svgs) {
              svgs = documentCallback(file);
              if (!isArrayLike(svgs)) {svgs = [svgs];}
              for (let i = 0; i < svgs.length; i++) {
                if (typeof svgs[i] === 'string') {svgs[i] = parseXml(svgs[i]);}
              }
              documentCache[file] = svgs;
            }
            for (let i = 0; i < svgs.length; i++) {
              let svgObj = svgs[i].getElementById(id);
              if (svgObj) {
                if (this.stack.indexOf(svgObj) === -1) {
                  return svgObj;
                } else {
                  warningCallback('SVGtoPDF: loop of circular references for id "' + file + '#' + id + '"');
                  return;
                }
              }
            }
          }
        }
      };
      this.computeUnits = function(value, unit, percent, isFontSize) {
        if (unit === '%') {
          return parseFloat(value) / 100 * (isFontSize || percent != null ? percent : this.getViewport());
        } else if (unit === 'ex' || unit === 'em') {
          return value * {'em':1, 'ex':0.5}[unit] * (isFontSize ? percent : this.get('font-size'));
        } else {
          return value * {'':1, 'px':1, 'pt':96/72, 'cm':96/2.54, 'mm':96/25.4, 'in':96, 'pc':96/6}[unit];
        }
      };
      this.computeLength = function(value, percent, initial, isFontSize) {
        let parser = new StringParser((value || '').trim()), temp1, temp2;
        if (typeof (temp1 = parser.matchNumber()) === 'string' && typeof (temp2 = parser.matchLengthUnit()) === 'string' && !parser.matchAll()) {
          return this.computeUnits(temp1, temp2, percent, isFontSize);
        }
        return initial;
      };
      this.computeLengthList = function(value, percent, strict) {
        let parser = new StringParser((value || '').trim()), result = [], temp1, temp2;
        while (typeof (temp1 = parser.matchNumber()) === 'string' && typeof (temp2 = parser.matchLengthUnit()) === 'string') {
          result.push(this.computeUnits(temp1, temp2, percent));
          parser.matchSeparator();
        }
        if (strict && parser.matchAll()) {return;}
        return result;
      };
      this.getLength = function(key, percent, initial) {
        return this.computeLength(this.attr(key), percent, initial);
      };
      this.getLengthList = function(key, percent) {
        return this.computeLengthList(this.attr(key), percent);
      };
      this.getUrl = function(key) {
        return this.resolveUrl(this.attr(key))
      };
      this.getNumberList = function(key) {
        let parser = new StringParser((this.attr(key) || '').trim()), result = [], temp;
        while (temp = parser.matchNumber()) {
          result.push(Number(temp));
          parser.matchSeparator();
        }
        result.error = parser.matchAll();
        return result;
      }
      this.getViewbox = function(key, initial) {
        let viewBox = this.getNumberList(key);
        if (viewBox.length === 4 && viewBox[2] >= 0 && viewBox[3] >= 0) {return viewBox;}
        return initial;
      };
      this.getPercent = function(key, initial) {
        let value = this.attr(key);
        let parser = new StringParser((value || '').trim()), temp1, temp2;
        let number = parser.matchNumber();
        if (!number) {return initial;}
        if (parser.match('%')) {number *= 0.01;}
        if (parser.matchAll()) {return initial;}
        return Math.max(0, Math.min(1, number));
      };
      this.chooseValue = function(args) {
        for (let i = 0; i < arguments.length; i++) {
          if (arguments[i] != null && arguments[i] === arguments[i]) {return arguments[i];}
        }
        return arguments[arguments.length - 1];
      };
      this.get = function(key) {
        if (styleCache[key] !== undefined) {return styleCache[key];}
        let keyInfo = Properties[key] || {}, value, result;
        for (let i = 0; i < 3; i++) {
          switch (i) {
            case 0:
              if (key !== 'transform') { // the CSS transform behaves strangely
                value = this.css[keyInfo.css || key];
              }
              break;
            case 1:
              value = this.style[key];
              break;
            case 2:
              value = this.attr(key);
              break;
          }
          if (value === 'inherit') {
            result = (this.inherits ? this.inherits.get(key) : keyInfo.initial);
            if (result != null) {return styleCache[key] = result;}
          }
          if (keyInfo.values != null) {
            result = keyInfo.values[value];
            if (result != null) {return styleCache[key] = result;}
          }
          if (value != null) {
            let parsed;
            switch (key) {
              case 'font-size':
                result = this.computeLength(value, this.inherits ? this.inherits.get(key) : keyInfo.initial, undefined, true);
                break;
              case 'baseline-shift':
                result = this.computeLength(value, this.get('font-size'));
                break;
              case 'font-family':
                result = value || undefined;
                break;
              case 'opacity': case 'stroke-opacity': case 'fill-opacity': case 'stop-opacity':
                parsed = parseFloat(value);
                if (!isNaN(parsed)) {
                  result = Math.max(0, Math.min(1, parsed));
                }
                break;
              case 'transform':
                result = parseTranform(value);
                break;
              case 'stroke-dasharray':
                if (value === 'none') {
                  result = [];
                } else if (parsed = this.computeLengthList(value, this.getViewport(), true)) {
                  let sum = 0, error = false;
                  for (let j = 0; j < parsed.length; j++) {
                    if (parsed[j] < 0) {error = true;}
                    sum += parsed[j];
                  }
                  if (!error) {
                    if (parsed.length % 2 === 1) {
                      parsed = parsed.concat(parsed);
                    }
                    result = (sum === 0 ? [] : parsed);
                  }
                }
                break;
              case 'color':
                if (value === 'none' || value === 'transparent') {
                  result = 'none';
                } else {
                  result = parseColor(value);
                }
                break;
              case 'fill': case 'stroke':
                if (value === 'none' || value === 'transparent') {
                  result = 'none';
                } else if (value === 'currentColor') {
                  result = this.get('color');
                } else if (parsed = parseColor(value)) {
                  return parsed;
                } else if (parsed = (value || '').split(' ')) {
                  let object = this.resolveUrl(parsed[0]),
                      fallbackColor = parseColor(parsed[1]);
                  if (object == null) {
                    result = fallbackColor;
                  } else if (object.nodeName === 'linearGradient' || object.nodeName === 'radialGradient') {
                    result = new SvgElemGradient(object, null, fallbackColor);
                  } else if (object.nodeName === 'pattern') {
                    result = new SvgElemPattern(object, null, fallbackColor);
                  } else {
                    result = fallbackColor;
                  }
                }
                break;
              case 'stop-color':
                if (value === 'none' || value === 'transparent') {
                  result = 'none';
                } else if (value === 'currentColor') {
                  result = this.get('color');
                } else {
                  result = parseColor(value);
                }
                break;
              case 'marker-start': case 'marker-mid': case 'marker-end': case 'clip-path': case 'mask':
                if (value === 'none') {
                  result = 'none';
                } else {
                  result = this.resolveUrl(value);
                }
                break;
              case 'stroke-width':
                parsed = this.computeLength(value, this.getViewport());
                if (parsed != null && parsed >= 0) {
                  result = parsed;
                }
                break;
              case 'stroke-miterlimit':
                parsed = parseFloat(value);
                if (parsed != null && parsed >= 1) {
                  result = parsed;
                }
                break;
              case 'word-spacing': case 'letter-spacing':
                result = this.computeLength(value, this.getViewport());
                break;
              case 'stroke-dashoffset':
                result = this.computeLength(value, this.getViewport());
                if (result != null) {
                  if (result < 0) { // fix for crbug.com/660850
                    let dasharray = this.get('stroke-dasharray');
                    for (let j = 0; j < dasharray.length; j++) {result += dasharray[j];}
                  }
                }
                break;
            }
            if (result != null) {return styleCache[key] = result;}
          }
        }
        return styleCache[key] = (keyInfo.inherit && this.inherits ? this.inherits.get(key) : keyInfo.initial);
      };
      this.getChildren = function() {
        if (childrenCache != null) {return childrenCache;}
        let children = [];
        for (let i = 0; i < obj.childNodes.length; i++) {
          let child = obj.childNodes[i];
          if (!child.error && this.allowedChildren.indexOf(child.nodeName) !== -1) {
            children.push(createSVGElement(child, this));
          }
        }
        return childrenCache = children;
      };
      this.getParentVWidth = function() {
        return (this.inherits ? this.inherits.getVWidth(): viewportWidth);
      };
      this.getParentVHeight = function() {
        return (this.inherits ? this.inherits.getVHeight() : viewportHeight);
      };
      this.getParentViewport = function() {
        return Math.sqrt(0.5 * this.getParentVWidth() * this.getParentVWidth() + 0.5 * this.getParentVHeight() * this.getParentVHeight());
      };
      this.getVWidth = function() {
        return this.getParentVWidth();
      };
      this.getVHeight = function() {
        return this.getParentVHeight();
      };
      this.getViewport = function() {
        return Math.sqrt(0.5 * this.getVWidth() * this.getVWidth() + 0.5 * this.getVHeight() * this.getVHeight());
      };
      this.getBoundingBox = function() {
        let shape = this.getBoundingShape();
        return shape.getBoundingBox();
      };
    };

    var SvgElemStylable = function(obj, inherits) {
      SvgElem.call(this, obj, inherits);
      this.transform = function() {
        doc.transform.apply(doc, this.getTransformation());
      };
      this.clip = function() {
        if (this.get('clip-path') !== 'none') {
          let clipPath = new SvgElemClipPath(this.get('clip-path'), null);
          clipPath.useMask(this.getBoundingBox());
          return true;
        }
      };
      this.mask = function() {
        if (this.get('mask') !== 'none') {
          let mask = new SvgElemMask(this.get('mask'), null);
          mask.useMask(this.getBoundingBox());
          return true;
        }
      };
      this.getFill = function(isClip, isMask) {
        let opacity = this.get('opacity'),
            fill = this.get('fill'),
            fillOpacity = this.get('fill-opacity');
        if (isClip) {return DefaultColors.white;}
        if (fill !== 'none' && opacity && fillOpacity) {
          if (fill instanceof SvgElemGradient || fill instanceof SvgElemPattern) {
            return fill.getPaint(this.getBoundingBox(), fillOpacity * opacity, isClip, isMask);
          }
          return opacityToColor(fill, fillOpacity * opacity, isMask);
        }
      };
      this.getStroke = function(isClip, isMask) {
        let opacity = this.get('opacity'),
            stroke = this.get('stroke'),
            strokeOpacity = this.get('stroke-opacity');
        if (isClip || isEqual(this.get('stroke-width'), 0)) {return;}
        if (stroke !== 'none' && opacity && strokeOpacity) {
          if (stroke instanceof SvgElemGradient || stroke instanceof SvgElemPattern) {
            return stroke.getPaint(this.getBoundingBox(), strokeOpacity * opacity, isClip, isMask);
          }
          return opacityToColor(stroke, strokeOpacity * opacity, isMask);
        }
      };
    };

    var SvgElemHasChildren = function(obj, inherits) {
      SvgElemStylable.call(this, obj, inherits);
      this.allowedChildren = ['use', 'g', 'a', 'svg', 'image', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text'];
      this.getBoundingShape = function() {
        let shape = new SvgShape(),
            children = this.getChildren();
        for (let i = 0; i < children.length; i++) {
          if (children[i].get('display') !== 'none') {
            if (typeof children[i].getBoundingShape === 'function') {
              let childShape = children[i].getBoundingShape().clone();
              if (typeof children[i].getTransformation === 'function') {
                childShape.transform(children[i].getTransformation());
              }
              shape.mergeShape(childShape);
            }
          }
        }
        return shape;
      };
      this.drawChildren = function(isClip, isMask) {
        let children = this.getChildren();
        for (let i = 0; i < children.length; i++) {
          if (children[i].get('display') !== 'none') {
            if (typeof children[i].drawInDocument === 'function') {
              children[i].drawInDocument(isClip, isMask);
            }
          }
        }
      };
    };

    var SvgElemContainer = function(obj, inherits) {
      SvgElemHasChildren.call(this, obj, inherits);
      this.drawContent = function(isClip, isMask) {
        this.transform();
        let clipped = this.clip(),
            masked = this.mask(),
            group;
        if ((this.get('opacity') < 1 || clipped || masked) && !isClip) {
          group = docBeginGroup(getPageBBox());
        }
        this.drawChildren(isClip, isMask);
        if (group) {
          docEndGroup(group);
          doc.fillOpacity(this.get('opacity'));
          docInsertGroup(group);
        }
      };
    };

    var SvgElemUse = function(obj, inherits) {
      SvgElemContainer.call(this, obj, inherits);
      let x = this.getLength('x', this.getVWidth(), 0),
          y = this.getLength('y', this.getVHeight(), 0),
          child = this.getUrl('href') || this.getUrl('xlink:href');
      if (child) {child = createSVGElement(child, this);}
      this.getChildren  = function() {
        return child ? [child] : [];
      };
      this.drawInDocument = function(isClip, isMask) {
        doc.save();
        this.drawContent(isClip, isMask);
        doc.restore();
      };
      this.getTransformation = function() {
        return multiplyMatrix(this.get('transform'), [1, 0, 0, 1, x, y]);
      };
    };

    var SvgElemSymbol = function(obj, inherits) {
      SvgElemContainer.call(this, obj, inherits);
      let width = this.getLength('width', this.getParentVWidth(), this.getParentVWidth()),
          height = this.getLength('height', this.getParentVHeight(), this.getParentVHeight());
      if (inherits instanceof SvgElemUse) {
        width = inherits.getLength('width', inherits.getParentVWidth(), width);
        height = inherits.getLength('height', inherits.getParentVHeight(), height);
      }
      let aspectRatio = (this.attr('preserveAspectRatio') || '').trim(),
          viewBox = this.getViewbox('viewBox', [0, 0, width, height]);
      this.getVWidth = function() {
        return viewBox[2];
      };
      this.getVHeight = function() {
        return viewBox[3];
      };
      this.drawInDocument = function(isClip, isMask) {
        doc.save();
        this.drawContent(isClip, isMask);
        doc.restore();
      };
      this.getTransformation = function() {
        return multiplyMatrix(parseAspectRatio(aspectRatio, width, height, viewBox[2], viewBox[3]), [1, 0, 0, 1, -viewBox[0], -viewBox[1]]);
      };
    };

    var SvgElemGroup = function(obj, inherits) {
      SvgElemContainer.call(this, obj, inherits);
      this.drawInDocument = function(isClip, isMask) {
        doc.save();
        if (this.link && !isClip && !isMask) {this.addLink();}
        this.drawContent(isClip, isMask);
        doc.restore();
      };
      this.getTransformation = function() {
        return this.get('transform');
      };
    };

    var SvgElemLink = function(obj, inherits) {
      if (inherits && inherits.isText) {
        SvgElemTspan.call(this, obj, inherits);
        this.allowedChildren = ['textPath', 'tspan', '#text', '#cdata-section', 'a'];
      } else {
        SvgElemGroup.call(this, obj, inherits);
      }
      this.link = this.attr('href') || this.attr('xlink:href');
      this.addLink = function() {
        if (this.link.match(/^(?:[a-z][a-z0-9+.-]*:|\/\/)?/i) && this.getChildren().length) {
          let bbox = this.getBoundingShape().transform(getGlobalMatrix()).getBoundingBox();
          docInsertLink(bbox[0], bbox[1], bbox[2], bbox[3], this.link);
        }
      }
    };

    var SvgElemSvg = function(obj, inherits) {
      SvgElemContainer.call(this, obj, inherits);
      let width = this.getLength('width', this.getParentVWidth(), this.getParentVWidth()),
          height = this.getLength('height', this.getParentVHeight(), this.getParentVHeight()),
          x = this.getLength('x', this.getParentVWidth(), 0),
          y = this.getLength('y', this.getParentVHeight(), 0);
      if (inherits instanceof SvgElemUse) {
        width = inherits.getLength('width', inherits.getParentVWidth(), width);
        height = inherits.getLength('height', inherits.getParentVHeight(), height);
      }
      let aspectRatio = this.attr('preserveAspectRatio'),
          viewBox = this.getViewbox('viewBox', [0, 0, width, height]);
      if (this.isOuterElement && preserveAspectRatio) {
        x = y = 0;
        width = viewportWidth;
        height = viewportHeight;
        aspectRatio = preserveAspectRatio;
      }
      this.getVWidth = function() {
        return viewBox[2];
      };
      this.getVHeight = function() {
        return viewBox[3];
      };
      this.drawInDocument = function(isClip, isMask) {
        doc.save();
        if (this.get('overflow') === 'hidden') {
          new SvgShape().M(x, y).L(x + width, y).L(x + width, y + height).L(x, y + height).Z()
                        .transform(this.get('transform'))
                        .insertInDocument();
          doc.clip();
        }
        this.drawContent(isClip, isMask);
        doc.restore();
      };
      this.getTransformation = function() {
        return multiplyMatrix(
          this.get('transform'),
          [1, 0, 0, 1, x, y],
          parseAspectRatio(aspectRatio, width, height, viewBox[2], viewBox[3]),
          [1, 0, 0, 1, -viewBox[0], -viewBox[1]]
        );
      };
    };

    var SVGElemImage = function(obj, inherits) {
      SvgElemStylable.call(this, obj, inherits);
      let link = imageCallback(this.attr('href') || this.attr('xlink:href') || ''),
          x = this.getLength('x', this.getVWidth(), 0),
          y = this.getLength('y', this.getVHeight(), 0),
          width = this.getLength('width', this.getVWidth(), 'auto'),
          height = this.getLength('height', this.getVHeight(), 'auto'),
          image;
      try {
        image = doc.openImage(link);
      } catch(e) {
        warningCallback('SVGElemImage: failed to open image "' + link + '" in PDFKit');
      }
      if (image) {
        if (width === 'auto' && height !== 'auto') {
          width = height * image.width / image.height;
        } else if (height === 'auto' && width !== 'auto') {
          height = width * image.height / image.width;
        } else if (width === 'auto' && height === 'auto') {
          width = image.width;
          height = image.height;
        }
      }
      if (width === 'auto' || width < 0) {width = 0;}
      if (height === 'auto' || height < 0) {height = 0;}
      this.getTransformation = function() {
        return this.get('transform');
      };
      this.getBoundingShape = function() {
        return new SvgShape().M(x, y).L(x + width, y).M(x + width, y + height).L(x, y + height);
      };
      this.drawInDocument = function(isClip, isMask) {
        if (this.get('visibility') === 'hidden' || !image) {return;}
        doc.save();
        this.transform();
        if (this.get('overflow') === 'hidden') {
          doc.rect(x, y, width, height).clip();
        }
        this.clip();
        this.mask();
        doc.translate(x, y);
        doc.transform.apply(doc, parseAspectRatio(this.attr('preserveAspectRatio'), width, height, image ? image.width : width, image ? image.height : height));
        if (!isClip) {
          doc.fillOpacity(this.get('opacity'));
          doc.image(image, 0, 0);
        } else {
          doc.rect(0, 0, image.width, image.height);
          docFillColor(DefaultColors.white).fill();
        }
        doc.restore();
      };
    };

    var SvgElemPattern = function(obj, inherits, fallback) {
      SvgElemHasChildren.call(this, obj, inherits);
      this.ref = (function() {
        let ref = this.getUrl('href') || this.getUrl('xlink:href');
        if (ref && ref.nodeName === obj.nodeName) {
          return new SvgElemPattern(ref, inherits, fallback);
        }
      }).call(this);
      let _attr = this.attr;
      this.attr = function(key) {
        let attr = _attr.call(this, key);
        if (attr != null || key === 'href' || key === 'xlink:href') {return attr;}
        return this.ref ? this.ref.attr(key) : null;
      };
      let _getChildren = this.getChildren;
      this.getChildren = function() {
        let children = _getChildren.call(this);
        if (children.length > 0) {return children;}
        return this.ref ? this.ref.getChildren() : [];
      };
      this.getPaint = function(bBox, gOpacity, isClip, isMask) {
        let bBoxUnitsPattern = (this.attr('patternUnits') !== 'userSpaceOnUse'),
            bBoxUnitsContent = (this.attr('patternContentUnits') === 'objectBoundingBox'),
            x = this.getLength('x', (bBoxUnitsPattern ? 1 : this.getParentVWidth()), 0),
            y = this.getLength('y', (bBoxUnitsPattern ? 1 : this.getParentVHeight()), 0),
            width = this.getLength('width', (bBoxUnitsPattern ? 1 : this.getParentVWidth()), 0),
            height = this.getLength('height', (bBoxUnitsPattern ? 1 : this.getParentVHeight()), 0);
        if (bBoxUnitsContent && !bBoxUnitsPattern) { // Use the same units for pattern & pattern content
          x = (x - bBox[0]) / (bBox[2] - bBox[0]) || 0;
          y = (y - bBox[1]) / (bBox[3] - bBox[1]) || 0;
          width = width / (bBox[2] - bBox[0]) || 0;
          height = height / (bBox[3] - bBox[1]) || 0;
        } else if (!bBoxUnitsContent && bBoxUnitsPattern) {
          x = bBox[0] + x * (bBox[2] - bBox[0]);
          y = bBox[1] + y * (bBox[3] - bBox[1]);
          width = width * (bBox[2] - bBox[0]);
          height = height * (bBox[3] - bBox[1]);
        }
        let viewBox = this.getViewbox('viewBox', [0, 0, width, height]),
            aspectRatio = (this.attr('preserveAspectRatio') || '').trim(),
            aspectRatioMatrix = multiplyMatrix(
              parseAspectRatio(aspectRatio, width, height, viewBox[2], viewBox[3], 0),
              [1, 0, 0, 1, -viewBox[0], -viewBox[1]]
            ),
            matrix = parseTranform(this.attr('patternTransform'));
        if (bBoxUnitsContent) {
          matrix = multiplyMatrix([bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]], matrix);
        }
        matrix = multiplyMatrix(matrix, [1, 0, 0, 1, x, y]);
        if ((matrix = validateMatrix(matrix)) && (aspectRatioMatrix = validateMatrix(aspectRatioMatrix)) && (width = validateNumber(width)) && (height = validateNumber(height))) {
          let group = docBeginGroup([0, 0, width, height]);
          doc.transform.apply(doc, aspectRatioMatrix);
          this.drawChildren(isClip, isMask);
          docEndGroup(group);
          return [docCreatePattern(group, width, height, matrix), gOpacity];
        } else {
          return fallback ? [fallback[0], fallback[1] * gOpacity] : undefined;
        }
      };
      this.getVWidth = function() {
        let bBoxUnitsPattern = (this.attr('patternUnits') !== 'userSpaceOnUse'),
            width = this.getLength('width', (bBoxUnitsPattern ? 1 : this.getParentVWidth()), 0);
        return this.getViewbox('viewBox', [0, 0, width, 0])[2];
      };
      this.getVHeight = function() {
        let bBoxUnitsPattern = (this.attr('patternUnits') !== 'userSpaceOnUse'),
            height = this.getLength('height', (bBoxUnitsPattern ? 1 : this.getParentVHeight()), 0);
        return this.getViewbox('viewBox', [0, 0, 0, height])[3];
      };
    };

    var SvgElemGradient = function(obj, inherits, fallback) {
      SvgElem.call(this, obj, inherits);
      this.allowedChildren = ['stop'];
      this.ref = (function() {
        let ref = this.getUrl('href') || this.getUrl('xlink:href');
        if (ref && ref.nodeName === obj.nodeName) {
          return new SvgElemGradient(ref, inherits, fallback);
        }
      }).call(this);
      let _attr = this.attr;
      this.attr = function(key) {
        let attr = _attr.call(this, key);
        if (attr != null || key === 'href' || key === 'xlink:href') {return attr;}
        return this.ref ? this.ref.attr(key) : null;
      };
      let _getChildren = this.getChildren;
      this.getChildren = function() {
        let children = _getChildren.call(this);
        if (children.length > 0) {return children;}
        return this.ref ? this.ref.getChildren() : [];
      };
      this.getPaint = function(bBox, gOpacity, isClip, isMask) {
        let children = this.getChildren();
        if (children.length === 0) {return;}
        if (children.length === 1) {
          let child = children[0],
              stopColor = child.get('stop-color');
          if (stopColor === 'none') {return;}
          return opacityToColor(stopColor, child.get('stop-opacity') * gOpacity, isMask);
        }
        let bBoxUnits = (this.attr('gradientUnits') !== 'userSpaceOnUse'),
            matrix = parseTranform(this.attr('gradientTransform')),
            spread = this.attr('spreadMethod'),
            grad,
            x1, x2, y1, y2, r2,
            nAfter = 0,
            nBefore = 0,
            nTotal = 1;
        if (bBoxUnits) {
          matrix = multiplyMatrix([bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]], matrix);
        }
        if (matrix = validateMatrix(matrix)) {
          if (this.name === 'linearGradient') {
            x1 = this.getLength('x1', (bBoxUnits ? 1 : this.getVWidth()), 0);
            x2 = this.getLength('x2', (bBoxUnits ? 1 : this.getVWidth()), (bBoxUnits ? 1 : this.getVWidth()));
            y1 = this.getLength('y1', (bBoxUnits ? 1 : this.getVHeight()), 0);
            y2 = this.getLength('y2', (bBoxUnits ? 1 : this.getVHeight()), 0);
          } else {
            x2 = this.getLength('cx', (bBoxUnits ? 1 : this.getVWidth()), (bBoxUnits ? 0.5 : 0.5 * this.getVWidth()));
            y2 = this.getLength('cy', (bBoxUnits ? 1 : this.getVHeight()), (bBoxUnits ? 0.5 : 0.5 * this.getVHeight()));
            r2 = this.getLength('r', (bBoxUnits ? 1 : this.getViewport()), (bBoxUnits ? 0.5 : 0.5 * this.getViewport()));
            x1 = this.getLength('fx', (bBoxUnits ? 1 : this.getVWidth()), x2);
            y1 = this.getLength('fy', (bBoxUnits ? 1 : this.getVHeight()), y2);
            if (r2 < 0) {
              warningCallback('SvgElemGradient: negative r value');
            }
            let d = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
                multiplier = 1;
            if (d > r2) { // according to specification
              multiplier = r2 / d;
              x1 = x2 + (x1 - x2) * multiplier;
              y1 = y2 + (y1 - y2) * multiplier;
            }
            r2 = Math.max(r2, d * multiplier * (1 + 1e-6)); // fix for edge-case gradients see issue #84
          }
          if (spread === 'reflect' || spread === 'repeat') {
            let inv = inverseMatrix(matrix),
                corner1 = transformPoint([bBox[0], bBox[1]], inv),
                corner2 = transformPoint([bBox[2], bBox[1]], inv),
                corner3 = transformPoint([bBox[2], bBox[3]], inv),
                corner4 = transformPoint([bBox[0], bBox[3]], inv);
            if (this.name === 'linearGradient') { // See file 'gradient-repeat-maths.png'
              nAfter  = Math.max((corner1[0] - x2) * (x2 - x1) + (corner1[1] - y2) * (y2 - y1),
                                 (corner2[0] - x2) * (x2 - x1) + (corner2[1] - y2) * (y2 - y1),
                                 (corner3[0] - x2) * (x2 - x1) + (corner3[1] - y2) * (y2 - y1),
                                 (corner4[0] - x2) * (x2 - x1) + (corner4[1] - y2) * (y2 - y1))
                                / (Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
              nBefore = Math.max((corner1[0] - x1) * (x1 - x2) + (corner1[1] - y1) * (y1 - y2),
                                 (corner2[0] - x1) * (x1 - x2) + (corner2[1] - y1) * (y1 - y2),
                                 (corner3[0] - x1) * (x1 - x2) + (corner3[1] - y1) * (y1 - y2),
                                 (corner4[0] - x1) * (x1 - x2) + (corner4[1] - y1) * (y1 - y2))
                                / (Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            } else {
              nAfter  = Math.sqrt(Math.max(Math.pow(corner1[0] - x2, 2) + Math.pow(corner1[1] - y2, 2),
                                           Math.pow(corner2[0] - x2, 2) + Math.pow(corner2[1] - y2, 2),
                                           Math.pow(corner3[0] - x2, 2) + Math.pow(corner3[1] - y2, 2),
                                           Math.pow(corner4[0] - x2, 2) + Math.pow(corner4[1] - y2, 2))) / r2 - 1;
            }
            nAfter = Math.ceil(nAfter + 0.5); // Add a little more because the stroke can extend outside of the bounding box
            nBefore = Math.ceil(nBefore + 0.5);
            nTotal = nBefore + 1 + nAfter; // How many times the gradient needs to be repeated to fill the object bounding box
          }
          if (this.name === 'linearGradient') {
            grad = doc.linearGradient(x1 - nBefore * (x2 - x1), y1 - nBefore * (y2 - y1), x2 + nAfter * (x2 - x1), y2 + nAfter * (y2 - y1));
          } else {
            grad = doc.radialGradient(x1, y1, 0, x2, y2, r2 + nAfter * r2);
          }
          for (let n = 0; n < nTotal; n++) {
            let offset = 0,
                inOrder = (spread !== 'reflect' || (n - nBefore) % 2 === 0);
            for (let i = 0; i < children.length; i++) {
              let child = children[inOrder ? i : children.length - 1 - i],
                  stopColor = child.get('stop-color');
              if (stopColor === 'none') {stopColor = DefaultColors.transparent;}
              stopColor = opacityToColor(stopColor, child.get('stop-opacity') * gOpacity, isMask);
              offset = Math.max(offset, inOrder ? child.getPercent('offset', 0) : 1 - child.getPercent('offset', 0));
              if (i === 0 && stopColor[0].length === 4) {grad._colorSpace = 'DeviceCMYK';} // Fix until PR #763 is merged into PDFKit
              if (i === 0 && offset > 0) {
                grad.stop((n + 0) / nTotal, stopColor[0], stopColor[1]);
              }
              grad.stop((n + offset) / (nAfter + nBefore + 1), stopColor[0], stopColor[1]);
              if (i === children.length - 1 && offset < 1) {
                grad.stop((n + 1) / nTotal, stopColor[0], stopColor[1]);
              }
            }
          }
          grad.setTransform.apply(grad, matrix);
          return [grad, 1];
        } else {
          return fallback ? [fallback[0], fallback[1] * gOpacity] : undefined;
        }
      }
    };

    var SvgElemBasicShape = function(obj, inherits) {
      SvgElemStylable.call(this, obj, inherits);
      this.dashScale = 1;
      this.getBoundingShape = function() {
        return this.shape;
      };
      this.getTransformation = function() {
        return this.get('transform');
      };
      this.drawInDocument = function(isClip, isMask) {
        if (this.get('visibility') === 'hidden' || !this.shape) {return;}
        doc.save();
        this.transform();
        this.clip();
        if (!isClip) {
          let masked = this.mask(),
              group;
          if (masked) {
            group = docBeginGroup(getPageBBox());
          }
          let subPaths = this.shape.getSubPaths(),
              fill = this.getFill(isClip, isMask),
              stroke = this.getStroke(isClip, isMask),
              lineWidth = this.get('stroke-width'),
              lineCap = this.get('stroke-linecap');
          if (fill || stroke) {
            if (fill) {
              docFillColor(fill);
            }
            if (stroke) {
              for (let j = 0; j < subPaths.length; j++) {
                if (isEqual(subPaths[j].totalLength, 0)) {
                  if ((lineCap === 'square' || lineCap === 'round') && lineWidth > 0) {
                    if (subPaths[j].startPoint && subPaths[j].startPoint.length > 1) {
                      let x = subPaths[j].startPoint[0],
                          y = subPaths[j].startPoint[1];
                      docFillColor(stroke);
                      if (lineCap === 'square') {
                        doc.rect(x - 0.5 * lineWidth, y - 0.5 * lineWidth, lineWidth, lineWidth);
                      } else if (lineCap === 'round') {
                        doc.circle(x, y, 0.5 * lineWidth);
                      }
                      doc.fill();
                    }
                  }
                }
              }
              let dashArray = this.get('stroke-dasharray'),
                  dashOffset = this.get('stroke-dashoffset');
              if (isNotEqual(this.dashScale, 1)) {
                for (let j = 0; j < dashArray.length; j++) {
                  dashArray[j] *= this.dashScale;
                }
                dashOffset *= this.dashScale;
              }
              docStrokeColor(stroke);
              doc.lineWidth(lineWidth)
                 .miterLimit(this.get('stroke-miterlimit'))
                 .lineJoin(this.get('stroke-linejoin'))
                 .lineCap(lineCap)
                 .dash(dashArray, {phase: dashOffset});
            }
            for (let j = 0; j < subPaths.length; j++) {
              if (subPaths[j].totalLength > 0) {
                subPaths[j].insertInDocument();
              }
            }
            if (fill && stroke) {
              doc.fillAndStroke(this.get('fill-rule'));
            } else if (fill) {
              doc.fill(this.get('fill-rule'));
            } else if (stroke) {
              doc.stroke();
            }
          }
          let markerStart = this.get('marker-start'),
              markerMid = this.get('marker-mid'),
              markerEnd = this.get('marker-end');
          if (markerStart !== 'none' || markerMid !== 'none' || markerEnd !== 'none') {
            let markersPos = this.shape.getMarkers();
            if (markerStart !== 'none') {
              let marker = new SvgElemMarker(markerStart, null);
              marker.drawMarker(false, isMask, markersPos[0], lineWidth);
            }
            if (markerMid !== 'none') {
              for (let i = 1; i < markersPos.length - 1; i++) {
                let marker = new SvgElemMarker(markerMid, null);
                marker.drawMarker(false, isMask, markersPos[i], lineWidth);
              }
            }
            if (markerEnd !== 'none') {
              let marker = new SvgElemMarker(markerEnd, null);
              marker.drawMarker(false, isMask, markersPos[markersPos.length - 1], lineWidth);
            }
          }
          if (group) {
            docEndGroup(group);
            docInsertGroup(group);
          }
        } else {
          this.shape.insertInDocument();
          docFillColor(DefaultColors.white);
          doc.fill(this.get('clip-rule'));
        }
        doc.restore();
      };
    };

    var SvgElemRect = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let x = this.getLength('x', this.getVWidth(), 0),
          y = this.getLength('y', this.getVHeight(), 0),
          w = this.getLength('width', this.getVWidth(), 0),
          h = this.getLength('height', this.getVHeight(), 0),
          rx = this.getLength('rx', this.getVWidth()),
          ry = this.getLength('ry', this.getVHeight());
      if (rx === undefined && ry === undefined) {rx = ry = 0;}
      else if (rx === undefined && ry !== undefined) {rx = ry;}
      else if (rx !== undefined && ry === undefined) {ry = rx;}
      if (w > 0 && h > 0) {
        if (rx && ry) {
          rx = Math.min(rx, 0.5 * w);
          ry = Math.min(ry, 0.5 * h);
          this.shape = new SvgShape().M(x + rx, y).L(x + w - rx, y).A(rx, ry, 0, 0, 1, x + w, y + ry)
                            .L(x + w, y + h - ry).A(rx, ry, 0, 0, 1, x + w - rx, y + h).L(x + rx, y + h)
                            .A(rx, ry, 0, 0, 1, x, y + h - ry).L(x, y + ry).A(rx, ry, 0, 0, 1, x + rx, y).Z();
        } else {
          this.shape = new SvgShape().M(x, y).L(x + w, y).L(x + w, y + h).L(x, y + h).Z();
        }
      } else {
        this.shape = new SvgShape();
      }
    };

    var SvgElemCircle = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let cx = this.getLength('cx', this.getVWidth(), 0),
          cy = this.getLength('cy', this.getVHeight(), 0),
          r = this.getLength('r', this.getViewport(), 0);
      if (r > 0) {
        this.shape = new SvgShape().M(cx + r, cy).A(r, r, 0, 0, 1, cx - r, cy).A(r, r, 0, 0, 1, cx + r, cy).Z();
      } else {
        this.shape = new SvgShape();
      }
    };

    var SvgElemEllipse = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let cx = this.getLength('cx', this.getVWidth(), 0),
          cy = this.getLength('cy', this.getVHeight(), 0),
          rx = this.getLength('rx', this.getVWidth(), 0),
          ry = this.getLength('ry', this.getVHeight(), 0);
      if (rx > 0 && ry > 0) {
        this.shape = new SvgShape().M(cx + rx, cy).A(rx, ry, 0, 0, 1, cx - rx, cy).A(rx, ry, 0, 0, 1, cx + rx, cy).Z();
      } else {
        this.shape = new SvgShape();
      }
    };

    var SvgElemLine = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let x1 = this.getLength('x1', this.getVWidth(), 0),
          y1 = this.getLength('y1', this.getVHeight(), 0),
          x2 = this.getLength('x2', this.getVWidth(), 0),
          y2 = this.getLength('y2', this.getVHeight(), 0);
      this.shape = new SvgShape().M(x1, y1).L(x2, y2);
    };

    var SvgElemPolyline = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let points = this.getNumberList('points');
      this.shape = new SvgShape();
      for (let i = 0; i < points.length - 1; i += 2) {
        if (i === 0) {
          this.shape.M(points[i], points[i+1]);
        } else {
          this.shape.L(points[i], points[i+1]);
        }
      }
      if (points.error) {warningCallback('SvgElemPolygon: unexpected string ' + points.error);}
      if (points.length % 2 === 1) {warningCallback('SvgElemPolyline: uneven number of coordinates');}
    };

    var SvgElemPolygon = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      let points = this.getNumberList('points');
      this.shape = new SvgShape();
      for (let i = 0; i < points.length - 1; i += 2) {
        if (i === 0) {
          this.shape.M(points[i], points[i+1]);
        } else {
          this.shape.L(points[i], points[i+1]);
        }
      }
      this.shape.Z();
      if (points.error) {warningCallback('SvgElemPolygon: unexpected string ' + points.error);}
      if (points.length % 2 === 1) {warningCallback('SvgElemPolygon: uneven number of coordinates');}
    };

    var SvgElemPath = function(obj, inherits) {
      SvgElemBasicShape.call(this, obj, inherits);
      this.shape = new SvgShape().path(this.attr('d'));
      let pathLength = this.getLength('pathLength', this.getViewport());
      this.pathLength = pathLength > 0 ? pathLength : undefined;
      this.dashScale = (this.pathLength !== undefined ? this.shape.totalLength / this.pathLength : 1);
    };

    var SvgElemMarker = function(obj, inherits) {
      SvgElemHasChildren.call(this, obj, inherits);
      let width = this.getLength('markerWidth', this.getParentVWidth(), 3),
          height = this.getLength('markerHeight', this.getParentVHeight(), 3),
          viewBox = this.getViewbox('viewBox', [0, 0, width, height]);
      this.getVWidth = function() {
        return viewBox[2];
      };
      this.getVHeight = function() {
        return viewBox[3];
      };
      this.drawMarker = function(isClip, isMask, posArray, strokeWidth) {
        doc.save();
        let orient = this.attr('orient'),
            units = this.attr('markerUnits'),
            rotate = (orient === 'auto' ? posArray[2] : (parseFloat(orient) || 0) * Math.PI / 180),
            scale = (units === 'userSpaceOnUse' ? 1 : strokeWidth);
        doc.transform(Math.cos(rotate) * scale, Math.sin(rotate) * scale, -Math.sin(rotate) * scale, Math.cos(rotate) * scale, posArray[0], posArray[1]);
        let refX = this.getLength('refX', this.getVWidth(), 0),
            refY = this.getLength('refY', this.getVHeight(), 0),
            aspectRatioMatrix = parseAspectRatio(this.attr('preserveAspectRatio'), width, height, viewBox[2], viewBox[3], 0.5);
        if (this.get('overflow') === 'hidden') {
          doc.rect(aspectRatioMatrix[0] * (viewBox[0] + viewBox[2] / 2 - refX) - width / 2, aspectRatioMatrix[3] * (viewBox[1] + viewBox[3] / 2 - refY) - height / 2, width, height).clip();
        }
        doc.transform.apply(doc, aspectRatioMatrix);
        doc.translate(-refX, -refY);
        let group;
        if (this.get('opacity') < 1 && !isClip) {
          group = docBeginGroup(getPageBBox());
        }
        this.drawChildren(isClip, isMask);
        if (group) {
          docEndGroup(group);
          doc.fillOpacity(this.get('opacity'));
          docInsertGroup(group);
        }
        doc.restore();
      };
    };

    var SvgElemClipPath = function(obj, inherits) {
      SvgElemHasChildren.call(this, obj, inherits);
      this.useMask = function(bBox) {
        let group = docBeginGroup(getPageBBox());
        doc.save();
        if (this.attr('clipPathUnits') === 'objectBoundingBox') {
          doc.transform(bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]);
        }
        this.clip();
        this.drawChildren(true, false);
        doc.restore();
        docEndGroup(group);
        docApplyMask(group, true);
      };
    };

    var SvgElemMask = function(obj, inherits) {
      SvgElemHasChildren.call(this, obj, inherits);
      this.useMask = function(bBox) {
        let group = docBeginGroup(getPageBBox());
        doc.save();
        let x, y, w, h;
        if (this.attr('maskUnits') === 'userSpaceOnUse') {
          x = this.getLength('x', this.getVWidth(), -0.1 * (bBox[2] - bBox[0]) + bBox[0]);
          y = this.getLength('y', this.getVHeight(), -0.1 * (bBox[3] - bBox[1]) + bBox[1]);
          w = this.getLength('width', this.getVWidth(), 1.2 * (bBox[2] - bBox[0]));
          h = this.getLength('height', this.getVHeight(), 1.2 * (bBox[3] - bBox[1]));
        } else {
          x = this.getLength('x', this.getVWidth(), -0.1) * (bBox[2] - bBox[0]) + bBox[0];
          y = this.getLength('y', this.getVHeight(), -0.1) * (bBox[3] - bBox[1]) + bBox[1];
          w = this.getLength('width', this.getVWidth(), 1.2) * (bBox[2] - bBox[0]);
          h = this.getLength('height', this.getVHeight(), 1.2) * (bBox[3] - bBox[1]);
        }
        doc.rect(x, y, w, h).clip();
        if (this.attr('maskContentUnits') === 'objectBoundingBox') {
          doc.transform(bBox[2] - bBox[0], 0, 0, bBox[3] - bBox[1], bBox[0], bBox[1]);
        }
        this.clip();
        this.drawChildren(false, true);
        doc.restore();
        docEndGroup(group);
        docApplyMask(group, true);
      };
    };

    var SvgElemTextContainer = function(obj, inherits) {
      SvgElemStylable.call(this, obj, inherits);
      this.allowedChildren = ['tspan', '#text', '#cdata-section', 'a'];
      this.isText = true;
      this.getBoundingShape = function() {
        let shape = new SvgShape();
        for (let i = 0; i < this._pos.length; i++) {
          let pos = this._pos[i];
          if (!pos.hidden) {
            let dx0 = pos.ascent * Math.sin(pos.rotate), dy0 = -pos.ascent * Math.cos(pos.rotate),
                dx1 = pos.descent * Math.sin(pos.rotate), dy1 = -pos.descent * Math.cos(pos.rotate),
                dx2 = pos.width * Math.cos(pos.rotate), dy2 = pos.width * Math.sin(pos.rotate);
            shape.M(pos.x + dx0, pos.y + dy0).L(pos.x + dx0 + dx2, pos.y + dy0 + dy2)
                 .M(pos.x + dx1 + dx2, pos.y + dy1 + dy2).L(pos.x + dx1, pos.y + dy1);
          }
        }
        return shape;
      };
      this.drawTextInDocument = function(isClip, isMask) {
        if (this.link && !isClip && !isMask) {this.addLink();}
        if (this.get('text-decoration') === 'underline') {
          this.decorate(0.05 * this._font.size, -0.075 * this._font.size, isClip, isMask);
        }
        if (this.get('text-decoration') === 'overline') {
          this.decorate(0.05 * this._font.size, getAscent(this._font.font, this._font.size) + 0.075 * this._font.size, isClip, isMask);
        }
        let fill = this.getFill(isClip, isMask),
            stroke = this.getStroke(isClip, isMask),
            strokeWidth = this.get('stroke-width');
        if (this._font.fauxBold) {
          if (!stroke) {
            stroke = fill;
            strokeWidth = this._font.size * 0.03;
          } else {
            strokeWidth += this._font.size * 0.03;
          }
        }
        let children = this.getChildren();
        for (let i = 0; i < children.length; i++) {
          let childElem = children[i];
          switch(childElem.name) {
            case 'tspan': case 'textPath': case 'a':
              if (childElem.get('display') !== 'none') {
                childElem.drawTextInDocument(isClip, isMask);
              }
              break;
            case '#text': case '#cdata-section':
              if (this.get('visibility') === 'hidden') {continue;}
              if (fill || stroke || isClip) {
                if (fill) {
                  docFillColor(fill);
                }
                if (stroke && strokeWidth) {
                  docStrokeColor(stroke);
                  doc.lineWidth(strokeWidth)
                     .miterLimit(this.get('stroke-miterlimit'))
                     .lineJoin(this.get('stroke-linejoin'))
                     .lineCap(this.get('stroke-linecap'))
                     .dash(this.get('stroke-dasharray'), {phase:this.get('stroke-dashoffset')});
                }
                docBeginText(this._font.font, this._font.size);
                docSetTextMode(!!fill, !!stroke);
                for (let j = 0, pos = childElem._pos; j < pos.length; j++) {
                  if (!pos[j].hidden && isNotEqual(pos[j].width, 0)) {
                    let cos = Math.cos(pos[j].rotate), sin = Math.sin(pos[j].rotate), skew = (this._font.fauxItalic ? -0.25 : 0);
                    docSetTextMatrix(cos * pos[j].scale, sin * pos[j].scale, cos * skew - sin, sin * skew + cos, pos[j].x, pos[j].y);
                    docWriteGlyph(pos[j].glyph);
                  }
                }
                docEndText();
              }
              break;
          }
        }
        if (this.get('text-decoration') === 'line-through') {
          this.decorate(0.05 * this._font.size, 0.5 * (getAscent(this._font.font, this._font.size) + getDescent(this._font.font, this._font.size)), isClip, isMask);
        }
      };
      this.decorate = function(lineWidth, linePosition, isClip, isMask) {
        let fill = this.getFill(isClip, isMask),
            stroke = this.getStroke(isClip, isMask);
        if (fill) {
          docFillColor(fill);
        }
        if (stroke) {
          docStrokeColor(stroke);
          doc.lineWidth(this.get('stroke-width'))
             .miterLimit(this.get('stroke-miterlimit'))
             .lineJoin(this.get('stroke-linejoin'))
             .lineCap(this.get('stroke-linecap'))
             .dash(this.get('stroke-dasharray'), {phase:this.get('stroke-dashoffset')});
        }
        for (let j = 0, pos = this._pos; j < pos.length; j++) {
          if (!pos[j].hidden && isNotEqual(pos[j].width, 0)) {
            let dx0 = (linePosition + lineWidth / 2) * Math.sin(pos[j].rotate),
                dy0 = -(linePosition + lineWidth / 2) * Math.cos(pos[j].rotate),
                dx1 = (linePosition - lineWidth / 2) * Math.sin(pos[j].rotate),
                dy1 = -(linePosition - lineWidth / 2) * Math.cos(pos[j].rotate),
                dx2 = pos[j].width * Math.cos(pos[j].rotate),
                dy2 = pos[j].width * Math.sin(pos[j].rotate);
            new SvgShape().M(pos[j].x + dx0, pos[j].y + dy0)
                          .L(pos[j].x + dx0 + dx2, pos[j].y + dy0 + dy2)
                          .L(pos[j].x + dx1 + dx2, pos[j].y + dy1 + dy2)
                          .L(pos[j].x + dx1, pos[j].y + dy1).Z()
                          .insertInDocument();
            if (fill && stroke) {
              doc.fillAndStroke();
            } else if (fill) {
              doc.fill();
            } else if (stroke) {
              doc.stroke();
            }
          }
        }
      };
    };

    var SvgElemTextNode = function(obj, inherits) {
      this.name = obj.nodeName;
      this.textContent = obj.nodeValue;
    };

    var SvgElemTspan = function(obj, inherits) {
      SvgElemTextContainer.call(this, obj, inherits);
    };

    var SvgElemTextPath = function(obj, inherits) {
      SvgElemTextContainer.call(this, obj, inherits);
      let pathObject, pathLength, temp;
      if ((temp = this.attr('path')) && temp.trim() !== '') {
        let pathLength = this.getLength('pathLength', this.getViewport());
        this.pathObject = new SvgShape().path(temp);
        this.pathLength = pathLength > 0 ? pathLength : this.pathObject.totalLength;
        this.pathScale = this.pathObject.totalLength / this.pathLength;
      } else if ((temp = this.getUrl('href') || this.getUrl('xlink:href')) && temp.nodeName === 'path') {
        let pathElem = new SvgElemPath(temp, this);
        this.pathObject = pathElem.shape.clone().transform(pathElem.get('transform'));
        this.pathLength = this.chooseValue(pathElem.pathLength, this.pathObject.totalLength);
        this.pathScale = this.pathObject.totalLength / this.pathLength;
      }
    };

    var SvgElemText = function(obj, inherits) {
      SvgElemTextContainer.call(this, obj, inherits);
      this.allowedChildren = ['textPath', 'tspan', '#text', '#cdata-section', 'a'];
      (function (textParentElem) {
        let processedText = '', remainingText = obj.textContent, textPaths = [], currentChunk = [], currentAnchor, currentDirection, currentX = 0, currentY = 0;
        function doAnchoring() {
          if (currentChunk.length) {
            let last = currentChunk[currentChunk.length - 1];
            let first = currentChunk[0]
            let width = last.x + last.width - first.x;
            let anchordx = {'startltr': 0, 'middleltr': 0.5, 'endltr': 1, 'startrtl': 1, 'middlertl': 0.5, 'endrtl': 0}[currentAnchor + currentDirection] * width || 0;
            for (let i = 0; i < currentChunk.length; i++) {
              currentChunk[i].x -= anchordx;
            }
          }
          currentChunk = [];
        }
        function adjustLength(pos, length, spacingAndGlyphs) {
          let firstChar = pos[0], lastChar = pos[pos.length - 1],
              startX = firstChar.x, endX = lastChar.x + lastChar.width;
          if (spacingAndGlyphs) {
            let textScale = length / (endX - startX);
            if (textScale > 0 && textScale < Infinity) {
              for (let j = 0; j < pos.length; j++) {
                pos[j].x = startX + textScale * (pos[j].x - startX);
                pos[j].scale *= textScale;
                pos[j].width *= textScale;
              }
            }
          } else {
            if (pos.length >= 2) {
              let spaceDiff = (length - (endX - startX)) / (pos.length - 1);
              for (let j = 0; j < pos.length; j++) {
                pos[j].x += j * spaceDiff;
              }
            }
          }
          currentX += length - (endX - startX);
        }
        function recursive(currentElem, parentElem) {
          currentElem._x = combineArrays(currentElem.getLengthList('x', currentElem.getVWidth()), (parentElem ? parentElem._x.slice(parentElem._pos.length) : []));
          currentElem._y = combineArrays(currentElem.getLengthList('y', currentElem.getVHeight()), (parentElem ? parentElem._y.slice(parentElem._pos.length) : []));
          currentElem._dx = combineArrays(currentElem.getLengthList('dx', currentElem.getVWidth()), (parentElem ? parentElem._dx.slice(parentElem._pos.length) : []));
          currentElem._dy = combineArrays(currentElem.getLengthList('dy', currentElem.getVHeight()), (parentElem ? parentElem._dy.slice(parentElem._pos.length) : []));
          currentElem._rot = combineArrays(currentElem.getNumberList('rotate'), (parentElem ? parentElem._rot.slice(parentElem._pos.length) : []));
          currentElem._defRot = currentElem.chooseValue(currentElem._rot[currentElem._rot.length - 1], parentElem && parentElem._defRot, 0);
          if (currentElem.name === 'textPath') {currentElem._y = [];}
          let fontOptions = {fauxItalic: false, fauxBold: false},
              fontNameorLink = fontCallback(currentElem.get('font-family'), currentElem.get('font-weight') === 'bold', currentElem.get('font-style') === 'italic', fontOptions);
          try {
            doc.font(fontNameorLink);
          } catch(e) {
            warningCallback('SVGElemText: failed to open font "' + fontNameorLink + '" in PDFKit');
          }
          currentElem._pos = [];
          currentElem._index = 0;
          currentElem._font = {font: doc._font, size: currentElem.get('font-size'), fauxItalic: fontOptions.fauxItalic, fauxBold: fontOptions.fauxBold};
          let textLength = currentElem.getLength('textLength', currentElem.getVWidth(), undefined),
              spacingAndGlyphs = currentElem.attr('lengthAdjust') === 'spacingAndGlyphs',
              wordSpacing = currentElem.get('word-spacing'),
              letterSpacing = currentElem.get('letter-spacing'),
              textAnchor = currentElem.get('text-anchor'),
              textDirection = currentElem.get('direction'),
              baseline = getBaseline(currentElem._font.font, currentElem._font.size, currentElem.get('alignment-baseline') || currentElem.get('dominant-baseline'), currentElem.get('baseline-shift'));
          if (currentElem.name === 'textPath') {
            doAnchoring();
            currentX = currentY = 0;
          }
          let children = currentElem.getChildren();
          for (let i = 0; i < children.length; i++) {
            let childElem = children[i];
            switch(childElem.name) {
              case 'tspan': case 'textPath': case 'a':
                recursive(childElem, currentElem);
                break;
              case '#text': case '#cdata-section':
                let rawText = childElem.textContent, renderedText = rawText, words;
                childElem._font = currentElem._font;
                childElem._pos = [];
                remainingText = remainingText.substring(rawText.length);
                if (currentElem.get('xml:space') === 'preserve') {
                  renderedText = renderedText.replace(/[\s]/g, ' ');
                } else {
                  renderedText = renderedText.replace(/[\s]+/g, ' ');
                  if (processedText.match(/[\s]$|^$/)) {renderedText = renderedText.replace(/^[\s]/, '');}
                  if (remainingText.match(/^[\s]*$/)) {renderedText = renderedText.replace(/[\s]$/, '');}
                }
                processedText += rawText;
                if (wordSpacing === 0) {
                  words = [renderedText];
                } else {
                  words = renderedText.split(/(\s)/);
                }
                for (let w = 0; w < words.length; w++) {
                  let pos = getTextPos(currentElem._font.font, currentElem._font.size, words[w]);
                  for (let j = 0; j < pos.length; j++) {
                    let index = currentElem._index,
                        xAttr = currentElem._x[index],
                        yAttr = currentElem._y[index],
                        dxAttr = currentElem._dx[index],
                        dyAttr = currentElem._dy[index],
                        rotAttr = currentElem._rot[index],
                        continuous = !(w === 0 && j === 0);
                    if (xAttr !== undefined) {continuous = false; doAnchoring(); currentX = xAttr;}
                    if (yAttr !== undefined) {continuous = false; doAnchoring(); currentY = yAttr;}
                    if (dxAttr !== undefined) {continuous = false; currentX += dxAttr;}
                    if (dyAttr !== undefined) {continuous = false; currentY += dyAttr;}
                    if (rotAttr !== undefined || currentElem._defRot !== 0) {continuous = false;}
                    let position = {
                      glyph: pos[j].glyph,
                      rotate: (Math.PI / 180) * currentElem.chooseValue(rotAttr, currentElem._defRot),
                      x: currentX + pos[j].xOffset,
                      y: currentY + baseline + pos[j].yOffset,
                      width: pos[j].width,
                      ascent: getAscent(currentElem._font.font, currentElem._font.size),
                      descent: getDescent(currentElem._font.font, currentElem._font.size),
                      scale: 1,
                      hidden: false,
                      continuous: continuous
                    };
                    currentChunk.push(position);
                    childElem._pos.push(position);
                    currentElem._pos.push(position);
                    currentElem._index += pos[j].unicode.length;
                    if (currentChunk.length === 1) {
                      currentAnchor = textAnchor;
                      currentDirection = textDirection;
                    }
                    currentX += pos[j].xAdvance + letterSpacing;
                    currentY += pos[j].yAdvance;
                  }
                  if (words[w] === ' ') {
                    currentX += wordSpacing;
                  }
                }
                break;
              default:
                remainingText = remainingText.substring(childElem.textContent.length);
            }
          }
          if (textLength && currentElem._pos.length) {
            adjustLength(currentElem._pos, textLength, spacingAndGlyphs);
          }
          if (currentElem.name === 'textPath' || currentElem.name === 'text') {
            doAnchoring();
          }
          if (currentElem.name === 'textPath') {
            textPaths.push(currentElem);
            let pathObject = currentElem.pathObject;
            if (pathObject) {
              currentX = pathObject.endPoint[0]; currentY = pathObject.endPoint[1];
            }
          }
          if (parentElem) {
            parentElem._pos = parentElem._pos.concat(currentElem._pos);
            parentElem._index += currentElem._index;
          }
        }
        function textOnPath(currentElem) {
          let pathObject = currentElem.pathObject,
              pathLength = currentElem.pathLength,
              pathScale = currentElem.pathScale;
          if (pathObject) {
            let textOffset = currentElem.getLength('startOffset', pathLength, 0);
            for (let j = 0; j < currentElem._pos.length; j++) {
              let charMidX = textOffset + currentElem._pos[j].x + 0.5 * currentElem._pos[j].width;
              if (charMidX > pathLength || charMidX < 0) {
                currentElem._pos[j].hidden = true;
              } else {
                let pointOnPath = pathObject.getPointAtLength(charMidX * pathScale);
                if (isNotEqual(pathScale, 1)) {
                  currentElem._pos[j].scale *= pathScale;
                  currentElem._pos[j].width *= pathScale;
                }
                currentElem._pos[j].x = pointOnPath[0] - 0.5 * currentElem._pos[j].width * Math.cos(pointOnPath[2]) - currentElem._pos[j].y * Math.sin(pointOnPath[2]);
                currentElem._pos[j].y = pointOnPath[1] - 0.5 * currentElem._pos[j].width * Math.sin(pointOnPath[2]) + currentElem._pos[j].y * Math.cos(pointOnPath[2]);
                currentElem._pos[j].rotate = pointOnPath[2] + currentElem._pos[j].rotate;
                currentElem._pos[j].continuous = false;
              }
            }
          } else {
            for (let j = 0; j < currentElem._pos.length; j++) {
              currentElem._pos[j].hidden = true;
            }
          }
        }
        recursive(textParentElem, null);
        for (let i = 0; i < textPaths.length; i++) {
          textOnPath(textPaths[i]);
        }
      })(this);
      this.getTransformation = function() {
        return this.get('transform');
      };
      this.drawInDocument = function(isClip, isMask) {
        doc.save();
        this.transform();
        this.clip();
        let masked = this.mask(), group;
        if (masked) {
          group = docBeginGroup(getPageBBox());
        }
        this.drawTextInDocument(isClip, isMask);
        if (group) {
          docEndGroup(group);
          docInsertGroup(group);
        }
        doc.restore();
      };
    };

    options = options || {};
    var pxToPt = options.assumePt ? 1 : (72/96), // 1px = 72/96pt, but only if assumePt is false
        viewportWidth = (options.width || doc.page.width) / pxToPt,
        viewportHeight = (options.height || doc.page.height) / pxToPt,
        preserveAspectRatio = options.preserveAspectRatio || null, // default to null so that the attr can override if not passed
        useCSS = options.useCSS && typeof SVGElement !== 'undefined' && svg instanceof SVGElement && typeof getComputedStyle === 'function',
        warningCallback = options.warningCallback,
        fontCallback = options.fontCallback,
        imageCallback = options.imageCallback,
        colorCallback = options.colorCallback,
        documentCallback = options.documentCallback,
        precision = Math.ceil(Math.max(1, options.precision)) || 3,
        groupStack = [],
        documentCache = {},
        links = [],
        styleRules = [];

    if (typeof warningCallback !== 'function') {
      warningCallback = function(str) {
        if (typeof console !== undefined && typeof console.warn === 'function') {console.warn(str);}
      };
    }
    if (typeof fontCallback !== 'function') {
      fontCallback = function(family, bold, italic, fontOptions) {
        // Check if the font is already registered in the document
        if (bold && italic) {
          if (doc._registeredFonts.hasOwnProperty(family + '-BoldItalic')) {
            return family + '-BoldItalic';
          } else if (doc._registeredFonts.hasOwnProperty(family + '-Italic')) {
            fontOptions.fauxBold = true;
            return family + '-Italic';
          } else if (doc._registeredFonts.hasOwnProperty(family + '-Bold')) {
            fontOptions.fauxItalic = true;
            return family + '-Bold';
          } else if (doc._registeredFonts.hasOwnProperty(family)) {
            fontOptions.fauxBold = true;
            fontOptions.fauxItalic = true;
            return family;
          }
        }
        if (bold && !italic) {
          if (doc._registeredFonts.hasOwnProperty(family + '-Bold')) {
            return family + '-Bold';
          } else if (doc._registeredFonts.hasOwnProperty(family)) {
            fontOptions.fauxBold = true;
            return family;
          }
        }
        if (!bold && italic) {
          if (doc._registeredFonts.hasOwnProperty(family + '-Italic')) {
            return family + '-Italic';
          } else if (doc._registeredFonts.hasOwnProperty(family)) {
            fontOptions.fauxItalic = true;
            return family;
          }
        }
        if (!bold && !italic) {
          if (doc._registeredFonts.hasOwnProperty(family)) {
            return family;
          }
        }
        // Use standard fonts as fallback
        if (family.match(/(?:^|,)\s*serif\s*$/)) {
          if (bold && italic) {return 'Times-BoldItalic';}
          if (bold && !italic) {return 'Times-Bold';}
          if (!bold && italic) {return 'Times-Italic';}
          if (!bold && !italic) {return 'Times-Roman';}
        } else if (family.match(/(?:^|,)\s*monospace\s*$/)) {
          if (bold && italic) {return 'Courier-BoldOblique';}
          if (bold && !italic) {return 'Courier-Bold';}
          if (!bold && italic) {return 'Courier-Oblique';}
          if (!bold && !italic) {return 'Courier';}
        } else if (family.match(/(?:^|,)\s*sans-serif\s*$/) || true) {
          if (bold && italic) {return 'Helvetica-BoldOblique';}
          if (bold && !italic) {return 'Helvetica-Bold';}
          if (!bold && italic) {return 'Helvetica-Oblique';}
          if (!bold && !italic) {return 'Helvetica';}
        }
      };
    }
    if (typeof imageCallback !== 'function') {
      imageCallback = function(link) {
        return link.replace(/\s+/g, '');
      };
    }
    if (typeof colorCallback !== 'function') {
      colorCallback = null;
    } else {
      for (let color in DefaultColors) {
        let newColor = colorCallback(DefaultColors[color]);
        DefaultColors[color][0] = newColor[0];
        DefaultColors[color][1] = newColor[1];
      }
    }
    if (typeof documentCallback !== 'function') {
      documentCallback = null;
    }

    if (typeof svg === 'string') {svg = parseXml(svg);}
    if (svg) {
      let styles = svg.getElementsByTagName('style');
      for (let i = 0; i < styles.length; i++) {
        styleRules = styleRules.concat(parseStyleSheet(styles[i].textContent));
      }
      let elem = createSVGElement(svg, null);
      if (typeof elem.drawInDocument === 'function') {
        if (options.useCSS && !useCSS) {
          warningCallback('SVGtoPDF: useCSS option can only be used for SVG *elements* in compatible browsers');
        }
        let savedFillColor = doc._fillColor;
        doc.save().translate(x || 0, y || 0).scale(pxToPt);
        elem.drawInDocument();
        for (let i = 0; i < links.length; i++) {
          doc.page.annotations.push(links[i]);
        }
        doc.restore();
        doc._fillColor = savedFillColor;
      } else {
        warningCallback('SVGtoPDF: this element can\'t be rendered directly: ' + svg.nodeName);
      }
    } else {
      warningCallback('SVGtoPDF: the input does not look like a valid SVG');
    }

};

if (typeof module !== 'undefined' && module && typeof module.exports !== 'undefined') {
  module.exports = SVGtoPDF;
}
