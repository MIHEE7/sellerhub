const { testNaverConnection }   = require('./naverApi');
const { testCoupangConnection } = require('./coupangApi');

async function testPlatformConnection(account) {
  switch (account.platform) {
    case 'naver':   return testNaverConnection(account);
    case 'coupang': return testCoupangConnection(account);
    // 추가 플랫폼은 동일 패턴으로 연결
    default:
      return { ok: false, error: `${account.platform} 테스트 미구현` };
  }
}

module.exports = { testPlatformConnection };
