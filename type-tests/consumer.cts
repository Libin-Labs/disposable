import disposable = require('@lp-labs/disposable');

const stack = new disposable.DisposableStack();
stack.use({ value: 1 }, (resource) => {
  void resource.value;
});
void stack.dispose();
