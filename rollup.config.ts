import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import type { RollupOptions } from 'rollup'
import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'

const pluginEsbuild = esbuild({
  minify: true,
})
const pluginDts = dts()
const pluginResolve = resolve()
const pluginCommonjs = commonjs()

const configs: RollupOptions[] = []
configs.push({
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.esm.js', format: 'es', sourcemap: true },
    { file: 'dist/index.cjs.js', format: 'cjs', sourcemap: true },
  ],
  plugins: [
    pluginResolve,
    pluginCommonjs,
    pluginEsbuild,
  ],
  // chalk5又不支持cjs, 这里还是使用chalk降级到4
  external: [/node_modules/],
})
configs.push({
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.d.ts' },
    { file: 'dist/index.esm.d.ts' },
    { file: 'dist/index.cjs.d.ts' },
  ],
  plugins: [
    pluginDts,
  ],
  external: [/node_modules/],
})

export default configs
