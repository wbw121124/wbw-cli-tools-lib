import { CliTools } from '../dist/esm/index.js';

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, name) {
  total++;
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
  }
}

function captureOutput(fn) {
  const output = [];
  const origWrite = process.stdout.write;
  process.stdout.write = (chunk) => {
    output.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = origWrite;
  }
  return output.join('');
}

// ═══════════════════════════════════════════
//  displayTable 格式B（简单格式）
// ═══════════════════════════════════════════

console.log('\n[测试1] displayTable 格式B - 简单 headers + rows');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayTable({
      headers: ['Name', 'Age', 'City'],
      rows: [
        ['Alice', 30, 'Beijing'],
        ['Bob', 25, 'Shanghai'],
      ],
    });
  });
  assert(out.includes('Name'), '表头包含 Name');
  assert(out.includes('Alice'), '数据行包含 Alice');
  assert(out.includes('30'), '数据行包含 30');
  assert(out.includes('┌'), '包含左上角边框');
  assert(out.includes('└'), '包含左下角边框');
  assert(out.includes('│'), '包含竖线分隔符');
  assert(out.includes('┬'), '包含顶部连接符');
}

// ═══════════════════════════════════════════
//  displayTable 格式B + footer
// ═══════════════════════════════════════════

console.log('\n[测试2] displayTable 格式B - 带 footer');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayTable({
      headers: ['A', 'B'],
      rows: [['1', '2']],
      footer: '(1 rows)',
    });
  });
  assert(out.includes('(1 rows)'), 'footer 显示正确');
}

// ═══════════════════════════════════════════
//  displayTable 格式A（对象数组）
// ═══════════════════════════════════════════

console.log('\n[测试3] displayTable 格式A - 对象数组 + 列定义');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayTable({
      columns: [
        { key: 'name', label: '名称', align: 'left' },
        { key: 'ver', label: '版本', align: 'center' },
      ],
      rows: [
        { name: 'cli-tools', ver: '1.0.0' },
        { name: 'utils', ver: '2.3.1' },
      ],
    });
  });
  assert(out.includes('cli-tools'), '数据行包含 cli-tools');
  assert(out.includes('1.0.0'), '数据行包含 1.0.0');
  assert(out.includes('├'), '包含中间分隔符');
  assert(out.includes('┼'), '包含十字连接符');
}

// ═══════════════════════════════════════════
//  displayTable 格式A + row_count
// ═══════════════════════════════════════════

console.log('\n[测试4] displayTable 格式A - row_count');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayTable({
      columns: [{ key: 'id', label: 'ID' }],
      rows: [{ id: 1 }, { id: 2 }],
      row_count: 2,
    });
  });
  assert(out.includes('(2 rows)'), 'row_count 显示正确');
}

// ═══════════════════════════════════════════
//  displayTable 格式A - maxColWidth
// ═══════════════════════════════════════════

console.log('\n[测试5] displayTable 格式A - maxColWidth 截断');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayTable({
      columns: [{ key: 'long', label: 'LongText', width: 5 }],
      rows: [{ long: 'This is a very long text that should be truncated' }],
      maxColWidth: 10,
    });
  });
  assert(out.includes('...'), '超宽文本被截断并包含 ...');
}

// ═══════════════════════════════════════════
//  displayTable 链式调用
// ═══════════════════════════════════════════

console.log('\n[测试6] displayTable 链式调用');
{
  const cli = CliTools.create({ commandName: 'test' });
  const result = cli.displayTable({ headers: ['X'], rows: [['Y']] });
  assert(result === cli, 'displayTable 返回 this');
}

// ═══════════════════════════════════════════
//  displayJSON 基础
// ═══════════════════════════════════════════

console.log('\n[测试7] displayJSON 基础');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayJSON({ name: 'test', version: '1.0.0' });
  });
  assert(out.includes('test'), 'JSON 包含值');
  assert(out.includes('1.0.0'), 'JSON 包含版本号');
  assert(out.includes('{'), 'JSON 包含左大括号');
  assert(out.includes('}'), 'JSON 包含右大括号');
}

// ═══════════════════════════════════════════
//  displayJSON 无颜色
// ═══════════════════════════════════════════

