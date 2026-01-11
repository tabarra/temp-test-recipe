import { spawn } from 'node:child_process';
import { anchorGlob, normalizePath, rgDiskPath } from './helpers';
import { RipgrepParser } from './parser';
import type { SearchResult, TextSearchMatch, TextSearchOptions } from './types';


//MARK: Text Search
export const textSearch = (options: TextSearchOptions): Promise<SearchResult<TextSearchMatch>> => {
    return new Promise((resolve, reject) => {
        const args: string[] = ['--json'];

        // Hidden files
        if (options.hidden !== false) {
            args.push('--hidden');
        }

        // Case sensitivity
        args.push(options.caseSensitive ? '--case-sensitive' : '--ignore-case');

        // Regex or fixed strings
        if (options.isRegex) {
            args.push('--regexp', options.pattern);
        } else {
            args.push('--fixed-strings');
        }

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

        // Context lines
        if (options.contextLines) {
            args.push('-C', String(options.contextLines));
        }

        // No config file
        args.push('--no-config', '--no-require-git');

        // Pattern (if not regex) and path
        // Normalize searchDir to absolute path for cross-platform compatibility
        const searchDir = normalizePath(options.searchDir);
        args.push('--');
        if (!options.isRegex) {
            args.push(options.pattern);
        }
        args.push(searchDir);

        const results: TextSearchMatch[] = [];
        const maxResults = options.maxResults ?? 10000;
        const parser = new RipgrepParser(maxResults, options.maxLineLength);

        const rgProcess = spawn(rgDiskPath, args);

        let limitHit = false;
        let stderr = '';

        parser.on('result', (match: TextSearchMatch) => {
            results.push(match);
        });

        parser.on('hitLimit', () => {
            limitHit = true;
            rgProcess.kill();
        });

        rgProcess.stdout.on('data', (data: Buffer) => {
            parser.handleData(data);
        });

        rgProcess.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        rgProcess.on('error', (err) => {
            reject(new Error(`ripgrep process error: ${err.message}`));
        });

        rgProcess.on('close', (code) => {
            parser.flush();

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
