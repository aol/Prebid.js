import {expect} from 'chai';

describe('delimiterLoader', () => {
  it('should wrap content for bidAdapter files', () => {
    let loader = require('loaders/delimiterLoader');
    let options = {file: 'aolBidAdapter.js'};
    let adapterContent = 'test-adapter-content';

    let expectedContent = '/*!ADAPTER BEGIN aol*/' + adapterContent + '/*!ADAPTER END aol*/';

    expect(loader(adapterContent, options)).to.equal(expectedContent);
  });

  it('should wrap content for analyticsAdapter files', () => {
    let loader = require('loaders/delimiterLoader');
    let options = {file: 'testbidderAnalyticsAdapter.js'};
    let adapterContent = 'test-adapter-content';

    let expectedContent = '/*!ANALYTICS ADAPTER BEGIN testbidder*/' + adapterContent + '/*!ANALYTICS ADAPTER END testbidder*/';

    expect(loader(adapterContent, options)).to.equal(expectedContent);
  });

  it('should not wrap content for unrecognized files', () => {
    let loader = require('loaders/delimiterLoader');
    let options = {file: 'dfpAdServerVideo.js'};
    let adapterContent = 'test-adapter-content';

    expect(loader(adapterContent, options)).to.equal(adapterContent);
  });
});
