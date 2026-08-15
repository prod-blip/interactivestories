import { readFile, writeFile } from 'node:fs/promises';

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) throw new Error('Usage: node scripts/export-face-only-glb.mjs <source.glb> <output.glb>');

const source = await readFile(sourcePath);
if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2) throw new Error('Expected a GLB 2.0 file');

let cursor = 12;
const jsonLength = source.readUInt32LE(cursor);
const jsonType = source.readUInt32LE(cursor + 4);
if (jsonType !== 0x4e4f534a) throw new Error('Missing GLB JSON chunk');
const json = JSON.parse(source.subarray(cursor + 8, cursor + 8 + jsonLength).toString('utf8').trim());
cursor += 8 + jsonLength;
const binaryLength = source.readUInt32LE(cursor);
const binaryType = source.readUInt32LE(cursor + 4);
if (binaryType !== 0x004e4942) throw new Error('Missing GLB binary chunk');
const binary = source.subarray(cursor + 8, cursor + 8 + binaryLength);

const primitive = json.meshes[0].primitives[0];
const positionAccessor = json.accessors[primitive.attributes.POSITION];
const normalAccessor = json.accessors[primitive.attributes.NORMAL];
const uvAccessor = json.accessors[primitive.attributes.TEXCOORD_0];
const indexAccessor = json.accessors[primitive.indices];

function accessorOffset(accessor) {
  return json.bufferViews[accessor.bufferView].byteOffset + (accessor.byteOffset ?? 0);
}

function readFloatAccessor(accessor, components) {
  if (accessor.componentType !== 5126) throw new Error('Only float attributes are supported');
  const view = json.bufferViews[accessor.bufferView];
  const stride = view.byteStride ?? components * 4;
  const offset = accessorOffset(accessor);
  const values = new Float32Array(accessor.count * components);
  for (let index = 0; index < accessor.count; index += 1) {
    for (let component = 0; component < components; component += 1) {
      values[index * components + component] = binary.readFloatLE(offset + index * stride + component * 4);
    }
  }
  return values;
}

function readIndexAccessor(accessor) {
  const offset = accessorOffset(accessor);
  const values = new Uint32Array(accessor.count);
  const readers = { 5121: ['readUInt8', 1], 5123: ['readUInt16LE', 2], 5125: ['readUInt32LE', 4] };
  const [reader, bytes] = readers[accessor.componentType] ?? [];
  if (!reader) throw new Error(`Unsupported index component type ${accessor.componentType}`);
  for (let index = 0; index < accessor.count; index += 1) values[index] = binary[reader](offset + index * bytes);
  return values;
}

const positions = readFloatAccessor(positionAccessor, 3);
const normals = readFloatAccessor(normalAccessor, 3);
const uvs = readFloatAccessor(uvAccessor, 2);
const indices = readIndexAccessor(indexAccessor);
let minimumX = Infinity;
let maximumX = -Infinity;
let minimumY = Infinity;
let maximumY = -Infinity;
for (let index = 0; index < positionAccessor.count; index += 1) {
  const x = positions[index * 3];
  const y = positions[index * 3 + 1];
  minimumX = Math.min(minimumX, x);
  maximumX = Math.max(maximumX, x);
  minimumY = Math.min(minimumY, y);
  maximumY = Math.max(maximumY, y);
}
const horizontalCenter = (minimumX + maximumX) / 2;
const headHalfWidth = (maximumX - minimumX) * 0.3;
const headFloor = minimumY + (maximumY - minimumY) * 0.6;

const selectedTriangles = [];
const usedVertices = new Set();
for (let triangle = 0; triangle < indices.length; triangle += 3) {
  const face = [indices[triangle], indices[triangle + 1], indices[triangle + 2]];
  const keep = face.every((index) => {
    const x = positions[index * 3];
    const y = positions[index * 3 + 1];
    return y >= headFloor && Math.abs(x - horizontalCenter) <= headHalfWidth;
  });
  if (!keep) continue;
  selectedTriangles.push(face);
  face.forEach((index) => usedVertices.add(index));
}

