# wbw-cli-tools-lib

CLI 工具库 - 封装 commander、@inquirer/prompts、ora、chalk、figlet、cli-cursor、readline-promise、EventEmitter，提供链式 API、工厂模式、事件系统与插件机制。

## 安装

```bash
npm install wbw-cli-tools-lib
```

## 快速开始

```ts
import { CliTools } from 'wbw-cli-tools-lib';

const cli = CliTools.create({
  commandName: 'my-cli',
  commandDescription: '我的CLI工具',
});

cli
  .printBanner('My App')
  .addOption('-n, --name <name>', '你的名字', 'World')
  .addOption('-d, --debug', '调试模式')
  .addOption('-p, --port <port>', '端口号', 3000)
  .onAction(async (opts) => {
    if (opts.debug) {
      cli.spinnerStart('加载中...');
      await new Promise(r => setTimeout(r, 1000));
      cli.spinnerSucceed('完成!');
    }
    cli.success(`你好, ${opts.name}! 端口: ${opts.port}`);
  });

cli.parse();
```

## 核心特性

### 工厂模式

```ts
const cli = CliTools.create({
  commandName: 'my-cli',
  commandDescription: '描述',
  color: true,
  cursor: true,
  logger: myLogger,
});
```

### 链式 API

```ts
cli
  .setName('my-cli')
  .setVersion('1.0.0')
  .addOption('-d, --debug', '调试模式')
  .success('操作成功')
  .info('提示信息')
  .warn('警告信息')
  .error('错误信息');
```

### 事件系统

```ts
// 监听事件
cli.on('spinner:start', ({ text }) => console.log(`开始: ${text}`));
cli.on('spinner:stop', () => console.log('停止'));
cli.on('prompt:cancel', ({ type }) => console.log(`取消: ${type}`));
cli.on('error', ({ error, context }) => console.error(context, error));

// 取消监听
cli.off('spinner:start', handler);
```

**可用事件：**

| 事件 | 数据 | 说明 |
|------|------|------|
| `init` | `void` | 实例创建后触发 |
| `parse:before` | `void` | 命令解析前触发 |
| `parse:after` | `void` | 命令解析后触发 |
| `spinner:start` | `{ text }` | Spinner 启动 |
| `spinner:stop` | `void` | Spinner 停止 |
| `spinner:succeed` | `{ text? }` | Spinner 成功 |
| `spinner:fail` | `{ text? }` | Spinner 失败 |
| `prompt:before` | `{ type, message }` | Prompt 开始前 |
| `prompt:after` | `{ type, result }` | Prompt 结束后 |
| `prompt:cancel` | `{ type }` | Prompt 被取消 |
| `plugin:load` | `{ name }` | 插件加载 |
| `error` | `{ error, context? }` | 错误发生 |

### 插件系统

```ts
const myPlugin: CliToolsPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  install(cli) {
    cli.on('init', () => console.log('Plugin loaded'));
  },
};

// 注册插件
await cli.use(myPlugin);

// 获取已加载插件
console.log(cli.getPlugins()); // ['my-plugin']
```

### 配置文件加载

```ts
// .myclirc
{ "theme": "dark", "verbose": true }

// 加载配置
const { config, source } = await cli.loadConfig({
  sources: ['.myclirc', 'package.json#myCli'],
  defaults: { theme: 'light', verbose: false },
});

// 获取配置值
const theme = cli.getConfigValue<string>('theme', 'light');
```

### 自定义日志器

```ts
const myLogger: Logger = {
  level: 'info',  // 只显示 info 及以上级别
  log: (...args) => console.log('[LOG]', ...args),
  error: (...args) => console.error('[ERR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  info: (...args) => console.info('[INFO]', ...args),
  debug: (...args) => console.debug('[DEBUG]', ...args),
};

const cli = CliTools.create({ logger: myLogger });
```

### 错误处理

