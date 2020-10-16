import * as React from 'react';

import * as Eq from 'fp-ts/lib/Eq';
import { identity } from 'fp-ts/lib/function';

import * as Store from '@iadvize-oss/store';

export type Options<State> = Partial<{
  /**
   * Used to check if nextState is the same as currentState to prevent excessive
   * renders
   */
  equals: (currentState: State, nextState: State) => boolean;
}>;

/**
 * Copied from react-redux
 *
 * React currently throws a warning when using useLayoutEffect on the server.
 * To get around it, we can conditionally useEffect on the server (no-op) and
 * useLayoutEffect in the browser. We need useLayoutEffect to ensure the store
 * subscription callback always has the selector from the latest render commit
 * available, otherwise a store update may happen between render and the effect,
 * which may cause missed updates; we also must ensure the store subscription
 * is created synchronously, otherwise a store update may occur before the
 * subscription is created and an inconsistent state may be observed
 */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined'
    ? React.useLayoutEffect
    : React.useEffect;

/**
 * Access store state and apply given selector.
 *
 * @param selector - Given a state, produces a sub state.
 *                   Should be pure. A selector returning something new even
 *                   when state does not change will create infinite loop.
 * @param store - The store to watch for state changes.
 * @param options - Optional options to customize the way the selected result
 *                  is handle.
 *
 * @example
 *
  import React from 'react';
  import \{ useSelector \} from 'store-react';

  import \{ store \} from './store';

  export const Component = () =\> \{
    const message = useSelector(state =\> state.message, store);

    return <div>\{message\}</div>
  \}
 *
 */
export function useSelector<State, SubState>(
  selector: (state: State) => SubState,
  store: Store.Store<State>,
  options: Options<SubState> = {},
): SubState {
  if (typeof selector !== 'function') {
    throw new Error('Selector need to be a function');
  }
  const [, forceRender] = React.useReducer((s) => s + 1, 0);

  const state = store.read();

  const equals = options.equals || Eq.eqStrict.equals;

  const stateRef = React.useRef(state);
  const selectorRef = React.useRef(selector);
  const equalsRef = React.useRef(equals);
  const erroredRef = React.useRef(false);

  const currentSubStateRef = React.useRef<SubState>();

  if (currentSubStateRef.current === undefined) {
    currentSubStateRef.current = selector(state);
  }

  let newStateSlice: SubState | undefined;
  let hasNewStateSlice = false;

  // The selector or equalityFn need to be called during the render phase if
  // they change.
  // We also want legitimate errors to be visible so we re-run
  // them if they errored in the subscriber.
  if (
    stateRef.current !== state ||
    selectorRef.current !== selector ||
    equalsRef.current !== equals ||
    erroredRef.current
  ) {
    // Using local variables to avoid mutations in the render phase.
    newStateSlice = selector(state);
    hasNewStateSlice = !equalsRef.current(
      currentSubStateRef.current,
      newStateSlice,
    );
  }

  // Syncing changes in useEffect.
  useIsomorphicLayoutEffect(() => {
    if (hasNewStateSlice) {
      currentSubStateRef.current = newStateSlice;
    }

    stateRef.current = state;
    selectorRef.current = selector;
    equalsRef.current = equals;
    erroredRef.current = false;
  });

  const stateBeforeSubscriptionRef = React.useRef(state);

  useIsomorphicLayoutEffect(() => {
    let unsubscribed = false;

    const listener = () => {
      if (unsubscribed) {
        return;
      }

      try {
        const nextState = store.read();
        const nextStateSlice = selectorRef.current(nextState);

        if (
          !equalsRef.current(
            currentSubStateRef.current as SubState,
            nextStateSlice,
          )
        ) {
          stateRef.current = nextState;
          currentSubStateRef.current = nextStateSlice;

          forceRender();
        }
      } catch (error) {
        erroredRef.current = true;
        forceRender();
      }
    };

    const unsubscribe = store.subscribe(listener)();

    if (store.read() !== stateBeforeSubscriptionRef.current) {
      listener(); // state has changed before subscription
    }

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }, [store]);

  const stateSliceToReturn = hasNewStateSlice
    ? (newStateSlice as SubState)
    : currentSubStateRef.current;

  React.useDebugValue(stateSliceToReturn);

  return stateSliceToReturn;
}

/**
 * Access store state.
 *
 * Pass optional options to customize the way the selected result is handle.
 *
 * @param store - The store to watch for state changes.
 * @param options - Optional options to customize the way the selected result
 *                  is handle.
 *
 * @example
 *
  import React from 'react';
  import \{ useState \} from 'store-react';

  import \{ store \} from './store';

  export const Component = () =\> \{
    const state = useState(store);

    return <div>\{state\}</div>
  \}
 *
 */
export function useState<State>(
  store: Store.Store<State>,
  options?: Options<State>,
): State {
  return useSelector(identity, store, options);
}

export function createStateHook<State>(getStore: () => Store.Store<State>) {
  return function useStateS(options?: Options<State>) {
    const store = getStore();

    return useState(store, options);
  };
}

export function createSelectorHook<State>(getStore: () => Store.Store<State>) {
  return function useSelectorS<SelectedState>(
    selector: (state: State) => SelectedState,
    options?: Options<SelectedState>,
  ) {
    const store = getStore();

    return useSelector(selector, store, options);
  };
}
