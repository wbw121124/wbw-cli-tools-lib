import { Command } from 'commander';
import ora, { type Ora, type Options as OraOptions } from 'ora';
import cliCursor from 'cli-cursor';
import chalk from 'chalk';
import figlet from 'figlet';
import input from '@inquirer/input';
import confirm from '@inquirer/confirm';
import select from '@inquirer/select';
import checkbox from '@inquirer/checkbox';
import password from '@inquirer/password';
import * as readlineModule from 'readline-promise';
import * as nodeReadline from 'node:readline';
import { EventEmitter } from './event-emitter.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
	CliToolsOptions,
	Logger,
	LogLevel,
	CliToolsPlugin,
	CliToolsEventMap,
	CliToolsEventHandler,
	ChoiceOption,
	PromptInputOptions,
	PromptPasswordOptions,
	LoadConfigOptions,
	ResolvedConfig,
	OptionValue,
	ReadlineInterfaceOptions,
	ReadlineCompleter,
	EventHistoryEntry,
	EventMiddleware,
	DisplayTableOptions,
	DisplayTableOptionsA,
	DisplayTableOptionsB,
	DisplayJSONOptions,
} from './types.js';
import type { ReadlinePromiseInterface } from 'readline-promise';
import type { ReadlinePromiseModule } from 'readline-promise';

const _rlpNs = readlineModule as unknown as { default?: { default?: ReadlinePromiseModule } & ReadlinePromiseModule } & ReadlinePromiseModule;
const _dl = _rlpNs.default;
const readline: ReadlinePromiseModule = _dl?.default?.createInterface ? _dl.default : _dl?.createInterface ? _dl as ReadlinePromiseModule : _rlpNs;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

/**
 * CLI 工具库主类
 *
 * 封装 commander、@inquirer/prompts、ora、chalk、figlet、cli-cursor，
 * 提供链式 API、工厂模式、事件系统与插件机制。
 *
 * @example
 * ```ts
 * const cli = CliTools.create({
 *   commandName: 'my-cli',
 *   commandDescription: '我的CLI工具',
 * });
 *
 * cli
 *   .printBanner('My App')
 *   .addOption('-d, --debug', '调试模式')
 *   .onAction(async (opts, cmd) => {
 *     if (opts.debug) cli.success('调试已开启');
 *   });
 *
 * cli.parse();
 * ```
 *
 * @public
 */
export class CliTools {
	private _program: Command;
	private _spinner: Ora | null = null;
	private _options: Required<Omit<CliToolsOptions, 'logger' | 'plugins'>> & { logger: Logger };
	private _cursorHidden = false;
	private _exitHandlerRegistered = false;
	private _plugins: CliToolsPlugin[] = [];
	private _emitter: EventEmitter<CliToolsEventMap>;
	private _config: Record<string, unknown> = {};
	private _readlineInterface: ReadlinePromiseInterface | null = null;
	private _silent = false;

	private constructor(options: CliToolsOptions = {}) {
		this._options = {
			color: options.color ?? true,
			cursor: options.cursor ?? true,
			commandName: options.commandName ?? 'cli-tools',
			commandDescription: options.commandDescription ?? 'CLI 工具库',
			logger: options.logger ?? console,
		};

		this._program = new Command();
		this._program.name(this._options.commandName);
		this._program.description(this._options.commandDescription);
		this._emitter = new EventEmitter<CliToolsEventMap>();

		if (!this._options.color) {
			chalk.level = 0;
		}
		if (!this._options.cursor) {
			this._hideCursor();
		}

		if (options.plugins) {
			for (const plugin of options.plugins) {
				this.use(plugin);
			}
		}

		this._emit('init');
	}

	// ═══════════════════════════════════════════
	//  工厂模式
	// ═══════════════════════════════════════════

	/**
	 * 工厂方法：创建 CliTools 实例
	 *
	 * @param options - 配置选项
	 * @returns CliTools 实例
	 *
	 * @example
	 * ```ts
	 * const cli = CliTools.create({
	 *   commandName: 'my-cli',
	 *   commandDescription: '我的CLI工具',
	 *   logger: myLogger,
	 *   plugins: [myPlugin],
	 * });
	 * ```
	 */
	static create(options?: CliToolsOptions): CliTools {
		return new CliTools(options);
	}

	// ═══════════════════════════════════════════
	//  事件系统
	// ═══════════════════════════════════════════

	/**
	 * 监听事件
	 *
	 * @param event - 事件名称
	 * @param handler - 事件处理器
	 * @returns 当前实例（支持链式调用）
	 *
	 * @example
	 * ```ts
	 * cli.on('spinner:stop', () => console.log('Spinner 已停止'));
	 * cli.on('error', ({ error }) => console.error(error));
	 * ```
	 */
	on<K extends keyof CliToolsEventMap>(event: K, handler: CliToolsEventHandler<CliToolsEventMap[K]>): this {
		this._emitter.on(event, handler);
		return this;
	}

	/**
	 * 取消监听事件
	 *
	 * @param event - 事件名称
	 * @param handler - 要移除的事件处理器
	 * @returns 当前实例
	 */
	off<K extends keyof CliToolsEventMap>(event: K, handler: CliToolsEventHandler<CliToolsEventMap[K]>): this {
		this._emitter.off(event, handler);
		return this;
	}

	/**
	 * 触发事件（仅内部使用）
	 *
	 * @private
	 */
	private _emit<K extends keyof CliToolsEventMap>(event: K, data?: CliToolsEventMap[K]): void {
		this._emitter.emit(event, data as CliToolsEventMap[K]);
	}

	// ═══════════════════════════════════════════
	//  事件管理器高级 API（公开）
	// ═══════════════════════════════════════════

	/**
	 * 监听事件（仅触发一次）
	 *
	 * @param event - 事件名称
	 * @param handler - 事件处理器
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.once('init', () => console.log('只执行一次'));
	 * ```
	 */
	once<K extends keyof CliToolsEventMap>(event: K, handler: CliToolsEventHandler<CliToolsEventMap[K]>): this {
		this._emitter.once(event, handler);
		return this;
	}

	/**
	 * 公开触发事件
	 *
	 * @param event - 事件名称
	 * @param data - 事件数据
	 * @returns 是否有监听器被调用
	 *
	 * @example
	 * ```ts
	 * cli.emit('custom:event', { value: 42 });
	 * ```
	 */
	emit<K extends keyof CliToolsEventMap>(event: K, data?: CliToolsEventMap[K]): boolean {
		return this._emitter.emit(event, data as CliToolsEventMap[K]);
	}

