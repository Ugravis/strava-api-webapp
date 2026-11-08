import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface PackageJson {
  name?: string;
  version?: string;
}

function readPackage(path: string): PackageJson | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
  } catch {
    return null;
  }
}

/**
 * The first `package.json` above `start` that `accept` keeps. Walks the
 * folders instead of importing `<name>/package.json`, which the `exports` of
 * some packages do not allow.
 */
function findPackage(
  start: string,
  accept: (pkg: PackageJson) => boolean,
): PackageJson | null {
  let folder = start;
  for (;;) {
    const pkg = readPackage(join(folder, 'package.json'));
    if (pkg && accept(pkg)) {
      return pkg;
    }
    const parent = dirname(folder);
    if (parent === folder) {
      return null;
    }
    folder = parent;
  }
}

/** Installed version of a dependency of the backend, null when unknown. */
export function dependencyVersion(name: string): string | null {
  try {
    const entry = require.resolve(name);
    return (
      findPackage(dirname(entry), (pkg) => pkg.name === name)?.version ?? null
    );
  } catch {
    return null;
  }
}

/** Version of the backend, from its own `package.json`. */
export function appVersion(): string {
  return findPackage(__dirname, (pkg) => !!pkg.version)?.version ?? '0.0.0';
}
