// Declarações para bibliotecas sem definições de tipos

declare module 'pdfkit' {
  import { Writable } from 'stream';
  
  interface PDFDocumentOptions {
    size?: string | [number, number];
    margins?: { top: number, bottom: number, left: number, right: number };
    info?: {
      Title?: string;
      Author?: string;
      Subject?: string;
      Keywords?: string;
      CreationDate?: Date;
    };
  }
  
  class PDFDocument extends Writable {
    constructor(options?: PDFDocumentOptions);
    
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    
    addPage(options?: { size?: string | [number, number], margins?: { top: number, bottom: number, left: number, right: number } }): PDFDocument;
    
    font(src: string): PDFDocument;
    fontSize(size: number): PDFDocument;
    text(text: string, options?: { align?: 'left' | 'center' | 'right' | 'justify', width?: number, underline?: boolean } | number, options2?: { align?: 'left' | 'center' | 'right' | 'justify', width?: number, underline?: boolean }): PDFDocument;
    text(text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' | 'justify', width?: number, underline?: boolean }): PDFDocument;
    
    moveDown(lines?: number): PDFDocument;
    moveUp(lines?: number): PDFDocument;
    
    image(src: string, options?: { fit?: [number, number], align?: string, valign?: string }): PDFDocument;
    image(src: string, x: number, y: number, options?: { fit?: [number, number], align?: string, valign?: string }): PDFDocument;
    
    end(): PDFDocument;
    
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
    
    y: number;
  }
  
  export default PDFDocument;
}

declare module 'blob-stream' {
  import { Writable } from 'stream';
  
  interface BlobStream extends Writable {
    on(event: 'finish', listener: () => void): this;
    toBlob(type?: string): Blob;
  }
  
  function blobStream(): BlobStream;
  
  export default blobStream;
}