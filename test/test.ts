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

})().then(t.end, e => process.nextTick(() => t.end(e))));
