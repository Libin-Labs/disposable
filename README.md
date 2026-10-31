# @lp-labs/disposable

Register asynchronous or synchronous cleanup callbacks and dispose them in deterministic last-in-first-out order.

```ts
import { createDisposableStack } from "@lp-labs/disposable";

const cleanup = createDisposableStack();
const connection = cleanup.use({
  query: async (sql: string) => console.log(sql),
  close: () => console.log("closed")
}, (value) => value.close());
cleanup.defer(async () => console.log("metrics flushed"));
try {
  await connection.query("select 1");
} finally {
  await cleanup.dispose();
}
```

## API

- `Cleanup` is `() => void | PromiseLike<void>`.
- `DisposalError(errors: readonly unknown[])` extends `AggregateError`. Its `errors` array contains cleanup failures in the order callbacks ran (newest registration first); its message gives the count.
- `new DisposableStack()` creates an active stack. `disposed` is true only after cleanup has completed.
- `defer(cleanup): this` registers a function for cleanup and returns the stack for chaining. A non-function throws `TypeError`.
- `use<T>(resource, cleanup): T` registers a callback receiving that resource and returns the same resource for convenient acquisition patterns.
- `dispose(): Promise<void>` runs all registered callbacks exactly once in LIFO order, awaiting each before starting the next. It is safe to call concurrently; callers receive the same in-progress promise, and later calls after success resolve without repeating work. It rejects with `DisposalError` only after all callbacks have been attempted when one or more callbacks fail. Registering after disposal starts throws.
- `createDisposableStack(): DisposableStack` is a constructor helper, functionally equivalent to `new DisposableStack()`.

The stack is intentionally asynchronous and sequential. Cleanup is not automatically run on garbage collection or process exit; callers must invoke `dispose`, typically in `finally`. There is no synchronous-disposal or implicit language `using` integration. A cleanup should not await `dispose()` on the same stack, which would wait on itself. A failed cleanup does not stop later cleanup, and a failed disposal is not retried on subsequent calls.

## Compatibility and references

Targets ES2022 (`AggregateError` and promises), with no runtime dependencies. See [JavaScript AggregateError](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/AggregateError).

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
