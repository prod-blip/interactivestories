import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(mobileRoot, '../web/out');
const destination = path.resolve(mobileRoot, 'www');

try {
  const sourceStats = await stat(source);
  if (!sourceStats.isDirectory()) throw new Error('not a directory');
} catch {
  throw new Error(`Web export not found at ${source}. Run the web build first.`);
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });

console.log(`Prepared Android web bundle: ${destination}`);
