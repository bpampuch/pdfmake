var fonts = {

	Nillima: {
		normal: 'examples/fonts/Nillima.ttf',
		bold: 'examples/fonts/Nillima.ttf',
		italics: 'examples/fonts/Nillima.ttf',
		bolditalics: 'examples/fonts/Nillima.ttf'
	},
	
	Roboto: {
		normal: 'examples/fonts/Roboto-Regular.ttf',
		bold: 'examples/fonts/Roboto-Medium.ttf',
		italics: 'examples/fonts/Roboto-Italic.ttf',
		bolditalics: 'examples/fonts/Roboto-MediumItalic.ttf'
	}
};

var PdfPrinter = require('../src/printer');
var printer = new PdfPrinter(fonts);
var fs = require('fs');


var docDefinition = {
        content: [
          { text: 'Multilingual Tables', style: 'title' },

        { text: 'This document demonstrates the use of multilingual tables with automatic RTL (Right-to-Left) text detection. It includes examples in English, Arabic, Persian, and Urdu.', style: 'paragraph' },
        { text: 'يوضح هذا المستند استخدام الجداول متعددة اللغات مع الكشف التلقائي عن النصوص من اليمين إلى اليسار. يتضمن أمثلة باللغات الإنجليزية والعربية والفارسية والأردية.', style: 'paragraph' },
        { text: 'این سند استفاده از جداول چندزبانه با تشخیص خودکار متن راست به چپ را نشان می‌دهد. شامل مثال‌هایی به زبان‌های انگلیسی، عربی، فارسی و اردو است.', style: 'paragraph' },
        { text: 'یہ دستاویز کثیر لسانی جدولوں کے استعمال کو خودکار دائیں سے بائیں متن کی شناخت کے ساتھ ظاہر کرتی ہے۔ اس میں انگریزی، عربی، فارسی اور اردو میں مثالیں شامل ہیں۔', style: 'paragraph' },

          // English Table
          { text: '\nEnglish Table:\n', style: 'header' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*'],
              body: [
                [
                  { text: 'Freedom', style: 'tableHeader' },
                  { text: 'Courage', style: 'tableHeader' },
                  { text: 'Humanity', style: 'tableHeader' },
                ],
                [
                  {
                    text: 'Freedom allows individuals to make decisions without restrictions, enhancing their sense of responsibility towards themselves and others.',
                    style: 'tableCell',
                  },
                  {
                    text: 'Courage enables us to confront risks with confidence, helping us achieve our goals and overcome obstacles.',
                    style: 'tableCell',
                  },
                  {
                    text: 'Humanity means standing by those in need and supporting them during tough times, fostering solidarity and compassion.',
                    style: 'tableCell',
                  },
                ],
                [
                  {
                    text: 'Freedom is priceless, as it is the essence of a dignified life that every person strives for.',
                    style: 'tableCell',
                  },
                  {
                    text: 'Courage is speaking the truth even when it is difficult, distinguishing individuals who are confident and principled.',
                    style: 'tableCell',
                  },
                  {
                    text: 'Supporting the weak reflects the morals and human values of a society, showcasing the strength of collective spirit.',
                    style: 'tableCell',
                  },
                ],
                [
                  {
                    text: 'Freedom gives life more meaning, providing individuals with a sense of belonging and the ability to innovate.',
                    style: 'tableCell',
                  },
                  {
                    text: 'Courage is standing against injustice and defending the truth, even at a great cost.',
                    style: 'tableCell',
                  },
                  {
                    text: 'Humanity is the essence of life, enabling us to live in peace and harmony with others.',
                    style: 'tableCell',
                  },
                ],
              ],
            },

            layout: {
              defaultBorder: true,
            },
          },

          // Arabic Table
          { text: '\nArabic Table:\n', style: 'header' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*'],
              body: [
                [
                  { text: 'الحرية', style: 'tableHeader' },
                  { text: 'الشجاعة', style: 'tableHeader' },
                  { text: 'نصرة الضعيف', style: 'tableHeader' },
                ],
                [
                  {
                    text: 'الحرية تمنح الإنسان القدرة على اتخاذ قراراته بحرية دون قيود، مما يعزز من شعوره بالمسؤولية تجاه نفسه وتجاه الآخرين',
                    style: 'tableCell',
                  },
                  {
                    text: 'الشجاعة تجعلنا نواجه المخاطر بشجاعة وثقة، مما يساعدنا على تحقيق أهدافنا وتجاوز العقبات',
                    style: 'tableCell',
                  },
                  {
                    text: 'الإنسانية تعني الوقوف بجانب المحتاجين ودعمهم في أوقات الشدة، مما يعزز من روح التضامن والتكافل',
                    style: 'tableCell',
                  },
                ],
                [
                  { text: 'الحرية لا تقدر بثمن، فهي جوهر الحياة الكريمة التي يسعى إليها كل إنسان', style: 'tableCell' },
                  {
                    text: 'الشجاعة هي أن تقول الحق ولو كان صعبًا، فهي التي تميز الإنسان الواثق بنفسه والمتمسك بمبادئه',
                    style: 'tableCell',
                  },
                  {
                    text: 'نصرة الضعيف تعكس أخلاق المجتمع وقيمه الإنسانية، وهي دليل على قوة الروح الجماعية',
                    style: 'tableCell',
                  },
                ],
                [
                  {
                    text: 'الحرية تجعل الحياة أكثر معنى، فهي التي تمنح الإنسان الشعور بالانتماء والقدرة على الإبداع',
                    style: 'tableCell',
                  },
                  { text: 'الشجاعة هي أن تواجه الظلم وتدافع عن الحق، حتى لو كان الثمن غاليًا', style: 'tableCell' },
                  {
                    text: 'الإنسانية هي جوهر الحياة، فهي التي تجعلنا نعيش في سلام ووئام مع الآخرين',
                    style: 'tableCell',
                  },
                ],
              ],
            },
            layout: {
              defaultBorder: true,
            },
          },

          // Persian Table
          { text: '\nPersian Table:\n', style: 'header' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*'],
              body: [
                [
                  { text: 'آزادی', style: 'tableHeader' },
                  { text: 'شجاعت', style: 'tableHeader' },
                  { text: 'حمایت از ضعیف', style: 'tableHeader' },
                ],
                [
                  {
                    text: 'آزادی به انسان امکان تصمیم‌گیری بدون محدودیت را می‌دهد و حس مسئولیت‌پذیری او را تقویت می‌کند.',
                    style: 'tableCell',
                  },
                  {
                    text: 'شجاعت به ما کمک می‌کند تا با اطمینان به خطرات روبرو شویم و اهداف خود را محقق کنیم.',
                    style: 'tableCell',
                  },
                  {
                    text: 'انسانیت به معنای ایستادن در کنار نیازمندان و حمایت از آن‌ها در زمان‌های سخت است.',
                    style: 'tableCell',
                  },
                ],
                [
                  {
                    text: 'آزادی بی‌قیمت است، زیرا جوهر زندگی با کرامت است که هر انسانی به دنبال آن است.',
                    style: 'tableCell',
                  },
                  {
                    text: 'شجاعت یعنی گفتن حقیقت حتی زمانی که دشوار است، و این ویژگی افراد با اعتماد به نفس و اصولی است.',
                    style: 'tableCell',
                  },
                  {
                    text: 'حمایت از ضعیف اخلاق و ارزش‌های انسانی جامعه را نشان می‌دهد و قدرت روح جمعی را به نمایش می‌گذارد.',
                    style: 'tableCell',
                  },
                ],
                [
                  {
                    text: 'آزادی به زندگی معنا می‌بخشد و حس تعلق و توانایی خلاقیت را به انسان می‌دهد.',
                    style: 'tableCell',
                  },
                  {
                    text: 'شجاعت یعنی ایستادن در برابر ظلم و دفاع از حقیقت، حتی اگر هزینه زیادی داشته باشد.',
                    style: 'tableCell',
                  },
                  {
                    text: 'انسانیت جوهر زندگی است که به ما امکان می‌دهد با دیگران در صلح و هماهنگی زندگی کنیم.',
                    style: 'tableCell',
                  },
                ],
              ],
            },

            layout: {
              defaultBorder: true,
            },
          },

          // Urdu Table
          { text: '\nUrdu Table:\n', style: 'header' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*'],
              body: [
                [
                  { text: 'آزادی', style: 'tableHeader' },
                  { text: 'شجاعت', style: 'tableHeader' },
                  { text: 'انسانیت', style: 'tableHeader' },
                ],
                [
                  { text: 'آزادی انسان کو اپنی زندگی کے فیصلے خود کرنے کا حق دیتی ہے۔', style: 'tableCell' },
                  { text: 'شجاعت ہمیں مشکلات کا سامنا کرنے کی ہمت دیتی ہے۔', style: 'tableCell' },
                  { text: 'انسانیت دوسروں کی مدد کرنے اور ان کے ساتھ ہمدردی کرنے کا درس دیتی ہے۔', style: 'tableCell' },
                ],
                [
                  { text: 'آزادی زندگی کو بامعنی بناتی ہے۔', style: 'tableCell' },
                  { text: 'شجاعت سچ بولنے کی طاقت ہے۔', style: 'tableCell' },
                  { text: 'انسانیت معاشرتی انصاف کی بنیاد ہے۔', style: 'tableCell' },
                ],
                [
                  { text: 'آزادی ہر انسان کا بنیادی حق ہے۔', style: 'tableCell' },
                  { text: 'شجاعت ہمیں اپنے اصولوں پر قائم رہنے کا حوصلہ دیتی ہے۔', style: 'tableCell' },
                  { text: 'انسانیت ہمیں دوسروں کے ساتھ امن اور محبت سے رہنے کا سبق دیتی ہے۔', style: 'tableCell' },
                ],
              ],
            },

            layout: {
              defaultBorder: true,
            },
          },
        ],
        defaultStyle: {
          font: 'Roboto',
          fontSize: 11,
        },
        styles: {
          title: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 10],
          },
          header: {
            fontSize: 14,
            bold: true,
            margin: [0, 10, 0, 5],
          },
          tableHeader: {
            bold: true,
            fillColor: '#f0f0f0',
            fontSize: 12,
            margin: [5, 5, 5, 5],
          },
          tableCell: {
            margin: [5, 5, 5, 5],
          },
            paragraph: {
                margin: [0, 5, 0, 5],
                fontSize: 12,
            },
        },
};


var now = new Date();
var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('examples/pdfs/rtlDoc.pdf'));
pdfDoc.end();
console.log(new Date() - now);
