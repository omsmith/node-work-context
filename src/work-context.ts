import hook from './async-hook';

const stack = new Array<WorkContext>();

/**
 * This is a reference point for a particular set of work, such as a web
 * request. By indicating when a work context starts, it is generally possible
 * to track it for later usage.
 */
export default class WorkContext {

	private _callbacks: Function[] | null = [];

	/**
	 * It is likely desireable to use the `WorkContext` object as a reference
	 * for some sort of storage or other tracking. To avoid excess memory
	 * build-up, it is also important that such mechanisms would get cleaned up
	 * after the work is done. A callback function can be registered with
	 * `.onFinished(callback)` to do that cleanup when `.finish()` is called.
	 *
	 * @param callback
	 */
	public onFinish(callback: () => void): WorkContext {
		this._checkFinished();

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this._callbacks!.push(callback);

		return this;
	}

	/**
	 * To be called when work is completely finished in order to do cleanup.
	 * This should be called _after_ `.run(fn)` has completed, and not during.
	 */
	public finish(): void {
		this._checkFinished();

		if (stack.includes(this)) {
			throw new Error('Finish called before context was cleared');
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		for (const cb of this._callbacks!) {
			if (cb) {
				cb();
			}
		}

		this._callbacks = null;
	}

	/**
	 * **Using `.run(fn)` is preferred and recommended.**
	 *
	 * Sets the current context. Returns an "exit function" to call when work
	 * is finished. Be sure to call the exit function even if errors are thrown
	 * or Promises are rejected. Every call to `.enter()` must have a matching
	 * call to the returned exit function, in the opposite order.
	 */
	public enter(): () => void {
		this._checkFinished();

		stack.push(this);

		const position = stack.length;
		return () => {
			if (stack.length !== position) {
				throw new Error('Exit called out of order')
			}
			stack.pop();
		};
	}

	/**
	 * The reccomended way to do work in context. This `WorkContext` will be
	 * the current context for calls inside of `fn`.
	 *
	 * Returns whatever `fn` returns. Throws whatever `fn` throws.
	 *
	 * @param fn
	 */
	public run<T>(fn: () => T): T {
		this._checkFinished();

		if (typeof fn !== 'function') {
			throw new TypeError('"fn" should be a Function');
		}

		const exit = this.enter();

		try {
			return fn();
		} finally {
			exit();
		}
	}

	private _checkFinished(): void {
		if (this._callbacks === null) {
			throw new Error('Work context has already finished')
		}
	}

	/**
	 * Returns the currently-in-context `WorkContext`, or `null` if there
	 * isn't one.
	 */
	public static getCurrent(): WorkContext | null {
		if (stack.length === 0) {
			return null;
		}

		return stack[stack.length - 1];
	}
}

/**
 * `work-context` leverages `async_hooks` to perform tracking across async
 * boundaries. The `AsyncHook` it uses to do so is available as an export named
 * `AsyncHook` and is enabled by default. It can be disabled if this is not
 * desired, but its usage is generally recommended to maintain correctness.
 */
export { hook as AsyncHook };
