declare module 'readline-promise' {
	import { Interface, ReadLineOptions, Completer, AsyncCompleter } from 'node:readline';

	export interface ReadlinePromiseInterface extends Interface {
		each(iteratee: (line: string, index: number, lines: string[]) => void): Promise<void>;
		forEach(iteratee: (line: string, index: number, lines: string[]) => void): Promise<void>;
		map<T>(iteratee: (line: string, index: number, lines: string[]) => T): Promise<T[]>;
		reduce<T>(iteratee: (accum: T, line: string, index: number, lines: string[]) => T, accumulator?: T): Promise<T>;
		questionAsync(query: string): Promise<string>;
	}

	export interface ReadlinePromiseModule {
		Interface: new (...args: unknown[]) => ReadlinePromiseInterface;
		createInterface(options: ReadLineOptions): ReadlinePromiseInterface;
		createInterface(input: NodeJS.ReadableStream, output?: NodeJS.WritableStream, completer?: Completer | AsyncCompleter, terminal?: boolean): ReadlinePromiseInterface;
		cursorTo(stream: NodeJS.WritableStream, x: number, y?: number, callback?: () => void): boolean;
		clearLine(stream: NodeJS.WritableStream, dir: number, callback?: () => void): boolean;
		moveCursor(stream: NodeJS.WritableStream, dx: number, dy: number, callback?: () => void): boolean;
		clearScreenDown(stream: NodeJS.WritableStream, callback?: () => void): boolean;
	}

	const rlp: ReadlinePromiseModule;
	export default rlp;
}
