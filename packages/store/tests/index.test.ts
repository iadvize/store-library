import * as Store from '../src';

describe('store', () => {
  describe('create', () => {
    it('saves initialState', () => {
      const store = Store.create(() => 2)();

      expect(store.read()).toEqual(2);
    });
  });

  const classicStoreFactory = Store.create(() => ({ value: 2 }));

  const projectionStoreFactory = function () {
    const baseStore = Store.create(() => 2)();

    const projection = Store.project(
      [baseStore],
      (value) => ({ value }),
      ({ value }) => {
        baseStore.apply(() => value)();
      },
    )();

    return projection;
  };

  describe.each([
    ['normal', classicStoreFactory],
    ['projection', projectionStoreFactory],
  ])('%s store', (_, storeFactory) => {
    describe('apply', () => {
      it('modifies state with a reducer given the previous state', () => {
        const store = storeFactory();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(store.read()).toEqual({ value: 3 });
      });

      it('should not return anything as it needs "read" to return', () => {
        const store = storeFactory();

        const result = store.apply(({ value }) => ({ value: value + 1 }))();

        expect(result).toBeUndefined();
      });
    });

    describe('subscribe', () => {
      it('throws if listener is not a function', () => {
        const store = storeFactory();

        const listener1 = 'hello';

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        expect(() => store.subscribe(listener1)).toThrow(/be a function/);
      });

      it('can subscribe multiple times the same prepared subscription', () => {
        const store = storeFactory();

        const listener = jest.fn();

        const preparedSubscription = store.subscribe(listener);

        const unsubscribe1 = preparedSubscription();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener).toHaveBeenCalledTimes(1);

        const unsubscribe2 = preparedSubscription();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener).toHaveBeenCalledTimes(3);

        unsubscribe1();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener).toHaveBeenCalledTimes(4);

        unsubscribe2();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener).toHaveBeenCalledTimes(4);

        const unsubscribe3 = preparedSubscription();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener).toHaveBeenCalledTimes(5);

        unsubscribe3();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener).toHaveBeenCalledTimes(5);
      });

      it('subscribes multiple listeners to state change and allow user to unsubscribe', () => {
        const store = storeFactory();

        const listener1 = jest.fn();
        const listener2 = jest.fn();

        const unsubscribe1 = store.subscribe(listener1)();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener1).toHaveBeenCalledTimes(1);

        const unsubscribe2 = store.subscribe(listener2)();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener1).toHaveBeenCalledTimes(2);
        expect(listener2).toHaveBeenCalledTimes(1);

        unsubscribe1();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener1).toHaveBeenCalledTimes(2);
        expect(listener2).toHaveBeenCalledTimes(2);

        unsubscribe2();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener1).toHaveBeenCalledTimes(2);
        expect(listener2).toHaveBeenCalledTimes(2);
      });

      // inspired from Redux createStore test
      it('only removes relevant listener when unsubscribe is called', () => {
        const store = storeFactory();

        const listener1 = jest.fn();

        // this one will not be unsubscribed
        store.subscribe(listener1)();

        // this one will be unsubscribed
        const unsubscribe = store.subscribe(listener1)();

        unsubscribe();
        unsubscribe();

        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener1).toHaveBeenCalledTimes(1);
      });

      // inspired from Redux createStore test
      it('supports removing a subscription within a subscription', () => {
        const store = storeFactory();

        const listener1 = jest.fn();
        const listener2 = jest.fn();
        const listener3 = jest.fn();

        store.subscribe(listener1)();

        const unSubB = store.subscribe(() => {
          listener2();
          unSubB();
        })();

        store.subscribe(listener3)();

        store.apply(({ value }) => ({ value: value + 1 }))();
        store.apply(({ value }) => ({ value: value + 1 }))();

        expect(listener1).toHaveBeenCalledTimes(2);
        expect(listener2).toHaveBeenCalledTimes(1);
        expect(listener3).toHaveBeenCalledTimes(2);
      });

      // inspired from Redux createStore test
      it('notifies all subscribers about current apply regardless if any of them gets unsubscribed in the process', () => {
        const store = storeFactory();

        const listener1 = jest.fn();
        const listener2 = jest.fn();
        const listener3 = jest.fn();

        const unsubscribeHandles: (() => void)[] = [];
        const doUnsubscribeAll = () =>
          unsubscribeHandles.forEach((unsubscribe) => unsubscribe());

        unsubscribeHandles.push(store.subscribe(listener1)());
        unsubscribeHandles.push(
          store.subscribe(() => {
            listener2();
            doUnsubscribeAll();
          })(),
        );
        unsubscribeHandles.push(store.subscribe(listener3)());

        store.apply(({ value }) => ({ value: value + 1 }))();
        expect(listener1).toHaveBeenCalledTimes(1);
        expect(listener2).toHaveBeenCalledTimes(1);
        expect(listener3).toHaveBeenCalledTimes(1);

        store.apply(({ value }) => ({ value: value + 1 }))();
        expect(listener1).toHaveBeenCalledTimes(1);
        expect(listener2).toHaveBeenCalledTimes(1);
        expect(listener3).toHaveBeenCalledTimes(1);
      });

      // inspired from Redux createStore test
      it('notifies only subscribers active at the moment of current apply', () => {
        const store = storeFactory();

        const listener1 = jest.fn();
        const listener2 = jest.fn();
        const listener3 = jest.fn();

        let listener3Added = false;
        const maybeAddThirdListener = () => {
          if (!listener3Added) {
            listener3Added = true;
            store.subscribe(listener3)();
          }
        };

        store.subscribe(listener1)();
        store.subscribe(() => {
          listener2();
          maybeAddThirdListener();
        })();

        store.apply(({ value }) => ({ value: value + 1 }))();
        expect(listener1).toHaveBeenCalledTimes(1);
        expect(listener2).toHaveBeenCalledTimes(1);
        expect(listener3).toHaveBeenCalledTimes(0);

        store.apply(({ value }) => ({ value: value + 1 }))();
        expect(listener1).toHaveBeenCalledTimes(2);
        expect(listener2).toHaveBeenCalledTimes(2);
        expect(listener3).toHaveBeenCalledTimes(1);
      });

      // inspired from Redux createStore test
      it('uses the last snapshot of subscribers during nested apply', () => {
        const store = storeFactory();

        const listener1 = jest.fn();
        const listener2 = jest.fn();
        const listener3 = jest.fn();
        const listener4 = jest.fn();

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        let unsubscribe4 = () => {};
        const unsubscribe1 = store.subscribe(() => {
          listener1();
          expect(listener1).toHaveBeenCalledTimes(1);
          expect(listener2).toHaveBeenCalledTimes(0);
          expect(listener3).toHaveBeenCalledTimes(0);
          expect(listener4).toHaveBeenCalledTimes(0);

          unsubscribe1();
          unsubscribe4 = store.subscribe(listener4)();
          store.apply(({ value }) => ({ value: value + 1 }))();

          expect(listener1).toHaveBeenCalledTimes(1);
          expect(listener2).toHaveBeenCalledTimes(1);
          expect(listener3).toHaveBeenCalledTimes(1);
          expect(listener4).toHaveBeenCalledTimes(1);
        })();

        store.subscribe(listener2)();
        store.subscribe(listener3)();

        store.apply(({ value }) => ({ value: value + 1 }))();
        expect(listener1).toHaveBeenCalledTimes(1);
        expect(listener2).toHaveBeenCalledTimes(2);
        expect(listener3).toHaveBeenCalledTimes(2);
        expect(listener4).toHaveBeenCalledTimes(1);

        unsubscribe4();
        store.apply(({ value }) => ({ value: value + 1 }))();
        expect(listener1).toHaveBeenCalledTimes(1);
        expect(listener2).toHaveBeenCalledTimes(3);
        expect(listener3).toHaveBeenCalledTimes(3);
        expect(listener4).toHaveBeenCalledTimes(1);
      });

      // inspired from Redux createStore test
      it('provides an up-to-date state when a subscriber is notified', () => {
        return new Promise((done) => {
          const store = storeFactory();

          store.subscribe(() => {
            const state = store.read();

            expect(state).toEqual({ value: 3 });

            done();
          })();

          store.apply(({ value }) => ({ value: value + 1 }))();
        });
      });
    });
  });
});

