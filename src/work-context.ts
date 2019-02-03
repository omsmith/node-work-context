import hook from './async-hook';

const stack = new Array<WorkContext>();

export default class WorkContext {

	private _callbacks: Function[] | null = [];

	public onFinish(callback: () => void): WorkContext {
		this._checkFinished();

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this._callbacks!.push(callback);

		return this;
	}

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

	public static getCurrent(): WorkContext | null {
		if (stack.length === 0) {
			return null;
		}

		return stack[stack.length - 1];
	}

	public static readonly AsyncHook = hook;
}
