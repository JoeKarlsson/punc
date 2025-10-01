// src/index.ts
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import PDFDocument from "pdfkit";
import through2 from "through2";
function defaultMapping() {
  return {
    // Basic punctuation
    ";": 0,
    ":": 0,
    "'": 0,
    '"': 0,
    ",": 0,
    "!": 0,
    "?": 0,
    ".": 0,
    "(": 0,
    ")": 0,
    "-": 0,
    // Unicode symbols
    "\u2605": 0,
    "\u2665": 0,
    "\u2666": 0,
    "\u2660": 0,
    "\u2663": 0,
    "\u2192": 0,
    "\u2190": 0,
    "\u2191": 0,
    "\u2193": 0,
    "\u221E": 0,
    "\xA7": 0,
    "\xB6": 0,
    // Repeated punctuation
    "!!!": 0,
    "???": 0,
    "...": 0,
    "---": 0,
    // Math operators
    "+": 0,
    "*": 0,
    "/": 0,
    "=": 0,
    "\u2260": 0,
    "\u2264": 0,
    "\u2265": 0,
    "\xB1": 0,
    "\xD7": 0,
    "\xF7": 0,
    // Currency
    $: 0,
    "\u20AC": 0,
    "\xA3": 0,
    "\xA5": 0,
    "\xA2": 0,
    // Percent and degree
    "%": 0,
    "\xB0": 0,
    // Copyright/Trademark
    "\xA9": 0,
    "\xAE": 0,
    "\u2122": 0,
    // Musical notes
    "\u266A": 0,
    "\u266B": 0,
    "\u266C": 0,
    "\u266D": 0,
    "\u266F": 0,
    // Arrows
    "\u2194": 0,
    "\u2195": 0,
    "\u2197": 0,
    "\u2198": 0,
    "\u2199": 0,
    "\u2196": 0,
    // Geometric shapes
    "\u25CB": 0,
    "\u25CF": 0,
    "\u25A1": 0,
    "\u25A0": 0,
    "\u25B3": 0,
    "\u25B2": 0,
    "\u25BD": 0,
    "\u25BC": 0,
    // Lines and borders
    "\u2502": 0,
    "\u2500": 0,
    "\u250C": 0,
    "\u2510": 0,
    "\u2514": 0,
    "\u2518": 0,
    "\u251C": 0,
    "\u2524": 0,
    "\u252C": 0,
    "\u2534": 0,
    // International punctuation
    "\xBF": 0,
    // Spanish
    "\xA1": 0,
    // Spanish
    "\u061F": 0,
    // Arabic
    "\u060C": 0,
    // Arabic
    "\u061B": 0,
    // Arabic
    "\uFF0C": 0,
    // Chinese
    "\u3002": 0,
    // Chinese
    "\uFF1B": 0,
    // Chinese
    "\uFF1A": 0,
    // Chinese
    "\uFF1F": 0,
    // Chinese
    "\uFF01": 0,
    // Chinese
    // Programming & Technical
    "[": 0,
    "]": 0,
    "{": 0,
    "}": 0,
    "<": 0,
    ">": 0,
    "`": 0,
    "|": 0,
    "\\": 0,
    "~": 0,
    "^": 0,
    "&": 0,
    "@": 0,
    "#": 0,
    // Visual & Decorative
    "\u2606": 0,
    "\u2726": 0,
    "\u2727": 0,
    "\u2661": 0,
    "\u2764": 0,
    "\u{1F499}": 0,
    "\u{1F49A}": 0,
    "\u{1F49B}": 0,
    "\u{1F49C}": 0,
    "\u2713": 0,
    "\u2714": 0,
    "\u2611": 0,
    "\u2717": 0,
    "\u2718": 0,
    "\u2612": 0
  };
}
function validateOptions(filePath, options) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid file path: expected non-empty string");
  }
  if (filePath.trim().length === 0) {
    throw new Error("File path cannot be empty or whitespace only");
  }
  if (!options) {
    return { encoding: "utf8", mapping: defaultMapping() };
  }
  if (typeof options === "string") {
    return { encoding: options, mapping: defaultMapping() };
  }
  if (typeof options !== "object") {
    throw new TypeError("expected options to be either an object or a string");
  }
  return {
    encoding: options.encoding || "utf8",
    mapping: options.mapping || defaultMapping()
  };
}
function removeAndReplace(regex, replace, dest) {
  return through2.obj(function(chunk, _, callback) {
    const chunkStr = typeof chunk === "string" ? chunk : chunk.toString();
    const result = chunkStr.replace(regex, replace);
    if (dest) dest(result);
    callback(null, result);
  });
}
function findWordsPerSentence(changeCount) {
  return through2.obj(function(chunk, _, callback) {
    const chunkStr = typeof chunk === "string" ? chunk : chunk.toString();
    const periodCount = (chunkStr.match(/\.|\?|\!/g) || []).length;
    const wordCount = chunkStr.split(" ").length;
    changeCount(wordCount / periodCount);
    callback(null, chunkStr);
  });
}
function findAndCount(map, dest) {
  return through2.obj(function(chunk, _, callback) {
    try {
      if (typeof chunk !== "string" && !Buffer.isBuffer(chunk)) {
        throw new Error("Invalid chunk: expected Buffer or string");
      }
      if (!map || typeof map !== "object") {
        throw new Error("Invalid punctuation map: expected object");
      }
      if (!Array.isArray(dest)) {
        throw new Error("Invalid destination array: expected array");
      }
      const chunkStr = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      if (typeof chunkStr !== "string") {
        throw new Error("Failed to convert chunk to string");
      }
      const repeatedPatterns = [
        { pattern: /!!!+/g, key: "!!!" },
        { pattern: /\?\?\?+/g, key: "???" },
        { pattern: /\.\.\.+/g, key: "..." },
        { pattern: /---+$/g, key: "---" }
      ];
      for (const { pattern, key } of repeatedPatterns) {
        try {
          if (!(key in map)) {
            console.warn(`Warning: Key '${key}' not found in punctuation map`);
            continue;
          }
          const matches = chunkStr.match(pattern);
          if (matches && Array.isArray(matches)) {
            const count = matches.length;
            if (typeof map[key] === "number" && !isNaN(map[key])) {
              map[key] += count;
              dest.push(...matches);
            } else {
              console.warn(
                `Warning: Invalid count value for key '${key}': ${map[key]}`
              );
            }
          }
        } catch (patternError) {
          console.warn(
            `Warning: Error processing pattern for key '${key}':`,
            patternError
          );
        }
      }
      for (let i = 0; i < chunkStr.length; i++) {
        const punctuation = chunkStr[i];
        try {
          if (punctuation && punctuation in map) {
            const key = punctuation;
            if (!(key in map)) {
              console.warn(
                `Warning: Key '${key}' not found in punctuation map`
              );
              continue;
            }
            if (typeof map[key] === "number" && !isNaN(map[key])) {
              map[key]++;
              dest.push(punctuation);
            } else {
              console.warn(
                `Warning: Invalid count value for key '${key}': ${map[key]}`
              );
            }
          }
        } catch (charError) {
          console.warn(
            `Warning: Error processing character '${punctuation}':`,
            charError
          );
        }
      }
      callback(null, chunkStr);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error in punctuation detection";
      callback(
        new Error(`Punctuation detection error: ${errorMessage}`),
        void 0
      );
    }
  });
}
async function punc(filePath, options) {
  const validatedOptions = validateOptions(filePath, options);
  const punctuationStore = [];
  let wordsPerSent = 0;
  let spacedOutBody = "";
  return new Promise((resolve, reject) => {
    try {
      const readStream = createReadStream(filePath, {
        encoding: validatedOptions.encoding
      });
      readStream.on("error", (error) => {
        reject(new Error(`File read error: ${error.message}`));
      });
      pipeline(
        readStream,
        removeAndReplace(/[\r\n]/g, ""),
        removeAndReplace(/[\s]+/g, " "),
        findAndCount(validatedOptions.mapping, punctuationStore),
        findWordsPerSentence((count) => {
          if (typeof count === "number" && !isNaN(count)) {
            wordsPerSent = count;
          } else {
            console.warn("Warning: Invalid words per sentence count:", count);
            wordsPerSent = 0;
          }
        }),
        removeAndReplace(/[a-zA-Z\d]+/g, " ", (spaced) => {
          if (typeof spaced === "string") {
            spacedOutBody = spaced;
          } else {
            console.warn("Warning: Invalid spaced text:", spaced);
            spacedOutBody = "";
          }
        })
      ).then(() => {
        try {
          if (!Array.isArray(punctuationStore)) {
            throw new Error("Invalid punctuation store: expected array");
          }
          if (!validatedOptions.mapping || typeof validatedOptions.mapping !== "object") {
            throw new Error("Invalid mapping: expected object");
          }
          if (typeof wordsPerSent !== "number" || isNaN(wordsPerSent)) {
            console.warn(
              "Warning: Invalid wordsPerSentence, defaulting to 0"
            );
            wordsPerSent = 0;
          }
          if (typeof spacedOutBody !== "string") {
            console.warn(
              "Warning: Invalid spacedOutBody, defaulting to empty string"
            );
            spacedOutBody = "";
          }
          resolve({
            body: punctuationStore.join(""),
            count: validatedOptions.mapping,
            wordsPerSentence: wordsPerSent,
            spaced: spacedOutBody
          });
        } catch (validationError) {
          reject(
            new Error(
              `Result validation error: ${validationError instanceof Error ? validationError.message : "Unknown error"}`
            )
          );
        }
      }).catch((error) => {
        reject(new Error(`Pipeline error: ${error.message}`));
      });
    } catch (setupError) {
      reject(
        new Error(
          `Setup error: ${setupError instanceof Error ? setupError.message : "Unknown error"}`
        )
      );
    }
  });
}
async function createPDF(filePath, options) {
  const validatedOptions = validateOptions(filePath, options);
  const newFileName = `${filePath}-visual.pdf`;
  return new Promise((resolve, reject) => {
    const readStream = createReadStream(filePath, {
      encoding: validatedOptions.encoding
    });
    const pdf = new PDFDocument();
    const writeStream = createWriteStream(newFileName);
    pdf.pipe(writeStream);
    let processedText = "";
    pipeline(
      readStream,
      removeAndReplace(/[a-zA-Z\d]+/g, " ", (chunk) => {
        processedText += chunk;
      })
    ).then(() => {
      pdf.font("lib/fonts/Inconsolata-Regular.ttf").fontSize(25).text(processedText);
      pdf.end();
      writeStream.on("finish", () => {
        resolve({ success: true, pathToFile: newFileName });
      });
      writeStream.on("error", reject);
    }).catch(reject);
  });
}
var index_default = punc;
export {
  createPDF,
  index_default as default,
  punc
};
