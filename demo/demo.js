import { CliTools, EventEmitter } from '../dist/esm/index.js';

const cli = CliTools.create({
  commandName: 'demo-cli',
  commandDescription: 'wbw-cli-tools-lib 演示工具',
  color: true,
  cursor: true,
});

// 监听事件
cli.on('init', () => console.log('[Event] init'));
cli.on('spinner:start', ({ text }) => console.log(`[Event] spinner:start - ${text}`));
cli.on('spinner:stop', () => console.log('[Event] spinner:stop'));
cli.on('prompt:cancel', ({ type }) => console.log(`[Event] prompt:cancel - ${type}`));

cli
  .printBanner('CLI Tools')
  .newline()
  .divider()
  .newline()
  .setVersion('1.0.0')
  .addOption('-n, --name <name>', '你的名字', 'World')
  .addOption('-d, --debug', '调试模式')
  .addOption('-p, --port <port>', '端口号', 3000)
  .onAction(async (opts) => {
    if (opts.debug) {
      cli.spinnerStart('正在处理...');
      await new Promise(r => setTimeout(r, 1000));
      cli.spinnerSucceed('调试模式已开启');
    }

    cli
      .newline()
      .logBold(`你好, ${opts.name}! 端口: ${opts.port}`)
      .success('这是成功消息')
      .info('这是提示消息')
      .warn('这是警告消息')
      .error('这是错误消息')
      .newline();

    cli
      .logRed('红色文本')
      .logGreen('绿色文本')
      .logYellow('黄色文本')
      .logBlue('蓝色文本')
      .logCyan('青色文本')
      .logMagenta('品红文本')
      .logGray('灰色文本')
      .newline();

    const name = await cli.promptInput('请输入你的名字:', { defaultValue: 'wbw' });
    if (name === null) return cli.warn('已取消');
    cli.logWithPrefix('[INPUT]', `你输入了: ${name}`);

    const ok = await cli.promptConfirm('是否继续?');
    if (ok === null || !ok) return cli.warn('已取消');

    const lang = await cli.promptSelect('选择语言:', ['TypeScript', 'JavaScript', 'Python', 'Go']);
    if (lang === null) return cli.warn('已取消');
    cli.success(`你选择了: ${lang}`);

    const features = await cli.promptCheckbox('选择功能:', ['TypeScript', 'ESLint', 'Prettier', 'Husky']);
    if (features === null) return cli.warn('已取消');
    cli.success(`已选择: ${features.join(', ')}`);

    const pwd = await cli.promptPassword('请输入密码:', { minLength: 6 });
    if (pwd === null) return cli.warn('已取消');
    cli.logWithPrefix('[PWD]', `密码长度: ${pwd.length}`);

    // ═══════════════════════════════════════════
    //  Readline 演示
    // ═══════════════════════════════════════════

    cli.newline().divider('=', 50).newline();
    cli.printBanner('Readline Demo');
    cli.info('Readline 演示 - 基于 readline-promise');
    cli.newline();

    // 演示1: 简单 readLine
    cli.logBold('[1] 简单 readline 输入');
    const input1 = await cli.readLine('> ');
    cli.logWithPrefix('[READLINE]', `你输入了: ${input1}`);
    cli.newline();

    // 演示2: Tab 补全
    cli.logBold('[2] Tab 补全演示 (输入时按 Tab)');
    const commands = ['install', 'build', 'test', 'lint', 'publish', 'deploy'];
    const completer = cli.createCompleter(commands);
    const rl = cli.getReadlineInterface({ completer });
    const input2 = await rl.questionAsync('命令> ');
    cli.logWithPrefix('[TAB]', `你选择了: ${input2}`);
    cli.newline();

    // 演示3: 光标控制
    cli.logBold('[3] 光标控制演示');
    cli.print('正在处理...');

    await new Promise(r => setTimeout(r, 500));
    cli.clearLine();
    cli.cursorTo(0);
    cli.print('处理进度: 50%');

    await new Promise(r => setTimeout(r, 500));
    cli.clearLine();
    cli.cursorTo(0);
    cli.print('处理进度: 100%');
    cli.logGreen(' ✓ 完成!');
    cli.newline();

    // 演示4: 清屏
    cli.logBold('[4] 清屏演示 (3秒后清屏)');
    await new Promise(r => setTimeout(r, 3000));
    cli.clearScreen();
    cli.printBanner('Screen Cleared!');
    cli.info('屏幕已清空');
    cli.newline();

    // 演示5: 历史记录
    cli.logBold('[5] 历史记录');
    for (let i = 0; i < 3; i++) {
      await cli.readLine(`输入第 ${i + 1} 条: `);
    }
    const history = cli.getHistory();
    cli.logWithPrefix('[HISTORY]', `共 ${history.length} 条记录`);
    history.forEach((h, i) => cli.print(`  ${i + 1}. ${h}`));
    cli.newline();

    // 清理
    cli.closeReadline();

    // ═══════════════════════════════════════════
    //  EventEmitter 演示
    // ═══════════════════════════════════════════

    cli.newline().divider('=', 50).newline();
    cli.printBanner('EventEmitter Demo');
    cli.info('独立 EventEmitter + CliTools 事件管理器');
    cli.newline();

    // 1. 基础使用
    cli.logBold('[1] 基础事件监听');
    const emitter = new EventEmitter();
    emitter.on('greet', (name) => cli.success(`你好, ${name}!`));
    emitter.emit('greet', 'World');
    cli.newline();

    // 2. once 监听
    cli.logBold('[2] once 只触发一次');
    const onceEmitter = new EventEmitter();
    onceEmitter.once('click', () => cli.info('按钮被点击'));
    onceEmitter.emit('click', undefined);
    onceEmitter.emit('click', undefined);
    cli.logGray('  (第二次 emit 不会触发)');
    cli.newline();

    // 3. 通配符监听
    cli.logBold('[3] 通配符监听');
    const wcEmitter = new EventEmitter();
    wcEmitter.addWildcardListener((event, data) => {
      cli.logGray(`  [wildcard] ${event}: ${data}`);
    });
    wcEmitter.emit('build', 'started');
    wcEmitter.emit('test', 'passed');
    wcEmitter.emit('deploy', 'done');
    cli.newline();

    // 4. 优先级
    cli.logBold('[4] 优先级');
    const priEmitter = new EventEmitter();
    priEmitter.on('task', () => cli.logGray('  低优先级'), { priority: 1 });
    priEmitter.on('task', () => cli.logGray('  高优先级'), { priority: 10 });
    priEmitter.on('task', () => cli.logGray('  默认优先级'));
    priEmitter.emit('task', undefined);
    cli.newline();

    // 5. 事件历史
    cli.logBold('[5] 事件历史');
    const histEmitter = new EventEmitter();
    histEmitter.emit('data', 'first');
    histEmitter.emit('data', 'second');
    histEmitter.emit('data', 'third');
    const history = histEmitter.getHistory();
    cli.info(`  历史记录: ${history.length} 条`);
    history.forEach(h => cli.logGray(`  [${h.event}] ${h.data} @ ${new Date(h.timestamp).toLocaleTimeString()}`));
    cli.newline();

    // 6. 中间件
    cli.logBold('[6] 事件中间件');
    const mwEmitter = new EventEmitter();
    mwEmitter.use((event, data, next) => {
      cli.logGray(`  [middleware] before: ${event}`);
      next();
      cli.logGray(`  [middleware] after: ${event}`);
    });
    mwEmitter.emit('action', 'test');
    cli.newline();

    // 7. 条件监听
    cli.logBold('[7] 条件监听');
    const condEmitter = new EventEmitter();
    condEmitter.onWhen('data', (msg) => msg.includes('error'), (msg) => {
      cli.error(`  捕获错误: ${msg}`);
    });
    condEmitter.emit('data', 'everything is fine');
    cli.logGray('  (无错误，不触发)');
    condEmitter.emit('data', 'something error occurred');
    cli.newline();

    // 8. CliTools 事件管理器新功能
    cli.logBold('[8] CliTools 事件管理器');
    const testCli = CliTools.create({ commandName: 'test', color: false, cursor: false });
    testCli.once('init', () => cli.info('  init 只触发一次'));
    testCli.emit('init', undefined);
    testCli.emit('init', undefined);
    cli.logGray('  (第二次不触发)');
    cli.logWithPrefix('[COUNT]', `spinner:start 监听器: ${testCli.listenerCount('spinner:start')}`);
    cli.logWithPrefix('[NAMES]', `已注册事件: ${testCli.eventNames().join(', ')}`);
    cli.newline();

    cli.newline().divider('=', 50).newline();
    cli.printBanner('Done!');
  });

cli.parse();
