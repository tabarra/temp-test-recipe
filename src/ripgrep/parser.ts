import { EventEmitter } from 'node:events';
import { StringDecoder } from 'node:string_decoder';
import { bytesOrTextToString } from './helpers';
import type { RgMessage, TextSearchMatch } from './types';

const DEFAULT_MAX_LINE_LENGTH = 10_000;

//MARK: Parser
export class RipgrepParser extends EventEmitter {
    private remainder = '';
    private isDone = false;
    private hitLimit = false;
    private stringDecoder = new StringDecoder('utf8');
    private numResults = 0;
    private maxLineLength: number;

    // Context handling
    private contextBuffer: string[] = [];
    private pendingMatch: TextSearchMatch | null = null;

    constructor(private maxResults: number, maxLineLength?: number) {
        super();
        this.maxLineLength = maxLineLength ?? DEFAULT_MAX_LINE_LENGTH;
    }

    /** Simple end-truncation for context lines */
    private truncateLine(line: string): string {
        if (line.length <= this.maxLineLength) {
            return line;
        }
        const skipped = line.length - this.maxLineLength;
        return line.substring(0, this.maxLineLength) + `⟪${skipped}⟫`;
    }

    /** Convert a byte offset to a character offset in a UTF-8 string */
    private byteOffsetToCharOffset(line: string, byteOffset: number): number {
        const buffer = Buffer.from(line, 'utf8');
        if (byteOffset >= buffer.length) {
            return line.length;
        }
        // Get the prefix bytes and convert back to string to count characters
        const prefixBytes = buffer.subarray(0, byteOffset);
        return prefixBytes.toString('utf8').length;
    }

    /** Truncation for match lines - skips to the match if needed */
    private truncateMatchLine(line: string, matchStartBytes: number): { text: string; truncated: boolean } {
        if (line.length <= this.maxLineLength) {
            return { text: line, truncated: false };
        }

        // Convert byte offset to character offset
        const matchStart = this.byteOffsetToCharOffset(line, matchStartBytes);
        const margin = 20;

        // If match is near the start, just truncate at the end
        if (matchStart < this.maxLineLength - margin) {
            const skipped = line.length - this.maxLineLength;
            return {
                text: line.substring(0, this.maxLineLength) + `⟪${skipped}⟫`,
                truncated: true,
            };
        }

        // Match is far into the line - skip to it
        const skipTo = Math.max(0, matchStart - margin);
        const endPos = Math.min(line.length, skipTo + this.maxLineLength);
        let text = `⟪${skipTo}⟫` + line.substring(skipTo, endPos);
        
        if (endPos < line.length) {
            text += `⟪${line.length - endPos}⟫`;
        }

        return { text, truncated: true };
    }

    cancel() {
        this.isDone = true;
    }

    flush() {
        this.handleDecodedData(this.stringDecoder.end());
        // Emit any pending match that hasn't been emitted yet
        this.emitPendingMatch();
    }

    handleData(data: Buffer | string) {
        if (this.isDone) return;

        const dataStr = typeof data === 'string'
            ? data
            : this.stringDecoder.write(data);
        this.handleDecodedData(dataStr);
    }

    private handleDecodedData(decodedData: string) {
        let newlineIdx = decodedData.indexOf('\n');
        const dataStr = this.remainder + decodedData;

        if (newlineIdx >= 0) {
            newlineIdx += this.remainder.length;
        } else {
            this.remainder = dataStr;
            return;
        }

        let prevIdx = 0;
        while (newlineIdx >= 0) {
            this.handleLine(dataStr.substring(prevIdx, newlineIdx).trim());
            prevIdx = newlineIdx + 1;
            newlineIdx = dataStr.indexOf('\n', prevIdx);
        }
        this.remainder = dataStr.substring(prevIdx);
    }

    private emitPendingMatch() {
        if (this.pendingMatch) {
            this.numResults++;
            this.emit('result', this.pendingMatch);
            this.pendingMatch = null;

            if (this.numResults >= this.maxResults) {
                this.hitLimit = true;
                this.cancel();
                this.emit('hitLimit');
            }
        }
    }

    private handleLine(outputLine: string) {
        if (this.isDone || !outputLine) return;

        let parsedLine: RgMessage;
        try {
            parsedLine = JSON.parse(outputLine);
        } catch {
            // Skip malformed lines
            return;
        }

        if (parsedLine.type === 'context') {
            const rawLine = bytesOrTextToString(parsedLine.data.lines).replace(/\r?\n$/, '');
            const lineText = this.truncateLine(rawLine);
            if (this.pendingMatch) {
                // Context after a match
                this.pendingMatch.contextAfter ??= [];
                this.pendingMatch.contextAfter.push(lineText);
            } else {
                // Context before a match
                this.contextBuffer.push(lineText);
            }
        } else if (parsedLine.type === 'match') {
            // Emit previous pending match before processing new one
            this.emitPendingMatch();

            const matchPath = bytesOrTextToString(parsedLine.data.path);
            const rawLine = bytesOrTextToString(parsedLine.data.lines).replace(/\r?\n$/, '');
            const lineNumber = parsedLine.data.line_number;
            const firstMatchStart = parsedLine.data.submatches[0]?.start ?? 0;
            const { text: lineText, truncated } = this.truncateMatchLine(rawLine, firstMatchStart);

            const matches = parsedLine.data.submatches.map((submatch) => ({
                text: bytesOrTextToString(submatch.match),
                startCol: submatch.start,
                endCol: submatch.end,
            }));

            const result: TextSearchMatch = {
                filePath: matchPath,
                lineNumber,
                lineText,
                matches,
            };

            if (truncated) {
                result.truncated = true;
            }

            // Attach context before (if any)
            if (this.contextBuffer.length > 0) {
                result.contextBefore = this.contextBuffer;
                this.contextBuffer = [];
            }

            this.pendingMatch = result;
        } else if (parsedLine.type === 'begin' || parsedLine.type === 'end') {
            // File boundary - emit pending match and clear context
            this.emitPendingMatch();
            this.contextBuffer = [];
        }
    }
}