console.log('\n[测试8] displayJSON 无颜色');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayJSON({ key: 'value' }, { colors: false });
  });
  assert(out.includes('"key"'), '无颜色模式包含 key');
  assert(out.includes('"value"'), '无颜色模式包含 value');
}

// ═══════════════════════════════════════════
//  displayJSON 自定义缩进
// ═══════════════════════════════════════════

console.log('\n[测试9] displayJSON 自定义缩进');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out2 = captureOutput(() => {
    cli.displayJSON({ a: 1 }, { indent: 4 });
  });
  assert(out2.includes('    '), '4 空格缩进');
}

// ═══════════════════════════════════════════
//  displayJSON 链式调用
// ═══════════════════════════════════════════

console.log('\n[测试10] displayJSON 链式调用');
{
  const cli = CliTools.create({ commandName: 'test' });
  const result = cli.displayJSON({ ok: true });
  assert(result === cli, 'displayJSON 返回 this');
}

// ═══════════════════════════════════════════
//  displayJSON 嵌套对象
// ═══════════════════════════════════════════

console.log('\n[测试11] displayJSON 嵌套对象');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayJSON({ a: { b: { c: 123 } } }, { colors: false });
  });
  assert(out.includes('123'), '嵌套对象正确显示');
}

// ═══════════════════════════════════════════
//  setPrompt / prompt
// ═══════════════════════════════════════════

console.log('\n[测试12] setPrompt');
{
  const cli = CliTools.create({ commandName: 'test' });
  const rl = cli.getReadlineInterface();
  const result = cli.setPrompt('> ');
  assert(result === cli, 'setPrompt 返回 this');
  assert(rl.getPrompt() === '> ', '提示符设置成功');
  cli.closeReadline();
}

// ═══════════════════════════════════════════
//  get readlineLine / readlineCursor
// ═══════════════════════════════════════════

console.log('\n[测试13] readlineLine / readlineCursor');
{
  const cli = CliTools.create({ commandName: 'test' });
  cli.getReadlineInterface();
  assert(typeof cli.readlineLine === 'string', 'readlineLine 是字符串');
  assert(typeof cli.readlineCursor === 'number', 'readlineCursor 是数字');
  cli.closeReadline();
}

// ═══════════════════════════════════════════
//  createCustomReadline
// ═══════════════════════════════════════════

console.log('\n[测试14] createCustomReadline');
{
  const cli = CliTools.create({ commandName: 'test' });
  const custom = cli.createCustomReadline({ prompt: 'custom> ' });
  assert(custom !== null, 'createCustomReadline 返回接口');
  assert(typeof custom.question === 'function', '接口有 question 方法');
  assert(typeof custom.close === 'function', '接口有 close 方法');
  custom.close();
  cli.closeReadline();
}

// ═══════════════════════════════════════════
//  ANSI clearCurrentLine
// ═══════════════════════════════════════════

console.log('\n[测试15] clearCurrentLine');
{
  const cli = CliTools.create({ commandName: 'test' });
  const result = cli.clearCurrentLine();
  assert(result === cli, 'clearCurrentLine 返回 this');
}

// ═══════════════════════════════════════════
//  ANSI moveToColumn
// ═══════════════════════════════════════════

console.log('\n[测试16] moveToColumn');
{
  const cli = CliTools.create({ commandName: 'test' });
  let written = '';
  const origWrite = process.stdout.write;
  process.stdout.write = (chunk) => { written += chunk.toString(); return true; };
  try {
    cli.moveToColumn(10);
  } finally {
    process.stdout.write = origWrite;
  }
  assert(written.includes('\x1b[10G'), 'moveToColumn 输出正确 ANSI');
  assert(cli.moveToColumn(1) === cli, 'moveToColumn 返回 this');
}

// ═══════════════════════════════════════════
//  ANSI moveUp / moveDown
// ═══════════════════════════════════════════

console.log('\n[测试17] moveUp / moveDown');
{
  const cli = CliTools.create({ commandName: 'test' });
  let written = '';
  const origWrite = process.stdout.write;
  process.stdout.write = (chunk) => { written += chunk.toString(); return true; };
  try {
    cli.moveUp();
    cli.moveDown(3);
  } finally {
    process.stdout.write = origWrite;
  }
  assert(written.includes('\x1b[A'), 'moveUp 默认输出 \\x1b[A');
  assert(written.includes('\x1b[3B'), 'moveDown(3) 输出 \\x1b[3B');
  assert(cli.moveUp() === cli, 'moveUp 返回 this');
  assert(cli.moveDown() === cli, 'moveDown 返回 this');
}

