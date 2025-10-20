// Lightweight shim for environments without @types/react installed
declare module 'react' {
  const React: any;
  export = React;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