describe('project', () => {
  it('can create a projection from one store', () => {
    const storeA = Store.create(() => 2)();
    const storeS = Store.project(
      [storeA],
      (a) => a + 2,
      (s) => {
        storeA.apply(() => s - 2)();
      },
    )();

    expect(storeS.read()).toEqual(4);

    storeS.apply(() => 2)();

    expect(storeS.read()).toEqual(2);
  });

  it('can create a projection from multiple stores', () => {
    const storeA = Store.create(() => 2)();
    const storeB = Store.create(() => 'hello')();
    const storeC = Store.create(() => 100)();

    const stores = [storeA, storeB, storeC] as const;

    const storeS = Store.project(
      stores,
      (a, b, c) => ({
        a,
        b,
        c,
      }),
      ({ a, b, c }) => {
        storeA.apply(() => a)();
        storeB.apply(() => b)();
        storeC.apply(() => c)();
      },
    )();

    expect(storeS.read()).toEqual({
      a: 2,
      b: 'hello',
      c: 100,
    });

    storeS.apply((s) => ({
      ...s,
      c: 200,
    }))();

    expect(storeS.read()).toEqual({
      a: 2,
      b: 'hello',
      c: 200,
    });
  });

  it('can listen for projection change', () => {
    const storeA = Store.create(() => 2)();
    const storeB = Store.create(() => 'hello')();
    const storeC = Store.create(() => 100)();

    const stores = [storeA, storeB, storeC] as const;

    const storeS = Store.project(
      stores,
      (a, b, c) => ({
        a,
        b,
        c,
      }),
      ({ a, b, c }) => {
        storeA.apply(() => a)();
        storeB.apply(() => b)();
        storeC.apply(() => c)();
      },
    )();

    const listener = jest.fn();

    const unsubscribe = storeS.subscribe(listener)();

    // this should count as one update, not three
    storeS.apply(() => ({
      a: 3,
      b: 'world',
      c: 200,
    }))();

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    storeS.apply(() => ({
      a: 4,
      b: '!',
      c: 300,
    }))();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('can listen for upstream store change', () => {
    const storeA = Store.create(() => 2)();
    const storeB = Store.create(() => 'hello')();
    const storeC = Store.create(() => 100)();

    const stores = [storeA, storeB, storeC] as const;

    const storeS = Store.project(
      stores,
      (a, b, c) => ({
        a,
        b,
        c,
      }),
      ({ a, b, c }) => {
        storeA.apply(() => a)();
        storeB.apply(() => b)();
        storeC.apply(() => c)();
      },
    )();

    const listener = jest.fn();

    const unsubscribe = storeS.subscribe(listener)();

    storeA.apply(() => 3)();

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    storeA.apply(() => 4)();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('liftAndApply', () => {
  it('modifies state with a reducer factory given the previous state', () => {
    const store = Store.create(() => ({
      a: 2,
      b: 'hello',
    }))();

    const add = Store.liftAndApply(
      (a: number, b: string) => (state) => ({
        a: state.a + a,
        b: state.b + b,
      }),
      store,
    );

    add(1, ' world')();

    expect(store.read()).toEqual({
      a: 3,
      b: 'hello world',
    });
  });

  it('should not return anything as it needs "read" to return', () => {
    const store = Store.create(() => 2)();

    const add = Store.liftAndApply((n: number) => (state) => state + n, store);

    const result = add(1)();

    expect(result).toBeUndefined();
  });
});
