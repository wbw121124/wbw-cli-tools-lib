# wbw-cli-tools-lib

CLI 工具库 - 封装 commander、@inquirer/prompts、ora、chalk、figlet、cli-cursor，提供链式 API、工厂模式、事件系统与插件机制。

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