所有 prompt 方法在用户取消时返回 `null`（而非抛出异常）：

```ts
const name = await cli.promptInput('请输入名字:');
if (name === null) {
  cli.warn('已取消');
  return;
}

const lang = await cli.promptSelect('选择语言:', ['TS', 'JS']);
if (lang === null) return;

const pwd = await cli.promptPassword('密码:', { minLength: 6 });
if (pwd === null) return;
```

### 泛型 ChoiceOption

```ts
// 使用对象选项
await cli.promptSelect('选择:', [
  { value: 'ts', name: 'TypeScript' },
  { value: 'js', name: 'JavaScript' },
]);

// 简写（字符串）
await cli.promptSelect('选择:', ['TypeScript', 'JavaScript']);

// 带描述和禁用状态
await cli.promptSelect('选择:', [
  { value: 'ts', name: 'TypeScript', description: '强类型' },
  { value: 'legacy', name: 'Legacy', disabled: '已废弃' },
]);

// checkbox 默认选中
await cli.promptCheckbox('选择功能:', [
  { value: 'eslint', name: 'ESLint', checked: true },
  { value: 'prettier', name: 'Prettier' },
]);
```

### Readline（基于 readline-promise）

集成 `readline-promise` 模块，提供 Promise 化的 readline 接口、Tab 补全、光标控制和历史记录功能。

```ts
// 简单输入
const name = await cli.readLine('请输入你的名字: ');
cli.success(`你好, ${name}!`);

// Tab 补全（PowerShell 风格）
const commands = ['install', 'build', 'test', 'lint', 'publish'];
const completer = cli.createCompleter(commands);
const rl = cli.getReadlineInterface({ completer });
const cmd = await rl.questionAsync('命令> '); // 输入时按 Tab 补全
cli.closeReadline();

// 光标控制
cli.cursorTo(0, 0);       // 移动光标到绝对位置
cli.clearLine();           // 清除当前行
cli.moveCursor(0, -1);    // 光标上移一行
cli.clearScreenDown();     // 清除光标以下内容
cli.clearScreen();         // 清屏

// 历史记录
const history = cli.getHistory();  // 获取历史记录
cli.clearHistory();                // 清空历史记录
```

### EventEmitter（独立事件管理器）

独立的类型安全事件发射器，支持完整版功能：on/once/off/emit、通配符、优先级、事件历史、中间件、条件监听、命名空间。

```ts
import { EventEmitter } from 'wbw-cli-tools-lib';

// 基础使用
const emitter = new EventEmitter<{ error: Error; data: string }>();
emitter.on('error', (err) => console.error(err));
emitter.emit('error', new Error('fail'));

// once 监听
emitter.once('data', (msg) => console.log('只触发一次'));
emitter.emit('data', 'hello');  // 触发
emitter.emit('data', 'world');  // 不触发

// 通配符（监听所有事件）
emitter.addWildcardListener((event, data) => {
  console.log(`[${event}]`, data);
});

// 优先级（数值越大越先执行）
emitter.on('task', () => console.log('高优先级'), { priority: 10 });
emitter.on('task', () => console.log('低优先级'), { priority: 1 });

// 事件历史
emitter.emit('data', 'first');
emitter.getHistory();           // [{ event: 'data', data: 'first', timestamp: ... }]
emitter.clearHistory();
emitter.replayHistory({ count: 5 }); // 重放最近 5 条

// 中间件（洋葱模型）
emitter.use((event, data, next) => {
  console.log(`before: ${event}`);
  next();
  console.log(`after: ${event}`);
});

// 条件监听
emitter.onWhen('data', (msg) => msg.includes('error'), (msg) => {
  console.log('捕获错误:', msg);
});

// 命名空间
const build = emitter.namespace('build');
build.on('start', handler);     // 实际监听 'build:start'
build.emit('start', data);      // 实际触发 'build:start'

// 销毁
emitter.dispose();
```

