import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import constants from 'src/constants.json'

const AOL_BIDDERS_CODES = {
  aol: 'aol',
  onemobile: 'onemobile',
  onedisplay: 'onedisplay'
};

const AOL_ENDPOINTS = {
  DISPLAY: {
    GET: 'display-get'
  },
  MOBILE: {
    GET: 'mobile-get',
    POST: 'mobile-post'
  }
};

const pubapiTemplate = template`//${'host'}/pubapi/3.0/${'network'}/${'placement'}/${'pageid'}/${'sizeid'}/ADTECH;v=2;cmd=bid;cors=yes;alias=${'alias'}${'bidfloor'}${'keyValues'};misc=${'misc'}`;
const nexageBaseApiTemplate = template`//${'host'}/bidRequest?`;
const nexageGetApiTemplate = template`dcn=${'dcn'}&pos=${'pos'}&cmd=bid${'ext'}`;
const MP_SERVER_MAP = {
  us: 'adserver-us.adtech.advertising.com',
  eu: 'adserver-eu.adtech.advertising.com',
  as: 'adserver-as.adtech.advertising.com'
};
const NEXAGE_SERVER = 'hb.nexage.com';
const SYNC_TYPES = {
  iframe: 'IFRAME',
  img: 'IMG'
};

$$PREBID_GLOBAL$$.aolGlobals = {
  pixelsDropped: false
};

let showCpmAdjustmentWarning = true;

function template(strings, ...keys) {
  return function(...values) {
    let dict = values[values.length - 1] || {};
    let result = [strings[0]];
    keys.forEach(function(key, i) {
      let value = Number.isInteger(key) ? values[key] : dict[key];
      result.push(value, strings[i + 1]);
    });
    return result.join('');
  };
}

let domReady = (() => {
  let readyEventFired = false;
  return fn => {
    let idempotentFn = () => {
      if (readyEventFired) {
        return;
      }
      readyEventFired = true;
      return fn();
    };

    if (document.readyState === 'complete') {
      return idempotentFn();
    }

    document.addEventListener('DOMContentLoaded', idempotentFn, false);
    window.addEventListener('load', idempotentFn, false);
  };
})();

function dropSyncCookies(pixels) {
  if (!$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped) {
    let pixelElements = parsePixelItems(pixels);
    renderPixelElements(pixelElements);
    $$PREBID_GLOBAL$$.aolGlobals.pixelsDropped = true;
  }
}

