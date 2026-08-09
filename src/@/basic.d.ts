declare module '*.json?raw' {
  const value: string;
  export default value;
}

export type Project = 'Foo' | 'Ba' | 'Roo';
export const CODES = ['HS'] as const; // add more as needed ie: 'LOL', 'DOTA', Slay the Spire, etc
