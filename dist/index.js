// src/punc.ts
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";

// src/mapping.ts
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

// src/validation.ts
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
  if (typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("expected options to be either an object or a string");
  }
  const defaultMap = defaultMapping();
  const customMapping = options.mapping || {};
  const filteredCustomMapping = {};
  for (const key in customMapping) {
    if (key in defaultMap) {
      filteredCustomMapping[key] = customMapping[key];
    }
  }
  const mergedMapping = { ...defaultMap, ...filteredCustomMapping };
  return {
    encoding: options.encoding || "utf8",
    mapping: mergedMapping
  };
}

// src/streams.ts
import through2 from "through2";
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
        { pattern: /---+/g, key: "---" }
      ];
      for (const { pattern, key } of repeatedPatterns) {
        try {
          if (!(key in map)) {
            continue;
          }
          const matches = chunkStr.match(pattern);
          if (matches && Array.isArray(matches)) {
            const count = matches.length;
            if (typeof map[key] === "number" && !isNaN(map[key])) {
              map[key] += count;
              dest.push(...matches);
            } else {
              map[key] = count;
              dest.push(...matches);
            }
          }
        } catch (patternError) {
          console.warn(
            `Warning: Error processing pattern for key '${key}':`,
            patternError
          );
        }
      }
      const characters = Array.from(chunkStr);
      for (let i = 0; i < characters.length; i++) {
        const punctuation = characters[i];
        try {
          if (punctuation && punctuation in map) {
            const key = punctuation;
            if (typeof map[key] === "number" && !isNaN(map[key])) {
              map[key]++;
              dest.push(punctuation);
            } else {
              map[key] = 1;
              dest.push(punctuation);
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
      const streamError = new Error(
        `Punctuation detection error: ${errorMessage}`
      );
      this.emit("error", streamError);
      callback(streamError, void 0);
    }
  });
}

// src/punc.ts
function punc(filePath, options) {
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

// src/pdf.ts
import { createReadStream as createReadStream2, createWriteStream } from "fs";
import { pipeline as pipeline2 } from "stream/promises";
import PDFDocument from "pdfkit";
async function createPDF(filePath, options) {
  const validatedOptions = validateOptions(filePath, options);
  const newFileName = `${filePath}-visual.pdf`;
  return new Promise((resolve, reject) => {
    const readStream = createReadStream2(filePath, {
      encoding: validatedOptions.encoding
    });
    readStream.on("error", (error) => {
      reject(new Error(`File read error: ${error.message}`));
    });
    const pdf = new PDFDocument();
    const writeStream = createWriteStream(newFileName);
    writeStream.on("error", (error) => {
      reject(new Error(`File write error: ${error.message}`));
    });
    pdf.pipe(writeStream);
    let processedText = "";
    pipeline2(
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
    }).catch((error) => {
      reject(new Error(`Pipeline error: ${error.message}`));
    });
  });
}

