/**
 * 管理员权限中间件
 * 验证用户是否具有管理员权限
 */

function adminMiddleware(req, res, next) {
  // 检查用户角色（由auth.middleware.js注入）
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: '需要管理员权限'
    }
  });
}

module.exports = adminMiddleware;
