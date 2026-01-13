const jwt = require('jsonwebtoken');
const { getDB } = require('../database/connection');

/**
 * JWT认证中间件
 */
async function authMiddleware(req, res, next) {
  try {
    // 从请求头获取Token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: '未提供认证Token'
        }
      });
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

    // 从数据库获取用户信息
    const db = await getDB();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get([decoded.userId]);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在'
        }
      });
    }

    // 检查用户状态
    if (user.status !== 1) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_DISABLED',
          message: '账号已被禁用，请联系管理员'
        }
      });
    }

    // 将用户信息附加到请求对象
    req.user = {
      id: user.id,
      phone: user.phone,
      openid: user.openid,
      nickname: user.nickname,
      role: user.role || 'user'  // 默认为普通用户
    };

    // 将 token 附加到请求对象（用于 syncToken）
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token无效'
        }
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token已过期'
        }
      });
    }

    console.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: '认证失败'
      }
    });
  }
}

module.exports = authMiddleware;
