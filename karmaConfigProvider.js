const webpackConfig = require('./webpack.conf');
const browsers = require('./browsers.saucelabs');

const BROWSER_TIMEOUTS = {
  DISCONNECT: 10000,
  NO_ACTIVITY: 240000
};

const BROWSER_DISCONNECT_TOLERANCE = 1;

module.exports = {
  generateDefaultConfig () {
    return {
      basePath: './',

      webpack: Object.assign(webpackConfig, {
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
      ],

      browserDisconnectTimeout:BROWSER_TIMEOUTS.DISCONNECT,
      browserNoActivityTimeout: BROWSER_TIMEOUTS.NO_ACTIVITY,
      captureTimeout: BROWSER_TIMEOUTS.NO_ACTIVITY,

      browserDisconnectTolerance: BROWSER_DISCONNECT_TOLERANCE
    }
  },

  generateSaucelabsConfig() {
    let baseConfig = this.generateDefaultConfig();

    return Object.assign(baseConfig, {
      sauceLabs: {
        testName: 'Prebid unit tests'
      },

      customLaunchers: browsers,
      browsers: Object.keys(browsers),

      reporters: baseConfig.reporters.concat(['saucelabs']),

      plugins: baseConfig.plugins.concat(['karma-sauce-launcher'])
    });
  }
};
