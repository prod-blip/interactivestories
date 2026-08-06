import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDirectory, '..');
const repositoryRoot = resolve(packageRoot, '../..');
const gamesRoot = join(repositoryRoot, 'games');
const gameRoot = resolve(process.cwd(), process.argv[2] ?? '.');

if (!gameRoot.startsWith(`${gamesRoot}${sep}`)) {
  throw new Error(`Shared assets can only be synchronized into a game workspace: ${gameRoot}`);
}

const source = join(packageRoot, 'assets');
const destination = join(gameRoot, 'public', 'shared');

rmSync(destination, { recursive: true, force: true });
mkdirSync(dirname(destination), { recursive: true });
cpSync(source, destination, { recursive: true });

console.log(`Synchronized Moonlit shared assets to ${destination}`);
