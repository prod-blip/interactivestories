import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [sourcePath, destinationDirectory] = process.argv.slice(2);
if (!sourcePath || !destinationDirectory) {
  throw new Error('Usage: node scripts/extract-head-components.mjs <source.obj> <destination-directory>');
}

const source = await readFile(sourcePath, 'utf8');
const lines = source.split(/\r?\n/);
const vertices = [];
const faces = [];

for (const line of lines) {
  if (line.startsWith('v ')) vertices.push(line.trim().split(/\s+/).slice(1).map(Number));
  if (line.startsWith('f ')) faces.push(line.trim().split(/\s+/).slice(1).map((value) => Number(value.split('/')[0]) - 1));
}

const parents = vertices.map((_, index) => index);
const ranks = new Uint8Array(vertices.length);
function find(index) {
  while (parents[index] !== index) {
    parents[index] = parents[parents[index]];
    index = parents[index];
  }
  return index;
}
function join(first, second) {
  first = find(first);
  second = find(second);
  if (first === second) return;
  if (ranks[first] < ranks[second]) parents[first] = second;
  else {
    parents[second] = first;
    if (ranks[first] === ranks[second]) ranks[first] += 1;
  }
}

for (const face of faces) for (let index = 1; index < face.length; index += 1) join(face[0], face[index]);

const components = new Map();
vertices.forEach((_, index) => {
  const root = find(index);
  if (!components.has(root)) components.set(root, []);
  components.get(root).push(index);
});

const heads = [...components.values()]
  .filter((indices) => indices.length > 1000)
  .sort((first, second) => second.length - first.length);

await mkdir(destinationDirectory, { recursive: true });
for (let componentIndex = 0; componentIndex < heads.length; componentIndex += 1) {
  const indices = heads[componentIndex];
  const selected = new Set(indices);
  const remap = new Map(indices.map((oldIndex, newIndex) => [oldIndex, newIndex + 1]));
  const componentFaces = faces.filter((face) => face.every((index) => selected.has(index)));
  const output = [
    '# Extracted from the supplied multi-view face reconstruction',
    `# Component ${componentIndex + 1}: ${indices.length} vertices, ${componentFaces.length} faces`,
    ...indices.map((index) => `v ${vertices[index].join(' ')}`),
    ...componentFaces.map((face) => `f ${face.map((index) => remap.get(index)).join(' ')}`),
    '',
  ].join('\n');
  await writeFile(path.join(destinationDirectory, `aryaan-head-view-${componentIndex + 1}.obj`), output);
}

console.log(`Extracted ${heads.length} head components from ${vertices.length} vertices.`);
