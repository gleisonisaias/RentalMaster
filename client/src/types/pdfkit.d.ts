// Declaração de tipos para PDFKit
declare module 'pdfkit/js/pdfkit.standalone.js' {
  class PDFDocument {
    constructor(options?: any);
    font(name: string): PDFDocument;
    fontSize(size: number): PDFDocument;
    text(text: string, options?: any): PDFDocument;
    text(text: string, x: number, y: number, options?: any): PDFDocument;
    moveDown(lines?: number): PDFDocument;
    addPage(options?: any): PDFDocument;
    end(): void;
    pipe(destination: any): any;
    y: number;
    page: {
      width: number;
      height: number;
      margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
      };
    };
  }
  export = PDFDocument;
}

// Declaração de tipos para blob-stream
declare module 'blob-stream' {
  function blobStream(): {
    on(event: string, callback: Function): void;
    pipe(destination: any): any;
    toBlob(type: string): Blob;
  };
  export = blobStream;
}