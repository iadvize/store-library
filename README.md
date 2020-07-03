Hello-world monorepo library
========================

This is a mono-repo of javascript libraries.

- [Packages in this monorepo](#packages-in-this-monorepo)
- [How to develop](#how-to-develop)
- [How to contribute](#how-to-contribute)

## Packages in this monorepo

It contains :

- [`@iadvize-oss/hello-1`](./packages/hello-1)
- [`@iadvize-oss/hello-2`](./packages/hello-2)

## How to develop 

- Develop your change in the package `packages/<the package>`
- Build the package with `npm run build`
- Add tests that run with `npm run test:js`
- Add lint that run with `npm run lint:js`

## How to contribute

1. Create a new branch with your changes. Create your PR.
2. Push your code. *Don't forget to update `packages/<the package>/CHANGELOG.md`*
3. Tag your PR with a version tag (`no-release`, `patch`, `minor` or `major`).
   Tag your PR with your package (eg. `packages/hello-1`). Submit it for approval.
4. The CI will publish the new version of the package for you once merged on master. 