### CliTools 事件管理器增强

CliTools 内部已集成 EventEmitter，新增以下公开 API：

```ts
cli.once('init', () => console.log('只触发一次'));
cli.emit('custom:event', { value: 42 });
cli.listenerCount('spinner:start');
cli.listeners('error');
cli.eventNames();
cli.hasListeners('init');
cli.prependListener('init', handler);
cli.addWildcardListener((event, data) => {});
cli.addEventMiddleware((event, data, next) => { next(); });
cli.onEventWhen('data', (msg) => msg.includes('err'), handler);
cli.getEventHistory();
cli.clearEventHistory();
cli.replayEventHistory({ count: 5 });
cli.getEventEmitter();          // 获取底层 EventEmitter 实例
cli.removeAllEventListeners();  // 清空所有监听器
```

## API 列表

### 工厂方法

| 方法 | 说明 |
|------|------|
| `CliTools.create(options?)` | 创建实例 |

### Commander

| 方法 | 说明 |
|------|------|
| `setName(name)` | 设置命令名称 |
| `setVersion(version)` | 设置版本号 |
| `setDescription(desc)` | 设置描述 |
| `addOption(flags, desc, default?)` | 添加选项 |
| `addArgument(name, desc)` | 添加参数 |
| `addCommand(name, desc, action)` | 注册子命令 |
| `onAction(callback)` | 设置主回调 |
| `parse(argv?)` | 解析参数 |
| `parseAsync(argv?)` | 异步解析 |
| `getProgram()` | 获取 Commander 实例 |

### Inquirer Prompts

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `promptInput(msg, opts?)` | `string \| null` | 文本输入 |
| `promptConfirm(msg, default?)` | `boolean \| null` | 确认提示 |
| `promptSelect(msg, choices)` | `string \| null` | 列表选择 |
| `promptCheckbox(msg, choices)` | `string[] \| null` | 多选 |
| `promptPassword(msg, opts?)` | `string \| null` | 密码输入 |

