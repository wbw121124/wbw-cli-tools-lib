import { EventEmitter } from '../dist/esm/index.js';

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

console.log('\n[测试1] 基础 API');
const em1 = new EventEmitter();
let onCalled = 0;
em1.on('test', () => onCalled++);
em1.emit('test', undefined);
assert(onCalled === 1, 'on + emit 触发一次');
em1.emit('test', undefined);
assert(onCalled === 2, '第二次 emit 触发');

console.log('\n[测试2] once');
const em2 = new EventEmitter();
let onceCount = 0;
em2.once('click', () => onceCount++);
em2.emit('click', undefined);
em2.emit('click', undefined);
assert(onceCount === 1, 'once 只触发一次');

console.log('\n[测试3] off');
const em3 = new EventEmitter();
let offCount = 0;
const handler = () => offCount++;
em3.on('data', handler);
em3.emit('data', undefined);
em3.off('data', handler);
em3.emit('data', undefined);
assert(offCount === 1, 'off 后不再触发');

console.log('\n[测试4] removeAllListeners');
const em4 = new EventEmitter();
let raCount = 0;
em4.on('a', () => raCount++);
em4.on('b', () => raCount++);
em4.removeAllListeners('a');
em4.emit('a', undefined);
em4.emit('b', undefined);
assert(raCount === 1, 'removeAllListeners 只移除指定事件');

const em4b = new EventEmitter();
em4b.on('x', () => {});
em4b.on('y', () => {});
em4b.removeAllListeners();
assert(em4b.listenerCount('x') === 0, 'removeAllListeners() 清空所有');
assert(em4b.listenerCount('y') === 0, '清空 y 也成功');

console.log('\n[测试5] listenerCount / listeners');
const em5 = new EventEmitter();
em5.on('e1', () => {});
em5.on('e1', () => {});
em5.on('e2', () => {});
assert(em5.listenerCount('e1') === 2, 'listenerCount 返回正确数量');
assert(em5.listeners('e1').length === 2, 'listeners 返回正确数组');
assert(em5.listeners('e2').length === 1, 'listeners e2 返回 1');

console.log('\n[测试6] eventNames / hasListeners');
const em6 = new EventEmitter();
assert(em6.eventNames().length === 0, '空 emitter 无事件');
em6.on('foo', () => {});
em6.on('bar', () => {});
assert(em6.eventNames().length === 2, 'eventNames 返回 2 个');
assert(em6.hasListeners('foo') === true, 'hasListeners foo 为 true');
assert(em6.hasListeners('baz') === false, 'hasListeners baz 为 false');

console.log('\n[测试7] prependListener');
const em7 = new EventEmitter();
const order = [];
em7.on('task', () => order.push('normal'));
em7.prependListener('task', () => order.push('first'));
em7.emit('task', undefined);
assert(order[0] === 'first', 'prepend 先执行');
assert(order[1] === 'normal', 'normal 后执行');

console.log('\n[测试8] 通配符');
const em8 = new EventEmitter();
const wcEvents = [];
em8.addWildcardListener((event, data) => wcEvents.push({ event, data }));
em8.emit('build', 'v1');
em8.emit('test', 'ok');
assert(wcEvents.length === 2, '通配符触发 2 次');
assert(wcEvents[0].event === 'build', '第一个事件是 build');
assert(wcEvents[1].data === 'ok', '第二个数据是 ok');

const em8b = new EventEmitter();
let wcOnce = 0;
em8b.addOnceWildcardListener(() => wcOnce++);
em8b.emit('a', undefined);
em8b.emit('b', undefined);
assert(wcOnce === 1, '一次性通配符只触发一次');

console.log('\n[测试9] 优先级');
const em9 = new EventEmitter();
const priOrder = [];
em9.on('task', () => priOrder.push('low'), { priority: 1 });
em9.on('task', () => priOrder.push('high'), { priority: 10 });
em9.on('task', () => priOrder.push('mid'), { priority: 5 });
em9.emit('task', undefined);
assert(priOrder[0] === 'high', '优先级 high 先执行');
assert(priOrder[1] === 'mid', '优先级 mid 第二');
assert(priOrder[2] === 'low', '优先级 low 最后');

