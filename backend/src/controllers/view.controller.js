/**
 * 浏览记录控制器
 */
const { getDB, saveDatabase } = require('../database/connection');
const { getDisplayName, formatDuration } = require('../utils/userHelper');

class ViewController {
  /**
   * 开始浏览记录
   * POST /api/views/start
   */
  async startView(req, res) {
    try {
      const { resourceId, userAgent } = req.body;
      const userId = req.user.id;

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: '缺少资源ID' }
        });
      }

      const db = await getDB();

      // 检查资源是否存在且已发布
      const resource = db.prepare(`
        SELECT id, status, is_disabled FROM resources WHERE id = ?
      `).get([resourceId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: { code: 'RESOURCE_NOT_FOUND', message: '资源不存在' }
        });
      }

      if (resource.status !== 'published') {
        return res.status(403).json({
          success: false,
          error: { code: 'RESOURCE_NOT_PUBLISHED', message: '资源未发布' }
        });
      }

      if (resource.is_disabled) {
        return res.status(403).json({
          success: false,
          error: { code: 'RESOURCE_DISABLED', message: '资源已被禁用' }
        });
      }

      // 获取客户端IP
      const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] ||
                       req.connection?.remoteAddress ||
                       req.socket?.remoteAddress ||
                       'unknown';

      // 创建浏览记录
      const result = db.prepare(`
        INSERT INTO resource_views (user_id, resource_id, ip_address, user_agent, start_time, duration, created_at)
        VALUES (?, ?, ?, ?, datetime('now', '+8 hours'), 0, datetime('now', '+8 hours'))
      `).run([userId, resourceId, ipAddress, userAgent || '']);

      saveDatabase();

      res.json({
        success: true,
        data: {
          viewId: result.lastInsertRowid
        }
      });
    } catch (error) {
      console.error('开始浏览记录错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'START_VIEW_ERROR', message: '记录浏览失败' }
      });
    }
  }

  /**
   * 心跳更新浏览时长
   * POST /api/views/:viewId/heartbeat
   */
  async heartbeat(req, res) {
    try {
      const { viewId } = req.params;
      const { duration } = req.body;
      const userId = req.user.id;

      if (!viewId || duration === undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: '参数错误' }
        });
      }

      const db = await getDB();

      // 检查记录是否属于当前用户
      const view = db.prepare(`
        SELECT id, user_id FROM resource_views WHERE id = ?
      `).get([viewId]);

      if (!view) {
        return res.status(404).json({
          success: false,
          error: { code: 'VIEW_NOT_FOUND', message: '浏览记录不存在' }
        });
      }

      if (view.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: '无权操作此记录' }
        });
      }

      // 更新浏览时长
      db.prepare(`
        UPDATE resource_views SET duration = ? WHERE id = ?
      `).run([Math.max(0, parseInt(duration) || 0), viewId]);

      saveDatabase();

      res.json({ success: true });
    } catch (error) {
      console.error('心跳更新错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'HEARTBEAT_ERROR', message: '更新失败' }
      });
    }
  }

  /**
   * 结束浏览
   * POST /api/views/:viewId/end
   * 支持 sendBeacon 发送的数据（Content-Type 可能是 text/plain）
   */
  async endView(req, res) {
    try {
      const { viewId } = req.params;
      let data = req.body;

      // sendBeacon 发送的数据可能是字符串
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_DATA', message: '数据格式错误' }
          });
        }
      }

      const { duration } = data;
      const userId = req.user?.id;

      if (!viewId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: '参数错误' }
        });
      }

      const db = await getDB();

      // 检查记录（sendBeacon可能没有用户信息，所以只验证viewId存在）
      const view = db.prepare(`
        SELECT id, user_id FROM resource_views WHERE id = ?
      `).get([viewId]);

      if (!view) {
        return res.status(404).json({
          success: false,
          error: { code: 'VIEW_NOT_FOUND', message: '浏览记录不存在' }
        });
      }

      // 如果有用户信息，验证权限
      if (userId && view.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: '无权操作此记录' }
        });
      }

      // 更新最终浏览时长
      if (duration !== undefined) {
        db.prepare(`
          UPDATE resource_views SET duration = ? WHERE id = ?
        `).run([Math.max(0, parseInt(duration) || 0), viewId]);

        saveDatabase();
      }

      res.json({ success: true });
    } catch (error) {
      console.error('结束浏览错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'END_VIEW_ERROR', message: '结束浏览失败' }
      });
    }
  }

  /**
   * 获取当前用户的浏览记录
   * GET /api/views/my
   */
  async getMyViews(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, pageSize = 20 } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const db = await getDB();

      // 获取总数
      const countResult = db.prepare(`
        SELECT COUNT(*) as total FROM resource_views WHERE user_id = ?
      `).get([userId]);

      // 获取浏览记录列表（包含资源信息）
      const views = db.prepare(`
        SELECT
          rv.id,
          rv.resource_id,
          rv.start_time,
          rv.duration,
          rv.created_at,
          r.uuid as resource_uuid,
          r.title as resource_title,
          r.course_name,
          r.course_level
        FROM resource_views rv
        LEFT JOIN resources r ON rv.resource_id = r.id
        WHERE rv.user_id = ?
        ORDER BY rv.start_time DESC
        LIMIT ? OFFSET ?
      `).all([userId, limit, offset]);

      // 格式化返回数据
      const formattedViews = views.map(v => ({
        id: v.id,
        startTime: v.start_time,
        duration: v.duration,
        durationText: formatDuration(v.duration),
        createdAt: v.created_at,
        resource: {
          id: v.resource_id,
          uuid: v.resource_uuid,
          title: v.resource_title,
          courseName: v.course_name,
          courseLevel: v.course_level
        }
      }));

      res.json({
        success: true,
        data: {
          list: formattedViews,
          pagination: {
            page: parseInt(page),
            pageSize: limit,
            total: countResult.total,
            totalPages: Math.ceil(countResult.total / limit)
          }
        }
      });
    } catch (error) {
      console.error('获取浏览记录错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'GET_VIEWS_ERROR', message: '获取浏览记录失败' }
      });
    }
  }

  /**
   * 教师查看自己资源的被浏览记录
   * GET /api/views/resource/:resourceId
   */
  async getResourceViews(req, res) {
    try {
      const { resourceId } = req.params;
      const { page = 1, pageSize = 20 } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const db = await getDB();

      // 检查资源是否存在
      const resource = db.prepare(`
        SELECT id, user_id, title FROM resources WHERE id = ?
      `).get([resourceId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: { code: 'RESOURCE_NOT_FOUND', message: '资源不存在' }
        });
      }

      // 只有资源创建者或管理员可以查看
      if (resource.user_id !== userId && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: '只能查看自己资源的浏览记录' }
        });
      }

      // 获取总数
      const countResult = db.prepare(`
        SELECT COUNT(*) as total FROM resource_views WHERE resource_id = ?
      `).get([resourceId]);

      // 获取浏览记录列表（包含用户信息）
      const views = db.prepare(`
        SELECT
          rv.id,
          rv.user_id,
          rv.ip_address,
          rv.user_agent,
          rv.start_time,
          rv.duration,
          rv.created_at,
          u.nickname,
          u.phone,
          u.role,
          u.organization,
          u.student_school
        FROM resource_views rv
        LEFT JOIN users u ON rv.user_id = u.id
        WHERE rv.resource_id = ?
        ORDER BY rv.start_time DESC
        LIMIT ? OFFSET ?
      `).all([resourceId, limit, offset]);

      // 格式化返回数据
      const formattedViews = views.map(v => ({
        id: v.id,
        ipAddress: v.ip_address,
        userAgent: v.user_agent,
        startTime: v.start_time,
        duration: v.duration,
        durationText: formatDuration(v.duration),
        createdAt: v.created_at,
        user: {
          id: v.user_id,
          displayName: getDisplayName({ nickname: v.nickname, phone: v.phone, id: v.user_id }),
          role: v.role,
          organization: v.organization || v.student_school
        }
      }));

      res.json({
        success: true,
        data: {
          resource: {
            id: resource.id,
            title: resource.title
          },
          list: formattedViews,
          pagination: {
            page: parseInt(page),
            pageSize: limit,
            total: countResult.total,
            totalPages: Math.ceil(countResult.total / limit)
          }
        }
      });
    } catch (error) {
      console.error('获取资源浏览记录错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'GET_RESOURCE_VIEWS_ERROR', message: '获取浏览记录失败' }
      });
    }
  }

  /**
   * 管理员查看所有浏览记录
   * GET /api/admin/views
   */
  async getAllViews(req, res) {
    try {
      const { page = 1, pageSize = 20, userId, resourceId, startDate, endDate } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const db = await getDB();

      // 构建查询条件
      let whereClause = '1=1';
      const params = [];

      if (userId) {
        whereClause += ' AND rv.user_id = ?';
        params.push(userId);
      }

      if (resourceId) {
        whereClause += ' AND rv.resource_id = ?';
        params.push(resourceId);
      }

      if (startDate) {
        whereClause += ' AND rv.start_time >= ?';
        params.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND rv.start_time <= ?';
        params.push(endDate + ' 23:59:59');
      }

      // 获取总数
      const countResult = db.prepare(`
        SELECT COUNT(*) as total FROM resource_views rv WHERE ${whereClause}
      `).get(params);

      // 获取浏览记录列表
      const views = db.prepare(`
        SELECT
          rv.id,
          rv.user_id,
          rv.resource_id,
          rv.ip_address,
          rv.user_agent,
          rv.start_time,
          rv.duration,
          rv.created_at,
          u.nickname,
          u.phone,
          u.role,
          u.organization,
          u.student_school,
          r.uuid as resource_uuid,
          r.title as resource_title,
          r.course_name
        FROM resource_views rv
        LEFT JOIN users u ON rv.user_id = u.id
        LEFT JOIN resources r ON rv.resource_id = r.id
        WHERE ${whereClause}
        ORDER BY rv.start_time DESC
        LIMIT ? OFFSET ?
      `).all([...params, limit, offset]);

      // 格式化返回数据
      const formattedViews = views.map(v => ({
        id: v.id,
        ipAddress: v.ip_address,
        userAgent: v.user_agent,
        startTime: v.start_time,
        duration: v.duration,
        durationText: formatDuration(v.duration),
        createdAt: v.created_at,
        user: {
          id: v.user_id,
          displayName: getDisplayName({ nickname: v.nickname, phone: v.phone, id: v.user_id }),
          role: v.role,
          organization: v.organization || v.student_school
        },
        resource: {
          id: v.resource_id,
          uuid: v.resource_uuid,
          title: v.resource_title,
          courseName: v.course_name
        }
      }));

      res.json({
        success: true,
        data: {
          list: formattedViews,
          pagination: {
            page: parseInt(page),
            pageSize: limit,
            total: countResult.total,
            totalPages: Math.ceil(countResult.total / limit)
          }
        }
      });
    } catch (error) {
      console.error('获取所有浏览记录错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'GET_ALL_VIEWS_ERROR', message: '获取浏览记录失败' }
      });
    }
  }

  /**
   * 获取当前用户在指定资源的累计学习时长
   * GET /api/views/resource/:resourceId/duration
   */
  async getResourceDuration(req, res) {
    try {
      const { resourceId } = req.params;
      const userId = req.user.id;
      const db = await getDB();

      const result = db.prepare(`
        SELECT COALESCE(SUM(duration), 0) as totalDuration
        FROM resource_views
        WHERE user_id = ? AND resource_id = ?
      `).get([userId, resourceId]);

      res.json({
        success: true,
        data: {
          totalDuration: result.totalDuration
        }
      });
    } catch (error) {
      console.error('获取资源学习时长错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'GET_RESOURCE_DURATION_ERROR', message: '获取学习时长失败' }
      });
    }
  }

  /**
   * 获取浏览统计数据（用于Dashboard）
   * GET /api/views/stats
   */
  async getViewStats(req, res) {
    try {
      const userId = req.user.id;
      const db = await getDB();

      // 获取当月的日期范围
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const formatDate = (d) => d.toISOString().split('T')[0];

      // 本月统计
      const monthlyStats = db.prepare(`
        SELECT
          COUNT(*) as views,
          COALESCE(SUM(duration), 0) as duration
        FROM resource_views
        WHERE user_id = ? AND start_time >= ?
      `).get([userId, formatDate(firstDayOfMonth)]);

      // 上月统计（用于计算变化率）
      const lastMonthStats = db.prepare(`
        SELECT
          COUNT(*) as views,
          COALESCE(SUM(duration), 0) as duration
        FROM resource_views
        WHERE user_id = ? AND start_time >= ? AND start_time <= ?
      `).get([userId, formatDate(firstDayOfLastMonth), formatDate(lastDayOfLastMonth)]);

      // 总统计
      const totalStats = db.prepare(`
        SELECT
          COUNT(*) as views,
          COALESCE(SUM(duration), 0) as duration
        FROM resource_views
        WHERE user_id = ?
      `).get([userId]);

      // 计算变化率
      const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // 近30天每日统计
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dailyStats = db.prepare(`
        SELECT
          DATE(start_time) as date,
          COUNT(*) as views,
          COALESCE(SUM(duration), 0) as duration
        FROM resource_views
        WHERE user_id = ? AND start_time >= ?
        GROUP BY DATE(start_time)
        ORDER BY date
      `).all([userId, formatDate(thirtyDaysAgo)]);

      // 最近浏览的资源
      const recentViews = db.prepare(`
        SELECT
          rv.id,
          rv.resource_id,
          rv.start_time,
          rv.duration,
          r.uuid as resource_uuid,
          r.title as resource_title,
          r.course_name,
          r.course_level
        FROM resource_views rv
        LEFT JOIN resources r ON rv.resource_id = r.id
        WHERE rv.user_id = ?
        ORDER BY rv.start_time DESC
        LIMIT 5
      `).all([userId]);

      res.json({
        success: true,
        data: {
          stats: {
            monthlyViews: monthlyStats.views,
            monthlyViewsChange: calculateChange(monthlyStats.views, lastMonthStats.views),
            totalViews: totalStats.views,
            monthlyDuration: monthlyStats.duration,
            monthlyDurationChange: calculateChange(monthlyStats.duration, lastMonthStats.duration),
            totalDuration: totalStats.duration
          },
          dailyStats: dailyStats.map(d => ({
            date: d.date,
            views: d.views,
            duration: d.duration
          })),
          recentViews: recentViews.map(v => ({
            id: v.id,
            startTime: v.start_time,
            duration: v.duration,
            durationText: formatDuration(v.duration),
            resource: {
              id: v.resource_id,
              uuid: v.resource_uuid,
              title: v.resource_title,
              courseName: v.course_name,
              courseLevel: v.course_level
            }
          }))
        }
      });
    } catch (error) {
      console.error('获取浏览统计错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'GET_STATS_ERROR', message: '获取统计数据失败' }
      });
    }
  }
}

module.exports = new ViewController();