const orderedVertices = [...usedVertices].sort((first, second) => first - second);
const remap = new Map(orderedVertices.map((oldIndex, newIndex) => [oldIndex, newIndex]));
const outputPositions = new Float32Array(orderedVertices.length * 3);
const outputNormals = new Float32Array(orderedVertices.length * 3);
const outputUvs = new Float32Array(orderedVertices.length * 2);
const positionMin = [Infinity, Infinity, Infinity];
const positionMax = [-Infinity, -Infinity, -Infinity];
orderedVertices.forEach((oldIndex, newIndex) => {
  for (let component = 0; component < 3; component += 1) {
    const position = positions[oldIndex * 3 + component];
    outputPositions[newIndex * 3 + component] = position;
    outputNormals[newIndex * 3 + component] = normals[oldIndex * 3 + component];
    positionMin[component] = Math.min(positionMin[component], position);
    positionMax[component] = Math.max(positionMax[component], position);
  }
  outputUvs[newIndex * 2] = uvs[oldIndex * 2];
  outputUvs[newIndex * 2 + 1] = uvs[oldIndex * 2 + 1];
});
const outputIndices = new Uint32Array(selectedTriangles.length * 3);
selectedTriangles.flat().forEach((oldIndex, index) => { outputIndices[index] = remap.get(oldIndex); });

function asBuffer(array) {
  return Buffer.from(array.buffer, array.byteOffset, array.byteLength);
}
function padded(buffer) {
  const padding = (4 - buffer.length % 4) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding)]) : buffer;
}

const chunks = [];
const bufferViews = [];
function appendChunk(data, properties = {}) {
  const offset = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const aligned = padded(data);
  chunks.push(aligned);
  bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length, ...properties });
  return bufferViews.length - 1;
}

const positionView = appendChunk(asBuffer(outputPositions), { target: 34962 });
const normalView = appendChunk(asBuffer(outputNormals), { target: 34962 });
const uvView = appendChunk(asBuffer(outputUvs), { target: 34962 });
const indexView = appendChunk(asBuffer(outputIndices), { target: 34963 });
const imageViews = json.images.map((image) => {
  const originalView = json.bufferViews[image.bufferView];
  return appendChunk(Buffer.from(binary.subarray(originalView.byteOffset, originalView.byteOffset + originalView.byteLength)));
});

const accessors = [
  { bufferView: positionView, byteOffset: 0, componentType: 5126, count: orderedVertices.length, type: 'VEC3', min: positionMin, max: positionMax },
  { bufferView: normalView, byteOffset: 0, componentType: 5126, count: orderedVertices.length, type: 'VEC3' },
  { bufferView: uvView, byteOffset: 0, componentType: 5126, count: orderedVertices.length, type: 'VEC2', min: [0, 0], max: [1, 1] },
  { bufferView: indexView, byteOffset: 0, componentType: 5125, count: outputIndices.length, type: 'SCALAR', min: [0], max: [orderedVertices.length - 1] },
];
const outputBinary = Buffer.concat(chunks);
const outputJson = {
  asset: { version: '2.0', generator: 'Moonlit face-only GLB exporter' },
  accessors,
  buffers: [{ byteLength: outputBinary.length }],
  bufferViews,
  images: json.images.map((image, index) => ({ ...image, bufferView: imageViews[index] })),
  materials: json.materials,
  meshes: [{ name: 'AryaanFaceOnly', primitives: [{ mode: 4, material: 0, indices: 3, attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 } }] }],
  nodes: [{ name: 'AryaanFaceOnly', mesh: 0, rotation: [0, 1, 0, 0] }],
  samplers: json.samplers,
  scenes: [{ name: 'Aryaan Face Only', nodes: [0] }],
  scene: 0,
  textures: json.textures,
};
const jsonBuffer = padded(Buffer.from(JSON.stringify(outputJson))).fill(0x20, Buffer.byteLength(JSON.stringify(outputJson)));
const totalLength = 12 + 8 + jsonBuffer.length + 8 + outputBinary.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(totalLength, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonBuffer.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(outputBinary.length, 0);
binaryHeader.writeUInt32LE(0x004e4942, 4);
await writeFile(outputPath, Buffer.concat([header, jsonHeader, jsonBuffer, binaryHeader, outputBinary]));
console.log(`Exported ${orderedVertices.length} face vertices and ${selectedTriangles.length} triangles to ${outputPath}`);
