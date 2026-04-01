const { collectNaverOrders } = require('./naver');
const { collectCoupangOrders } = require('./coupang');
const { collectCafe24Orders } = require('./cafe24');
const { collectEmsOrders } = require('./ems');
const { collectZigzagOrders } = require('./zigzag');
const { collectElevenstOrders } = require('./elevenst');
const { collectTalkstoreOrders } = require('./talkstore');
const { collectTossOrders } = require('./toss');
const { collectAllwaysOrders } = require('./allways');

const collectors = {
  naver: collectNaverOrders,
  coupang: collectCoupangOrders,
  cafe24: collectCafe24Orders,
  gmarket: collectEmsOrders,
  zigzag: collectZigzagOrders,
  elevenst: collectElevenstOrders,
  talkstore: collectTalkstoreOrders,
  toss: collectTossOrders,
  allways: collectAllwaysOrders,
};

async function collectOrdersForIntegration({ db, integration }) {
  const collector = collectors[integration.platform];

  if (!collector) {
    return {
      success: false,
      skipped: true,
      platform: integration.platform,
      reason: '지원되지 않는 플랫폼',
    };
  }

  return collector({ db, integration });
}

module.exports = {
  collectOrdersForIntegration,
};