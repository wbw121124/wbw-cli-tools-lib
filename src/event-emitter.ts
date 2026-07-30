import type { EventHandler, EventEmitterOptions, EventHistoryEntry, EventMiddleware } from './types.js';

/**
 * 内部监听器包装
 */
interface ListenerEntry<T> {
	handler: EventHandler<T>;
	priority: number;
	once: boolean;
}

/**
 * 通配符监听器
 */
interface WildcardEntry {
	handler: (event: string, data: unknown) => void;
	once: boolean;
}

/**
 * 独立事件发射器（类型安全、完整版）
 *
 * 支持：on/once/off/emit、通配符(*)、优先级、事件历史、
 * 中间件拦截、条件监听、命名空间、延迟触发、dispose
 *
 * @example
 * ```ts
 * const emitter = new EventEmitter<{ error: Error; data: string }>();
 *
 * emitter.on('error', (err) => console.error(err));
 * emitter.once('data', (msg) => console.log('只触发一次:', msg));
 * emitter.emit('error', new Error('fail'));
 * ```
 *
 * @public
 */
export class EventEmitter<T extends object = Record<string, unknown>> {
	private _listeners = new Map<keyof T, ListenerEntry<unknown>[]>();
	private _wildcardListeners: WildcardEntry[] = [];
	private _middlewares: EventMiddleware<T>[] = [];
	private _history: EventHistoryEntry[] = [];
	private _historyMax: number;
	private _disposed = false;

	constructor(options: EventEmitterOptions = {}) {
		this._historyMax = options.maxHistory ?? 100;
	}

	// ═══════════════════════════════════════════
	//  基础 API
	// ═══════════════════════════════════════════

	/**
	 * 监听事件
	 *
	 * @param event - 事件名称
	 * @param handler - 事件处理器
	 * @param options - 优先级等选项
	 * @returns 当前实例
	 */
	on<K extends keyof T>(event: K, handler: EventHandler<T[K]>, options?: { priority?: number }): this {
		this._assertNotDisposed();
		const entry: ListenerEntry<T[K]> = {
			handler,
			priority: options?.priority ?? 0,
			once: false,
		};
		this._addListener(event, entry);
		return this;
	}

	/**
	 * 监听事件（仅触发一次）
	 *
	 * @param event - 事件名称
	 * @param handler - 事件处理器
	 * @param options - 优先级等选项
	 * @returns 当前实例
	 */
	once<K extends keyof T>(event: K, handler: EventHandler<T[K]>, options?: { priority?: number }): this {
		this._assertNotDisposed();
		const entry: ListenerEntry<T[K]> = {
			handler,
			priority: options?.priority ?? 0,
			once: true,
		};
		this._addListener(event, entry);
		return this;
	}