function parsePixelItems(pixels) {
  let itemsRegExp = /(img|iframe)[\s\S]*?src\s*=\s*("|')(.*?)\2/gi;
  let tagNameRegExp = /\w*(?=\s)/;
  let srcRegExp = /src=("|')(.*?)\1/;
  let pixelsItems = [];

  if (pixels) {
    let matchedItems = pixels.match(itemsRegExp);
    if (matchedItems) {
      matchedItems.forEach(item => {
        let tagNameMatches = item.match(tagNameRegExp);
        let sourcesPathMatches = item.match(srcRegExp);
        if (tagNameMatches && sourcesPathMatches) {
          pixelsItems.push({
            tagName: tagNameMatches[0].toUpperCase(),
            src: sourcesPathMatches[2]
          });
        }
      });
    }
  }

  return pixelsItems;
}

function renderPixelElements(pixelsElements) {
  pixelsElements.forEach((element) => {
    switch (element.tagName) {
      case SYNC_TYPES.img:
        return renderPixelImage(element);
      case SYNC_TYPES.iframe:
        return renderPixelIframe(element);
    }
  });
}

function renderPixelImage(pixelsItem) {
  let image = new Image();
  image.src = pixelsItem.src;
}

function renderPixelIframe(pixelsItem) {
  let iframe = document.createElement('iframe');
  iframe.width = 1;
  iframe.height = 1;
  iframe.style.display = 'none';
  iframe.src = pixelsItem.src;
  if (document.readyState === 'interactive' ||
    document.readyState === 'complete') {
    document.body.appendChild(iframe);
  } else {
    domReady(() => {
      document.body.appendChild(iframe);
    });
  }
}

function _buildMarketplaceUrl(bid) {
  const params = bid.params;
  const serverParam = params.server;
  let regionParam = params.region || 'us';
  let server;

  if (!MP_SERVER_MAP.hasOwnProperty(regionParam)) {
    utils.logWarn(`Unknown region '${regionParam}' for AOL bidder.`);
    regionParam = 'us'; // Default region.
  }

  if (serverParam) {
    server = serverParam;
  } else {
    server = MP_SERVER_MAP[regionParam];
  }

  // Set region param, used by AOL analytics.
  params.region = regionParam;

  return pubapiTemplate({
    host: server,
    network: params.network,
    placement: parseInt(params.placement),
    pageid: params.pageId || 0,
    sizeid: params.sizeId || 0,
    alias: params.alias || utils.getUniqueIdentifierStr(),
    bidfloor: formatMarketplaceBidFloor(params.bidFloor),
    keyValues: formatMarketplaceKeyValues(params.keyValues),
    misc: new Date().getTime() // cache busting
  });
}

function formatMarketplaceBidFloor(bidFloor) {
  return (typeof bidFloor !== 'undefined') ? `;bidfloor=${bidFloor.toString()}` : '';
}

function formatMarketplaceKeyValues(keyValues) {
  let formattedKeyValues = '';

  utils._each(keyValues, (value, key) => {
    formattedKeyValues += `;kv${key}=${encodeURIComponent(value)}`;
  });

  return formattedKeyValues;
}

function _buildOneMobileBaseUrl(bid) {
  return nexageBaseApiTemplate({
    host: bid.params.host || NEXAGE_SERVER
  });
}

function _buildOneMobileGetUrl(bid) {
  let {dcn, pos} = bid.params;
  let nexageApi = _buildOneMobileBaseUrl(bid);
  if (dcn && pos) {
    let ext = '';
    utils._each(bid.params.ext, (value, key) => {
      ext += `&${key}=${encodeURIComponent(value)}`;
    });
    nexageApi += nexageGetApiTemplate({dcn, pos, ext});
  }
  return nexageApi;
}

function _addErrorBidResponse(bid, response = {}) {
  const bidResponse = bidfactory.createBid(2, bid);
  bidResponse.bidderCode = bid.bidder;
  bidResponse.reason = response.nbr;
  bidResponse.raw = response;
  bidmanager.addBidResponse(bid.placementCode, bidResponse);
}

function _addBidResponse(bid, response) {
  let bidData;

  try {
    bidData = response.seatbid[0].bid[0];
  } catch (e) {
    _addErrorBidResponse(bid, response);
    return;
  }

  let cpm;

  if (bidData.ext && bidData.ext.encp) {
    cpm = bidData.ext.encp;
  } else {
    cpm = bidData.price;

    if (cpm === null || isNaN(cpm)) {
      utils.logError('Invalid price in bid response', AOL_BIDDERS_CODES.aol, bid);
      _addErrorBidResponse(bid, response);
      return;
    }
  }

  let ad = bidData.adm;
  if (response.ext && response.ext.pixels) {
    if (bid.params.userSyncOn === constants.EVENTS.BID_RESPONSE) {
      dropSyncCookies(response.ext.pixels);
    } else {
      let formattedPixels = response.ext.pixels.replace(/<\/?script( type=('|")text\/javascript('|")|)?>/g, '');

      ad += '<script>if(!parent.$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped){' +
        'parent.$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped=true;' + formattedPixels +
        '}</script>';
    }
  }

  const bidResponse = bidfactory.createBid(1, bid);
  bidResponse.bidderCode = bid.bidder;
  bidResponse.ad = ad;
  bidResponse.cpm = cpm;
  bidResponse.width = bidData.w;
  bidResponse.height = bidData.h;
  bidResponse.creativeId = bidData.crid;
  bidResponse.pubapiId = response.id;
  bidResponse.currencyCode = response.cur;
  if (bidData.dealid) {
    bidResponse.dealId = bidData.dealid;
  }

  bidmanager.addBidResponse(bid.placementCode, bidResponse);
}

function _isMarketplaceBidder(bidder) {
  return bidder === AOL_BIDDERS_CODES.aol || bidder === AOL_BIDDERS_CODES.onedisplay;
}

function _isNexageBidder(bidder) {
  return bidder === AOL_BIDDERS_CODES.aol || bidder === AOL_BIDDERS_CODES.onemobile;
}

function _isNexageRequestPost(bid) {
  if (_isNexageBidder(bid.bidder) && bid.params.id && bid.params.imp && bid.params.imp[0]) {
    let imp = bid.params.imp[0];
    return imp.id && imp.tagid &&
      ((imp.banner && imp.banner.w && imp.banner.h) ||
        (imp.video && imp.video.mimes && imp.video.minduration && imp.video.maxduration));
  }
}

function _isNexageRequestGet(bid) {
  return _isNexageBidder(bid.bidder) && bid.params.dcn && bid.params.pos;
}

function isMarketplaceBid(bid) {
  return _isMarketplaceBidder(bid.bidder) && bid.params.placement && bid.params.network;
}

function resolveEndpoint(bid) {
  if (_isNexageRequestGet(bid)) {
    return AOL_ENDPOINTS.MOBILE.GET;
  } else if (_isNexageRequestPost(bid)) {
    return AOL_ENDPOINTS.MOBILE.POST;
  } else if (isMarketplaceBid(bid)) {
    return AOL_ENDPOINTS.DISPLAY.GET;
  }
}

function formatBidRequest(endpointCode, bid) {
  switch (endpointCode) {
    case AOL_ENDPOINTS.DISPLAY.GET:
      return {
        url: _buildMarketplaceUrl(bid),
        method: 'GET'
      };

    case AOL_ENDPOINTS.MOBILE.GET:
      return {
        url: _buildOneMobileGetUrl(bid),
        method: 'GET'
      };

    case AOL_ENDPOINTS.MOBILE.POST:
      return {
        url: _buildOneMobileBaseUrl(bid),
        method: 'POST',
        data: bid.params
      };
  }
}

export const aolAdapter = {
  code: AOL_BIDDERS_CODES.aol,
  aliases: [AOL_BIDDERS_CODES.onemobile, AOL_BIDDERS_CODES.onedisplay],
  isBidRequestValid: function() {
    return true;
  },
  buildRequests: function (bids) {
    return bids.map(bid => {
      const endpointCode = resolveEndpoint(bid);

      return formatBidRequest(endpointCode, bid)
    });
  },
  interpretResponse: function(serverResponse, request) {},
  getUserSyncs: function(syncOptions) {}
};

registerBidder(aolAdapter);
