/// <reference types="vite/client" />

declare module '*.css';
declare module '*.png' {
  const content: string;
  export default content;
}
declare module '*.svg' {
  const content: string;
  export default content;
}