	/**
	 * 获取指定事件的监听器数量
	 *
	 * @param event - 事件名称
	 * @returns 监听器数量
	 */
	listenerCount<K extends keyof CliToolsEventMap>(event: K): number {
		return this._emitter.listenerCount(event);
	}

	/**
	 * 获取指定事件的所有监听器
	 *
	 * @param event - 事件名称
	 * @returns 处理器数组
	 */
	listeners<K extends keyof CliToolsEventMap>(event: K): CliToolsEventHandler<CliToolsEventMap[K]>[] {
		return this._emitter.listeners(event) as CliToolsEventHandler<CliToolsEventMap[K]>[];
	}

	/**
	 * 获取所有已注册的事件名称
	 *
	 * @returns 事件名称数组
	 */
	eventNames(): (keyof CliToolsEventMap)[] {
		return this._emitter.eventNames();
	}

	/**
	 * 检查事件是否有监听器
	 *
	 * @param event - 事件名称
	 * @returns 是否有监听器
	 */
	hasListeners<K extends keyof CliToolsEventMap>(event: K): boolean {
		return this._emitter.hasListeners(event);
	}

	/**
	 * 将监听器添加到队列头部
	 *
	 * @param event - 事件名称
	 * @param handler - 事件处理器
	 * @returns 当前实例
	 */
	prependListener<K extends keyof CliToolsEventMap>(event: K, handler: CliToolsEventHandler<CliToolsEventMap[K]>): this {
		this._emitter.prependListener(event, handler);
		return this;
	}

	/**
	 * 添加通配符监听器（监听所有事件）
	 *
	 * @param handler - 接收 (event, data) 的处理器
	 * @returns 当前实例
	 */
	addWildcardListener(handler: (event: string, data: unknown) => void): this {
		this._emitter.addWildcardListener(handler);
		return this;
	}

	/**
	 * 移除通配符监听器
	 *
	 * @param handler - 要移除的处理器
	 * @returns 当前实例
	 */
	offWildcardListener(handler: (event: string, data: unknown) => void): this {
		this._emitter.offWildcardListener(handler);
		return this;
	}

	/**
	 * 注册事件中间件（洋葱模型拦截事件）
	 *
	 * @param middleware - 中间件函数
	 * @returns 当前实例
	 */
	addEventMiddleware(middleware: EventMiddleware<CliToolsEventMap>): this {
		this._emitter.use(middleware);
		return this;
	}

	/**
	 * 条件监听：仅当 condition 返回 true 时执行 handler
	 *
	 * @param event - 事件名称
	 * @param condition - 条件函数
	 * @param handler - 事件处理器
	 * @returns 当前实例
	 */
	onEventWhen<K extends keyof CliToolsEventMap>(
		event: K,
		condition: (data: CliToolsEventMap[K]) => boolean,
		handler: CliToolsEventHandler<CliToolsEventMap[K]>,
	): this {
		this._emitter.onWhen(event, condition, handler);
		return this;
	}

	/**
	 * 获取事件历史记录
	 *
	 * @param event - 过滤事件名称（可选）
	 * @returns 历史记录数组
	 */
	getEventHistory<K extends keyof CliToolsEventMap>(event?: K): EventHistoryEntry[] {
		return this._emitter.getHistory(event);
	}

	/**
	 * 清空事件历史记录
	 *
	 * @param event - 清空指定事件的历史（可选）
	 * @returns 当前实例
	 */
	clearEventHistory<K extends keyof CliToolsEventMap>(event?: K): this {
		this._emitter.clearHistory(event);
		return this;
	}

	/**
	 * 重放事件历史记录
	 *
	 * @param options - 重放选项
	 * @returns 当前实例
	 */
	replayEventHistory(options?: { event?: keyof CliToolsEventMap; count?: number }): this {
		this._emitter.replayHistory(options);
		return this;
	}

	/**
	 * 获取底层 EventEmitter 实例（高级用法）
	 *
	 * @returns EventEmitter 实例
	 */
	getEventEmitter(): EventEmitter<CliToolsEventMap> {
		return this._emitter;
	}

	/**
	 * 移除指定事件的所有监听器，或移除所有事件的所有监听器
	 *
	 * @param event - 事件名称（可选）
	 * @returns 当前实例
	 */
	removeAllEventListeners<K extends keyof CliToolsEventMap>(event?: K): this {
		this._emitter.removeAllListeners(event);
		return this;
	}

	// ═══════════════════════════════════════════
	//  插件系统
	// ═══════════════════════════════════════════

	/**
	 * 注册插件
	 *
	 * @param plugin - 插件实例
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * const myPlugin: CliToolsPlugin = {
	 *   name: 'my-plugin',
	 *   install(cli) {
	 *     cli.on('init', () => console.log('Plugin loaded'));
	 *   },
	 * };
	 * cli.use(myPlugin);
	 * ```
	 */
	async use(plugin: CliToolsPlugin): Promise<this> {
		if (this._plugins.some(p => p.name === plugin.name)) {
			this._logDebug(`Plugin "${plugin.name}" already loaded, skipping`);
			return this;
		}
		this._plugins.push(plugin);
		this._emit('plugin:load', { name: plugin.name });
		await plugin.install(this);
		this._logDebug(`Plugin "${plugin.name}" loaded`);
		return this;
	}

	/**
	 * 获取已加载的插件列表
	 *
	 * @returns 插件名称数组
	 */
	getPlugins(): string[] {
		return this._plugins.map(p => p.name);
	}

	// ═══════════════════════════════════════════
	//  配置文件加载
	// ═══════════════════════════════════════════

