import { renderHook, act } from '@testing-library/react-hooks';

import { identity } from 'fp-ts/lib/function';

import * as Store from '@iadvize-oss/store';

import {
  useState,
  useSelector,
  createSelectorHook,
  createStateHook,
  Options,
} from '../src';

type State = { count: number };

describe('select', () => {
  describe.each([
    [
      'useSelector',
      function setupClassicHook() {
        const store = Store.create(() => ({
          count: 0,
        }))();

        function useSelectorBind<SubState>(
          selector: (state: State) => SubState,
          options?: Options<SubState>,
        ) {
          return useSelector(selector, store, options);
        }

        return [store, useSelectorBind] as const;
      },
    ],
    [
      'createSelectorHook',
      function setupClassicHook() {
        const store = Store.create(() => ({
          count: 0,
        }))();

        const useSelectorBind = createSelectorHook(() => store);

        return [store, useSelectorBind] as const;
      },
    ],
  ])('%s', (_, setupFunction) => {
    const incrementCount = (state: State) => {
      return {
        ...state,
        count: state.count + 1,
      };
    };

    let [store, useSelectorBind] = setupFunction();

    beforeEach(() => {
      [store, useSelectorBind] = setupFunction();
    });

    // inspired by react-redux
    it('selects the state on initial render', () => {
      const { result } = renderHook(() => useSelectorBind((s) => s.count));

      expect(result.current).toEqual(0);
    });

    // inspired by react-redux
    it('throws if missing selector or selector is not a function', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(() => useSelectorBind()).toThrow(/be a function/);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(() => useSelectorBind('hello')).toThrow(/be a function/);
    });

    // inspired by react-redux
    it('selects the state and renders the component when the store updates', () => {
      const { result } = renderHook(() => useSelectorBind((s) => s.count));

      expect(result.current).toEqual(0);

      act(store.apply(incrementCount));

      expect(result.current).toEqual(1);
    });

    it('unsubscribes when component unmounts', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderedItems: any[] = [];
      const { result, unmount } = renderHook(() => {
        const count = useSelectorBind((s) => s.count);

        renderedItems.push(count);

        return count;
      });

      expect(result.current).toEqual(0);
      expect(renderedItems).toHaveLength(1);

      act(store.apply(incrementCount));

      expect(result.current).toEqual(1);
      expect(renderedItems).toHaveLength(2);

      unmount();

      act(store.apply(incrementCount));

      // not new renderedItems after unmount
      expect(renderedItems).toHaveLength(2);
    });

    // inspired by react-redux
    it('defaults to ref-equality to prevent unnecessary updates', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderedItems: any[] = [];

      renderHook(() => {
        const result = useSelectorBind((s) => s.count);
        renderedItems.push(result);
      });

      expect(renderedItems).toHaveLength(1);

      act(store.apply(identity));

      expect(renderedItems).toHaveLength(1);
    });

    // inspired by react-redux
    it('allows other equality functions to prevent unnecessary updates', () => {
      function customEquals(currentState: number, nextState: number) {
        return currentState === 1 && nextState === 2;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderedItems: any[] = [];

      renderHook(() => {
        const result = useSelectorBind((s) => s.count, {
          equals: customEquals,
        });

        renderedItems.push(result);
      });

      expect(renderedItems).toHaveLength(1);

      act(store.apply(incrementCount));

      expect(renderedItems).toHaveLength(2);

      act(store.apply(incrementCount)); // should do nothing

      expect(renderedItems).toHaveLength(2);

      act(store.apply(incrementCount));

      expect(renderedItems).toHaveLength(3);
    });

    // inspired by react-redux
    it('notices store updates between render and store subscription effect', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderedItems: any[] = [];

      renderHook(() => {
        const result = useSelectorBind((s) => s.count);
        renderedItems.push(result);

        if (result === 0) {
          store.apply(incrementCount)();
        }
      });

      expect(renderedItems).toEqual([0, 1]);
    });
  });
});

describe('state', () => {
  describe.each([
    [
      'useState',
      function setupClassicHook() {
        const store = Store.create(() => ({
          count: 0,
        }))();

        function useStateBind(options?: Options<State>) {
          return useState(store, options);
        }

        return [store, useStateBind] as const;
      },
    ],
    [
      'createStateHook',
      function setupClassicHook() {
        const store = Store.create(() => ({
          count: 0,
        }))();

        const useStateBind = createStateHook(() => store);

        return [store, useStateBind] as const;
      },
    ],
  ])('%s', (_, setupFunction) => {
    const incrementCount = ({ count }: State) => ({ count: count + 1 });

    let [store, useStateBind] = setupFunction();

    beforeEach(() => {
      [store, useStateBind] = setupFunction();
    });

    // inspired by react-redux
    it('selects the state on initial render', () => {
      const { result } = renderHook(() => useStateBind());

      expect(result.current).toEqual({ count: 0 });
    });

    // inspired by react-redux
    it('selects the state and renders the component when the store updates', () => {
      const { result } = renderHook(() => useStateBind());

      expect(result.current).toEqual({ count: 0 });

      act(store.apply(incrementCount));

      expect(result.current).toEqual({ count: 1 });
    });

    it('unsubscribes when unmount', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderedItems: any[] = [];
      const { result, unmount } = renderHook(() => {
        const count = useStateBind();

        renderedItems.push(count);

        return count;
      });

      expect(result.current).toEqual({ count: 0 });
      expect(renderedItems).toHaveLength(1);

      act(store.apply(incrementCount));

      expect(result.current).toEqual({ count: 1 });
      expect(renderedItems).toHaveLength(2);

      unmount();

      act(store.apply(incrementCount));

      // not new renderedItems after unmount
      expect(renderedItems).toHaveLength(2);
    });

    // inspired by react-redux
    it('defaults to ref-equality to prevent unnecessary updates', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderedItems: any[] = [];

      renderHook(() => {
        const result = useStateBind();
        renderedItems.push(result);
      });

      expect(renderedItems).toHaveLength(1);

      act(store.apply(identity));

      expect(renderedItems).toHaveLength(1);
    });

    // inspired by react-redux
    it('allows other equality functions to prevent unnecessary updates', () => {
      const equals = (currentState: State, nextState: State) => {
        return currentState.count - nextState.count <= 1;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderedItems: any[] = [];

      renderHook(() => {
        const result = useStateBind({ equals });
        renderedItems.push(result);
      });

      expect(renderedItems).toHaveLength(1);

      act(store.apply(incrementCount));

      expect(renderedItems).toHaveLength(1);
    });

    // inspired by react-redux
    it('notices store updates between render and store subscription effect', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderedItems: any[] = [];

      renderHook(() => {
        const result = useStateBind();
        renderedItems.push(result);

        if (result.count === 0) {
          store.apply(incrementCount)();
        }
      });

      expect(renderedItems).toEqual([{ count: 0 }, { count: 1 }]);
    });
  });
});
