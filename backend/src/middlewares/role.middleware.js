/**
 * 角色权限中间件
 * 支持多角色检查
 */

/**
 * 创建角色检查中间件
 * @param  {...string} allowedRoles - 允许访问的角色列表
 * @returns {Function} Express中间件
 *
 * 使用示例:
 * router.get('/api/admin/users', authMiddleware, requireRole('admin'), controller.getUsers)
 * router.get('/api/resources/create', authMiddleware, requireRole('admin', 'teacher'), controller.create)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // 检查用户是否已登录
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录'
        }
      });
    }

    // 检查用户角色是否在允许列表中
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '没有权限访问此资源'
        }
      });
    }

    next();
  };
}

/**
 * 教师或管理员权限中间件
 * 用于需要教师或更高权限的操作（如创建资源）
 */
function requireTeacherOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '请先登录'
      }
    });
  }

  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '只有教师和管理员可以执行此操作'
      }
    });
  }

  next();
}

/**
 * 仅管理员权限中间件
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '请先登录'
      }
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '需要管理员权限'
      }
    });
  }

  next();
}

module.exports = {
  requireRole,
  requireTeacherOrAdmin,
  requireAdmin
};
