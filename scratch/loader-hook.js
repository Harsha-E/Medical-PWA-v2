/**
 * @fileoverview Node.js ESM Loader Hook
 * Intercepts CDN URL imports (e.g., https://esm.sh/fuse.js) and maps them to local files/mocks.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('https://esm.sh/fuse.js')) {
    const mockPath = path.resolve(process.cwd(), 'scratch/mock-fuse.js');
    return {
      format: 'module',
      shortCircuit: true,
      url: pathToFileURL(mockPath).href
    };
  }
  if (specifier.startsWith('https://cdn.jsdelivr.net/npm/dexie')) {
    const mockPath = path.resolve(process.cwd(), 'scratch/mock-dexie.js');
    return {
      format: 'module',
      shortCircuit: true,
      url: pathToFileURL(mockPath).href
    };
  }
  if (specifier.startsWith('https://www.gstatic.com/firebasejs')) {
    const mockPath = path.resolve(process.cwd(), 'scratch/mock-firebase.js');
    return {
      format: 'module',
      shortCircuit: true,
      url: pathToFileURL(mockPath).href
    };
  }
  return nextResolve(specifier, context);
}
