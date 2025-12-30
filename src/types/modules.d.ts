/**
 * Type declarations for modules without TypeScript definitions
 */

declare module 'archiver' {
  interface Archiver {
    on(event: 'data', listener: (chunk: Buffer) => void): Archiver;
    on(event: 'end', listener: () => void): Archiver;
    on(event: 'error', listener: (err: Error) => void): Archiver;
    append(buffer: Buffer, options: { name: string }): Archiver;
    finalize(): void;
  }
  
  function archiver(format: string, options?: any): Archiver;
  export = archiver;
}

declare module 'adm-zip' {
  interface ZipEntry {
    entryName: string;
    isDirectory: boolean;
    header: { size: number };
    getData(): Buffer;
  }
  
  class AdmZip {
    constructor(buffer: Buffer);
    getEntries(): ZipEntry[];
  }
  
  export = AdmZip;
}

declare module 'better-sqlite3' {
  interface Database {
    prepare(query: string): Statement;
  }
  
  interface Statement {
    all(...params: any[]): any[];
    run(...params: any[]): { lastInsertRowid?: number; changes?: number };
  }
  
  class Database {
    constructor(connectionString: string);
    prepare(query: string): Statement;
  }
  
  export = Database;
}

