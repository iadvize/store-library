/* eslint-disable no-underscore-dangle */
import * as Store from '@iadvize-oss/store';

type Options = Partial<{
  name: string;
  maxAge: number;
}>;

type ReduxDevtools = {
  connect(
    options: object,
  ): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    init(state: any): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send<A extends { type: string }>(action: A, state: any): void;
  };
};

type WindowWithDevtools = typeof window & {
  __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevtools;
};

export function withDevtools(options: Options = {}) {
  return <State>(store: Store.Store<State>) => {
    return (): Store.Store<State> => {
      const windowWithDevtools = window as WindowWithDevtools;

      if (!windowWithDevtools.__REDUX_DEVTOOLS_EXTENSION__) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn(
            `No Redux devtools extension found on window.\nPlease install the extension: https://github.com/zalmoxisus/redux-devtools-extension#installation`,
          );
        }

        return store;
      }

      const devTools = windowWithDevtools.__REDUX_DEVTOOLS_EXTENSION__.connect({
        name: options.name,
        maxAge: options.maxAge,
        features: {
          lock: false,
          persist: false,
          import: false,
          jump: false,
          skip: false,
          reorder: false,
          dispatch: false,
        },
      });

      devTools.init(store.read());

      return {
        ...store,

        apply(reducer: Store.Reducer<State>) {
          return (): void => {
            store.apply(reducer)();

            const reducerName = reducer.name || 'anonymous';
            const newState = store.read();

            const trace = new Error().stack;

            devTools.send(
              {
                type: reducerName,
                // eslint-disable-next-line camelcase
                _debugger_trace: trace,
              },
              newState,
            );
          };
        },
      };
    };
  };
}
