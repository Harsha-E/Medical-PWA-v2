/**
 * @fileoverview Loader entrypoint to register ESM hooks for the Node.js test runner.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const hookPath = path.resolve(process.cwd(), 'scratch/loader-hook.js');
register(pathToFileURL(hookPath).href, import.meta.url);
