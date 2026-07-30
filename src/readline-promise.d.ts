declare module 'readline-promise' {
	import * as readline from 'node:readline';
	import { Interface } from 'node:readline';

	export interface ReadlineInterface extends Interface {
		each(iteratee: (line: string, index: number, lines: string[]) => void): Promise<void>;
		forEach(iteratee: (line: string, index: number, lines: string[]) => void): Promise<void>;
		map<T>(iteratee: (line: string, index: number, lines: string[]) => T): Promise<T[]>;
		reduce<T>(iteratee: (accum: T, line: string, index: number, lines: string[]) => T, accumulator?: T): Promise<T>;
		questionAsync(query: string): Promise<string>;
	}

	export function createInterface(options: readline.ReadLineOptions): ReadlineInterface;
	export function createInterface(input: NodeJS.ReadableStream, output?: NodeJS.WritableStream, completer?: readline.Completer | readline.AsyncCompleter, terminal?: boolean): ReadlineInterface;

	export function cursorTo(stream: NodeJS.WritableStream, x: number, y?: number, callback?: () => void): boolean;
	export function clearLine(stream: NodeJS.WritableStream, dir: number, callback?: () => void): boolean;
	export function moveCursor(stream: NodeJS.WritableStream, dx: number, dy: number, callback?: () => void): boolean;
	export function clearScreenDown(stream: NodeJS.WritableStream, callback?: () => void): boolean;

	const rlp: {
		createInterface: typeof createInterface;
		cursorTo: typeof cursorTo;
		clearLine: typeof clearLine;
		moveCursor: typeof moveCursor;
		clearScreenDown: typeof clearScreenDown;
	};
	export default rlp;
}
