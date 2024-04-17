module.exports = {
  root: true,
  env: {
    browser: false,
    es2021: true,
    node: true,
    mocha: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    sourceType: 'module'
  },
  rules: {
    'space-before-function-paren': [2, 'always'],
    'prefer-const': 2,
    'no-prototype-builtins': 0,
    curly: [2, 'multi-line'],
    eqeqeq: [2, 'always']
  }
}
