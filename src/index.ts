import { getConvarString } from './nativeUtils';
import { textSearch, fileSearch } from './ripgrep';
import chalk from 'chalk';

const MAX_LINE_LENGTH = 200;

const highlightMatches = (text: string, matchTexts: string[]) => {
    let result = text;
    for (const matchText of matchTexts) {
        result = result.replaceAll(matchText, chalk.red(matchText));
    }
    return result;
};


const testTextSearch = async (searchDir: string) => {
    console.log('\n=== Text Search Test ===');
    const result = await textSearch({
        searchDir,
        pattern: 'GetResourcePath',
        includes: ['*.js', '*.cjs', '*.lua'],
        excludes: ['node_modules/**'],
        contextLines: 2,
    });
    console.log(`Found ${result.results.length} matches (limitHit: ${result.limitHit})`);

    // for (const match of result.results) {
    //     console.log(match);
    // }

    for (const match of result.results) {
        // console.log(match); continue;
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

(async () => {
    try {
        const testPath = getConvarString('ripgrepScanner_testPath');
        if (!testPath) {
            console.error('ripgrepScanner_testPath is not set');
            return;
        }
        await testTextSearch(testPath);
    } catch (error) {
        console.error(error);
    }
})();
