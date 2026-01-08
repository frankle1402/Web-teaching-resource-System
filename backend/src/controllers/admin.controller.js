const { getDB, saveDatabase } = require('../database/connection');

/**
 * 管理员控制器
 * 提供用户管理、资源管理、数据统计等功能
 */
class AdminController {
  /**
   * 记录管理员操作日志
   */
  async _logAction(db, adminId, action, targetType, targetId, details = null) {
    db.prepare(`
      INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run([adminId, action, targetType, targetId, details ? JSON.stringify(details) : null]);
    saveDatabase();
  }

  /**
   * 获取统计数据
   */
  async getStats(req, res) {
    try {
      const db = await getDB();

      // 用户统计
      const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 1").get().count;
      const todayNewUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')").get().count;

      // 资源统计
      const totalResources = db.prepare('SELECT COUNT(*) as count FROM resources').get().count;
      const publishedResources = db.prepare("SELECT COUNT(*) as count FROM resources WHERE status = 'published'").get().count;
      const disabledResources = db.prepare('SELECT COUNT(*) as count FROM resources WHERE is_disabled = 1').get().count;

      // 今日活跃用户（今天有登录记录的用户）
      const todayActiveUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE DATE(last_login) = DATE('now')").get().count;

      // AI生成统计
      const totalAiCalls = db.prepare('SELECT COUNT(*) as count FROM ai_generation_logs').get().count;
      const todayAiCalls = db.prepare("SELECT COUNT(*) as count FROM ai_generation_logs WHERE DATE(created_at) = DATE('now')").get().count;

      // 最近7天注册趋势
      const weekTrend = db.prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE DATE(created_at) >= DATE('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `).all();

      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            active: activeUsers,
            todayNew: todayNewUsers,
            todayActive: todayActiveUsers
          },
          resources: {
            total: totalResources,
            published: publishedResources,
            disabled: disabledResources
          },
          ai: {
            totalCalls: totalAiCalls,
            todayCalls: todayAiCalls
          },
          weekTrend
        }
      });
    } catch (error) {
      console.error('获取统计数据错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_STATS_ERROR',
          message: '获取统计数据失败'
        }
      });
    }
  }

  /**
   * 获取用户列表
   */
  async getUsers(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword,
        status,
        role
      } = req.query;

      const db = await getDB();

      // 构建查询条件
      let whereConditions = [];
      let params = [];

      if (keyword) {
        whereConditions.push('(phone LIKE ? OR nickname LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      if (status !== undefined && status !== '') {
        whereConditions.push('status = ?');
        params.push(parseInt(status));
      }

      if (role) {
        whereConditions.push('role = ?');
        params.push(role);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // 查询总数
      const countResult = db.prepare(`SELECT COUNT(*) as total FROM users ${whereClause}`).get(params);
      const total = countResult.total;

      // 查询用户列表
      const offset = (page - 1) * pageSize;
      const users = db.prepare(`
        SELECT
          id, phone, nickname, avatar_url, role, status,
          created_at, last_login
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all([...params, parseInt(pageSize), offset]);

      // 获取每个用户的资源数量
      const usersWithResourceCount = users.map(user => {
        const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources WHERE user_id = ?').get([user.id]).count;
        return {
          ...user,
          resourceCount
        };
      });

      res.json({
        success: true,
        data: {
          list: usersWithResourceCount,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取用户列表错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_USERS_ERROR',
          message: '获取用户列表失败'
        }
      });
    }
  }

  /**
   * 启用/禁用用户
   */
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 1=启用, 0=禁用

      if (![0, 1].includes(parseInt(status))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: '状态值无效'
          }
        });
      }

      const db = await getDB();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get([id]);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          }
        });
      }

      // 不允许禁用自己
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_DISABLE_SELF',
            message: '不能禁用自己'
          }
        });
      }

      db.prepare('UPDATE users SET status = ? WHERE id = ?').run([status, id]);
      saveDatabase();

      // 记录操作日志
      await this._logAction(db, req.user.id, status === 1 ? 'enable_user' : 'disable_user', 'user', id, {
        targetUser: user.phone,
        previousStatus: user.status,
        newStatus: status
      });

      console.log(`✓ 管理员 ${req.user.phone} ${status === 1 ? '启用' : '禁用'}了用户 ${user.phone}`);

      res.json({
        success: true,
        message: status === 1 ? '用户已启用' : '用户已禁用'
      });
    } catch (error) {
      console.error('更新用户状态错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_USER_STATUS_ERROR',
          message: '更新用户状态失败'
        }
      });
    }
  }

  /**
   * 编辑用户信息
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { nickname, role } = req.body;

      const db = await getDB();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get([id]);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          }
        });
      }

      // 不允许修改自己的角色
      if (user.id === req.user.id && role && role !== user.role) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_CHANGE_SELF_ROLE',
            message: '不能修改自己的角色'
          }
        });
      }

      // 更新用户信息
      const updateFields = [];
      const updateParams = [];

      if (nickname !== undefined) {
        updateFields.push('nickname = ?');
        updateParams.push(nickname);
      }

      if (role !== undefined && ['admin', 'user'].includes(role)) {
        updateFields.push('role = ?');
        updateParams.push(role);
      }

      if (updateFields.length > 0) {
        updateParams.push(id);
        db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(updateParams);
        saveDatabase();

        // 记录操作日志
        await this._logAction(db, req.user.id, 'update_user', 'user', id, {
          targetUser: user.phone,
          changes: { nickname, role }
        });
      }

      // 获取更新后的用户
      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get([id]);

      res.json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      console.error('更新用户错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_USER_ERROR',
          message: '更新用户失败'
        }
      });
    }
  }

  /**
   * 获取指定用户的资源列表
   */
  async getUserResources(req, res) {
    try {
      const { id } = req.params;
      const {
        page = 1,
        pageSize = 20,
        status
      } = req.query;

      const db = await getDB();

      // 检查用户是否存在
      const user = db.prepare('SELECT id, phone, nickname FROM users WHERE id = ?').get([id]);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          }
        });
      }

      // 构建查询条件
      let whereConditions = ['user_id = ?'];
      let params = [id];

      if (status) {
        whereConditions.push('status = ?');
        params.push(status);
      }

      const whereClause = whereConditions.join(' AND ');

      // 查询总数
      const countResult = db.prepare(`SELECT COUNT(*) as total FROM resources WHERE ${whereClause}`).get(params);
      const total = countResult.total;

      // 查询资源列表
      const offset = (page - 1) * pageSize;
      const resources = db.prepare(`
        SELECT
          id, uuid, title, course_name, course_level, major,
          status, is_disabled, disabled_reason,
          view_count, like_count, dislike_count,
          created_at, updated_at
        FROM resources
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all([...params, parseInt(pageSize), offset]);

      res.json({
        success: true,
        data: {
          user,
          list: resources,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取用户资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_USER_RESOURCES_ERROR',
          message: '获取用户资源失败'
        }
      });
    }
  }

  /**
   * 获取操作日志
   */
  async getLogs(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        action,
        targetType
      } = req.query;

      const db = await getDB();

      // 构建查询条件
      let whereConditions = [];
      let params = [];

      if (action) {
        whereConditions.push('action = ?');
        params.push(action);
      }

      if (targetType) {
        whereConditions.push('target_type = ?');
        params.push(targetType);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // 查询总数
      const countResult = db.prepare(`SELECT COUNT(*) as total FROM admin_logs ${whereClause}`).get(params);
      const total = countResult.total;

      // 查询日志列表
      const offset = (page - 1) * pageSize;
      const logs = db.prepare(`
        SELECT
          al.*,
          u.phone as admin_phone,
          u.nickname as admin_nickname
        FROM admin_logs al
        LEFT JOIN users u ON al.admin_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `).all([...params, parseInt(pageSize), offset]);

      // 解析details JSON
      const logsWithDetails = logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }));

      res.json({
        success: true,
        data: {
          list: logsWithDetails,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取操作日志错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_LOGS_ERROR',
          message: '获取操作日志失败'
        }
      });
    }
  }

  /**
   * 获取所有用户的资源列表
   */
  async getAllResources(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        userId,
        status,
        keyword,
        isDisabled
      } = req.query;

      const db = await getDB();

      // 构建查询条件
      let whereConditions = [];
      let params = [];

      if (userId) {
        whereConditions.push('r.user_id = ?');
        params.push(userId);
      }

      if (status) {
        whereConditions.push('r.status = ?');
        params.push(status);
      }

      if (keyword) {
        whereConditions.push('(r.title LIKE ? OR r.course_name LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      if (isDisabled !== undefined && isDisabled !== '') {
        whereConditions.push('r.is_disabled = ?');
        params.push(parseInt(isDisabled));
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // 查询总数
      const countResult = db.prepare(`SELECT COUNT(*) as total FROM resources r ${whereClause}`).get(params);
      const total = countResult.total;

      // 查询资源列表
      const offset = (page - 1) * pageSize;
      const resources = db.prepare(`
        SELECT
          r.id, r.uuid, r.title, r.course_name, r.course_level, r.major,
          r.status, r.is_disabled, r.disabled_reason, r.disabled_at,
          r.view_count, r.like_count, r.dislike_count,
          r.created_at, r.updated_at,
          u.id as user_id, u.phone as user_phone, u.nickname as user_nickname
        FROM resources r
        LEFT JOIN users u ON r.user_id = u.id
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `).all([...params, parseInt(pageSize), offset]);

      res.json({
        success: true,
        data: {
          list: resources,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取所有资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ALL_RESOURCES_ERROR',
          message: '获取所有资源失败'
        }
      });
    }
  }

  /**
   * 禁用/启用资源
   */
  async toggleResourceDisabled(req, res) {
    try {
      const { id } = req.params;
      const { isDisabled, reason } = req.body; // 1=禁用, 0=启用

      const db = await getDB();
      const resource = db.prepare(`
        SELECT r.*, u.phone as user_phone
        FROM resources r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `).get([id]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      if (isDisabled) {
        // 禁用资源
        db.prepare(`
          UPDATE resources
          SET is_disabled = 1, disabled_at = datetime('now'), disabled_by = ?, disabled_reason = ?
          WHERE id = ?
        `).run([req.user.id, reason || '', id]);

        // 记录操作日志
        await this._logAction(db, req.user.id, 'disable_resource', 'resource', id, {
          resourceTitle: resource.title,
          reason
        });

        console.log(`✓ 管理员 ${req.user.phone} 禁用了资源 ${resource.title}`);
      } else {
        // 启用资源
        db.prepare(`
          UPDATE resources
          SET is_disabled = 0, disabled_at = NULL, disabled_by = NULL, disabled_reason = NULL
          WHERE id = ?
        `).run([id]);

        // 记录操作日志
        await this._logAction(db, req.user.id, 'enable_resource', 'resource', id, {
          resourceTitle: resource.title
        });

        console.log(`✓ 管理员 ${req.user.phone} 启用了资源 ${resource.title}`);
      }

      saveDatabase();

      res.json({
        success: true,
        message: isDisabled ? '资源已禁用' : '资源已启用'
      });
    } catch (error) {
      console.error('禁用/启用资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TOGGLE_RESOURCE_DISABLED_ERROR',
          message: '操作失败'
        }
      });
    }
  }

  /**
   * 强制下架资源（退回草稿状态）
   */
  async forceUnpublishResource(req, res) {
    try {
      const { id } = req.params;

      const db = await getDB();
      const resource = db.prepare(`
        SELECT r.*, u.phone as user_phone
        FROM resources r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `).get([id]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      if (resource.status !== 'published') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NOT_PUBLISHED',
            message: '该资源不是已发布状态'
          }
        });
      }

      // 更新状态为草稿
      db.prepare(`
        UPDATE resources
        SET status = 'draft', updated_at = datetime('now')
        WHERE id = ?
      `).run([id]);

      saveDatabase();

      // 记录操作日志
      await this._logAction(db, req.user.id, 'unpublish_resource', 'resource', id, {
        resourceTitle: resource.title,
        resourceOwner: resource.user_phone
      });

      console.log(`✓ 管理员 ${req.user.phone} 强制下架了资源 ${resource.title}`);

      res.json({
        success: true,
        message: '资源已下架，退回草稿状态'
      });
    } catch (error) {
      console.error('强制下架资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FORCE_UNPUBLISH_ERROR',
          message: '强制下架失败'
        }
      });
    }
  }
}

module.exports = new AdminController();