// src/analysis.ts
import { createReadStream as createReadStream3 } from "fs";
import { pipeline as pipeline3 } from "stream/promises";
import through22 from "through2";
async function getPositions(filePath, options) {
  const validatedOptions = validateOptions(filePath, options);
  const positions = [];
  const map = validatedOptions.mapping;
  let offset = 0;
  await pipeline3(
    createReadStream3(filePath, { encoding: validatedOptions.encoding }),
    removeAndReplace(/[\r\n]/g, ""),
    removeAndReplace(/[\s]+/g, " "),
    through22.obj(function(chunk, _, callback) {
      const str = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      for (const char of Array.from(str)) {
        if (char in map) {
          positions.push({ char, offset });
          map[char]++;
        }
        offset++;
      }
      callback(null, str);
    })
  );
  return { positions, totalChars: offset, map };
}
function windowedDensity(positions, totalChars, windows = 100) {
  if (totalChars === 0) return [];
  const windowSize = Math.max(1, Math.ceil(totalChars / windows));
  const actualWindows = Math.ceil(totalChars / windowSize);
  const result = [];
  for (let i = 0; i < actualWindows; i++) {
    const startOffset = i * windowSize;
    const endOffset = Math.min(startOffset + windowSize, totalChars);
    const inWindow = positions.filter((p) => p.offset >= startOffset && p.offset < endOffset);
    const counts = {};
    for (const { char } of inWindow) {
      const key = char;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const charsInWindow = endOffset - startOffset;
    result.push({
      index: i,
      startOffset,
      endOffset,
      counts,
      totalPunctuation: inWindow.length,
      density: inWindow.length / charsInWindow * 100
    });
  }
  return result;
}

// src/svg.ts
import { writeFile } from "fs/promises";
import { Resvg } from "@resvg/resvg-js";
var DEFAULT_BG = "#0d1117";
function charColor(char) {
  if ([".", "?", "!"].includes(char)) return "#f59e0b";
  if ([",", ";", ":", "-"].includes(char)) return "#38bdf8";
  if (["[", "]", "{", "}", "(", ")"].includes(char)) return "#a78bfa";
  if (["'", '"'].includes(char)) return "#fb7185";
  if (["!!!", "???", "...", "---"].includes(char)) return "#86efac";
  return "#64748b";
}
function lerpColor(hexA, hexB, t) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const hex = (s, i) => parseInt(s.slice(i, i + 2), 16);
  const ra = hex(hexA, 1), ga = hex(hexA, 3), ba = hex(hexA, 5);
  const rb = hex(hexB, 1), gb = hex(hexB, 3), bb = hex(hexB, 5);
  return `rgb(${clamp(ra + (rb - ra) * t)},${clamp(ga + (gb - ga) * t)},${clamp(ba + (bb - ba) * t)})`;
}
function escapeXML(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function smoothPath(pts) {
  if (pts.length === 0) return "";
  const first = pts[0];
  const parts = [`M ${first.x.toFixed(1)},${first.y.toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const mx = ((p.x + q.x) / 2).toFixed(1);
    const my = ((p.y + q.y) / 2).toFixed(1);
    parts.push(`Q ${p.x.toFixed(1)},${p.y.toFixed(1)} ${mx},${my}`);
  }
  const last = pts[pts.length - 1];
  parts.push(`L ${last.x.toFixed(1)},${last.y.toFixed(1)}`);
  return parts.join(" ");
}
function titleFromPath(filePath) {
  const base = filePath.split("/").pop() ?? filePath;
  return base.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function buildBarcode(positions, totalChars, w, h, bg, title, subtitle) {
  const stripes = positions.map(({ char, offset }) => {
    const x = (offset / Math.max(totalChars, 1) * w).toFixed(2);
    return `<rect x="${x}" y="0" width="1.5" height="${h}" fill="${charColor(char)}" opacity="0.9"/>`;
  }).join("");
  const titleBlock = title ? `
<defs>
  <linearGradient id="barcode-fade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${bg}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${bg}" stop-opacity="0.94"/>
  </linearGradient>
</defs>
<rect x="0" y="${h - 64}" width="${w}" height="64" fill="url(#barcode-fade)"/>
<text x="20" y="${h - 28}" font-family="monospace" font-size="20" font-weight="bold" fill="#f1f5f9">${escapeXML(title)}</text>
<text x="20" y="${h - 10}" font-family="monospace" font-size="11" fill="#64748b">${escapeXML(subtitle)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${bg}"/>
${stripes}${titleBlock}
</svg>`;
}
function buildHeatmap(windows, w, h, bg, title, subtitle) {
  const COLS = 40;
  const LEGEND_W = 28;
  const titleH = subtitle ? 52 : 38;
  const padH = 16;
  const padR = padH + LEGEND_W + 12;
  const padB = 28;
  const gridW = w - padH - padR;
  const rows = Math.ceil(windows.length / COLS);
  const gridH = h - titleH - padB;
  const cellW = gridW / COLS;
  const cellH = gridH / Math.max(rows, 1);
  const gap = 1.5;
  const maxD = Math.max(...windows.map((win) => win.density), 1);
  const cells = windows.map((win) => {
    const col = win.index % COLS;
    const row = Math.floor(win.index / COLS);
    const x = (padH + col * cellW + gap / 2).toFixed(1);
    const y = (titleH + row * cellH + gap / 2).toFixed(1);
    const cw = (cellW - gap).toFixed(1);
    const ch = (cellH - gap).toFixed(1);
    const t = Math.pow(win.density / maxD, 0.55);
    return `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${lerpColor("#1a2230", "#f59e0b", t)}" rx="1.5"/>`;
  }).join("");
  const lgX = w - padH - LEGEND_W + 4;
  const lgY = titleH;
  const lgH = gridH;
  const legendStops = Array.from({ length: 6 }, (_, i) => {
    const t = i / 5;
    return `<stop offset="${(t * 100).toFixed(0)}%" stop-color="${lerpColor("#1a2230", "#f59e0b", t)}"/>`;
  }).join("");
  const legend = `
<defs><linearGradient id="hm-legend" x1="0" y1="1" x2="0" y2="0">${legendStops}</linearGradient></defs>
<rect x="${lgX}" y="${lgY}" width="${LEGEND_W - 4}" height="${lgH}" fill="url(#hm-legend)" rx="3"/>
<text x="${lgX + (LEGEND_W - 4) / 2}" y="${lgY - 4}" text-anchor="middle" font-family="monospace" font-size="8" fill="#475569">high</text>
<text x="${lgX + (LEGEND_W - 4) / 2}" y="${lgY + lgH + 11}" text-anchor="middle" font-family="monospace" font-size="8" fill="#475569">low</text>`;
  const titleEl = `<text x="${padH}" y="22" font-family="monospace" font-size="14" font-weight="bold" fill="#f1f5f9">${escapeXML(title)}</text>`;
  const subtitleEl = subtitle ? `<text x="${padH}" y="40" font-family="monospace" font-size="10" fill="#64748b">${escapeXML(subtitle)}</text>` : "";
  const caption = `<text x="${padH}" y="${h - 8}" font-family="monospace" font-size="9" fill="#334155">Punctuation density heatmap \xB7 ${windows.length} windows</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${bg}" rx="8"/>
${titleEl}${subtitleEl}
${cells}${legend}
${caption}
</svg>`;
}
var WAVEFORM_SERIES = [
  { key: ".", label: "period", color: "#f59e0b" },
  { key: ",", label: "comma", color: "#38bdf8" },
  { key: "?", label: "question", color: "#a78bfa" },
  { key: "!", label: "exclamation", color: "#fb7185" },
  { key: ";", label: "semicolon", color: "#86efac" },
  { key: ":", label: "colon", color: "#fbbf24" },
  { key: "-", label: "dash", color: "#67e8f9" }
];
function buildWaveform(windows, w, h, bg, title, subtitle) {
  const titleH = 28;
  const subtitleH = subtitle ? 18 : 0;
  const legendH = 22;
  const pad = { t: 16, r: 24, b: 36, l: 52 };
  const topUsed = titleH + subtitleH + legendH + pad.t;
  const plotW = w - pad.l - pad.r;
  const plotH = h - topUsed - pad.b;
  const plotTop = topUsed;
  const baseline = plotTop + plotH;
  const n = Math.max(windows.length - 1, 1);
  const maxVal = Math.max(
    ...WAVEFORM_SERIES.flatMap(
      ({ key }) => windows.map((win) => win.counts[key] ?? 0)
    ),
    1
  );
  const series = WAVEFORM_SERIES.map(({ key, color }) => {
    const pts = windows.map((win, i) => ({
      x: pad.l + i / n * plotW,
      y: plotTop + plotH - (win.counts[key] ?? 0) / maxVal * plotH
    }));
    const line = smoothPath(pts);
    const first = pts[0];
    const last = pts[pts.length - 1];
    const area = `${line} L ${last.x.toFixed(1)},${baseline} L ${first.x.toFixed(1)},${baseline} Z`;
    return `<path d="${area}" fill="${color}" opacity="0.1"/>
<path d="${line}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }).join("\n");
  const legendY = titleH + subtitleH + 6;
  const step = plotW / WAVEFORM_SERIES.length;
  const legend = WAVEFORM_SERIES.map(({ key, label, color }, i) => {
    const lx = pad.l + i * step;
    const sym = escapeXML(String(key));
    return `<rect x="${lx.toFixed(1)}" y="${legendY}" width="9" height="9" fill="${color}" rx="2"/>
<text x="${(lx + 13).toFixed(1)}" y="${legendY + 8}" font-family="monospace" font-size="9" fill="${color}">${sym} ${label}</text>`;
  }).join("\n");
  const axes = `<line x1="${pad.l}" y1="${plotTop}" x2="${pad.l}" y2="${baseline}" stroke="#1e2a3a" stroke-width="1"/>
<line x1="${pad.l}" y1="${baseline}" x2="${pad.l + plotW}" y2="${baseline}" stroke="#1e2a3a" stroke-width="1"/>`;
  const xLabels = ["0%", "25%", "50%", "75%", "100%"].map((lbl, i) => {
    const x = (pad.l + i / 4 * plotW).toFixed(1);
    return `<text x="${x}" y="${baseline + 14}" text-anchor="middle" font-family="monospace" font-size="9" fill="#475569">${lbl}</text>`;
  }).join("");
  const midY = (plotTop + baseline) / 2;
  const yTick = `<line x1="${pad.l - 4}" y1="${midY.toFixed(1)}" x2="${pad.l}" y2="${midY.toFixed(1)}" stroke="#1e2a3a" stroke-width="1"/>
<text x="${(pad.l - 6).toFixed(1)}" y="${(midY + 4).toFixed(1)}" text-anchor="end" font-family="monospace" font-size="8" fill="#334155">50%</text>`;
  const titleEl = `<text x="${pad.l}" y="20" font-family="monospace" font-size="14" font-weight="bold" fill="#f1f5f9">${escapeXML(title)}</text>`;
  const subtitleEl = subtitle ? `<text x="${pad.l}" y="${titleH + 14}" font-family="monospace" font-size="10" fill="#64748b">${escapeXML(subtitle)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${bg}" rx="8"/>
${titleEl}${subtitleEl}
${legend}
${axes}
${yTick}
${xLabels}
${series}
</svg>`;
}
function buildRadial(map, w, h, bg, title, subtitle) {
  const cx = w / 2;
  const titleReserve = title ? 52 : 0;
  const cy = (h - titleReserve) / 2;
  const maxRadius = Math.min(w * 0.44, (h - titleReserve) * 0.44);
  const entries = Object.entries(map).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${bg}" rx="8"/>
<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" font-family="monospace" font-size="13" fill="#64748b">No punctuation found</text>
</svg>`;
  }
  const maxCount = entries[0][1];
  const angleStep = 2 * Math.PI / entries.length;
  const defs = `<defs>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2.5" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>`;
  const guides = [0.25, 0.5, 0.75, 1].map((t) => `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(t * maxRadius).toFixed(1)}" fill="none" stroke="#1e2a3a" stroke-width="${t === 1 ? 1.5 : 1}" stroke-dasharray="${t < 1 ? "3,4" : "none"}"/>`).join("\n");
  const top5 = new Set(entries.slice(0, 5).map(([c]) => c));
  const spokes = entries.map(([char, count], i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = Math.sqrt(count / maxCount) * maxRadius;
    const minLabelR = Math.max(r + 18, maxRadius * 0.28);
    const tipX = (cx + r * Math.cos(angle)).toFixed(1);
    const tipY = (cy + r * Math.sin(angle)).toFixed(1);
    const lx = (cx + minLabelR * Math.cos(angle)).toFixed(1);
    const ly = (cy + minLabelR * Math.sin(angle) + 4).toFixed(1);
    const color = charColor(char);
    const countLabel = top5.has(char) ? ` ${count.toLocaleString()}` : "";
    return `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${tipX}" y2="${tipY}" stroke="${color}" stroke-width="1.2" opacity="0.4"/>
<circle cx="${tipX}" cy="${tipY}" r="4" fill="${color}" filter="url(#glow)"/>
<text x="${lx}" y="${ly}" text-anchor="middle" font-family="monospace" font-size="9" fill="${color}">${escapeXML(char)}${escapeXML(countLabel)}</text>`;
  }).join("\n");
  const titleBlock = title ? `
<text x="${cx.toFixed(1)}" y="${h - (subtitle ? 28 : 14)}" text-anchor="middle" font-family="monospace" font-size="15" font-weight="bold" fill="#f1f5f9">${escapeXML(title)}</text>
${subtitle ? `<text x="${cx.toFixed(1)}" y="${h - 10}" text-anchor="middle" font-family="monospace" font-size="10" fill="#64748b">${escapeXML(subtitle)}</text>` : ""}` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${bg}" rx="8"/>
${defs}
${guides}
${spokes}${titleBlock}
</svg>`;
}
var MARK_COLOR = "#e8edf2";
function buildScore(positions, w, h, bg, title, subtitle) {
  const N = positions.length;
  if (N === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${bg}" rx="8"/>
<text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="monospace" font-size="13" fill="#64748b">No punctuation found</text>
</svg>`;
  }
  const titleH = subtitle ? 52 : 36;
  const padH = 16;
  const padB = 28;
  const plotW = w - 2 * padH;
  const plotH = h - titleH - padB;
  const rawCell = Math.sqrt(plotW * plotH / Math.max(N, 1));
  const cellSize = Math.min(Math.max(rawCell, 9), 28);
  const cols = Math.max(1, Math.floor(plotW / cellSize));
  const fontSize = Math.max(7, Math.floor(cellSize * 0.72));
  const marks = positions.map(({ char }, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (padH + (col + 0.5) * cellSize).toFixed(1);
    const ty = (titleH + (row + 0.5) * cellSize + fontSize * 0.38).toFixed(1);
    return `<text x="${x}" y="${ty}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="${MARK_COLOR}" opacity="1">${escapeXML(char)}</text>`;
  }).join("");
  const titleEl = `<text x="${padH}" y="22" font-family="monospace" font-size="14" font-weight="bold" fill="#f1f5f9">${escapeXML(title)}</text>`;
  const subtitleEl = subtitle ? `<text x="${padH}" y="40" font-family="monospace" font-size="10" fill="#64748b">${escapeXML(subtitle)}</text>` : "";
  const caption = `<text x="${w - padH}" y="${h - 6}" text-anchor="end" font-family="monospace" font-size="8" fill="#334155">${N.toLocaleString()} marks \xB7 reading order</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${bg}" rx="8"/>
${titleEl}${subtitleEl}
${marks}
${caption}
</svg>`;
}
function buildSpiral(positions, w, h, bg, title, subtitle) {
  const N = positions.length;
  if (N === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${bg}" rx="8"/>
<text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="monospace" font-size="13" fill="#64748b">No punctuation found</text>
</svg>`;
  }
  const titleReserve = title ? 52 : 0;
  const cx = w / 2;
  const cy = (h - titleReserve) / 2;
  const maxRadius = Math.min(w, h - titleReserve) * 0.46;
  const fontSize = Math.max(4, Math.min(16, Math.sqrt(Math.PI * maxRadius * maxRadius / Math.max(N, 1) / 0.5)));
  const TURNS = Math.max(4, Math.floor(maxRadius / fontSize));
  const thetaTot = TURNS * 2 * Math.PI;
  const minRadius = Math.max(fontSize * 3, maxRadius * 0.06);
  const drPerTheta = (maxRadius - minRadius) / thetaTot;
  const ARC_SAMPLES = 2e3;
  const arcTable = new Array(ARC_SAMPLES + 1).fill(0);
  for (let i = 1; i <= ARC_SAMPLES; i++) {
    const thetaMid = (i - 0.5) / ARC_SAMPLES * thetaTot;
    const rMid = minRadius + drPerTheta * thetaMid;
    const ds = Math.sqrt(rMid * rMid + drPerTheta * drPerTheta) * (thetaTot / ARC_SAMPLES);
    arcTable[i] = (arcTable[i - 1] ?? 0) + ds;
  }
  const totalArcLen = arcTable[ARC_SAMPLES] ?? 0;
  const arcToTheta = (target) => {
    let lo = 0, hi = ARC_SAMPLES;
    while (lo < hi - 1) {
      const mid = lo + hi >> 1;
      if ((arcTable[mid] ?? 0) <= target) lo = mid;
      else hi = mid;
    }
    const span = (arcTable[lo + 1] ?? 0) - (arcTable[lo] ?? 0);
    const frac = span > 0 ? (target - (arcTable[lo] ?? 0)) / span : 0;
    return (lo + frac) / ARC_SAMPLES * thetaTot;
  };
  const GUIDE_STEPS = Math.min(1500, TURNS * 25);
  const spiralD = [];
  for (let i = 0; i <= GUIDE_STEPS; i++) {
    const theta = i / GUIDE_STEPS * thetaTot;
    const phi = theta - Math.PI / 2;
    const r = minRadius + drPerTheta * theta;
    spiralD.push((i === 0 ? "M" : "L") + ` ${(cx + r * Math.cos(phi)).toFixed(1)},${(cy + r * Math.sin(phi)).toFixed(1)}`);
  }
  const guideSpiral = `<path d="${spiralD.join(" ")}" fill="none" stroke="#1e293b" stroke-width="0.5" opacity="0.2"/>`;
  const marks = positions.map(({ char }, i) => {
    const target = N > 1 ? i / (N - 1) * totalArcLen : 0;
    const theta = arcToTheta(Math.min(target, totalArcLen));
    const phi = theta - Math.PI / 2;
    const r = minRadius + drPerTheta * theta;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const x = cx + r * cosPhi;
    const y = cy + r * sinPhi;
    const dxdtheta = drPerTheta * cosPhi - r * sinPhi;
    const dydtheta = drPerTheta * sinPhi + r * cosPhi;
    const angleDeg = Math.atan2(dydtheta, dxdtheta) * 180 / Math.PI;
    return `<text transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${angleDeg.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-family="monospace" font-size="${fontSize.toFixed(1)}" fill="${MARK_COLOR}" opacity="1">${escapeXML(char)}</text>`;
  }).join("");
  const titleBlock = title ? `
<text x="${cx.toFixed(1)}" y="${h - (subtitle ? 28 : 14)}" text-anchor="middle" font-family="monospace" font-size="15" font-weight="bold" fill="#f1f5f9">${escapeXML(title)}</text>
${subtitle ? `<text x="${cx.toFixed(1)}" y="${h - 10}" text-anchor="middle" font-family="monospace" font-size="10" fill="#64748b">${escapeXML(subtitle)}</text>` : ""}` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${bg}" rx="8"/>
${guideSpiral}
${marks}
${titleBlock}
</svg>`;
}
function resolveOpts(filePath, options) {
  const o = typeof options === "object" && options !== null ? options : {};
  const autoTitle = titleFromPath(filePath);
  return {
    bg: o.background ?? DEFAULT_BG,
    width: o.width,
    height: o.height,
    wins: o.windows,
    out: o.outputPath,
    title: o.title ?? autoTitle,
    subtitle: o.subtitle ?? "",
    format: o.format ?? "svg",
    puncOpts: options
  };
}
async function writeSVG(svg, outPath, format) {
  if (format === "png") {
    const pngPath = outPath.endsWith(".svg") ? `${outPath.slice(0, -4)}.png` : `${outPath}.png`;
    const wMatch = svg.match(/width="(\d+)"/);
    const svgW = wMatch ? parseInt(wMatch[1]) : 900;
    const targetW = Math.max(7200, svgW * 5);
    const resvg = new Resvg(svg, {
      font: { loadSystemFonts: true },
      fitTo: { mode: "width", value: targetW }
    });
    const pngBuf = Buffer.from(resvg.render().asPng());
    await writeFile(pngPath, pngBuf);
    return { success: true, pathToFile: pngPath, svg };
  }
  await writeFile(outPath, svg, "utf8");
  return { success: true, pathToFile: outPath, svg };
}
async function createBarcodeSVG(filePath, options) {
  const { bg, width, height, out, title, subtitle, format, puncOpts } = resolveOpts(filePath, options);
  const { positions, totalChars } = await getPositions(filePath, puncOpts);
  const svg = buildBarcode(positions, totalChars, width ?? 1200, height ?? 240, bg, title, subtitle);
  return writeSVG(svg, out ?? `${filePath}-barcode.svg`, format);
}
async function createHeatmapSVG(filePath, options) {
  const { bg, width, height, wins, out, title, subtitle, format, puncOpts } = resolveOpts(filePath, options);
  const { positions, totalChars } = await getPositions(filePath, puncOpts);
  const density = windowedDensity(positions, totalChars, wins ?? 200);
  const svg = buildHeatmap(density, width ?? 900, height ?? 380, bg, title, subtitle);
  return writeSVG(svg, out ?? `${filePath}-heatmap.svg`, format);
}
async function createWaveformSVG(filePath, options) {
  const { bg, width, height, wins, out, title, subtitle, format, puncOpts } = resolveOpts(filePath, options);
  const { positions, totalChars } = await getPositions(filePath, puncOpts);
  const density = windowedDensity(positions, totalChars, wins ?? 100);
  const svg = buildWaveform(density, width ?? 1200, height ?? 440, bg, title, subtitle);
  return writeSVG(svg, out ?? `${filePath}-waveform.svg`, format);
}
async function createRadialSVG(filePath, options) {
  const { bg, width, height, out, title, subtitle, format, puncOpts } = resolveOpts(filePath, options);
  const { map } = await getPositions(filePath, puncOpts);
  const svg = buildRadial(map, width ?? 800, height ?? 860, bg, title, subtitle);
  return writeSVG(svg, out ?? `${filePath}-radial.svg`, format);
}
async function createScoreSVG(filePath, options) {
  const { bg, width, height, out, title, subtitle, format, puncOpts } = resolveOpts(filePath, options);
  const { positions } = await getPositions(filePath, puncOpts);
  const w = width ?? 1200;
  const h = height ?? 960;
  const svg = buildScore(positions, w, h, bg, title, subtitle);
  return writeSVG(svg, out ?? `${filePath}-score.svg`, format);
}
async function createSpiralSVG(filePath, options) {
  const { bg, width, height, out, title, subtitle, format, puncOpts } = resolveOpts(filePath, options);
  const { positions } = await getPositions(filePath, puncOpts);
  const svg = buildSpiral(positions, width ?? 1200, height ?? 960, bg, title, subtitle);
  return writeSVG(svg, out ?? `${filePath}-spiral.svg`, format);
}
export {
  createBarcodeSVG,
  createHeatmapSVG,
  createPDF,
  createRadialSVG,
  createScoreSVG,
  createSpiralSVG,
  createWaveformSVG,
  punc as default,
  defaultMapping,
  getPositions,
  punc,
  validateOptions,
  windowedDensity
};
