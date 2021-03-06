@iadvize/store
==============

A lightweight Javascript store library.

[📖 Documentation](https://iadvize.github.io/store-library/packages/store/)

# Basic example

```typescript
type Todo = {
  done: boolean;
  label: string;
};

type State = Todo[];

// initialise the store with an initial state
const todoStore = Store.create<State>(() => [
  { done: false, label: "writtings some doc" },
  { done: true, label: "napping" },
])();

// create a reducer function adding a new Todo
function appendNewTodoOnState(newTodo: string) {
  return function appendNewTodoReducer(state: State) {
    return [
      ...state,
      { done: false, label: newTodo }
    ];
  }
}

// associating the reducer function and a store instance
const appendNewTodo = Store.liftAndApply(appendNewTodoOnState, todoStore);

// create a reducer function removing all todos, ie. returning and empty state
const emptyTodosReducer = () => [];

// associating the reducer function and a store instance
const emptyTodos = todoStore.apply(emptyTodosReducer);

// registering a listener
const subscribeToTodoStore = todoStore.subscribe(newState => {
  console.log("newState", newState);
});

// applying the listener
const unsubscribeFromTodoStore = subscribeToTodoStore();

// triggering a change
appendNewTodo("have drink with my colleagues")();

// will log:
// newState, [{done: false, label: 'writtings some doc'},{done: true, label: 'napping'},{done: false, label: 'have drink with my colleagues'}]

// emptying the store 
emptyTodos();

// will log:
// newState, []

// removing the listener we don't need anymore
unsubscribeFromTodoStore();
```

# Reference

## `Store.create` - Store creation

```
Store.create<State>(initialState: () => State): () => Store<State>
```

You create a store with `Store.create` by passing it a function that will return
your initial state. This will return you a function to call to create the
corresponding store as many times you need.

**Params**

- `initialState: () => State` - Function that return the initial state

**Returns**

`() => Store<State>` - Effect to call to receive a Store initialized with the
initial state

**Example**

```typescript
const createTodoStore = Store.create<State>(() => [
  { done: false, label: "writtings some doc" },
  { done: true, label: "napping" }
]);

const todoStore = createTodoStore();
```

## `<store>.read` - Reading the state

Call `<store>.read` to read the state.

```
<store>.read(): State
```

**Returns**

`State` - Returns the state. 

**Example**

```typescript
const state = store.read();
console.log('state', state);
```

## `<store>.subscribe` - Subscribing to state change

You subscribe to state changes with `<store>.subscribe`. It accepts a listener
that receives the new state as a parameter.

```
<store>.subscribe(listener: Listener<State>): () => Unsubscribe
```

**Params**

- `listener: Listener<State>` - Where
  `Listener<State> = (state: State) => void`. The function that will be called
  when state change with the new state as argument.

**Returns**

`() => Unsubscribe` - A function to call to apply the subscription as many times
you need. 

When applying a subscription, you will receive in return an unsubscribe function
to call to unsubscribe this specific applied subscription where
`type Unsubscribe: () => void`.

**Example**

```typescript
// prepare the subscription to change
// subscribeToTodoStore :: () => Unsubscribe
const subscribeToTodoStore = todoStore.subscribe((state) =>
  console.log('new state', state);
);

// starting the listener
// unsubscribeFromTodoStore :: () => void 
const unsubscribeFromTodoStore = subscribeToTodoStore();

// unsubscribe when you are done
unsubscribeFromTodoStore();
```

## `<store>.apply` - Updating state

Call `<store>.apply` with a reducer to update the store.

```
<store>.apply(reducer: (state: State) => State): () => void
```

**Params**

- `reducer: (state: State) => State` - A function that receive a state and
  return a new state.

**Returns**

`() => void` - An effect to call to apply the update synchronously.

**Example**

```typescript
// preparing an update function
// appendNewTodoOnState :: (newTodo: string) => (state: State) => State
function appendNewTodoOnState(newTodo: string) {
  function appendNewTodoReducer(state: State) {
    return [
      ...state,
      { done: false, label: newTodo }
    ]
  }
}

// Preparing the update on the store
const appendNewTodo = todoStore.apply(
  appendNewTodoOnState('have drink with my colleagues')
);

// Applying the transformation
appendNewTodo();
```

Here we apply a reducer function directly on the store instance and trigger the
change with the `appendNewTodo` function.

Of course we would need `appendNewTodo` to accept any todo rather than a preset
one:

```typescript
// Preparing the update on the store
// appendNewTodo :: (newTodo: string) => () => void
const appendNewTodo = (newTodo: string) => todoStore.apply(
  appendNewTodoOnState(newTodo)
);

// Applying the transformation
appendNewTodo('have drink with my colleagues')();
```

Because this operation is so common, we can use `Store.liftAndApply` which will
handle the parameter passing for us and cut on the boilerplate:

```typescript
// appendNewTodo :: (newTodo: string) => () => void
const appendNewTodo = Store.liftAndApply(appendNewTodoOnState, todoStore);

appendNewTodo('have drink with my colleagues')();
```

## `Store.liftAndApply` - create a parametrized update

Call `Store.liftAndApply` to easily create an update effect function. Pass it
a function that given any parameters returns a reducer `State => State` and the
store.

```
Store.liftAndApply<
  State,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Fn extends (...args: any[]) => Reducer<State>
>(fn: Fn, store: Store<State>): (...args: Parameters<Fn>) => () => void
```

**Params**

- `fn: Fn` - Where `Fn extends (...args: any[]) => Reducer<State>` a function
  that returns a reducer.

- `store: Store<State>` - The store we want to update.

**Returns**

An function that accept `fn` arguments and return an effect to call to apply the
update synchronously.

**Example**

```typescript
// appendNewTodoOnState :: (newTodo: string, done: boolean) => (state: State) => State
function appendNewTodoOnState(newTodo: string, done: boolean) {
  function appendNewTodoReducer(state: State) {
    return [
      ...state,
      { done, label: newTodo }
    ]
  }
}

// appendNewTodo :: (newTodo: string, done: boolean) => () => void
const appendNewTodo = Store.liftAndApply(appendNewTodo, todoStore);

appendNewTodo('Groceries already done', true);
```
