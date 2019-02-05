import AsyncHooks = require('async_hooks');

import WorkContext from './work-context';

// eslint-disable-next-line @typescript-eslint/prefer-interface
type MapEntry = {
	ctx: WorkContext;
	exit: null | (() => void);
	removeFinishListener: () => void;
}
const map = new Map<number, MapEntry>();

export default AsyncHooks
	.createHook({
		init(asyncId: number) {
			const ctx = WorkContext.getCurrent();
			if (ctx === null) {
				return;
			}

			const onFinish = function onFinish(): void {
				map.delete(asyncId);
			};

			map.set(asyncId, {
				ctx,
				exit: null,
				removeFinishListener: ctx.onFinish(onFinish)
			});
		},

		before(asyncId: number) {
			const mapped = map.get(asyncId);
			if (!mapped) {
				return;
			}

			mapped.exit = mapped.ctx.enter();
		},

		after(asyncId: number) {
			const mapped = map.get(asyncId);
			if (!mapped) {
				return;
			}

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			mapped.exit!();
			mapped.exit = null;
		},

		destroy(asyncId: number) {
			const mapped = map.get(asyncId);
			if (!mapped) {
				return;
			}

			mapped.removeFinishListener();
			map.delete(asyncId);
		}
	})
	.enable();
