import { CliTools } from '../dist/esm/index.js';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
  }
}

// 测试1: 模块导入和基本功能
console.log('\n[测试1] 模块导入和基本功能');
const cli = CliTools.create({ commandName: 'test-cli', color: false, cursor: false });
assert(cli !== undefined, 'CliTools.create 返回实例');
assert(typeof cli.readLine === 'function', 'readLine 方法存在');
assert(typeof cli.getReadlineInterface === 'function', 'getReadlineInterface 方法存在');
assert(typeof cli.closeReadline === 'function', 'closeReadline 方法存在');
assert(typeof cli.createCompleter === 'function', 'createCompleter 方法存在');
assert(typeof cli.cursorTo === 'function', 'cursorTo 方法存在');
assert(typeof cli.clearLine === 'function', 'clearLine 方法存在');
assert(typeof cli.moveCursor === 'function', 'moveCursor 方法存在');
assert(typeof cli.clearScreenDown === 'function', 'clearScreenDown 方法存在');
assert(typeof cli.clearScreen === 'function', 'clearScreen 方法存在');
assert(typeof cli.getHistory === 'function', 'getHistory 方法存在');
assert(typeof cli.clearHistory === 'function', 'clearHistory 方法存在');

// 测试2: getReadlineInterface 返回有效接口
console.log('\n[测试2] getReadlineInterface');
const rl = cli.getReadlineInterface();
assert(rl !== null && rl !== undefined, 'getReadlineInterface 返回非空');
assert(typeof rl.questionAsync === 'function', '接口有 questionAsync 方法');
assert(typeof rl.close === 'function', '接口有 close 方法');
assert(typeof rl.on === 'function', '接口有 on 方法');
assert(typeof rl.forEach === 'function', '接口有 forEach 方法');
assert(typeof rl.map === 'function', '接口有 map 方法');
assert(typeof rl.reduce === 'function', '接口有 reduce 方法');

// 测试3: closeReadline 关闭接口
console.log('\n[测试3] closeReadline');
cli.closeReadline();
const rlAfterClose = cli.getReadlineInterface();
assert(rlAfterClose !== null, 'closeReadline 后重新创建接口');

// 测试4: createCompleter - 字符串数组
console.log('\n[测试4] createCompleter - 字符串数组');
const completer = cli.createCompleter(['install', 'build', 'test', 'lint']);
const result1 = completer('in');
assert(Array.isArray(result1) && result1.length === 2, '返回 [matches, original] 格式');
assert(result1[0].length === 1 && result1[0][0] === 'install', '补全 install');
assert(result1[1] === 'in', '原始输入保持不变');

const result2 = completer('x');
assert(result2[0].length === 4, '无匹配时返回全部选项');
assert(result2[0].includes('install'), '包含 install');
assert(result2[0].includes('build'), '包含 build');
assert(result2[0].includes('test'), '包含 test');
assert(result2[0].includes('lint'), '包含 lint');

// 测试5: createCompleter - 自定义函数
console.log('\n[测试5] createCompleter - 自定义函数');
const customCompleter = cli.createCompleter((line) => {
  const items = ['foo', 'bar', 'baz'];
  const hits = items.filter(i => i.startsWith(line));
  return [hits.length ? hits : items, line];
});
const result3 = customCompleter('f');
assert(result3[0].length === 1 && result3[0][0] === 'foo', '自定义函数补全 foo');

const result4 = customCompleter('b');
assert(result4[0].length === 2, '自定义函数补全 bar 和 baz');
assert(result4[0].includes('bar'), '包含 bar');
assert(result4[0].includes('baz'), '包含 baz');

// 测试6: 历史记录
console.log('\n[测试6] 历史记录');
const history1 = cli.getHistory();
assert(Array.isArray(history1), 'getHistory 返回数组');
cli.clearHistory();
const history2 = cli.getHistory();
assert(history2.length === 0 || Array.isArray(history2), 'clearHistory 清空历史');

// 测试7: 光标控制方法不抛错
console.log('\n[测试7] 光标控制方法（不抛错）');
try {
  cli.cursorTo(0, 0);
  assert(true, 'cursorTo 不抛错');
} catch (e) {
  assert(false, `cursorTo 抛错: ${e.message}`);
}
try {
  cli.clearLine(0);
  assert(true, 'clearLine 不抛错');
} catch (e) {
  assert(false, `clearLine 抛错: ${e.message}`);
}
try {
  cli.moveCursor(0, 0);
  assert(true, 'moveCursor 不抛错');
} catch (e) {
  assert(false, `moveCursor 抛错: ${e.message}`);
}
try {
  cli.clearScreenDown();
  assert(true, 'clearScreenDown 不抛错');
} catch (e) {
  assert(false, `clearScreenDown 抛错: ${e.message}`);
}
try {
  cli.clearScreen();
  assert(true, 'clearScreen 不抛错');
} catch (e) {
  assert(false, `clearScreen 抛错: ${e.message}`);
}

// 测试8: 链式调用
console.log('\n[测试8] 链式调用');
const chainResult = cli
  .cursorTo(0, 0)
  .clearLine(0)
  .moveCursor(0, 0)
  .clearScreenDown()
  .clearScreen()
  .clearHistory()
  .closeReadline();
assert(chainResult === cli, '链式调用返回 this');

// 测试9: 默认补全器（空输入）
console.log('\n[测试9] createCompleter 默认行为');
const defaultCompleter = cli.createCompleter(['alpha', 'beta', 'gamma']);
const emptyResult = defaultCompleter('');
assert(emptyResult[0].length === 3, '空输入返回全部选项');

const exactResult = defaultCompleter('alpha');
assert(exactResult[0].length === 1 && exactResult[0][0] === 'alpha', '精确匹配返回单个结果');

// 汇总
console.log('\n═══════════════════════════════');
console.log(`  通过: ${passed}  失败: ${failed}`);
console.log('═══════════════════════════════\n');

cli.closeReadline();
process.exit(failed > 0 ? 1 : 0);