	/**
	 * 加载配置文件
	 *
	 * 支持 JSON 格式的配置文件。按 sources 顺序查找，优先使用第一个找到的文件。
	 *
	 * @param options - 配置加载选项
	 * @returns 解析后的配置结果，未找到文件则返回 defaults
	 *
	 * @example
	 * ```ts
	 * const { config } = await cli.loadConfig({
	 *   sources: ['.myclirc', 'package.json#myCli'],
	 *   defaults: { theme: 'dark', verbose: false },
	 * });
	 * console.log(config.theme); // 'dark'
	 * ```
	 */
	async loadConfig(options: LoadConfigOptions = {}): Promise<ResolvedConfig> {
		const { sources = [], defaults = {}, mergeDefaults = true } = options;

		for (const source of sources) {
			const [filePath, jsonKey] = source.split('#');
			const fullPath = resolve(filePath);

			if (!existsSync(fullPath)) continue;

			try {
				const raw = readFileSync(fullPath, 'utf-8');
				let parsed: Record<string, unknown> = JSON.parse(raw);

				if (jsonKey && typeof parsed === 'object' && parsed !== null) {
					parsed = (parsed[jsonKey] as Record<string, unknown>) ?? {};
				}

				const config = mergeDefaults ? { ...defaults, ...parsed } : parsed;
				this._config = config;
				this._logDebug(`Config loaded from ${source}`);
				return { source, config };
			} catch (e) {
				this._options.logger.error?.(`Failed to load config from ${source}:`, e);
			}
		}

		this._config = { ...defaults };
		return { config: { ...defaults } };
	}

	/**
	 * 获取已加载的配置
	 *
	 * @returns 当前配置对象
	 */
	getConfig(): Record<string, unknown> {
		return { ...this._config };
	}

	/**
	 * 获取配置值（支持类型断言）
	 *
	 * @param key - 配置键名
	 * @param defaultValue - 默认值
	 * @returns 配置值
	 *
	 * @example
	 * ```ts
	 * const theme = cli.getConfigValue<string>('theme', 'light');
	 * ```
	 */
	getConfigValue<T>(key: string, defaultValue?: T): T {
		const value = this._config[key];
		return (value !== undefined ? value : defaultValue) as T;
	}

	// ═══════════════════════════════════════════
	//  Commander 封装（链式）
	// ═══════════════════════════════════════════

	/**
	 * 设置命令名称
	 *
	 * @param name - 命令名称
	 * @returns 当前实例
	 */
	setName(name: string): this {
		this._program.name(name);
		return this;
	}

	/**
	 * 设置命令版本号
	 *
	 * @param version - 版本号字符串
	 * @returns 当前实例
	 */
	setVersion(version: string): this {
		this._program.version(version);
		return this;
	}

	/**
	 * 设置命令描述
	 *
	 * @param description - 描述文本
	 * @returns 当前实例
	 */
	setDescription(description: string): this {
		this._program.description(description);
		return this;
	}

	/**
	 * 添加命令行选项
	 *
	 * @param flags - 选项标志（如 `'-d, --debug'`）
	 * @param description - 选项描述
	 * @param defaultValue - 默认值（仅支持 string | boolean | number）
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.addOption('-n, --name <name>', '你的名字', 'World');
	 * cli.addOption('-d, --debug', '调试模式');
	 * cli.addOption('-p, --port <port>', '端口号', 3000);
	 * ```
	 */
	addOption(flags: string, description: string, defaultValue?: OptionValue): this {
		if (typeof defaultValue === 'number') {
			this._program.option(flags, description, (val: string) => Number(val), defaultValue);
		} else {
			this._program.option(flags, description, defaultValue);
		}
		return this;
	}

	/**
	 * 添加命令行参数
	 *
	 * @param name - 参数名称（如 `'<file>'` 或 `'[file]'`）
	 * @param description - 参数描述
	 * @returns 当前实例
	 */
	addArgument(name: string, description: string): this {
		this._program.argument(name, description);
		return this;
	}

	/**
	 * 注册子命令
	 *
	 * @param name - 子命令名称
	 * @param description - 子命令描述
	 * @param action - 子命令执行回调
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.addCommand('init', '初始化项目', async (options, cmd) => {
	 *   console.log('项目已初始化');
	 * });
	 * ```
	 */
	addCommand(name: string, description: string, action: (...args: unknown[]) => void | Promise<void>): this {
		this._program.command(name).description(description).action(action as (...a: unknown[]) => void);
		return this;
	}

	/**
	 * 设置主命令的执行回调
	 *
	 * @param action - 执行回调，参数为解析后的 options 和 Command 实例
	 * @returns 当前实例
	 */
	onAction(action: (options: Record<string, unknown>, command: Command) => void | Promise<void>): this {
		this._program.action((...args: [string[], Command]) => {
			const command = args[1];
			const opts = command.opts();
			this._emit('parse:after');
			return action(opts as Record<string, unknown>, command);
		});
		return this;
	}

	/**
	 * 解析命令行参数
	 *
	 * @param argv - 参数数组（默认 process.argv）
	 * @returns 当前实例
	 */
	parse(argv?: string[]): this {
		this._emit('parse:before');
		this._program.parse(argv);
		return this;
	}

	/**
	 * 解析命令行参数并返回 Command 实例
	 *
	 * @param argv - 参数数组（默认 process.argv）
	 * @returns Commander Command 实例
	 */
	parseAsync(argv?: string[]): Promise<Command> {
		this._emit('parse:before');
		return this._program.parseAsync(argv);
	}

	/**
	 * 获取底层 Commander Command 实例，用于高级定制
	 *
	 * @returns Commander Command 实例
	 */
	getProgram(): Command {
		return this._program;
	}

	// ═══════════════════════════════════════════
	//  Inquirer Prompts 封装（带错误处理）
	// ═══════════════════════════════════════════

	/**
	 * 文本输入提示
	 *
	 * @param message - 提示消息
	 * @param options - 额外配置
	 * @returns 用户输入的文本，用户取消返回 null
	 *
	 * @example
	 * ```ts
	 * const name = await cli.promptInput('请输入你的名字:', { defaultValue: 'wbw' });
	 * if (name === null) cli.warn('已取消');
	 * ```
	 */
	async promptInput(message: string, options?: PromptInputOptions): Promise<string | null> {
		this._emit('prompt:before', { type: 'input', message });
		try {
			const result = await input({
				message,
				default: options?.defaultValue,
				validate: options?.validate,
				required: options?.required,
			});
			this._emit('prompt:after', { type: 'input', result });
			return result;
		} catch (e) {
			this._emit('prompt:cancel', { type: 'input' });
			this._emit('error', { error: e as Error, context: 'promptInput' });
			return null;
		}
	}

	/**
	 * 确认提示（是/否）
	 *
	 * @param message - 提示消息
	 * @param defaultValue - 默认值
	 * @returns 用户选择的结果，用户取消返回 null
	 *
	 * @example
	 * ```ts
	 * const ok = await cli.promptConfirm('确认继续?');
	 * if (ok === null) cli.warn('已取消');
	 * ```
	 */
	async promptConfirm(message: string, defaultValue?: boolean): Promise<boolean | null> {
		this._emit('prompt:before', { type: 'confirm', message });
		try {
			const result = await confirm({ message, default: defaultValue });
			this._emit('prompt:after', { type: 'confirm', result });
			return result;
		} catch (e) {
			this._emit('prompt:cancel', { type: 'confirm' });
			this._emit('error', { error: e as Error, context: 'promptConfirm' });
			return null;
		}
	}

