declare module '@citation-js/core' {
  export const plugins: {
    input: { chain(input: string, options: Record<string, string>): unknown };
  };
}
declare module '@citation-js/plugin-bibtex';
declare module '*?url' {
  const url: string;
  export default url;
}
