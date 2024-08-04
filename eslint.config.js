import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  typescript: {
    overrides: {
      'ts/explicit-function-return-type': 'off',
      'node/prefer-global/buffer': 'off',
      'semi': 'off',
    },
  },
}, {
  name: 'gistools/ignores',
  ignores: ['**/examples/**/*', '**/*.md'],
})