	/**
	 * 列表选择提示
	 *
	 * @param message - 提示消息
	 * @param choices - 选项数组
	 * @returns 用户选择的值，用户取消返回 null
	 *
	 * @example
	 * ```ts
	 * const lang = await cli.promptSelect('选择语言:', ['TypeScript', 'JavaScript']);
	 * if (lang === null) return;
	 * cli.success(`你选择了: ${lang}`);
	 * ```
	 */
	async promptSelect(message: string, choices: (string | ChoiceOption)[]): Promise<string | null> {
		this._emit('prompt:before', { type: 'select', message });
		try {
			const formattedChoices = choices.map(c =>
				typeof c === 'string' ? { name: c, value: c } : { name: c.name, value: c.value }
			);
			const result = await select({
				message,
				choices: formattedChoices as never,
			});
			this._emit('prompt:after', { type: 'select', result });
			return result as string;
		} catch (e) {
			this._emit('prompt:cancel', { type: 'select' });
			this._emit('error', { error: e as Error, context: 'promptSelect' });
			return null;
		}
	}

	/**
	 * 多选提示（复选框）
	 *
	 * @param message - 提示消息
	 * @param choices - 选项数组
	 * @returns 用户选择的值数组，用户取消返回 null
	 *
	 * @example
	 * ```ts
	 * const features = await cli.promptCheckbox('选择功能:', ['ESLint', 'Prettier']);
	 * if (features === null) return;
	 * cli.success(`已选择: ${features.join(', ')}`);
	 * ```
	 */
	async promptCheckbox(message: string, choices: (string | ChoiceOption)[]): Promise<string[] | null> {
		this._emit('prompt:before', { type: 'checkbox', message });
		try {
			const formattedChoices = choices.map(c =>
				typeof c === 'string'
					? { name: c, value: c, checked: false }
					: { name: c.name, value: c.value, checked: c.checked ?? false }
			);
			const result = await checkbox({
				message,
				choices: formattedChoices as never,
			});
			this._emit('prompt:after', { type: 'checkbox', result });
			return result as string[];
		} catch (e) {
			this._emit('prompt:cancel', { type: 'checkbox' });
			this._emit('error', { error: e as Error, context: 'promptCheckbox' });
			return null;
		}
	}

	/**
	 * 密码输入提示（内容隐藏）
	 *
	 * @param message - 提示消息
	 * @param options - 密码选项（mask、minLength、validate）
	 * @returns 用户输入的密码文本，用户取消返回 null
	 *
	 * @example
	 * ```ts
	 * const pwd = await cli.promptPassword('请输入密码:', { minLength: 6 });
	 * if (pwd === null) return;
	 * cli.success(`密码长度: ${pwd.length}`);
	 * ```
	 */
	async promptPassword(message: string, options?: PromptPasswordOptions): Promise<string | null> {
		this._emit('prompt:before', { type: 'password', message });
		try {
			const { mask, minLength, validate } = options ?? {};

			const combinedValidate = async (value: string): Promise<boolean | string> => {
				if (minLength && minLength > 0 && value.length < minLength) {
					return `密码长度不能少于 ${minLength} 个字符`;
				}
				if (validate) {
					return validate(value);
				}
				return true;
			};

			const result = await password({
				message,
				mask,
				validate: combinedValidate,
			});
			this._emit('prompt:after', { type: 'password', result });
			return result;
		} catch (e) {
			this._emit('prompt:cancel', { type: 'password' });
			this._emit('error', { error: e as Error, context: 'promptPassword' });
			return null;
		}
	}

	// ═══════════════════════════════════════════
	//  Ora Spinner 封装（链式）
	// ═══════════════════════════════════════════

	/**
	 * 创建并启动 Spinner
	 *
	 * @param text - 显示文本
	 * @param options - ora 配置选项
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.spinnerStart('加载中...').spinnerSucceed('完成!');
	 * ```
	 */
	spinnerStart(text: string, options?: OraOptions): this {
		this._emit('spinner:start', { text });
		this._spinner = ora({ text, ...options }).start();
		return this;
	}

	/**
	 * 停止 Spinner
	 *
	 * @returns 当前实例
	 */
	spinnerStop(): this {
		this._spinner?.stop();
		this._spinner = null;
		this._emit('spinner:stop');
		return this;
	}

	/**
	 * Spinner 成功状态（✔）
	 *
	 * @param text - 成功消息
	 * @returns 当前实例
	 */
	spinnerSucceed(text?: string): this {
		this._spinner?.succeed(text);
		this._spinner = null;
		this._emit('spinner:succeed', { text });
		return this;
	}

	/**
	 * Spinner 失败状态（✖）
	 *
	 * @param text - 失败消息
	 * @returns 当前实例
	 */
	spinnerFail(text?: string): this {
		this._spinner?.fail(text);
		this._spinner = null;
		this._emit('spinner:fail', { text });
		return this;
	}

	/**
	 * Spinner 警告状态（⚠）
	 *
	 * @param text - 警告消息
	 * @returns 当前实例
	 */
	spinnerWarn(text?: string): this {
		this._spinner?.warn(text);
		this._spinner = null;
		this._emit('spinner:stop');
		return this;
	}

	/**
	 * Spinner 信息状态（ℹ）
	 *
	 * @param text - 信息消息
	 * @returns 当前实例
	 */
	spinnerInfo(text?: string): this {
		this._spinner?.info(text);
		this._spinner = null;
		this._emit('spinner:stop');
		return this;
	}

	/**
	 * 持久化 Spinner（停止并保留文本）
	 *
	 * @param symbol - 替代符号
	 * @param text - 保留的文本
	 * @returns 当前实例
	 */
	spinnerPersist(symbol?: string, text?: string): this {
		this._spinner?.stopAndPersist({ symbol, text });
		this._spinner = null;
		this._emit('spinner:stop');
		return this;
	}

	/**
	 * 更新 Spinner 文本
	 *
	 * @param text - 新文本
	 * @returns 当前实例
	 */
	spinnerText(text: string): this {
		if (this._spinner) {
			this._spinner.text = text;
		}
		return this;
	}

