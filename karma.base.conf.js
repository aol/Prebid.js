const baseWebpackConfig = require('./webpack.conf');

module.exports = {
  basePath: './',

  webpack: Object.assign(baseWebpackConfig, {
    plugins: []
  }),
  webpackMiddleware: {
    noInfo: true
  },

  files: ['test/test_index.js'],
  frameworks: ['es5-shim', 'mocha', 'chai', 'sinon'],
  preprocessors: {
    'test/test_index.js': ['webpack', 'sourcemap']
  },

  singleRun: true,
  reporters: ['mocha'],
  browsers: ['ChromeHeadless'],

  plugins: [
    'karma-chrome-launcher',
    'karma-coverage-istanbul-reporter',
    'karma-es5-shim',
    'karma-mocha',
    'karma-chai',
    'karma-requirejs',
    'karma-sinon',
    'karma-sourcemap-loader',
    'karma-spec-reporter',
    'karma-junit-reporter',
    'karma-webpack',
    'karma-mocha-reporter'
  ]
}
