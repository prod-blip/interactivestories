import { spawnSync } from 'node:child_process';
import { accessSync, constants, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tasks = process.argv.slice(2);

if (tasks.length === 0) throw new Error('At least one Gradle task is required.');

let javaHome = process.env.JAVA_HOME;
if (!javaHome) {
  const javaExecutable = process.env.PATH
    ?.split(path.delimiter)
    .map((directory) => path.join(directory, 'java'))
    .find((candidate) => {
      try {
        accessSync(candidate, constants.X_OK);
        return realpathSync(candidate) !== '/usr/bin/java';
      } catch {
        return false;
      }
    });

  if (!javaExecutable) {
    throw new Error('JAVA_HOME is not set and a JDK could not be resolved from PATH.');
  }
  javaHome = path.resolve(path.dirname(realpathSync(javaExecutable)), '..');
}

const result = spawnSync('./gradlew', tasks, {
  cwd: path.join(mobileRoot, 'android'),
  env: { ...process.env, JAVA_HOME: javaHome },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
