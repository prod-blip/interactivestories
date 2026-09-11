import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(mobileRoot, 'assets/icon.svg');
const resourceRoot = path.join(mobileRoot, 'android/app/src/main/res');
const sizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

for (const [density, size] of Object.entries(sizes)) {
  const directory = path.join(resourceRoot, `mipmap-${density}`);
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
    await sharp(source).resize(size, size).png().toFile(path.join(directory, name));
  }
}

const playStoreAssetRoot = path.join(mobileRoot, 'play-store/assets');
await mkdir(playStoreAssetRoot, { recursive: true });
await sharp(source)
  .resize(512, 512)
  .png()
  .toFile(path.join(playStoreAssetRoot, 'icon.png'));

console.log('Generated branded Android launcher and Play Store icons.');
