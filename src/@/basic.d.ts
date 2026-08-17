export type Project = 'Foo' | 'Ba' | 'Roo';

declare module '*.json?raw' {
  const value: string;
  export default value;
}
