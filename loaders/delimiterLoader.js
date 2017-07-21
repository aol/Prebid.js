// Copyright 2017 AOL Platforms.

/**
 * @author Valentin Zhukovsky <valentin.zhukovsky@oath.com>
 */

let path = require('path');

const BID_ADAPTER = 'BidAdapter';
const ANALYTIC_ADAPTER = 'AnalyticsAdapter';

let parseAdapterInfo = (adapterPath) => {
  let fileName = path.parse(adapterPath).name;
  let matchedItems = fileName.match(/(.+)(BidAdapter|AnalyticsAdapter)/);

  if (matchedItems) {
    return {
      code: matchedItems[1],
      type: matchedItems[2]
    };
  }
};

let wrapAdapterContent = (adapterInfo, content) => {
  switch (adapterInfo.type) {
    case BID_ADAPTER:
      return `/*!ADAPTER BEGIN ${adapterInfo.code}*/${content}/*!ADAPTER END ${adapterInfo.code}*/`;
    case ANALYTIC_ADAPTER:
      return `/*!ANALYTICS ADAPTER BEGIN ${adapterInfo.code}*/${content}/*!ANALYTICS ADAPTER END ${adapterInfo.code}*/`;
    default:
      return content;
  }
};

module.exports = function(content) {
  let adapterInfo = parseAdapterInfo(this.resourcePath);

  if (adapterInfo) {
    return wrapAdapterContent(adapterInfo, content);
  }

  return content;
};
