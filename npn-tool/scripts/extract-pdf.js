// Standalone PDF text extraction script
// Usage: node scripts/extract-pdf.js <input.pdf> <output.txt>
const { PDFParse } = require('pdf-parse');
const fs = require('fs');

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error('Usage: node scripts/extract-pdf.js <input.pdf> <output.txt>');
  process.exit(1);
}

const data = fs.readFileSync(inputFile);
const parser = new PDFParse({ data: new Uint8Array(data) });

parser.getText().then(result => {
  fs.writeFileSync(outputFile, result.text || '');
  process.exit(0);
}).catch(() => {
  fs.writeFileSync(outputFile, '');
  process.exit(0);
});
