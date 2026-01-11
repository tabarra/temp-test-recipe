//MARK: Internal Types
export type RgBytesOrText = { bytes: string } | { text: string };

export type RgMessage = {
    type: 'match';
    data: RgMatch;
} | {
    type: 'context';
    data: RgMatch;
} | {
    type: 'begin' | 'end' | 'summary';
    data: unknown;
};

export type RgMatch = {
    path: RgBytesOrText;
    lines: RgBytesOrText;
    line_number: number;
    absolute_offset: number;
    submatches: RgSubmatch[];
};

export type RgSubmatch = {
    match: RgBytesOrText;
    start: number;
    end: number;
};


//MARK: Public Types
export type TextSearchMatch = {
    filePath: string;
    lineNumber: number;
    lineText: string;
    /** Whether lineText was truncated due to maxLineLength */
    truncated?: boolean;
    matches: Array<{
        text: string;
        startCol: number;
        endCol: number;
    }>;
    /** Context lines before the match (when contextLines option is used) */
    contextBefore?: string[];
    /** Context lines after the match (when contextLines option is used) */
    contextAfter?: string[];
};

export type TextSearchOptions = {
    /** The directory to search in */
    searchDir: string;
    /** Search pattern */
    pattern: string;
    /** Include glob patterns (e.g., ['*.ts', '*.js']) */
    includes?: string[];
    /** Exclude glob patterns (e.g., ['node_modules/**']) */
    excludes?: string[];
    /** Whether the pattern is a regex */
    isRegex?: boolean;
    /** Case sensitive search */
    caseSensitive?: boolean;
    /** Follow symlinks */
    followSymlinks?: boolean;
    /** Use .gitignore files */
    useGitignore?: boolean;
    /** Max results to return */
    maxResults?: number;
    /** Number of context lines before/after match */
    contextLines?: number;
    /** Search hidden files */
    hidden?: boolean;
    /** Number of threads to use */
    numThreads?: number;
    /** Max line length before truncation (default: 10000) */
    maxLineLength?: number;
};

export type FileSearchOptions = {
    /** The directory to search in */
    searchDir: string;
    /** Include glob patterns (e.g., ['*.ts', '*.js']) */
    includes?: string[];
    /** Exclude glob patterns (e.g., ['node_modules/**']) */
    excludes?: string[];
    /** Follow symlinks */
    followSymlinks?: boolean;
    /** Use .gitignore files */
    useGitignore?: boolean;
    /** Max results to return */
    maxResults?: number;
    /** Search hidden files */
    hidden?: boolean;
    /** Number of threads to use */
    numThreads?: number;
};

export type SearchResult<T> = {
    results: T[];
    limitHit: boolean;
};
