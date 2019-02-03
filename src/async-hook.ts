import AsyncHooks = require('async_hooks');

import WorkContext from './work-context';

const map = new Map<number, { ctx: WorkContext; exits: (() => void)[] }>();

export default AsyncHooks
	.createHook({
		init(asyncId: number) {
			const ctx = WorkContext.getCurrent();
			if (ctx === null) {
				return;
			}

			map.set(asyncId, {
				ctx,
				exits: []
			});

			ctx.onFinish(() => {
				map.delete(asyncId);
			});
		},

		before(asyncId: number) {
			const mapped = map.get(asyncId);
			if (!mapped) {
				return;
			}

			mapped.exits.push(mapped.ctx.enter());
		},

		after(asyncId: number) {
			const mapped = map.get(asyncId);
			if (!mapped) {
				return;
			}

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			mapped.exits.pop()!();
		},

		destroy(asyncId: number) {
			map.delete(asyncId);
		}
	})
	.enable();
