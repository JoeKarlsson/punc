export interface PunctuationCount {
    ';': number;
    ':': number;
    "'": number;
    '"': number;
    ',': number;
    '!': number;
    '?': number;
    '.': number;
    '(': number;
    ')': number;
    '-': number;
}
export interface PuncOptions {
    encoding?: BufferEncoding;
    mapping?: PunctuationCount;
}
export interface PuncResult {
    body: string;
    count: PunctuationCount;
    wordsPerSentence: number;
    spaced: string;
}
export interface PDFResult {
    success: boolean;
    pathToFile: string;
}
export declare function punc(filePath: string, options?: PuncOptions | string): Promise<PuncResult>;
export declare function createPDF(filePath: string, options?: PuncOptions | string): Promise<PDFResult>;
export default punc;
//# sourceMappingURL=index.d.ts.map