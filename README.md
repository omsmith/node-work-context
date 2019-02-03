# work-context

Helper for tracking work contexts, including across async boundaries.

## Install

```sh
npm install work-context --save
```

## Usage

```js
// Create storage for your work
import WorkContext from '..';

const storageMap = new Map();

const wc1 = new WorkContext().onFinish(() => storageMap.delete(wc1));
const wc2 = new WorkContext().onFinish(() => storageMap.delete(wc2));

storageMap.set(wc1, { key: 'wc1' }).set(wc2, { key: 'wc2' });

(async () => {
	await Promise.all([
		wc1.run(() => handler('A')),
		wc2.run(() => handler('B'))
	]);

	wc1.finish();
	wc2.finish();
})();

async function handler(logPrefix) {
	console.log(logPrefix, storageMap.get(WorkContext.getCurrent()).key)

	await new Promise(resolve => setTimeout(() => {
		console.log(logPrefix, storageMap.get(WorkContext.getCurrent()).key);
		resolve();
	}, 3));

	console.log(logPrefix, storageMap.get(WorkContext.getCurrent()).key);
}
```

## API

### `new WorkContext(): WorkContext`

The default export is a constructor function for a `WorkContext`. This is a
reference point for a particular set of work, such as a web request. By
indicating when a work context starts, it is generally possible to track it for
later usage.

---

#### `.onFinish(cb: () => void): WorkContext`

It is likely desireable to use the `WorkContext` object as a refernce for
some sort of storage or other tracking. To avoid excess memory build-up, it is
also important that such mechanisms would get cleaned up after the work is
done. A callback function can be registered with `.onFinished(callback)` to do
that cleanup when `.finish()` is called.

Returns the context instance for easy wire-up.

**NOTE:** Throws an `Error` if `.finish()` has already been called.

---

#### `.finish(): void`

To be called when work is completely finished in order to do cleanup. This
should be called _after_ `.run(fn)` has completed, and not during.

**NOTE:** Throws an `Error` if `.finish()` has already been called.

**NOTE:** Throws an `Error` if the context is still active.

---

#### `.run<T>(fn: () => T): T`

The reccomended way to do work in context. This `WorkContext` will be the
current context for calls inside of `fn`.

Returns whatever `fn` returns. Throws whatever `fn` throws.

**NOTE:** Throws an `Error` if `.finish()` has already been called.

**NOTE:** Throws a `TypeError` if `fn` is not a `function`;

---

#### `.enter(): () => void`

**Using `.run(fn)` is preferred and recommended.**

Sets the current context. Returns an "exit function" to call when work is
finished. Be sure to call the exit function even if errors are thrown or
Promises are rejected. Every call to `.enter()` must have a matching call to
the returned exit function, in the opposite order.

**NOTE:** Throws an `Error` if `.finish()` has already been called.

**NOTE:** The returned exit function throws an `Error` if called out of order.

---

### `WorkContext.getCurrent(): WorkContext | null`

Returns the currently-in-context `WorkContext`, or `null` if there isn't one.

---

### `WorkContext.AsyncHook: AsyncHook`

`work-context` leverages [`async_hooks`][async_hooks] to perform tracking
across async boundaries. The `AsyncHook` it uses to do so is available as
`WorkContext.AsyncHook` and is enabled by default. It can be disabled if this
is not desired, but its usage is generally recommended to maintain correctness.

#### `.enable(): AsyncHook`

#### `.disable(): AsyncHook`

## Code Style

This repository is configured with [EditorConfig][EditorConfig] and
[ESLint][ESLint] rules.

[async_hooks]: https://nodejs.org/api/async_hooks.html
[EditorConfig]: https://editorconfig.org
[ESLint]: https://eslint.org
