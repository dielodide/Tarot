/// <reference types="vite/client" />

declare module './.vite-source-tags.js' {
  export function sourceTags(): import('vite').Plugin
}
