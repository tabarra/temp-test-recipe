import { spawn } from 'node:child_process';
import { anchorGlob, normalizePath, rgDiskPath } from './helpers';
import type { FileSearchOptions, SearchResult } from './types';


//MARK: File Search
export const fileSearch = (options: FileSearchOptions): Promise<SearchResult<string>> => {
    return new Promise((resolve, reject) => {
        const args: string[] = ['--files'];

        // Hidden files
        if (options.hidden !== false) {
            args.push('--hidden');
        }

        // Case sensitive for file matching
        args.push('--case-sensitive');

        // Includes
        if (options.includes?.length) {
            for (const include of options.includes) {
                args.push('-g', anchorGlob(include));
            }
        }

        // Excludes
        if (options.excludes?.length) {
            for (const exclude of options.excludes) {
                args.push('-g', `!${anchorGlob(exclude)}`);
            }
        }

        // Gitignore
        if (options.useGitignore === false) {
            args.push('--no-ignore');
        }

        // Symlinks
        if (options.followSymlinks) {
            args.push('--follow');
        }

        // Threads
        if (options.numThreads) {
            args.push('--threads', String(options.numThreads));
        }

        // No config file
        args.push('--no-config', '--no-require-git');

        // Normalize searchDir to absolute path for cross-platform compatibility
        const searchDir = normalizePath(options.searchDir);
        args.push(searchDir);

        const results: string[] = [];
        const maxResults = options.maxResults ?? 100000;
        let limitHit = false;
        let stderr = '';
        let stdout = '';

        const rgProcess = spawn(rgDiskPath, args);

        rgProcess.stdout.on('data', (data: Buffer) => {
            stdout += data.toString();

            // Process complete lines
            const lines = stdout.split('\n');
            stdout = lines.pop() ?? ''; // Keep incomplete line

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                    if (results.length >= maxResults) {
                        limitHit = true;
                        rgProcess.kill();
                        return;
                    }
                    results.push(trimmed);
                }
            }
        });

        rgProcess.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        rgProcess.on('error', (err) => {
            reject(new Error(`ripgrep process error: ${err.message}`));
        });

        rgProcess.on('close', (code) => {
            // Process any remaining data
            if (stdout.trim() && results.length < maxResults) {
                results.push(stdout.trim());
            }

            // Exit code 1 means no matches found, which is not an error
            if (code !== 0 && code !== 1 && !limitHit) {
                if (stderr) {
                    reject(new Error(`ripgrep error: ${stderr}`));
                    return;
                }
            }

            resolve({ results, limitHit });
        });
    });
};