	/**
	 * 移除事件监听器
	 *
	 * @param event - 事件名称
	 * @param handler - 要移除的处理器
	 * @returns 当前实例
	 */
	off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): this {
		const list = this._listeners.get(event);
		if (!list) return this;
		const idx = list.findIndex(e => e.handler === handler);
		if (idx !== -1) list.splice(idx, 1);
		if (list.length === 0) this._listeners.delete(event);
		return this;
	}

	/**
	 * 触发事件
	 *
	 * @param event - 事件名称
	 * @param data - 事件数据
	 * @returns 是否有监听器被调用
	 */
	emit<K extends keyof T>(event: K, data: T[K]): boolean {
		this._assertNotDisposed();
		this._recordHistory(event as string, data);

		const middlewareChain = this._buildMiddlewareChain(event, data);
		const result = middlewareChain();

		return result;
	}

	/**
	 * 移除指定事件的所有监听器，或移除所有事件的所有监听器
	 *
	 * @param event - 事件名称（可选）
	 * @returns 当前实例
	 */
	removeAllListeners(event?: keyof T): this {
		if (event !== undefined) {
			this._listeners.delete(event);
		} else {
			this._listeners.clear();
			this._wildcardListeners.length = 0;
		}
		return this;
	}

	// ═══════════════════════════════════════════
	//  查询 API
	// ═══════════════════════════════════════════

	/**
	 * 获取指定事件的监听器数量
	 *
	 * @param event - 事件名称
	 * @returns 监听器数量
	 */
	listenerCount(event: keyof T): number {
		return this._listeners.get(event)?.length ?? 0;
	}

	/**
	 * 获取指定事件的所有监听器（只读副本）
	 *
	 * @param event - 事件名称
	 * @returns 处理器数组
	 */
	listeners<K extends keyof T>(event: K): EventHandler<T[K]>[] {
		const list = this._listeners.get(event);
		if (!list) return [];
		return list.map(e => e.handler as EventHandler<T[K]>);
	}

	/**
	 * 获取所有已注册的事件名称
	 *
	 * @returns 事件名称数组
	 */
	eventNames(): (keyof T)[] {
		return Array.from(this._listeners.keys());
	}

	/**
	 * 检查事件是否有监听器
	 *
	 * @param event - 事件名称
	 * @returns 是否有监听器
	 */
	hasListeners(event: keyof T): boolean {
		return this.listenerCount(event) > 0;
	}

	// ═══════════════════════════════════════════
	//  高级 API
	// ═══════════════════════════════════════════

	/**
	 * 将监听器添加到队列头部（最高优先级）
	 *
	 * @param event - 事件名称
	 * @param handler - 事件处理器
	 * @returns 当前实例
	 */
	prependListener<K extends keyof T>(event: K, handler: EventHandler<T[K]>): this {
		this._assertNotDisposed();
		const entry: ListenerEntry<T[K]> = {
			handler,
			priority: Number.MAX_SAFE_INTEGER,
			once: false,
		};
		const list = this._listeners.get(event) ?? [];
		list.unshift(entry as ListenerEntry<unknown>);
		this._listeners.set(event, list);
		return this;
	}

	/**
	 * 添加通配符监听器（监听所有事件）
	 *
	 * @param handler - 接收 (event, data) 的处理器
	 * @returns 当前实例
	 */
	addWildcardListener(handler: (event: string, data: unknown) => void): this {
		this._assertNotDisposed();
		this._wildcardListeners.push({ handler, once: false });
		return this;
	}

	/**
	 * 添加一次性通配符监听器
	 *
	 * @param handler - 接收 (event, data) 的处理器
	 * @returns 当前实例
	 */
	addOnceWildcardListener(handler: (event: string, data: unknown) => void): this {
		this._assertNotDisposed();
		this._wildcardListeners.push({ handler, once: true });
		return this;
	}

	/**
	 * 移除通配符监听器
	 *
	 * @param handler - 要移除的处理器
	 * @returns 当前实例
	 */
	offWildcardListener(handler: (event: string, data: unknown) => void): this {
		const idx = this._wildcardListeners.findIndex(e => e.handler === handler);
		if (idx !== -1) this._wildcardListeners.splice(idx, 1);
		return this;
	}

	/**
	 * 注册中间件（洋葱模型拦截事件）
	 *
	 * @param middleware - 中间件函数，调用 next() 继续
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * emitter.use((event, data, next) => {
	 *   console.log(`[${event}] before`);
	 *   next();
	 *   console.log(`[${event}] after`);
	 * });
	 * ```
	 */
	use(middleware: EventMiddleware<T>): this {
		this._assertNotDisposed();
		this._middlewares.push(middleware);
		return this;
	}

	/**
	 * 条件监听：仅当 condition 返回 true 时执行 handler
	 *
	 * @param event - 事件名称
	 * @param condition - 条件函数
	 * @param handler - 事件处理器
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * emitter.onWhen('data', (msg) => msg.includes('error'), (msg) => {
	 *   console.log('捕获错误消息:', msg);
	 * });
	 * ```
	 */
	onWhen<K extends keyof T>(event: K, condition: (data: T[K]) => boolean, handler: EventHandler<T[K]>): this {
		return this.on(event, (data) => {
			if (condition(data)) {
				return handler(data);
			}
		});
	}

	/**
	 * 创建命名空间子发射器（事件名自动加前缀）
	 *
	 * @param ns - 命名空间名称
	 * @returns 子 EventEmitter（共享父级监听器）
	 *
	 * @example
	 * ```ts
	 * const build = emitter.namespace('build');
	 * build.on('start', handler); // 实际监听 'build:start'
	 * build.emit('start', data);  // 实际触发 'build:start'
	 * ```
	 */
	namespace(ns: string): EventEmitter<T> {
		const parent = this;
		const child = new EventEmitter<T>({ maxHistory: this._historyMax });

		child.on = function <K extends keyof T>(event: K, handler: EventHandler<T[K]>, opts?: { priority?: number }) {
			parent.on(`${ns}:${String(event)}` as keyof T, handler as EventHandler<T[keyof T]>, opts);
			return child;
		} as typeof child.on;

		child.once = function <K extends keyof T>(event: K, handler: EventHandler<T[K]>, opts?: { priority?: number }) {
			parent.once(`${ns}:${String(event)}` as keyof T, handler as EventHandler<T[keyof T]>, opts);
			return child;
		} as typeof child.once;

		child.off = function <K extends keyof T>(event: K, handler: EventHandler<T[K]>) {
			parent.off(`${ns}:${String(event)}` as keyof T, handler as EventHandler<T[keyof T]>);
			return child;
		} as typeof child.off;

		child.emit = function <K extends keyof T>(event: K, data: T[K]): boolean {
			return parent.emit(`${ns}:${String(event)}` as keyof T, data as T[keyof T]);
		} as typeof child.emit;

		child.removeListener = child.off;

		return child;
	}

	// ═══════════════════════════════════════════
	//  事件历史
	// ═══════════════════════════════════════════

	/**
	 * 获取事件历史记录
	 *
	 * @param event - 过滤事件名称（可选）
	 * @returns 历史记录数组
	 */
	getHistory(event?: keyof T): EventHistoryEntry[] {
		if (event !== undefined) {
			return this._history.filter(h => h.event === String(event));
		}
		return [...this._history];
	}

	/**
	 * 清空事件历史记录
	 *
	 * @param event - 清空指定事件的历史（可选，不传则全部清空）
	 * @returns 当前实例
	 */
	clearHistory(event?: keyof T): this {
		if (event !== undefined) {
			this._history = this._history.filter(h => h.event !== String(event));
		} else {
			this._history.length = 0;
		}
		return this;
	}

	/**
	 * 重放事件历史记录
	 *
	 * @param options - 重放选项
	 * @returns 当前实例
	 *
	 * @example
	 * ```ts
	 * // 重放最近 5 条 'data' 事件
	 * emitter.replayHistory({ event: 'data', count: 5 });
	 * ```
	 */
	replayHistory(options?: { event?: keyof T; count?: number }): this {
		let entries = options?.event !== undefined
			? this._history.filter(h => h.event === String(options.event))
			: [...this._history];

		if (options?.count !== undefined && options.count > 0) {
			entries = entries.slice(-options.count);
		}

		for (const entry of entries) {
			this.emit(entry.event as keyof T, entry.data as T[keyof T]);
		}
		return this;
	}

	// ═══════════════════════════════════════════
	//  兼容别名
	// ═══════════════════════════════════════════

	/** @alias off */
	removeListener<K extends keyof T>(event: K, handler: EventHandler<T[K]>): this {
		return this.off(event, handler);
	}

	// ═══════════════════════════════════════════
	//  生命周期
	// ═══════════════════════════════════════════

	/**
	 * 销毁发射器，清理所有资源
	 */
	dispose(): void {
		if (this._disposed) return;
		this._disposed = true;
		this._listeners.clear();
		this._wildcardListeners.length = 0;
		this._middlewares.length = 0;
		this._history.length = 0;
	}

	/**
	 * 是否已销毁
	 */
	get disposed(): boolean {
		return this._disposed;
	}

	// ═══════════════════════════════════════════
	//  私有方法
	// ═══════════════════════════════════════════

	private _assertNotDisposed(): void {
		if (this._disposed) {
			throw new Error('EventEmitter has been disposed');
		}
	}

	private _addListener<K extends keyof T>(event: K, entry: ListenerEntry<T[K]>): void {
		const list = this._listeners.get(event) ?? [];
		list.push(entry as ListenerEntry<unknown>);
		list.sort((a, b) => b.priority - a.priority);
		this._listeners.set(event, list);
	}

	private _recordHistory(event: string, data: unknown): void {
		this._history.push({
			event,
			data,
			timestamp: Date.now(),
		});
		if (this._history.length > this._historyMax) {
			this._history.shift();
		}
	}

	private _buildMiddlewareChain(event: keyof T, data: T[keyof T]): () => boolean {
		const middlewares = this._middlewares;
		const handlers = this._listeners.get(event) ?? [];
		const wildcards = this._wildcardListeners;

		let called = false;
		let mwIndex = 0;

		const runHandlers = (): boolean => {
			called = true;
			const toRemove: Array<{ list: ListenerEntry<unknown>[]; idx: number }> = [];

			for (let i = 0; i < handlers.length; i++) {
				const entry = handlers[i];
				try {
					(entry.handler as EventHandler<T[keyof T]>)(data);
				} catch {
					// handler error should not break chain
				}
				if (entry.once) {
					toRemove.push({ list: handlers as ListenerEntry<unknown>[], idx: i });
				}
			}

			// 清理 once 监听器（从后往前）
			for (let i = toRemove.length - 1; i >= 0; i--) {
				toRemove[i].list.splice(toRemove[i].idx, 1);
			}

			// 触发通配符
			for (let i = wildcards.length - 1; i >= 0; i--) {
				const wc = wildcards[i];
				try {
					wc.handler(String(event), data);
				} catch {
					// ignore
				}
				if (wc.once) {
					wildcards.splice(i, 1);
				}
			}

			return called;
		};

		const next = (): boolean => {
			mwIndex++;
			if (mwIndex < middlewares.length) {
				try {
					middlewares[mwIndex](event as keyof T, data, next);
				} catch {
					return runHandlers();
				}
				return called;
			}
			return runHandlers();
		};

		return () => {
			if (middlewares.length > 0) {
				try {
					middlewares[0](event as keyof T, data, next);
				} catch {
					return runHandlers();
				}
				return called;
			}
			return runHandlers();
		};
	}
}
