/**
 * CLI 工具配置选项
 * @public
 */
export interface CliToolsOptions {
	/**
	 * 是否启用彩色输出（默认：true）
	 */
	color?: boolean;
	/**
	 * 是否启用光标控制（默认：true）
	 */
	cursor?: boolean;
	/**
	 * 默认命令名称
	 */
	commandName?: string;
	/**
	 * 默认命令描述
	 */
	commandDescription?: string;
	/**
	 * 自定义日志器（默认：console）
	 */
	logger?: Logger;
	/**
	 * 已注册的插件列表
	 */
	plugins?: CliToolsPlugin[];
}

/**
 * 日志级别
 * @public
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 自定义日志器接口
 * @public
 */
export interface Logger {
	/** 当前日志级别（低于此级别的日志将被忽略） */
	level?: LogLevel;
	log: (...args: unknown[]) => void;
	error?: (...args: unknown[]) => void;
	warn?: (...args: unknown[]) => void;
	info?: (...args: unknown[]) => void;
	debug?: (...args: unknown[]) => void;
}

/**
 * 事件映射表
 * @public
 */
export interface CliToolsEventMap {
	/** 实例创建后触发 */
	'init': void;
	/** 命令解析前触发 */
	'parse:before': void;
	/** 命令解析后触发 */
	'parse:after': void;
	/** Spinner 启动时触发 */
	'spinner:start': { text: string };
	/** Spinner 停止时触发 */
	'spinner:stop': void;
	/** Spinner 成功时触发 */
	'spinner:succeed': { text?: string };
	/** Spinner 失败时触发 */
	'spinner:fail': { text?: string };
	/** Prompt 开始前触发 */
	'prompt:before': { type: string; message: string };
	/** Prompt 结束后触发 */
	'prompt:after': { type: string; result: unknown };
	/** Prompt 被取消时触发 */
	'prompt:cancel': { type: string };
	/** 插件加载时触发 */
	'plugin:load': { name: string };
	/** 错误发生时触发 */
	'error': { error: Error; context?: string };
}

/**
 * 事件回调函数类型
 * @public
 */
export type CliToolsEventHandler<T = void> = (data: T) => void | Promise<void>;

/**
 * 插件接口
 * @public
 */
export interface CliToolsPlugin {
	/** 插件名称 */
	name: string;
	/** 插件版本 */
	version?: string;
	/**
	 * 安装插件
	 * @param cli - CliTools 实例
	 */
	install(cli: unknown): void | Promise<void>;
}

/**
 * 列表选项（用于 select/checkbox 提示）
 * @public
 */
export interface ChoiceOption<T = string> {
	/** 选项值 */
	value: T;
	/** 选项显示名称 */
	name: string;
	/** 选项描述 */
	description?: string;
	/** 是否禁用 */
	disabled?: boolean | string;
	/** 是否默认选中（仅 checkbox） */
	checked?: boolean;
}

/**
 * promptPassword 选项
 * @public
 */
export interface PromptPasswordOptions {
	/** 遮罩字符（默认 '*'） */
	mask?: string | boolean;
	/** 最小长度（0 = 不限制） */
	minLength?: number;
	/** 验证函数 */
	validate?: (value: string) => boolean | string | Promise<string | boolean>;
}

/**
 * promptInput 选项
 * @public
 */
export interface PromptInputOptions {
	/** 默认值 */
	defaultValue?: string;
	/** 验证函数 */
	validate?: (value: string) => boolean | string | Promise<string | boolean>;
	/** 是否必填 */
	required?: boolean;
}

/**
 * 配置文件加载选项
 * @public
 */
export interface LoadConfigOptions {
	/** 配置文件路径列表（按优先级排序） */
	sources?: string[];
	/** 默认配置 */
	defaults?: Record<string, unknown>;
	/** 是否自动合并 defaults（默认：true） */
	mergeDefaults?: boolean;
}

/**
 * 已解析的配置结果
 * @public
 */
export interface ResolvedConfig {
	/** 配置来源文件路径 */
	source?: string;
	/** 配置内容 */
	config: Record<string, unknown>;
}

/**
 * Option 类型安全定义
 * @public
 */
export type OptionValue = string | boolean | number;

/**
 * Readline 补全器函数类型
 * @public
 */
export type ReadlineCompleter = (line: string) => [string[], string] | Promise<[string[], string]>;

/**
 * readline 接口选项
 * @public
 */
export interface ReadlineInterfaceOptions {
	/** 是否启用终端模式（默认 true） */
	terminal?: boolean;
	/** Tab 补全器 */
	completer?: ReadlineCompleter;
	/** 提示符 */
	prompt?: string;
	/** 是否保留历史记录（默认 true） */
	history?: boolean;
}

/**
 * 事件处理器函数类型
 * @public
 */
export type EventHandler<T = void> = (data: T) => void | Promise<void>;

/**
 * EventEmitter 配置选项
 * @public
 */
export interface EventEmitterOptions {
	/** 历史记录最大条数（默认 100） */
	maxHistory?: number;
}

/**
 * 事件历史记录条目
 * @public
 */
export interface EventHistoryEntry<T = unknown> {
	/** 事件名称 */
	event: string;
	/** 事件数据 */
	data: T;
	/** 时间戳 */
	timestamp: number;
}

/**
 * 事件中间件函数类型
 * @public
 */
export type EventMiddleware<T = Record<string, unknown>> = (
	event: keyof T,
	data: T[keyof T],
	next: () => void,
) => void;

// ═══════════════════════════════════════════
//  displayTable / displayJSON 类型
// ═══════════════════════════════════════════

/**
 * 表格列定义（格式A）
 * @public
 */
export interface TableColumn {
	/** 数据键名 */
	key: string;
	/** 列标题（默认使用 key） */
	label?: string;
	/** 对齐方式（默认 'left'） */
	align?: 'left' | 'center' | 'right';
	/** 固定列宽 */
	width?: number;
}

/**
 * 表格选项（格式A：对象数组 + 列定义）
 * @public
 */
export interface DisplayTableOptionsA {
	/** 列定义 */
	columns: TableColumn[];
	/** 数据行 */
	rows: Record<string, unknown>[];
	/** 总行数信息 */
	row_count?: number;
	/** 最大列宽（默认 30） */
	maxColWidth?: number;
	/** 表头样式（默认 'bold'） */
	headerStyle?: 'bold' | 'underline' | 'none';
}

/**
 * 表格选项（格式B：简单 headers + rows）
 * @public
 */
export interface DisplayTableOptionsB {
	/** 表头名称 */
	headers: string[];
	/** 数据行（二维数组） */
	rows: (string | number)[][];
	/** 底部文字 */
	footer?: string;
}

/**
 * 表格显示选项（联合类型）
 * @public
 */
export type DisplayTableOptions = DisplayTableOptionsA | DisplayTableOptionsB;

/**
 * JSON 显示选项
 * @public
 */
export interface DisplayJSONOptions {
	/** 缩进空格数（默认 2） */
	indent?: number;
	/** 是否彩色（默认 true） */
	colors?: boolean;
	/** 最大展开深度（默认 10） */
	maxDepth?: number;
}

// ═══════════════════════════════════════════
//  输出重定向类型
// ═══════════════════════════════════════════

/**
 * 静默 Logger（所有方法为空操作）
 * @public
 */
export interface SilentLogger extends Logger {
	level: 'error';
}
