import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(readFileSync(new URL('./parts.json', import.meta.url), 'utf8'));
const assembled = Buffer.concat(manifest.parts.map((p) => readFileSync(new URL('./parts/' + p.file, import.meta.url))));
const bundle = readFileSync(new URL('../bundle/worker.js', import.meta.url));
const h = (b) => createHash('sha256').update(b).digest('hex');
const ok = h(assembled) === h(bundle) && assembled.equals(bundle);
if (process.argv.includes('--check')) {
  console.log((ok ? 'assemble OK ' : 'assemble FAILED ') + h(assembled) + ' parts=' + manifest.parts.length);
  process.exit(ok ? 0 : 1);
}
process.stdout.write(assembled);
