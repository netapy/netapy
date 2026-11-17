import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = fileURLToPath(new URL('./', import.meta.url));
const output = `${root}dist`;
await rm(output, { recursive: true, force: true });
await mkdir(`${output}/draw/assets`, { recursive: true });
// ponytail: explicit public files, never deploy sources, dependencies or credentials.
for (const path of ['index.html', 'robots.txt', 'sitemap.xml', 'writing']) {
  await cp(`${root}${path}`, `${output}/${path}`, { recursive: true });
}
for (const path of ['index.html', 'style.css']) {
  await cp(`${source}${path}`, `${output}/draw/${path}`);
}
await build({
  entryPoints: [`${source}app.js`],
  bundle: true,
  splitting: true,
  format: 'esm',
  target: 'es2022',
  outdir: `${output}/draw/assets`,
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.woff2': 'file', '.wasm': 'file' },
  logLevel: 'warning'
});
const excalidraw = `${source}node_modules/@excalidraw/excalidraw/dist/prod`;
await cp(`${excalidraw}/fonts`, `${output}/draw/assets/fonts`, { recursive: true });
await cp(`${excalidraw}/index.css`, `${output}/draw/assets/index.css`);
console.log('Built the unchanged static site and /draw into dist/.');
