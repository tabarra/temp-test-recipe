import type { TextSearchOptions } from "../src/ripgrep";

const src: Omit<TextSearchOptions, 'searchDir'> = {
    pattern: 'GetResourcePath',
    includes: ['*.js', '*.cjs', '*.lua'],
    contextLines: 2,
    maxLineLength: 200,
};

const configString = JSON.stringify(src);
console.log(configString.replaceAll('"', '\\"'));
