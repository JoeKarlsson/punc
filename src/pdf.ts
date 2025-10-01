import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import PDFDocument from 'pdfkit';
import { PuncOptions, PDFResult } from './types';
import { validateOptions } from './validation';
import { removeAndReplace } from './streams';

// Create PDF function
export async function createPDF(
  filePath: string,
  options?: PuncOptions | string
): Promise<PDFResult> {
  const validatedOptions = validateOptions(filePath, options);
  const newFileName = `${filePath}-visual.pdf`;

  return new Promise((resolve, reject) => {
    const readStream = createReadStream(filePath, {
      encoding: validatedOptions.encoding,
    });

    // Add error handling to read stream
    readStream.on('error', error => {
      reject(new Error(`File read error: ${error.message}`));
    });

    const pdf = new PDFDocument();
    const writeStream = createWriteStream(newFileName);

    // Add error handling to write stream
    writeStream.on('error', error => {
      reject(new Error(`File write error: ${error.message}`));
    });

    pdf.pipe(writeStream);

    let processedText = '';

    pipeline(
      readStream,
      removeAndReplace(/[a-zA-Z\d]+/g, ' ', chunk => {
        processedText += chunk;
      })
    )
      .then(() => {
        pdf
          .font('lib/fonts/Inconsolata-Regular.ttf')
          .fontSize(25)
          .text(processedText);

        pdf.end();

        writeStream.on('finish', () => {
          resolve({ success: true, pathToFile: newFileName });
        });
      })
      .catch(error => {
        reject(new Error(`Pipeline error: ${error.message}`));
      });
  });
}