console.log('\n[测试10] 事件历史');
const em10 = new EventEmitter({ maxHistory: 3 });
em10.emit('d', 1);
em10.emit('d', 2);
em10.emit('d', 3);
em10.emit('d', 4);
const h = em10.getHistory();
assert(h.length === 3, '历史记录限制为 3');
assert(h[0].data === 2, '最早记录是 2');
assert(h[2].data === 4, '最新记录是 4');

em10.clearHistory('d');
assert(em10.getHistory('d').length === 0, 'clearHistory 清空指定事件');
assert(em10.getHistory().length === 0, '全部清空');

console.log('\n[测试11] 重放历史');
const em11 = new EventEmitter();
const replayData = [];
em11.on('e', (d) => replayData.push(d));
em11.emit('e', 'a');
em11.emit('e', 'b');
em11.emit('e', 'c');
replayData.length = 0;
em11.replayHistory({ count: 2 });
assert(replayData.length === 2, 'replayHistory 重放 2 条');
assert(replayData[0] === 'b', '重放第一条是 b');
assert(replayData[1] === 'c', '重放第二条是 c');

console.log('\n[测试12] 中间件');
const em12 = new EventEmitter();
const mwLog = [];
em12.use((event, data, next) => {
  mwLog.push(`before:${event}`);
  next();
  mwLog.push(`after:${event}`);
});
em12.on('action', () => mwLog.push('handler'));
em12.emit('action', undefined);
assert(mwLog[0] === 'before:action', '中间件 before');
assert(mwLog[1] === 'handler', 'handler 执行');
assert(mwLog[2] === 'after:action', '中间件 after');

console.log('\n[测试13] 条件监听');
const em13 = new EventEmitter();
let condHit = 0;
em13.onWhen('msg', (data) => data.includes('err'), () => condHit++);
em13.emit('msg', 'all good');
assert(condHit === 0, '不满足条件不触发');
em13.emit('msg', 'error occurred');
assert(condHit === 1, '满足条件触发');

console.log('\n[测试14] 命名空间');
const em14 = new EventEmitter();
const ns = em14.namespace('build');
const nsEvents = [];
em14.on('build:start', (d) => nsEvents.push(`parent:${d}`));
ns.on('start', (d) => nsEvents.push(`child:${d}`));
ns.emit('start', 'v1');
assert(nsEvents.length === 2, '命名空间 emit 触发父和子');
assert(nsEvents.includes('parent:v1'), '父级收到事件');
assert(nsEvents.includes('child:v1'), '子级收到事件');

console.log('\n[测试15] dispose');
const em15 = new EventEmitter();
em15.on('x', () => {});
em15.dispose();
assert(em15.disposed === true, 'disposed 为 true');
assert(em15.listenerCount('x') === 0, 'dispose 清空监听器');
let errorCaught = false;
try {
  em15.on('y', () => {});
} catch {
  errorCaught = true;
}
assert(errorCaught === true, 'dispose 后操作抛错');

console.log('\n[测试16] CliTools 事件管理器');
const { CliTools } = await import('../dist/esm/index.js');
const cli = CliTools.create({ commandName: 'test', color: false, cursor: false });

let cliOnce = 0;
cli.once('init', () => cliOnce++);
cli.emit('init', undefined);
cli.emit('init', undefined);
assert(cliOnce === 1, 'CliTools once 只触发一次');

assert(typeof cli.listenerCount('init') === 'number', 'CliTools listenerCount 可用');
assert(Array.isArray(cli.eventNames()), 'CliTools eventNames 可用');
assert(typeof cli.hasListeners('init') === 'boolean', 'CliTools hasListeners 可用');

let cliPrepend = 0;
cli.prependListener('init', () => cliPrepend++);
assert(typeof cliPrepend === 'number', 'CliTools prependListener 可用');

cli.addEventMiddleware((event, data, next) => {
  next();
});
assert(typeof cli.addEventMiddleware === 'function', 'CliTools addEventMiddleware 可用');

assert(typeof cli.getEventEmitter() === 'object', 'CliTools getEventEmitter 可用');
assert(typeof cli.removeAllEventListeners === 'function', 'CliTools removeAllEventListeners 可用');

// 汇总
console.log('\n═══════════════════════════════');
console.log(`  通过: ${passed}  失败: ${failed}`);
console.log('═══════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
