/**
 * 认证调试中间件 - 记录所有认证相关信息
 */
function debugAuthMiddleware(req, res, next) {
  const timestamp = new Date().toISOString();
  const url = req.originalUrl || req.url;

  console.log('\n' + '='.repeat(60));
  console.log(`[DEBUG AUTH] ${timestamp}`);
  console.log(`[DEBUG AUTH] ${req.method} ${url}`);
  console.log('-'.repeat(60));

  // 1. 检查 Authorization Header
  const authHeader = req.headers.authorization;
  console.log(`[DEBUG AUTH] Authorization Header: ${authHeader ? authHeader.substring(0, 50) + '...' : '无'}`);

  // 2. 检查 Cookie
  const cookies = req.headers.cookie;
  console.log(`[DEBUG AUTH] Cookie Header: ${cookies ? cookies.substring(0, 100) + '...' : '无'}`);

  // 3. 检查 Session
  if (req.session) {
    console.log(`[DEBUG AUTH] Session ID: ${req.sessionID || '无'}`);
    console.log(`[DEBUG AUTH] Session authToken: ${req.session.authToken ? '有 (' + req.session.authToken.substring(0, 20) + '...)' : '无'}`);
    console.log(`[DEBUG AUTH] Session userInfo: ${req.session.userInfo ? JSON.stringify(req.session.userInfo).substring(0, 50) + '...' : '无'}`);
  } else {
    console.log(`[DEBUG AUTH] Session: 未初始化`);
  }

  // 4. 检查 Origin 和 Referer
  console.log(`[DEBUG AUTH] Origin: ${req.headers.origin || '无'}`);
  console.log(`[DEBUG AUTH] Referer: ${req.headers.referer || '无'}`);

  console.log('='.repeat(60) + '\n');

  next();
}

module.exports = debugAuthMiddleware;