// ═══════════════════════════════════════════
//  ANSI moveCursorTo
// ═══════════════════════════════════════════

console.log('\n[测试18] moveCursorTo');
{
  const cli = CliTools.create({ commandName: 'test' });
  let written = '';
  const origWrite = process.stdout.write;
  process.stdout.write = (chunk) => { written += chunk.toString(); return true; };
  try {
    cli.moveToColumn(1);
  } finally {
    process.stdout.write = origWrite;
  }
  assert(written.includes('\x1b[1G'), 'moveToColumn(1) 输出 \\x1b[1G');
}

// ═══════════════════════════════════════════
//  spinnerUpdate
// ═══════════════════════════════════════════

console.log('\n[测试19] spinnerUpdate');
{
  const cli = CliTools.create({ commandName: 'test' });
  cli.spinnerStart('加载中');
  const result = cli.spinnerUpdate('新文本');
  assert(result === cli, 'spinnerUpdate 返回 this');
  cli.spinnerSucceed();
}

// ═══════════════════════════════════════════
//  spinnerProgress
// ═══════════════════════════════════════════

console.log('\n[测试20] spinnerProgress');
{
  const cli = CliTools.create({ commandName: 'test' });
  cli.spinnerStart('处理中');
  const result = cli.spinnerProgress(50, 100, '处理中');
  assert(result === cli, 'spinnerProgress 返回 this');
  cli.spinnerSucceed('完成');
}

// ═══════════════════════════════════════════
//  spinnerProgress 边界值
// ═══════════════════════════════════════════

console.log('\n[测试21] spinnerProgress 边界值');
{
  const cli = CliTools.create({ commandName: 'test' });
  cli.spinnerStart('加载中');
  const result0 = cli.spinnerProgress(0, 100);
  assert(result0 === cli, 'spinnerProgress(0) 返回 this');
  const result100 = cli.spinnerProgress(100, 100);
  assert(result100 === cli, 'spinnerProgress(100) 返回 this');
  cli.spinnerSucceed();
}

// ═══════════════════════════════════════════
//  silent / isSilent
// ═══════════════════════════════════════════

console.log('\n[测试22] silent / isSilent');
{
  const cli = CliTools.create({ commandName: 'test' });
  assert(!cli.isSilent(), '初始非静默');
  const result = cli.silent();
  assert(result === cli, 'silent 返回 this');
  assert(cli.isSilent(), '静默模式已启用');
}

// ═══════════════════════════════════════════
//  silent 后输出被忽略
// ═══════════════════════════════════════════

console.log('\n[测试23] silent 模式输出被忽略');
{
  const cli = CliTools.create({ commandName: 'test' });
  cli.silent();
  let output = '';
  const origWrite = process.stdout.write;
  process.stdout.write = (chunk) => { output += chunk.toString(); return true; };
  try {
    cli.print('隐藏文本');
  } finally {
    process.stdout.write = origWrite;
  }
  assert(!output.includes('隐藏文本'), '静默模式下 print 不输出');
}

// ═══════════════════════════════════════════
//  setLogger
// ═══════════════════════════════════════════

console.log('\n[测试24] setLogger');
{
  const cli = CliTools.create({ commandName: 'test' });
  let logged = '';
  const result = cli.setLogger({
    level: 'info',
    log: (...args) => { logged = args.join(' '); },
  });
  assert(result === cli, 'setLogger 返回 this');
  cli.print('自定义输出');
  assert(logged.includes('自定义输出'), '自定义日志器接收输出');
}

// ═══════════════════════════════════════════
//  setOutput
// ═══════════════════════════════════════════

console.log('\n[测试25] setOutput');
{
  const cli = CliTools.create({ commandName: 'test' });
  let written = '';
  const fakeStream = {
    write: (chunk) => { written += chunk.toString(); return true; },
  };
  const result = cli.setOutput(fakeStream);
  assert(result === cli, 'setOutput 返回 this');
  cli.print('流输出测试');
  assert(written.includes('流输出测试'), '输出重定向到流');
}

// ═══════════════════════════════════════════
//  chalk getter
// ═══════════════════════════════════════════

