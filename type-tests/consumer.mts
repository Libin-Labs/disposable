import { createDisposableStack, DisposalError, type Cleanup } from '@lp-labs/disposable';

const cleanup: Cleanup = async () => {};
const stack = createDisposableStack().defer(cleanup);
const failure: DisposalError | undefined = undefined;
// @ts-expect-error Cleanup callbacks return void or a promise-like void.
const invalidCleanup: Cleanup = () => 1;
void [stack.dispose(), failure];
void invalidCleanup;
