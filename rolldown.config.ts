import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const allDeps = Object.keys({
	...pkg.dependencies,
	...pkg.devDependencies,
});

const externalFn = (id: string) => {
	if (id.startsWith('node:')) return true;
	if (allDeps.includes(id)) return true;
	if (id.startsWith('@inquirer/')) return true;
	return false;
};

export default defineConfig([
	// CJS 构建（压缩）
	{
		input: 'src/index.ts',
		output: {
			dir: 'dist/',
			entryFileNames: 'index.js',
			format: 'cjs',
			exports: 'named',
			sourcemap: true,
			minify: true,
		},
		plugins: [],
		external: externalFn,
	},
	// ESM 构建（压缩 + DTS）
	{
		input: 'src/index.ts',
		output: {
			dir: 'dist/esm/',
			format: 'esm',
			exports: 'named',
			sourcemap: true,
			minify: true,
		},
		plugins: [
			dts({
				tsconfig: 'tsconfig.json',
			}),
		],
		external: externalFn,
	},
]);
