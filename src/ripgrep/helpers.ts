import fs from 'node:fs';
import path from 'node:path';
import { getCurrentDir } from '../runtimeDir';
import type { RgBytesOrText } from './types';

// FiveM-specific globals (to detect runtime)
declare const GetCurrentResourceName: (() => string) | undefined;

//MARK: Ripgrep Path
const getRgDir = (): string => {
    const currentDir = getCurrentDir(import.meta.url);

    // In FiveM runtime, getCurrentDir returns the resource folder via GetResourcePath
    // In dev mode, we're in src/ripgrep/, need to go up 2 levels then into temp/
    const isFiveM = typeof GetCurrentResourceName === 'function';
    
    if (!isFiveM) {
        // Dev mode - binaries are in ./temp/
        const devPath = path.resolve(currentDir, '..', '..', 'temp');
        return devPath;
    }
    
    return currentDir;
};

export const rgDiskPath = (() => {
    const rgDir = getRgDir();
    const rgName = process.platform === 'win32' ? 'rg-windows.exe' : 'rg-linux';
    const fullPath = path.join(rgDir, rgName);
    
    // Ensure execute permission on Linux (may be lost during packaging)
    if (process.platform !== 'win32' && fs.existsSync(fullPath)) {
        try {
            fs.chmodSync(fullPath, 0o755);
        } catch (e) {
            // chmod failed, continue anyway
        }
    }
    
    return fullPath;
})();


//MARK: Helpers
export const bytesOrTextToString = (obj: RgBytesOrText): string => {
    return 'bytes' in obj
        ? Buffer.from(obj.bytes, 'base64').toString()
        : obj.text;
};

export const anchorGlob = (glob: string): string => {
    return glob.startsWith('**') ? glob : `**/${glob}`;
};

/**
 * Normalize a path for the current platform.
 * Handles Git Bash/MSYS2 style paths like /c/Users/... on Windows.
 */
export const normalizePath = (inputPath: string): string => {
    // Handle Git Bash/MSYS2 style paths on Windows (e.g., /c/Users/...)
    if (process.platform === 'win32' && /^\/[a-zA-Z]\//.test(inputPath)) {
        const driveLetter = inputPath[1]!.toUpperCase();
        return path.resolve(`${driveLetter}:${inputPath.slice(2)}`);
    }
    return path.resolve(inputPath);
};
