import { CliTools } from '../dist/esm/index.js';

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

    cli.newline().divider('=', 50).newline();
    cli.printBanner('Done!');
  });

cli.parse();
