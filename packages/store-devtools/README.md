@iadvize/store-devtools
=======================

Devtools for `@iadvize/store`, a lightweight Javascript store library.

Use `@iadvize/store-devtools` to debug your store with [ReduxDevtools
extension](https://github.com/zalmoxisus/redux-devtools-extension).

# Usage

```
npm install @iadvize-oss/store @iadvize-oss/store-devtools
```

`@iadvize-oss/store` is a peer-dependency

# Example

```typescript
import * as Store from '@iadvize/store';
import { withDevtools } from '@iadvize/store-devtools';

const store = withDevtools({
  name: 'my store',
})(Store.create(() => 2)());
```

Instead of classic `Redux` action type, it will try to use the reducer function
name to log the change.

```typescript
store.apply(
  function multiplyByTwo(state: number) {
    return state * 2;
  }
)();
```

Devtools will use `multiplyByTwo` as change type here.
