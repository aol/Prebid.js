const karmaBaseConfig = require('./karma.base.conf');
const browsers = require('./browsers.saucelabs');

module.exports = Object.assign(karmaBaseConfig, {
  sauceLabs: {
    testName: 'Prebid'
  },

  customLaunchers: browsers,
  browsers: Object.keys(browsers),

  plugins: karmaBaseConfig.plugins.concat(['karma-sauce-launcher'])
});
