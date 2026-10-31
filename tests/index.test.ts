import test from 'node:test';
import assert from 'node:assert/strict';
import { createDisposableStack, DisposableStack, DisposalError } from '../src/index.js';

test('runs cleanup in deterministic LIFO order and awaits async callbacks', async () => {
  const calls: string[] = [];
  const stack = createDisposableStack();
  stack.defer(() => {
    calls.push('first');
  });
  stack.use({ id: 'second' }, async (resource) => {
    await Promise.resolve();
    calls.push(resource.id);
  });
  stack.defer(() => {
    calls.push('last');
  });
  await stack.dispose();
  assert.deepEqual(calls, ['last', 'second', 'first']);
  assert.equal(stack.disposed, true);
});

test('disposal is idempotent, including concurrent callers', async () => {
  const stack = new DisposableStack();
  let count = 0;
  stack.defer(async () => {
    await Promise.resolve();
    count += 1;
  });
  const first = stack.dispose();
  const second = stack.dispose();
  assert.equal(first, second);
  await Promise.all([first, second]);
  await stack.dispose();
  assert.equal(count, 1);
});

test('continues after failures and aggregates errors in execution order', async () => {
  const stack = new DisposableStack();
  const calls: number[] = [];
  const first = new Error('first');
  const second = new Error('second');
  stack.defer(() => {
    calls.push(1);
    throw first;
  });
  stack.defer(async () => {
    calls.push(2);
    throw second;
  });
  stack.defer(() => {
    calls.push(3);
  });
  await assert.rejects(stack.dispose(), (error: unknown) => {
    assert.ok(error instanceof DisposalError);
    assert.deepEqual(error.errors, [second, first]);
    assert.equal(error.message, '2 cleanup operations failed');
    return true;
  });
  assert.deepEqual(calls, [3, 2, 1]);
  assert.equal(stack.disposed, true);
});

test('rejects late and invalid registration without mutating cleanup sequence', async () => {
  const stack = new DisposableStack();
  assert.throws(() => stack.defer(1 as never), TypeError);
  stack.defer(() => {});
  const pending = stack.dispose();
  assert.throws(() => stack.defer(() => {}), /after disposal has started/);
  await pending;
  assert.throws(() => stack.use({}, () => {}), /after disposal has started/);
});

test('exposes cleanup error array for a single failure too', async () => {
  const stack = createDisposableStack();
  const failure = new Error('fail');
  stack.defer(() => {
    throw failure;
  });
  await assert.rejects(stack.dispose(), (error: unknown) => {
    assert.ok(error instanceof AggregateError);
    assert.deepEqual(error.errors, [failure]);
    return true;
  });
});
