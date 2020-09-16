import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import multiInput from 'rollup-plugin-multi-input';
import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';

export default [
  {
    input: [
      'src/**/*.(ts|tsx)',
      '!src/**/*.test.(ts|tsx)',
      '!src/**/*.stories.(ts|tsx)',
    ],
    plugins: [nodeResolve(), multiInput(), commonjs(), typescript(), terser()],
    external: ['react'],
    output: [
      {
        dir: 'dist',
        format: 'cjs',
      },
      {
        dir: 'esm',
        format: 'es',
      },
    ],
  },
];
