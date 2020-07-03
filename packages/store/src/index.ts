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
 * Combine multiple stores of states `A`, `B`, `C`, ... into a unique store interface
 * of state `Projection`
 * Could also be used to create a derived state from a unique store.
 * Use this to prevent redundant states.
 *
 * @example

  import * as Store from 'store';

  const storeA = Store.create(() =\> 2)();
  const storeB = Store.create(() =\> 3)();

  const storeP = Store.project(
    (a, b) =\> a + b,
    (c) =\> \{
      storeA.apply(() =\> c)();
      storeB.apply(() =\> 0)();
    \},
  )(storeA, storeB);

 *
 */
export function project<A, Projection>(
  stores: readonly [Store<A>],
  readProjection: (a: A) => Projection,
  applyProjection: (newState: Projection) => void,
): () => Store<Projection>;

export function project<A, B, Projection>(
  stores: readonly [Store<A>, Store<B>],
  readProjection: (a: A, b: B) => Projection,
  applyProjection: (newState: Projection) => void,
): () => Store<Projection>;

export function project<A, B, C, Projection>(
  stores: readonly [Store<A>, Store<B>, Store<C>],
  readProjection: (a: A, b: B, c: C) => Projection,
  applyProjection: (newState: Projection) => void,
): () => Store<Projection>;

export function project<A, B, C, D, Projection>(
  stores: readonly [Store<A>, Store<B>, Store<C>, Store<D>],
  readProjection: (a: A, b: B, c: C, d: D) => Projection,
  applyProjection: (reducer: Reducer<Projection>) => void,
): () => Store<Projection>;

export function project<Projection>(
  stores: readonly Store<unknown>[],
  readProjection: (...states: unknown[]) => Projection,
  applyProjection: (newState: Projection) => void,
): () => Store<Projection> {
  return () => {
    let isUpdating = false;

    const listeners: Listener<Projection>[] = [];

    function read(): Projection {
      const states = stores.map((store) => store.read());

      return readProjection(...states);
    }

    function apply(reducer: Reducer<Projection>) {
      return (): void => {
        const newState = reducer(read());

        // this is used to desactivate listeners to upstream stores while
        // applying projection update
        isUpdating = true;

        applyProjection(newState);

        isUpdating = false;

        // copying listeners list here to deals with unsubscribe nested in
        // subscription
        const localListeners = listeners.slice();
        localListeners.forEach((listener) => {
          listener(newState);
        });
      };
    }

    function subscribe(listener: Listener<Projection>) {
      if (typeof listener !== 'function') {
        throw new Error('Expected the listener to be a function.');
      }

      return (): Unsubscribe => {
        // we store listeners internally (to be called during the current
        // projection `apply` call) and we also register them to upstream stores
        // (to be called when stores are updated outside of the projection)

        listeners.push(listener);

        const unsubscribes = stores.map((store) =>
          store.subscribe(() => {
            // we have to prevent projection listeners to be called in a middle
            // of the current projection's `apply' call
            if (isUpdating) {
              return;
            }

            const currentState = read();

            listener(currentState);
          })(),
        );

        const removed = false;

        return (): void => {
          // don't remove `listener` again if unsubscribe function has already
          // been called once
          if (removed) {
            return;
          }

          const index = listeners.indexOf(listener);

          if (index > -1) {
            listeners.splice(index, 1);
          }

          unsubscribes.forEach((unsubscribe) => unsubscribe());
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
