@iadvize/store
==============

This is a monorepo for the experimental `@iadvize-oss/store`, a lightweight
Javascript store library and its React bindings and devtools helper.

# Why

We used to rely heavily on Redux at iAdvize, using the library as the defacto
state storage of our frontend apps.

We've started to question this systemic use of Redux. We’re not the only ones as
we’ve seen actors of the frontend community having the same questions and
shipping alternatives that :

- want to respond to scaling issues, view-binding complexity and rendering
  headache (React useState, Recoil)

- want to respond to architecture issues, where the rule of having one only
  store for all the data of the app does not make sense (Dan Abramov's famous
  “local state is fine”, Recoil and the ecosystem of small store libs built with
  React in mind like react-hooks-global-state)

- want to offer a better developper experience, reducing the Redux boilerplate
  and the reducer / middleware duality

Listening on these discussions, and working on new internal apps, we started to
understand that Redux does not match all of our frontend app architectures. 

Some of our apps rely only on GraphQL and do not need a global store. They will
use only a few local  `useState`. 
Other apps follow a DDD / layers architecture were we would like to have a basic
store in the infrastructure layer with no functional api bound to it unlike what
Redux wants us to do with actions.

Other apps cannot rely on specific React-only store libraries like Recoil
because they also need to access this state in other parts of their codebase
where React isn't an option (legacy views, low-level code, etc.).

That’s why we created this new store library. 

It’s lightweight. A store will only provide  `read`, `apply` and `subscribe`
methods, in the FP way. 

It’s composable. You can take multiple stores and combine them. You can select
a subpart of one store’s state.

It offers a React binding library à la `react-redux` and a
Redux-devtools-compatible debugger.

# Packages 

- [`@iadvize-oss/store`](./packages/store). The store.
- [`@iadvize-oss/store-react`](./packages/store-react). React bindings.
- [`@iadvize-oss/store-devtools`](./packages/store-devtools). Devtools