console.log('\n[测试26] chalk getter');
{
  const cli = CliTools.create({ commandName: 'test' });
  assert(typeof cli.chalk === 'function', 'chalk 是函数');
  assert(typeof cli.chalk.red === 'function', 'chalk.red 是函数');
  assert(typeof cli.chalk.green === 'function', 'chalk.green 是函数');
  assert(typeof cli.chalk.bold === 'function', 'chalk.bold 是函数');
}

// ═══════════════════════════════════════════
//  color 方法
// ═══════════════════════════════════════════

console.log('\n[测试27] color 方法');
{
  const cli = CliTools.create({ commandName: 'test' });
  const result = cli.color('红色文本', 'red');
  assert(result === cli, 'color 返回 this');
}

// ═══════════════════════════════════════════
//  color 方法 - 未知颜色名
// ═══════════════════════════════════════════

console.log('\n[测试28] color 方法 - 未知颜色名');
{
  const cli = CliTools.create({ commandName: 'test' });
  let output = '';
  const origWrite = process.stdout.write;
  process.stdout.write = (chunk) => { output += chunk.toString(); return true; };
  try {
    cli.color('测试', 'notAColor');
  } finally {
    process.stdout.write = origWrite;
  }
  assert(output.includes('测试'), '未知颜色名仍输出文本');
}

// ═══════════════════════════════════════════
//  链式组合
// ═══════════════════════════════════════════

console.log('\n[测试29] 链式组合调用');
{
  const cli = CliTools.create({ commandName: 'test' });
  const result = cli
    .displayJSON({ a: 1 }, { colors: false })
    .displayTable({ headers: ['X'], rows: [['Y']] })
    .moveToColumn(1)
    .moveUp()
    .moveDown();
  assert(result === cli, '链式调用返回 this');
}

// ═══════════════════════════════════════════
//  displayJSON 空数据
// ═══════════════════════════════════════════

console.log('\n[测试30] displayJSON 空对象');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayJSON({}, { colors: false });
  });
  assert(out.includes('{}'), '空对象显示 {}');
}

// ═══════════════════════════════════════════
//  displayJSON 数组
// ═══════════════════════════════════════════

console.log('\n[测试31] displayJSON 数组');
{
  const cli = CliTools.create({ commandName: 'test' });
  let out = '';
  const origWrite = process.stdout.write;
  process.stdout.write = (chunk) => { out += chunk.toString(); return true; };
  try {
    cli.displayJSON([1, 2, 3], { colors: false });
  } finally {
    process.stdout.write = origWrite;
  }
  assert(out.includes('1') && out.includes('2') && out.includes('3'), '数组元素正确显示');
}

// ═══════════════════════════════════════════
//  displayTable 空行
// ═══════════════════════════════════════════

console.log('\n[测试32] displayTable 格式B - 空行');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayTable({
      headers: ['A', 'B'],
      rows: [],
    });
  });
  assert(out.includes('A'), '空表格仍显示表头');
}

// ═══════════════════════════════════════════
//  displayTable 空格对齐
// ═══════════════════════════════════════════

console.log('\n[测试33] displayTable 对齐');
{
  const cli = CliTools.create({ commandName: 'test' });
  const out = captureOutput(() => {
    cli.displayTable({
      columns: [
        { key: 'a', label: 'A', align: 'right', width: 10 },
        { key: 'b', label: 'B', align: 'center', width: 10 },
      ],
      rows: [{ a: '1', b: '2' }],
    });
  });
  assert(out.includes('│'), '对齐表格包含竖线');
}

// ═══════════════════════════════════════════
//  移动光标方法不抛异常
// ═══════════════════════════════════════════

console.log('\n[测试34] ANSI 方法不抛异常');
{
  const cli = CliTools.create({ commandName: 'test' });
  let ok = true;
  try {
    cli.clearCurrentLine();
    cli.moveToColumn(1);
    cli.moveUp(1);
    cli.moveDown(1);
    cli.moveCursorTo(1, 1);
  } catch (e) {
    ok = false;
  }
  assert(ok, '所有 ANSI 方法不抛异常');
}

// ═══════════════════════════════════════════
//  汇总
// ═══════════════════════════════════════════

console.log('\n══════════════════════════════════════════');
console.log(`  通过: ${passed}/${total}  失败: ${failed}/${total}`);
console.log('══════════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);
