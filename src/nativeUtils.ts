import path from 'node:path';
import url from 'node:url';

// FiveM-specific globals
declare const GetCurrentResourceName: (() => string) | undefined;
declare const GetResourcePath: ((resourceName: string) => string) | undefined;
declare const GetConvar: (name: string, defaultValue: string) => string;


/**
 * Helper function to get convars WITHOUT a fallback value
 */
export const getConvarString = (convarName: string) => {
    if (typeof GetConvar !== 'function') {
        return undefined;
    }
    const undefinedKey = Math.random().toString(36).substring(2, 15);
    const cvar = GetConvar(convarName, undefinedKey);
    return (cvar !== undefinedKey) ? cvar.trim() : undefined;
};


/**
 * Gets the directory of the current file.
 * Works in both ESM (dev/Bun) and CJS (FiveM runtime).
 * 
 * In FiveM runtime, uses GetResourcePath native.
 * In dev/Bun, derives from import.meta.url.
 */
export const getCurrentDir = (metaUrl: string): string => {
    // FiveM runtime - use natives to get resource path
    if (typeof GetCurrentResourceName === 'function' && typeof GetResourcePath === 'function') {
        const resourceName = GetCurrentResourceName();
        const resourcePath = GetResourcePath(resourceName);
        return resourcePath;
    }

    // ESM/Bun - derive from import.meta.url
    const result = path.dirname(url.fileURLToPath(metaUrl));
    return result;
};