	/**
	 * 获取当前 Spinner 实例（用于高级操作）
	 *
	 * @returns 当前 Spinner 实例，若未创建则返回 null
	 */
	getSpinner(): Ora | null {
		return this._spinner;
	}

	// ═══════════════════════════════════════════
	//  Chalk 颜色工具（链式）
	// ═══════════════════════════════════════════

	/** @private */
	private _out(text: string): void {
		this._options.logger.log(text);
	}

	/** @private */
	private _logWithLevel(level: LogLevel, text: string): void {
		const currentLevel = this._options.logger.level ?? 'debug';
		if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[currentLevel]) return;

		if (level === 'error') {
			(this._options.logger.error ?? this._options.logger.log)(text);
		} else if (level === 'warn') {
			(this._options.logger.warn ?? this._options.logger.log)(text);
		} else if (level === 'info') {
			(this._options.logger.info ?? this._options.logger.log)(text);
		} else {
			(this._options.logger.debug ?? this._options.logger.log)(text);
		}
	}

	/** @private */
	private _logDebug(text: string): void {
		this._logWithLevel('debug', text);
	}

	logRed(text: string): this { this._out(chalk.red(text)); return this; }
	logGreen(text: string): this { this._out(chalk.green(text)); return this; }
	logYellow(text: string): this { this._out(chalk.yellow(text)); return this; }
	logBlue(text: string): this { this._out(chalk.blue(text)); return this; }
	logCyan(text: string): this { this._out(chalk.cyan(text)); return this; }
	logMagenta(text: string): this { this._out(chalk.magenta(text)); return this; }
	logWhite(text: string): this { this._out(chalk.white(text)); return this; }
	logGray(text: string): this { this._out(chalk.gray(text)); return this; }
	logBold(text: string): this { this._out(chalk.bold(text)); return this; }
	logUnderline(text: string): this { this._out(chalk.underline(text)); return this; }

	/**
	 * 输出成功信息（绿色 + ✔）
	 *
	 * @param text - 文本内容
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.success('操作成功!');
	 * ```
	 */
	success(text: string): this {
		this._out(chalk.green(`✔ ${text}`));
		return this;
	}

	/**
	 * 输出错误信息（红色 + ✖）
	 *
	 * @param text - 文本内容
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.error('操作失败!');
	 * ```
	 */
	error(text: string): this {
		this._out(chalk.red(`✖ ${text}`));
		return this;
	}

	/**
	 * 输出警告信息（黄色 + ⚠）
	 *
	 * @param text - 文本内容
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.warn('请注意!');
	 * ```
	 */
	warn(text: string): this {
		this._out(chalk.yellow(`⚠ ${text}`));
		return this;
	}

	/**
	 * 输出提示信息（蓝色 + ℹ）
	 *
	 * @param text - 文本内容
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.info('提示信息');
	 * ```
	 */
	info(text: string): this {
		this._out(chalk.blue(`ℹ ${text}`));
		return this;
	}

	// ═══════════════════════════════════════════
	//  Figlet ASCII Art 封装
	// ═══════════════════════════════════════════

	/**
	 * 生成并输出 ASCII Art 文本
	 *
	 * @param text - 要转换的文本
	 * @param font - figlet 字体名称（默认 'Standard'）
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.printBanner('Hello');
	 * cli.printBanner('Big', 'Big');
	 * ```
	 */
	printBanner(text: string, font?: string): this {
		const art = figlet.textSync(text, { font: font as figlet.Fonts });
		this._out(chalk.cyan(art));
		return this;
	}

	/**
	 * 生成 ASCII Art 文本（不输出）
	 *
	 * @param text - 要转换的文本
	 * @param font - figlet 字体名称（默认 'Standard'）
	 * @returns 生成的 ASCII Art 文本
	 *
	 * @example
	 * ```ts
	 * const art = cli.banner('Hello');
	 * fs.writeFileSync('banner.txt', art);
	 * ```
	 */
	banner(text: string, font?: string): string {
		return figlet.textSync(text, { font: font as figlet.Fonts });
	}

	/**
	 * 异步生成 ASCII Art 文本
	 *
	 * @param text - 要转换的文本
	 * @param font - figlet 字体名称（默认 'Standard'）
	 * @returns Promise，解析为 ASCII Art 文本
	 */
	bannerAsync(text: string, font?: string): Promise<string> {
		return figlet.text(text, { font: font as figlet.Fonts });
	}

	/**
	 * 获取所有可用的 figlet 字体列表
	 *
	 * @returns 字体名称数组
	 */
	getFonts(): string[] {
		return figlet.fontsSync();
	}

	// ═══════════════════════════════════════════
	//  光标控制
	// ═══════════════════════════════════════════

	/** @private */
	private _hideCursor(): void {
		cliCursor.hide();
		this._cursorHidden = true;
		this._registerExitHandler();
	}

	/** @private */
	private _showCursor(): void {
		if (this._cursorHidden) {
			cliCursor.show();
			this._cursorHidden = false;
		}
	}

	/** @private */
	private _registerExitHandler(): void {
		if (this._exitHandlerRegistered) return;
		this._exitHandlerRegistered = true;

		const cleanup = (): void => {
			this._showCursor();
			if (this._spinner?.isSpinning) {
				this._spinner.stop();
			}
			if (this._readlineInterface) {
				this._readlineInterface.close();
				this._readlineInterface = null;
			}
		};

		process.on('exit', cleanup);
		process.on('SIGINT', () => { cleanup(); process.exit(130); });
		process.on('SIGTERM', () => { cleanup(); process.exit(143); });
	}

	/**
	 * 显示终端光标
	 *
	 * @returns 当前实例
	 */
	cursorShow(): this {
		this._showCursor();
		return this;
	}

	/**
	 * 隐藏终端光标
	 *
	 * @returns 当前实例
	 */
	cursorHide(): this {
		this._hideCursor();
		return this;
	}

	/**
	 * 切换光标可见性
	 *
	 * @param force - true 显示，false 隐藏，undefined 切换
	 * @returns 当前实例
	 */
	cursorToggle(force?: boolean): this {
		if (force === true) {
			this._showCursor();
		} else if (force === false) {
			this._hideCursor();
		} else {
			if (this._cursorHidden) {
				this._showCursor();
			} else {
				this._hideCursor();
			}
		}
		return this;
	}

	// ═══════════════════════════════════════════
	//  通用日志
	// ═══════════════════════════════════════════

	/**
	 * 输出普通日志
	 *
	 * @param text - 文本内容
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.print('Hello World');
	 * ```
	 */
	print(text: string): this {
		this._out(text);
		return this;
	}

	/**
	 * 输出带前缀的日志
	 *
	 * @param prefix - 前缀文本
	 * @param text - 日志内容
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.logWithPrefix('[INFO]', '任务完成');
	 * ```
	 */
	logWithPrefix(prefix: string, text: string): this {
		this._out(`${chalk.gray(prefix)} ${text}`);
		return this;
	}

	/**
	 * 输出空行
	 *
	 * @returns 当前实例
	 */
	newline(): this {
		this._out('');
		return this;
	}

	/**
	 * 输出分隔线
	 *
	 * @param char - 分隔线字符
	 * @param length - 分隔线长度
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.divider('=', 50);
	 * ```
	 */
	divider(char = '─', length = 40): this {
		this._out(chalk.gray(char.repeat(length)));
		return this;
	}

	// ═══════════════════════════════════════════
	//  Readline 接口（基于 readline-promise）
	// ═══════════════════════════════════════════

	/**
	 * 获取 readline 接口实例（懒加载）
	 *
	 * @param options - readline 配置选项
	 * @returns readline-promise 接口实例
	 *
	 * @example
	 * ```ts
	 * const rl = cli.getReadlineInterface();
	 * const answer = await rl.questionAsync('请输入: ');
	 * cli.closeReadline();
	 * ```
	 */
	getReadlineInterface(options?: ReadlineInterfaceOptions): ReadlinePromiseInterface {
		if (!this._readlineInterface) {
			const completer = options?.completer;
			const terminal = options?.terminal ?? true;

			this._readlineInterface = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
				completer: completer as nodeReadline.Completer | nodeReadline.AsyncCompleter | undefined,
				terminal,
			});

			if (options?.history !== false) {
				(this._readlineInterface as unknown as { history: string[] }).history = [];
			}

			this._registerExitHandler();
			this._logDebug('Readline interface created');
		}
		return this._readlineInterface;
	}

	/**
	 * 读取一行输入（基于 readline-promise）
	 *
	 * @param prompt - 提示文本
	 * @returns 用户输入的文本
	 *
	 * @example
	 * ```ts
	 * const name = await cli.readLine('请输入你的名字: ');
	 * cli.success(`你好, ${name}!`);
	 * ```
	 */
	async readLine(prompt?: string): Promise<string> {
		this._emit('prompt:before', { type: 'readline', message: prompt ?? '' });
		const rl = this.getReadlineInterface({ prompt });
		try {
			const result = await rl.questionAsync(prompt ?? '');
			this._emit('prompt:after', { type: 'readline', result });
			return result;
		} catch (e) {
			this._emit('prompt:cancel', { type: 'readline' });
			this._emit('error', { error: e as Error, context: 'readLine' });
			return '';
		}
	}

	/**
	 * 创建 Tab 补全器（PowerShell 风格）
	 *
	 * @param options - 补全选项：字符串数组或自定义补全函数
	 * @returns readline 补全器函数
	 *
	 * @example
	 * ```ts
	 * // 字符串数组补全
	 * const completer = cli.createCompleter(['install', 'build', 'test']);
	 * const rl = cli.getReadlineInterface({ completer });
	 *
	 * // 自定义函数补全
	 * const customCompleter = cli.createCompleter((line) => {
	 *   const hits = ['install', 'build', 'test'].filter(c => c.startsWith(line));
	 *   return [hits.length ? hits : ['install', 'build', 'test'], line];
	 * });
	 * ```
	 */
	createCompleter(options: string[] | ((line: string) => [string[], string] | Promise<[string[], string]>)): ReadlineCompleter {
		if (Array.isArray(options)) {
			const completions = options;
			return (line: string): [string[], string] => {
				const hits = completions.filter(c => c.startsWith(line));
				return [hits.length ? hits : completions, line];
			};
		}
		return options;
	}

	/**
	 * 关闭 readline 接口
	 *
	 * @returns 当前实例
	 */
	closeReadline(): this {
		if (this._readlineInterface) {
			this._readlineInterface.close();
			this._readlineInterface = null;
			this._logDebug('Readline interface closed');
		}
		return this;
	}

	// ═══════════════════════════════════════════
	//  Readline 光标控制（node:readline 静态方法）
	// ═══════════════════════════════════════════

	/**
	 * 光标移动到绝对位置
	 *
	 * @param x - 列位置
	 * @param y - 行位置（可选）
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.cursorTo(0, 0); // 移动到左上角
	 * ```
	 */
	cursorTo(x: number, y?: number): this {
		readline.cursorTo(process.stdout, x, y);
		return this;
	}

	/**
	 * 清除当前行
	 *
	 * @param dir - 清除方向：-1=左, 0=全部, 1=右（默认 0）
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.clearLine();    // 清除整行
	 * cli.clearLine(-1);  // 清除光标左侧
	 * cli.clearLine(1);   // 清除光标右侧
	 * ```
	 */
	clearLine(dir: -1 | 0 | 1 = 0): this {
		readline.clearLine(process.stdout, dir);
		return this;
	}

	/**
	 * 光标相对移动
	 *
	 * @param dx - 水平移动量（正数向右，负数向左）
	 * @param dy - 垂直移动量（正数向下，负数向上）
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.moveCursor(0, -1); // 上移一行
	 * cli.moveCursor(0, 1);  // 下移一行
	 * ```
	 */
	moveCursor(dx: number, dy: number): this {
		readline.moveCursor(process.stdout, dx, dy);
		return this;
	}

	/**
	 * 清除光标以下屏幕内容
	 *
	 * @returns 当前实例
	 */
	clearScreenDown(): this {
		readline.clearScreenDown(process.stdout);
		return this;
	}

	/**
	 * 清屏并将光标移至左上角
	 *
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.clearScreen();
	 * cli.printBanner('Hello');
	 * ```
	 */
	clearScreen(): this {
		readline.cursorTo(process.stdout, 0, 0);
		readline.clearScreenDown(process.stdout);
		return this;
	}

	// ═══════════════════════════════════════════
	//  Readline 历史记录
	// ═══════════════════════════════════════════

	/**
	 * 获取 readline 历史记录
	 *
	 * @returns 历史记录数组
	 *
	 * @example
	 * ```ts
	 * cli.readLine('输入命令: ');
	 * const history = cli.getHistory();
	 * console.log('历史记录:', history);
	 * ```
	 */
	getHistory(): string[] {
		const rl = this._readlineInterface;
		if (!rl) return [];
		const hist = (rl as unknown as { history: string[] }).history;
		return Array.isArray(hist) ? [...hist] : [];
	}

	/**
	 * 清空 readline 历史记录
	 *
	 * @returns 当前实例
	 */
	clearHistory(): this {
		const rl = this._readlineInterface;
		if (rl) {
			const hist = (rl as unknown as { history: string[] }).history;
			if (Array.isArray(hist)) hist.length = 0;
		}
		return this;
	}

	// ═══════════════════════════════════════════
	//  Readline 增强
	// ═══════════════════════════════════════════

	/**
	 * 获取当前输入行内容
	 *
	 * @returns 当前行文本
	 */
	get readlineLine(): string {
		return this._readlineInterface?.line ?? '';
	}

	/**
	 * 获取当前光标位置
	 *
	 * @returns 光标偏移量
	 */
	get readlineCursor(): number {
		return (this._readlineInterface as unknown as { cursor?: number })?.cursor ?? 0;
	}

	/**
	 * 设置提示符
	 *
	 * @param prompt - 提示符文本
	 * @returns 当前实例
	 */
	setPrompt(prompt: string): this {
		this._readlineInterface?.setPrompt(prompt);
		return this;
	}

	/**
	 * 显示提示符
	 *
	 * @returns 当前实例
	 */
	prompt(): this {
		this._readlineInterface?.prompt();
		return this;
	}

	/**
	 * 创建独立的 readline 接口（不存储到内部单例）
	 *
	 * @param options - readline 配置选项
	 * @returns 独立的 readline-promise 接口
	 */
	createCustomReadline(options?: ReadlineInterfaceOptions): ReadlinePromiseInterface {
		const completer = options?.completer;
		const terminal = options?.terminal ?? true;

		return readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			completer: completer as nodeReadline.Completer | nodeReadline.AsyncCompleter | undefined,
			terminal,
		});
	}

	// ═══════════════════════════════════════════
	//  displayTable / displayJSON
	// ═══════════════════════════════════════════

	/**
	 * 显示格式化表格
	 *
	 * 支持两种数据格式：
	 * - 格式A：对象数组 + 列定义（带对齐、宽度控制）
	 * - 格式B：简单 headers + 二维数组
	 *
	 * @param options - 表格选项
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * // 格式A
	 * cli.displayTable({
	 *   columns: [
	 *     { key: 'name', label: '名称', align: 'left' },
	 *     { key: 'version', label: '版本', align: 'center' },
	 *   ],
	 *   rows: [
	 *     { name: 'cli-tools', version: '1.0.0' },
	 *     { name: 'utils', version: '2.3.1' },
	 *   ],
	 *   row_count: 2,
	 * });
	 *
	 * // 格式B
	 * cli.displayTable({
	 *   headers: ['Name', 'Age'],
	 *   rows: [['Alice', 30], ['Bob', 25]],
	 * });
	 * ```
	 */
	displayTable(options: DisplayTableOptions): this {
		if ('headers' in options) {
			return this._displayTableSimple(options as DisplayTableOptionsB);
		}
		return this._displayTableAdvanced(options as DisplayTableOptionsA);
	}

	/**
	 * 显示格式化 JSON
	 *
	 * @param data - 要显示的数据
	 * @param options - 显示选项
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.displayJSON({ name: 'cli-tools', version: '1.0.0' });
	 * cli.displayJSON(data, { indent: 4, colors: false });
	 * ```
	 */
	displayJSON(data: unknown, options?: DisplayJSONOptions): this {
		const { indent = 2, colors = true } = options ?? {};

		try {
			const seen = new WeakSet();
			const raw = JSON.stringify(data, (_key, value) => {
				if (typeof value === 'object' && value !== null) {
					if (seen.has(value)) return '[Circular]';
					seen.add(value);
				}
				return value;
			}, indent);

			if (!colors) {
				this._out(raw);
				return this;
			}

			const colored = raw
				.replace(/"([^"]+)":/g, (_m, p1) => `${chalk.cyan(`"${p1}"`)}:`)
				.replace(/: "([^"]*?)"/g, (_m, p1) => `: ${chalk.green(`"${p1}"`)}`)
				.replace(/: (\d+\.?\d*)/g, (_m, p1) => `: ${chalk.yellow(p1)}`)
				.replace(/: (true|false)/g, (_m, p1) => `: ${chalk.gray(p1)}`)
				.replace(/: (null)/g, (_m, p1) => `: ${chalk.gray(p1)}`);

			this._out(colored);
		} catch (e) {
			this._out(String(data));
		}
		return this;
	}

	/** @private */
	private _displayTableSimple(options: DisplayTableOptionsB): this {
		const { headers, rows, footer } = options;

		const colWidths = headers.map((h, i) => {
			const maxDataWidth = Math.max(...rows.map(r => String(r[i] ?? '').length), 0);
			return Math.max(h.length, maxDataWidth);
		});

		const pad = (text: string, width: number) => text.padEnd(width);
		const line = (left: string, mid: string, right: string, fill: string) =>
			left + colWidths.map(w => fill.repeat(w + 2)).join(mid) + right;

		const output: string[] = [];
		output.push(line('┌', '┬', '┐', '─'));
		output.push('│ ' + headers.map((h, i) => pad(h, colWidths[i])).join(' │ ') + ' │');
		output.push(line('├', '┼', '┤', '─'));
		for (const row of rows) {
			output.push('│ ' + headers.map((_, i) => pad(String(row[i] ?? ''), colWidths[i])).join(' │ ') + ' │');
		}
		output.push(line('└', '┴', '┘', '─'));
		if (footer) output.push(footer);

		this._out(output.join('\n'));
		return this;
	}

	/** @private */
	private _displayTableAdvanced(options: DisplayTableOptionsA): this {
		const { columns, rows, row_count, maxColWidth = 30, headerStyle = 'bold' } = options;

		const colWidths = columns.map(col => {
			const labelWidth = col.label?.length ?? col.key.length;
			const maxDataWidth = Math.max(
				...rows.map(r => String(r[col.key] ?? '').length),
				0,
			);
			return col.width ?? Math.min(Math.max(labelWidth, maxDataWidth), maxColWidth);
		});

		const alignText = (text: string, width: number, align: 'left' | 'center' | 'right'): string => {
			const truncated = text.length > width ? text.slice(0, width - 3) + '...' : text;
			if (align === 'center') {
				const left = Math.floor((width - truncated.length) / 2);
				const right = width - truncated.length - left;
				return ' '.repeat(left) + truncated + ' '.repeat(right);
			}
			if (align === 'right') return truncated.padStart(width);
			return truncated.padEnd(width);
		};

		const formatHeader = (text: string): string => {
			if (headerStyle === 'bold') return chalk.bold(text);
			if (headerStyle === 'underline') return chalk.underline(text);
			return text;
		};

		const line = (left: string, mid: string, right: string, fill: string) =>
			left + colWidths.map(w => fill.repeat(w + 2)).join(mid) + right;

		const output: string[] = [];
		output.push(line('┌', '┬', '┐', '─'));
		output.push(
			'│ '
			+ columns.map((col, i) =>
				formatHeader(alignText(col.label ?? col.key, colWidths[i], col.align ?? 'left')),
			).join(' │ ')
			+ ' │',
		);
		output.push(line('├', '┼', '┤', '─'));
		for (const row of rows) {
			output.push(
				'│ '
				+ columns.map((col, i) =>
					alignText(String(row[col.key] ?? ''), colWidths[i], col.align ?? 'left'),
				).join(' │ ')
				+ ' │',
			);
		}
		output.push(line('└', '┴', '┘', '─'));
		if (row_count !== undefined) {
			output.push(`(${row_count} rows)`);
		}

		this._out(output.join('\n'));
		return this;
	}

	// ═══════════════════════════════════════════
	//  ANSI 辅助方法
	// ═══════════════════════════════════════════

	/**
	 * 清除当前行
	 *
	 * @returns 当前实例
	 */
	clearCurrentLine(): this {
		readline.clearLine(process.stdout, 0);
		return this;
	}

	/**
	 * 移动光标到指定列
	 *
	 * @param column - 列号（从 1 开始）
	 * @returns 当前实例
	 */
	moveToColumn(column: number): this {
		process.stdout.write(`\x1b[${column}G`);
		return this;
	}

	/**
	 * 光标上移
	 *
	 * @param n - 移动行数（默认 1）
	 * @returns 当前实例
	 */
	moveUp(n?: number): this {
		process.stdout.write(n !== undefined ? `\x1b[${n}A` : '\x1b[A');
		return this;
	}

	/**
	 * 光标下移
	 *
	 * @param n - 移动行数（默认 1）
	 * @returns 当前实例
	 */
	moveDown(n?: number): this {
		process.stdout.write(n !== undefined ? `\x1b[${n}B` : '\x1b[B');
		return this;
	}

	/**
	 * 移动光标到绝对位置
	 *
	 * @param x - 列位置
	 * @param y - 行位置
	 * @returns 当前实例
	 */
	moveCursorTo(x: number, y: number): this {
		process.stdout.write(`\x1b[${y};${x}H`);
		return this;
	}

	// ═══════════════════════════════════════════
	//  Spinner 增强
	// ═══════════════════════════════════════════

	/**
	 * 更新 Spinner 文本（别名）
	 *
	 * @param text - 新文本
	 * @returns 当前实例
	 */
	spinnerUpdate(text: string): this {
		return this.spinnerText(text);
	}

	/**
	 * 显示进度条 Spinner
	 *
	 * @param current - 当前进度
	 * @param total - 总数
	 * @param text - 附加文本
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.spinnerStart('加载中...');
	 * for (let i = 0; i <= 100; i++) {
	 *   cli.spinnerProgress(i, 100, '加载中...');
	 *   await new Promise(r => setTimeout(r, 50));
	 * }
	 * cli.spinnerSucceed('完成!');
	 * ```
	 */
	spinnerProgress(current: number, total: number, text?: string): this {
		if (!this._spinner) return this;

		const pct = Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
		const barWidth = 20;
		const filled = Math.round((pct / 100) * barWidth);
		const empty = barWidth - filled;
		const bar = '='.repeat(filled) + '>' + ' '.repeat(Math.max(empty - 1, 0));
		const suffix = text ? ` ${text}` : '';
		this._spinner.text = `[${bar}] ${pct}%${suffix}`;
		return this;
	}

	// ═══════════════════════════════════════════
	//  输出重定向
	// ═══════════════════════════════════════════

	/**
	 * 重定向输出到新的 WriteStream
	 *
	 * @param stream - 输出流
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * import { createWriteStream } from 'node:fs';
	 * cli.setOutput(createWriteStream('output.log'));
	 * ```
	 */
	setOutput(stream: NodeJS.WritableStream): this {
		this._options.logger = {
			...this._options.logger,
			log: (...args: unknown[]) => stream.write(args.join(' ') + '\n'),
		};
		return this;
	}

	/**
	 * 替换日志器
	 *
	 * @param logger - 新的日志器
	 * @returns 当前实例
	 */
	setLogger(logger: Logger): this {
		this._options.logger = logger;
		return this;
	}

	/**
	 * 静默模式（所有输出被忽略）
	 *
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.silent();
	 * cli.print('这行不会显示'); // 无输出
	 * ```
	 */
	silent(): this {
		this._silent = true;
		this._options.logger = {
			level: 'error',
			log: () => {},
			error: () => {},
			warn: () => {},
			info: () => {},
			debug: () => {},
		};
		return this;
	}

	/**
	 * 检查是否处于静默模式
	 *
	 * @returns 是否静默
	 */
	isSilent(): boolean {
		return this._silent;
	}

	// ═══════════════════════════════════════════
	//  颜色辅助
	// ═══════════════════════════════════════════

	/**
	 * 获取 chalk 实例（高级用法）
	 *
	 * @returns chalk 实例
	 *
	 * @example
	 * ```ts
	 * const styled = cli.chalk.underline.bold.red('警告');
	 * cli.print(styled);
	 * ```
	 */
	get chalk(): typeof chalk {
		return chalk;
	}

	/**
	 * 通用颜色输出方法
	 *
	 * @param text - 文本内容
	 * @param colorName - chalk 颜色名称
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * cli.color('错误信息', 'red');
	 * cli.color('警告信息', 'yellow');
	 * cli.color('成功信息', 'green');
	 * ```
	 */
	color(text: string, colorName: string): this {
		const fn = (chalk as unknown as Record<string, (s: string) => string>)[colorName];
		if (typeof fn === 'function') {
			this._out(fn(text));
		} else {
			this._out(text);
		}
		return this;
	}
}
