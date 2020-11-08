export type Reducer<State> = (state: State) => State;

export type Listener<State> = (state: State) => void;

export type Unsubscribe = () => void;

export type Store<State> = {
  /**
   * Read the store current state
   *
   * @example

    import * as Store from 'store';

    const store = Store.create(() =\> 2)();

    store.read() // 2

   *
   */
  readonly read: () => State;

  /**
   * Apply a reducer on the state and update the store current state with the
   * result
   *
   * @example

    import * as Store from 'store';

    const store = Store.create(() =\> 2)();

    store.apply(state =\> state + 1)();

    store.read() // 3

   *
   */
  readonly apply: (reducer: Reducer<State>) => () => void;

  /**
   * Subscribe a listener to state changes
   *
   * The subscription returns a function to call to unsubscribe.
   *
   * @example

    import * as Store from 'store';

    const store = Store.create(() =\> 2)();

    const subscribe = store.subscribe(() =\> console.log('hello world'));

    const unsubscribe = subscribe();

    store.apply(state =\> state + 1)();

    // hello world

    unsubscribe();

    store.apply(state =\> state + 1)();

   *
   */
  readonly subscribe: (listener: Listener<State>) => () => Unsubscribe;
};

/**
 * Store creation with a initialState
 *
 * @example

  import * as Store from 'store';

  const createNumberStore = Store.create(() =\> 2);

  const store = createNumberStore();

 *
 */
export function create<State>(
  setupInitialState: () => State,
): () => Store<State> {
  return () => {
    let state = setupInitialState();

    const listeners: Listener<State>[] = [];

    function read(): State {
      return state;
    }

    function apply(reducer: Reducer<State>) {
      return (): void => {
        state = reducer(state);

        // copying listeners list here to deals with unsubscribe nested in
        // subscription
        const localListeners = listeners.slice();
        localListeners.forEach((listener) => {
          listener(state);
        });
      };
    }

    function subscribe(listener: Listener<State>) {
      if (typeof listener !== 'function') {
        throw new Error('Expected the listener to be a function.');
      }

      return (): Unsubscribe => {
        listeners.push(listener);

        let removed = false;

        return (): void => {
          // don't remove `listener` again if unsubscribe function has already
          // been called once
          if (removed) {
            return;
          }

          removed = true;

          const index = listeners.indexOf(listener);

          if (index > -1) {
            listeners.splice(index, 1);
          }
        };
      };
    }

    return {
      read,
      apply,
      subscribe,
    };
  };
}

/**
   * Lift and apply a reducer factory, returning a function that, given some
   * arguments, will apply the reducer on the state and update the store current
   * state with the result
   *
   * @example

    import * as Store from 'store';

    const store = Store.create(() =\> 2)();

    // instead of:
    const add = (n: number) =\> store.apply(state =\> state + n);

    // write:
    const add = Store.liftAndApply((n: number) =\> state =\> state + n, store);

    add(2)();
    store.read() // 4
   *
   */
export function liftAndApply<
  State,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Fn extends (...args: any[]) => Reducer<State>
>(fn: Fn, store: Store<State>): (...args: Parameters<Fn>) => () => void {
  return (...args: Parameters<Fn>) => store.apply(fn(...args));
}
