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
  }
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

  const equals = options.equals || Eq.strictEqual;

  const [currentSubState, updateCurrentSubState] = React.useState(
    selector(store.read()),
  );

  useIsomorphicLayoutEffect(() => {
    function checkForUpdates(newState: State) {
      const newSubState = selector(newState);

      if (equals(currentSubState, newSubState)) {
        return;
      }

      updateCurrentSubState(newSubState);
    }

    const unsubscribe = store.subscribe(checkForUpdates)();

    checkForUpdates(store.read());

    return unsubscribe;
  }, [store]);

  React.useDebugValue(currentSubState);

  return currentSubState;
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
  }
 *
 */
export function useState<State>(
  store: Store.Store<State>,
  options?: Options<State>,
): State {
  return useSelector(identity, store, options);
}

export function createStateHook<State>(store: Store.Store<State>) {
  return function useStateS(options?: Options<State>) {
    return useState(store, options);
  };
}

export function createSelectorHook<State>(store: Store.Store<State>) {
  return function useSelectorS<SelectedState>(
    selector: (state: State) => SelectedState,
    options?: Options<SelectedState>,
  ) {
    return useSelector(selector, store, options);
  };
}
