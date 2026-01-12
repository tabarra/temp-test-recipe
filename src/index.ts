import fs from 'node:fs';
import chalk from 'chalk';
import { textSearch, fileSearch, type TextSearchOptions } from './ripgrep';
import { getConvarString } from './nativeUtils';

const MAX_LINE_LENGTH = 200;

const highlightMatches = (text: string, matchTexts: string[]) => {
    let result = text;
    for (const matchText of matchTexts) {
        result = result.replaceAll(matchText, chalk.red(matchText));
    }
    return result;
};


const simpleTextSearch = async (scanOptions: TextSearchOptions) => {
    console.log('\n=== Text Search Test ===');
    const result = await textSearch(scanOptions);
    console.log(`Found ${result.results.length} matches (limitHit: ${result.limitHit})`);

    for (const match of result.results) {
        const truncatedTag = match.truncated ? ' [TRUNCATED]' : '';
        console.log('');
        console.log(chalk.inverse(`--- ${match.filePath}:${match.lineNumber}${truncatedTag} ---`));

        const contextBefore = match.contextBefore ?? [];
        const contextAfter = match.contextAfter ?? [];
        const maxLineNum = match.lineNumber + contextAfter.length;
        const padWidth = String(maxLineNum).length;
        const matchTexts = match.matches.map(m => m.text);

        for (let i = 0; i < contextBefore.length; i++) {
            const lineNum = match.lineNumber - contextBefore.length + i;
            console.log(`  ${String(lineNum).padStart(padWidth)}: ${contextBefore[i].substring(0, MAX_LINE_LENGTH)}`);
        }
        const highlightedLine = highlightMatches(match.lineText.substring(0, MAX_LINE_LENGTH), matchTexts);
        console.log(`  ${String(match.lineNumber).padStart(padWidth)}: ${highlightedLine}`);
        for (let i = 0; i < contextAfter.length; i++) {
            const lineNum = match.lineNumber + 1 + i;
            console.log(`  ${String(lineNum).padStart(padWidth)}: ${contextAfter[i].substring(0, MAX_LINE_LENGTH)}`);
        }
    }
    console.log('');
};

//Runs the main function
(async () => {
    try {
        const CV_SCAN_DIR = 'rgs_scanDir';
        const searchDir = getConvarString(CV_SCAN_DIR);
        if (!searchDir) throw new Error(`${CV_SCAN_DIR} is not set`);
        if (!fs.existsSync(searchDir)) throw new Error(`${searchDir} does not exist`);

        const CV_CONFIG = 'rgs_config';
        const configString = getConvarString(CV_CONFIG);
        if (!configString) throw new Error(`${CV_CONFIG} is not set`);
        const config = JSON.parse(configString) as TextSearchOptions;

        await simpleTextSearch({ ...config, searchDir });
    } catch (error) {
        console.error(error);
    }
})();
