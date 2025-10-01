"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createPDF: () => createPDF,
  default: () => index_default,
  punc: () => punc
});
module.exports = __toCommonJS(index_exports);
var import_fs = require("fs");
var import_promises = require("stream/promises");
var import_pdfkit = __toESM(require("pdfkit"), 1);
var import_through2 = __toESM(require("through2"), 1);
function defaultMapping() {
  return {
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
    "-": 0
  };
}
function validateOptions(filePath, options) {
  if (!filePath) {
    throw new Error("Punc: file path not given.");
  }
  if (!options) {
    return { encoding: "utf8", mapping: defaultMapping() };
  }
  if (typeof options === "string") {
    return { encoding: options, mapping: defaultMapping() };
  }
  if (typeof options !== "object") {
    throw new TypeError(
      `Punc: expected options to be either an object or a string, but got ${typeof options} instead`
    );
  }
  return {
    encoding: options.encoding || "utf8",
    mapping: options.mapping || defaultMapping()
  };
}
function removeAndReplace(regex, replace, dest) {
  return import_through2.default.obj(function(chunk, _, callback) {
    const result = chunk.toString().replace(regex, replace);
    if (dest) dest(result);
    callback(null, result);
  });
}
function findWordsPerSentence(changeCount) {
  return import_through2.default.obj(function(chunk, _, callback) {
    const chunkStr = chunk.toString();
    const periodCount = (chunkStr.match(/\.|\?|\!/g) || []).length;
    const wordCount = chunkStr.split(" ").length;
    changeCount(wordCount / periodCount);
    callback(null, chunkStr);
  });
}
function findAndCount(map, dest) {
  return import_through2.default.obj(function(chunk, _, callback) {
    const chunkStr = chunk.toString();
    for (const punctuation of chunkStr) {
      if (punctuation in map) {
        map[punctuation]++;
        dest.push(punctuation);
      }
    }
    callback(null, chunkStr);
  });
}
async function punc(filePath, options) {
  const validatedOptions = validateOptions(filePath, options);
  const punctuationStore = [];
  let wordsPerSent = 0;
  let spacedOutBody = "";
  return new Promise((resolve, reject) => {
    const readStream = (0, import_fs.createReadStream)(filePath, {
      encoding: validatedOptions.encoding
    });
    (0, import_promises.pipeline)(
      readStream,
      removeAndReplace(/[\r\n]/g, ""),
      removeAndReplace(/[\s]+/g, " "),
      findAndCount(validatedOptions.mapping, punctuationStore),
      findWordsPerSentence((count) => wordsPerSent = count),
      removeAndReplace(/[a-zA-Z\d]+/g, " ", (spaced) => spacedOutBody = spaced)
    ).then(() => {
      resolve({
        body: punctuationStore.join(""),
        count: validatedOptions.mapping,
        wordsPerSentence: wordsPerSent,
        spaced: spacedOutBody
      });
    }).catch(reject);
  });
}
async function createPDF(filePath, options) {
  const validatedOptions = validateOptions(filePath, options);
  const newFileName = `${filePath}-visual.pdf`;
  return new Promise((resolve, reject) => {
    const readStream = (0, import_fs.createReadStream)(filePath, {
      encoding: validatedOptions.encoding
    });
    const pdf = new import_pdfkit.default();
    const writeStream = (0, import_fs.createWriteStream)(newFileName);
    pdf.pipe(writeStream);
    let processedText = "";
    (0, import_promises.pipeline)(
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPDF,
  punc
});
