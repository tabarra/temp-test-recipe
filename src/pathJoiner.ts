import path from 'node:path';
import { getCurrentDir } from './runtimeDir';

type PathJoiner = {
    /**
     * Joins segments to the base path.
     * When called with no arguments, returns the base path itself.
     * @returns Normalized path without trailing slash.
     */
    (...segments: string[]): string;
    /** Creates a new PathJoiner scoped to a subdirectory. */
    sub: (...subpaths: string[]) => PathJoiner;
    /** The base path (no trailing slash). */
    base: string;
};

/**
 * Creates a path joiner function rooted at the given base path.
 * @param basePath - Base path (defaults to repo root). No trailing slash.
 */
export const createPathJoiner = (basePath?: string): PathJoiner => {
    basePath ??= path.resolve(getCurrentDir(import.meta.url), '..');
    return Object.assign(
        (...segments: string[]) => path.join(basePath, ...segments),
        {
            sub: (...subpaths: string[]) => createPathJoiner(path.join(basePath, ...subpaths)),
            base: basePath,
        }
    );
};
