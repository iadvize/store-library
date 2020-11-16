@iadvize/store-react
====================

This the React binding library for `@iadvize/store`, a lightweight Javascript
store library.

[📖 Documentation](https://iadvize.github.io/store-library/packages/store-react/)

# Installation 

```
npm add react @iadvize-oss/store @iadvize-oss/store-react
```

`react` and `@iadvize-oss/store` are peer dependencies

# Usage

It's easy to use `@iadvize/store` with React thanks to hooks exposed by
`@iadvize/store-react`.

## `useState`

Hook to get store's state. Will subscribe to change and cause rerender.

```
useState<State>(store: Store<State>, options?: Options<State>) => State
```

**Params**

- `store: Store<State>` - The store

- `options: Options<State>` - Optional. See `Options` below.

**Returns**

`State` - The full store state

**Example**

```typescript
const store = Store.create(() => 2)(); 

function Component() {
  const state = useState(store);

  return <p>{state}</p>; // Will return <p>2</p>
}
```

## `createStateHook`

Use `createStateHook` to create a `useState` hook specific to a store.

```
createStateHook<State>(getStore: () => Store<State>): (options?: Options<State>) => State
```

**Params**

- `getStore: () => Store<State>` - A function returning the store.

- `options: Options<State>` - Optional. See `Options` below.

**Returns**

`State` - The full store state

**Example**

```typescript
const store = Store.create(() => 2)(); 

const useState = createStateHook(() => store);

function Component() {
  const state = useState();

  return <p>{state}</p>; // Will return <p>2</p>
}
```

## `useSelector`

Hook to get store's state and apply a selector on it. Will subscribe to change
and cause rerender.

```
useSelector<State, SubState>(
  selector: (state: State) => SubState,
  store: Store<State>,
  options: Options<SubState> = {},
): SubState
```

**Params**

- `selector: (state: State) => SubState` - Selector over state.

- `store: Store<State>` - The store.

- `options: Options<SubState>` - Optional. See `Options` below.

**Returns**

`SubState` - The result of `selector` over state 

**Example**

```typescript
const store = Store.create(() => ({ value: 2 }))();

function Component() {
  const subState = useSelector(({ value }) => value, store);

  return <p>{subState}</p> // Will return <p>2</p>
}
```

## `createSelectorHook`

Use `createSelectorHook` to create a `useSelector` hook specific to a store.

```
createSelectorHook<State>(getStore: () => Store<State>): (
  selector: (state: State) => SubState,
  options?: Options<State>,
): State
```

**Params**

- `getStore: () => Store<State>` - A function returning the store.

- `selector: (state: State) => SubState` - Selector over state.

- `options: Options<State>` - Optional. See `Options` below.

**Returns**

`State` - The full store state

**Example**

```typescript
const store = Store.create(() => ({ value: 2 }))();

const useSelector = createSelectorHook(store);

function Component() {
  const subState = useSelector(({ value }) => value);

  return <p>{subState}</p>; // Will return <p>2</p>
}
```

## `Options<State>`

```typescript
type Options<State> = Partial<{
  equals: (currentState: State, nextState: State) => boolean;
}>;
```

When the stores change, `useSelector` and `useState` hooks only force a
re-render if the hook result is different than the last result.

You can provide your own `equals` function that should return true if
`currentState` is the same as `nextState`. Default is strict equality (`===`).

Providing a shallow equality function is a common pattern when the
`useSelector` or `useState` hooks return a new object object every time, like in
this example:

```typescript
import { shallowEqual } from 'somelib';

type Todo = {
  done: boolean;
  label: string;
};

type State = Todo[];

const store: Store<State> = ...;

function pendingDoneSelector(state: state) { // returns a new object every time
  return {
    pending: state.filter(({ done }) => !done),
    done: state.filter(({ done }) => done),
  };
}

function Component() {
  // with the shallowEqual function, the selector will not force a re-render
  // when pendingDoneSelector returned object content doesn't change, even if
  // it's not strictly the same reference
  const state = useSelector(pendingDoneSelector, store, { equals: shallowEqual });

  return ...
}
```
