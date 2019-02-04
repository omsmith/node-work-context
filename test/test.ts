import test = require('tape');
import call from './will-call';

import WorkContext from '..';

test('work-context', t => (async () => {
	t.equal(WorkContext.getCurrent(), null, 'Should start without a context');

	const wc1 = new WorkContext();
	t.equal(WorkContext.getCurrent(), null, 'Constructing a work context should not set a context');

	{
		const exit = wc1.enter();
		t.equal(WorkContext.getCurrent(), wc1, '#enter should set context as current');
		t.equal(typeof exit, 'function', '#enter should return an exit function');
		t.equal(exit(), undefined, 'exit function should return undefined');
		t.equal(WorkContext.getCurrent(), null, 'exit function should clear the current context when only 1 deep');
	}

	t.equal(wc1.run(call.expect(() => {
		t.equal(WorkContext.getCurrent(), wc1, '#run should invoke function in context');

		wc1.run(call.expect(() => {
			t.equal(WorkContext.getCurrent(), wc1, 'Nested #run of same context should succeed');
		}));

		t.equal(WorkContext.getCurrent(), wc1, 'Nested #run of same context shouldn\'t clear context');

		return 'cats';
	})), 'cats', '#run should return return value of function');

	const wc2 = new WorkContext();

	{
		const exit1 = wc1.enter();
		t.equal(WorkContext.getCurrent(), wc1, '#enter should set current context when others exist');

		const exit2 = wc2.enter();
		t.equal(WorkContext.getCurrent(), wc2, '#enter should set current context to another context');
		exit2();

		t.equal(WorkContext.getCurrent(), wc1, 'exit function should return context back to first context');
		exit1();

		t.equal(WorkContext.getCurrent(), null, 'exit function should return context back to null');
	}

	wc1.run(call.expect(() => {
		t.equal(WorkContext.getCurrent(), wc1, '#run should invoke function in context');

		wc2.run(call.expect(() => {
			t.equal(WorkContext.getCurrent(), wc2, 'Nested #run should switch context');

			wc1.run(call.expect(() => {
				t.equal(WorkContext.getCurrent(), wc1, 'Double-nested #run should set context');
			}))

			t.equal(WorkContext.getCurrent(), wc2, 'Double-nested #run should return context');
		}));

		t.equal(WorkContext.getCurrent(), wc1, 'Nested #run should return context');
	}));
	t.equal(WorkContext.getCurrent(), null, '#run should clear current context at top of stack');

	{
		t.throws(call.expect(() => {
			wc1.run(call.expect(() => {
				throw new Error('cats');
			}));
		}), /[Error: cats]/, '#run should throw errors that occur in function');
		t.equal(WorkContext.getCurrent(), null, '#run should unwind context after error');
	}

	await Promise.all([
		wc1.run(async () => {
			t.equal(WorkContext.getCurrent(), wc1, '#run concurrently inside async');
			await Promise.resolve();
			t.equal(WorkContext.getCurrent(), wc1, '#run concurrently inside async after await');
			await new Promise(resolve => setTimeout(() => {
				t.equal(WorkContext.getCurrent(), wc1, 'Should maintain context inside timeout');
				resolve();
			}, 5));
			t.equal(WorkContext.getCurrent(), wc1, '#run concurrently inside async after await');
		}),
		wc2.run(async () => {
			t.equal(WorkContext.getCurrent(), wc2, '#run concurrently inside async');
			await Promise.resolve();
			t.equal(WorkContext.getCurrent(), wc2, '#run concurrently inside async after await');
			await new Promise(resolve => setTimeout(() => {
				t.equal(WorkContext.getCurrent(), wc2, 'Should maintain context inside timeout');
				resolve();
			}, 3));
			t.equal(WorkContext.getCurrent(), wc2, '#run concurrently inside async after await');
		})
	]);

	{
		const exit = wc1.enter();
		wc2.run(call.expect(() => {
			t.throws(exit, /[Error: Exit called out of order]/, 'exit should throw when called out of order');
			t.equal(WorkContext.getCurrent(), wc2, 'Still in wc2 after exit error');
		}));
		exit();
		t.equal(WorkContext.getCurrent(), null, 'exit should leave after enter and then run of another');
	}

	// @ts-ignore
	t.throws(() => wc1.run(), /[Error: "fn" should be a Function]/, '#run should throw when passed undefined');
	// @ts-ignore
	t.throws(() => wc1.run(1), /[Error: "fn" should be a Function]/, '#run should throw when passed a number');
	// @ts-ignore
	t.throws(() => wc1.run('cats'), /[Error: "fn" should be a Function]/, '#run should throw when passed a string');

	{
		const finished = new WorkContext();
		finished.finish();

		t.throws(() => finished.enter(), /[Error: Work context is already finished]/, '#enter should throw when finished');
		t.throws(() => finished.finish(), /[Error: Work context is already finished]/, '#finish should throw when finished');
		t.throws(() => finished.onFinish(() => {}), /[Error: Work context is already finished]/, '#onFinish should throw when finished');
		t.throws(() => finished.run(() => {}), /[Error: Work context is already finished]/, '#run should throw when finished');
	}

	{
		const wc = new WorkContext();

		let finishListenerACalled = false;
		wc.onFinish(call.expect(() => finishListenerACalled = true ));

		let finishListenerBCalled = false;
		wc.onFinish(call.expect(() => finishListenerBCalled = true ));

		let finishListenerCCalled = false;
		const remove = wc.onFinish(() => finishListenerCCalled = true);
		remove();

		t.equal(finishListenerACalled, false, 'finish listeners should not be called until #finish');
		t.equal(finishListenerBCalled, false, 'finish listeners should not be called until #finish');
		wc.finish();
		t.equal(finishListenerACalled, true, 'finish listeners should be called after #finish');
		t.equal(finishListenerBCalled, true, 'finish listeners should be called after #finish');
		t.equal(finishListenerCCalled, false, 'removed finish listeners should not be called on #finish');
	}

	{
		const wc = new WorkContext();

		wc.onFinish(call.expect(() => {
			throw new Error('throwing finish listener');
		}));

		t.throws(() => wc.finish(), /[Error: throwing finish listener]/, '#finish throws if a finish listener throws');
	}

	{
		const wc = new WorkContext();

		const remove = wc.onFinish(call.expect(() => {}));

		wc.finish();

		t.doesNotThrow(remove, 'removeFinishListener fn does not throw even if finished');
	}

	{
		const wc = new WorkContext();
		wc.run(call.expect(() => {
			t.throws(
				() => wc.finish(),
				/[Error: Finish called before context was cleared]/,
				'#finish throws if context is in use'
			);
		}));
	}

})().then(t.end, e => process.nextTick(() => t.end(e))));
