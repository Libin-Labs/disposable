export type Cleanup = () => void | PromiseLike<void>;

export class DisposalError extends AggregateError {
  override name = 'DisposalError';
  constructor(errors: readonly unknown[]) {
    super(errors, `${errors.length} cleanup operation${errors.length === 1 ? '' : 's'} failed`);
  }
}

export class DisposableStack {
  private cleanups: Cleanup[] = [];
  private state: 'active' | 'disposing' | 'disposed' = 'active';
  private disposal?: Promise<void>;

  get disposed(): boolean {
    return this.state === 'disposed';
  }

  defer(cleanup: Cleanup): this {
    if (this.state !== 'active')
      throw new Error('Cannot register cleanup after disposal has started');
    if (typeof cleanup !== 'function') throw new TypeError('cleanup must be a function');
    this.cleanups.push(cleanup);
    return this;
  }

  use<T>(resource: T, cleanup: (resource: T) => void | PromiseLike<void>): T {
    if (typeof cleanup !== 'function') throw new TypeError('cleanup must be a function');
    this.defer(() => cleanup(resource));
    return resource;
  }

  dispose(): Promise<void> {
    if (this.disposal !== undefined) return this.disposal;
    if (this.state === 'disposed') return Promise.resolve();
    this.state = 'disposing';
    const pending = this.cleanups.splice(0).reverse();
    this.disposal = Promise.resolve().then(async () => {
      const errors: unknown[] = [];
      for (const cleanup of pending) {
        try {
          await cleanup();
        } catch (error) {
          errors.push(error);
        }
      }
      this.state = 'disposed';
      if (errors.length > 0) throw new DisposalError(errors);
    });
    return this.disposal;
  }
}

export function createDisposableStack(): DisposableStack {
  return new DisposableStack();
}
