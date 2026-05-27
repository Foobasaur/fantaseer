export type Project = 'Foo' | 'Ba' | 'Roo';

/** Monochrome text glyphs — accept CSS color */
export type Glyph =
  /** circled dot — throw / target */
  | '⨀'
  /** circled plus — caught / added */
  | '⨁'
  /** circled times — escaped / missed */
  | '⨂'
  /** upper half black circle — poké ball top */
  | '◓'
  /** large circle — empty / miss */
  | '◯';

declare module '*.json?raw' {
  const value: string;
  export default value;
}