### Readline

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getReadlineInterface(opts?)` | `ReadlineInterface` | 获取 readline 接口（懒加载） |
| `readLine(prompt?)` | `Promise<string>` | 读取一行输入 |
| `createCompleter(options)` | `ReadlineCompleter` | 创建 Tab 补全器 |
| `closeReadline()` | `this` | 关闭 readline 接口 |
| `cursorTo(x, y?)` | `this` | 光标移到绝对位置 |
| `clearLine(dir?)` | `this` | 清除当前行 |
| `moveCursor(dx, dy)` | `this` | 光标相对移动 |
| `clearScreenDown()` | `this` | 清除光标以下内容 |
| `clearScreen()` | `this` | 清屏 |
| `getHistory()` | `string[]` | 获取历史记录 |
| `clearHistory()` | `this` | 清空历史记录 |

### EventEmitter（独立）

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `on(event, handler, opts?)` | `this` | 监听事件 |
| `once(event, handler, opts?)` | `this` | 监听一次 |
| `off(event, handler)` | `this` | 移除监听 |
| `emit(event, data)` | `boolean` | 触发事件 |
| `removeAllListeners(event?)` | `this` | 移除所有监听器 |
| `listenerCount(event)` | `number` | 监听器数量 |
| `listeners(event)` | `EventHandler[]` | 获取监听器列表 |
| `eventNames()` | `(keyof T)[]` | 已注册事件名 |
| `hasListeners(event)` | `boolean` | 是否有监听器 |
| `prependListener(event, handler)` | `this` | 添加到队列头部 |
| `addWildcardListener(handler)` | `this` | 通配符监听 |
| `addOnceWildcardListener(handler)` | `this` | 一次性通配符 |
| `offWildcardListener(handler)` | `this` | 移除通配符 |
| `use(middleware)` | `this` | 注册中间件 |
| `onWhen(event, condition, handler)` | `this` | 条件监听 |
| `namespace(ns)` | `EventEmitter` | 命名空间子发射器 |
| `getHistory(event?)` | `EventHistoryEntry[]` | 获取历史记录 |
| `clearHistory(event?)` | `this` | 清空历史记录 |
| `replayHistory(opts?)` | `this` | 重放历史记录 |
| `dispose()` | `void` | 销毁发射器 |

### CliTools 事件管理器增强

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `once(event, handler)` | `this` | 监听一次 |
| `emit(event, data?)` | `boolean` | 公开触发事件 |
| `listenerCount(event)` | `number` | 监听器数量 |
| `listeners(event)` | `EventHandler[]` | 获取监听器 |
| `eventNames()` | `(keyof T)[]` | 已注册事件名 |
| `hasListeners(event)` | `boolean` | 是否有监听器 |
| `prependListener(event, handler)` | `this` | 添加到队列头部 |
| `addWildcardListener(handler)` | `this` | 通配符监听 |
| `offWildcardListener(handler)` | `this` | 移除通配符 |
| `addEventMiddleware(middleware)` | `this` | 事件中间件 |
| `onEventWhen(event, cond, handler)` | `this` | 条件监听 |
| `getEventHistory(event?)` | `EventHistoryEntry[]` | 获取历史 |
| `clearEventHistory(event?)` | `this` | 清空历史 |
| `replayEventHistory(opts?)` | `this` | 重放历史 |
| `getEventEmitter()` | `EventEmitter` | 获取底层实例 |
| `removeAllEventListeners(event?)` | `this` | 清空所有监听器 |

### Spinner

| 方法 | 说明 |
|------|------|
| `spinnerStart(text, opts?)` | 启动 Spinner |
| `spinnerStop()` | 停止 |
| `spinnerSucceed(text?)` | 成功状态 |
| `spinnerFail(text?)` | 失败状态 |
| `spinnerWarn(text?)` | 警告状态 |
| `spinnerInfo(text?)` | 信息状态 |
| `spinnerPersist(symbol?, text?)` | 持久化 |
| `spinnerText(text)` | 更新文本 |
| `getSpinner()` | 获取实例 |

### 颜色输出

| 方法 | 说明 |
|------|------|
| `logRed/Green/Yellow/Blue/Cyan/Magenta/White/Gray(text)` | 彩色输出 |
| `logBold(text)` | 加粗 |
| `logUnderline(text)` | 下划线 |
| `success(text)` | ✔ 成功 |
| `error(text)` | ✖ 错误 |
| `warn(text)` | ⚠ 警告 |
| `info(text)` | ℹ 信息 |

### ASCII Art

| 方法 | 说明 |
|------|------|
| `printBanner(text, font?)` | 生成并输出 |
| `banner(text, font?)` | 生成（不输出） |
| `bannerAsync(text, font?)` | 异步生成 |
| `getFonts()` | 获取字体列表 |

### 光标控制

| 方法 | 说明 |
|------|------|
| `cursorShow()` | 显示 |
| `cursorHide()` | 隐藏 |
| `cursorToggle(force?)` | 切换 |

### 日志工具

| 方法 | 说明 |
|------|------|
| `print(text)` | 输出日志 |
| `logWithPrefix(prefix, text)` | 带前缀日志 |
| `newline()` | 空行 |
| `divider(char?, length?)` | 分隔线 |

### 事件与插件

| 方法 | 说明 |
|------|------|
| `on(event, handler)` | 监听事件 |
| `off(event, handler)` | 取消监听 |
| `use(plugin)` | 注册插件 |
| `getPlugins()` | 获取插件列表 |

### 配置

| 方法 | 说明 |
|------|------|
| `loadConfig(options)` | 加载配置文件 |
| `getConfig()` | 获取配置 |
| `getConfigValue<T>(key, default?)` | 获取配置值 |

## 许可证

GPLv3.0-only
