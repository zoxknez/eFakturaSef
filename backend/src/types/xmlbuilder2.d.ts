declare module 'xmlbuilder2' {
  interface CreateOptions {
    version?: '1.0' | '1.1';
    encoding?: string;
  }

  interface XMLBuilder {
    ele(name: string, attributes?: Record<string, string>): XMLBuilder;
    txt(value: string): XMLBuilder;
    up(): XMLBuilder;
    end(options?: { prettyPrint?: boolean }): string;
  }

  export function create(options?: CreateOptions): XMLBuilder;
}
