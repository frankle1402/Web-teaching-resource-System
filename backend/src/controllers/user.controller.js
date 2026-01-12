/**
 * 用户控制器
 * 处理用户个人信息和Dashboard数据
 */
const { getDB, saveDatabase } = require('../database/connection');
const { formatUserForResponse, getDisplayName, formatDuration, TEACHER_TITLES, STUDENT_LEVELS } = require('../utils/userHelper');

class UserController {
  /**
   * 获取当前用户完整信息
   * GET /api/user/profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const db = await getDB();

      const user = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get([userId]);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: '用户不存在' }
        });
      }

      res.json({
        success: true,
        data: formatUserForResponse(user)
      });
    } catch (error) {
      console.error('获取用户信息错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'GET_PROFILE_ERROR', message: '获取用户信息失败' }
      });
    }
  }

  /**
   * 更新个人信息
   * PUT /api/user/profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const {
        nickname,
        avatar_url,
        real_name,
        organization,
        // 教师字段
        teacher_title,
        teacher_field,
        // 学生字段
        student_school,
        student_major,
        student_class,
        student_grade,
        student_level
      } = req.body;

      const db = await getDB();

      // 获取当前用户信息
      const user = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get([userId]);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: '用户不存在' }
        });
      }

      // 根据角色验证必填字段
      if (user.role === 'teacher') {
        if (!organization) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: '教师必须填写单位/机构' }
          });
        }
      } else if (user.role === 'student') {
        if (!student_school) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: '学生必须填写学校' }
          });
        }
      }

      // 构建更新SQL
      const updates = [];
      const params = [];

      if (nickname !== undefined) {
        updates.push('nickname = ?');
        params.push(nickname);
      }

      if (avatar_url !== undefined) {
        updates.push('avatar_url = ?');
        params.push(avatar_url);
      }

      if (real_name !== undefined) {
        updates.push('real_name = ?');
        params.push(real_name);
      }

      if (organization !== undefined) {
        updates.push('organization = ?');
        params.push(organization);
      }

      // 教师字段
      if (teacher_title !== undefined) {
        updates.push('teacher_title = ?');
        params.push(teacher_title);
      }

      if (teacher_field !== undefined) {
        updates.push('teacher_field = ?');
        params.push(teacher_field);
      }

      // 学生字段
      if (student_school !== undefined) {
        updates.push('student_school = ?');
        params.push(student_school);
      }

      if (student_major !== undefined) {
        updates.push('student_major = ?');
        params.push(student_major);
      }

      if (student_class !== undefined) {
        updates.push('student_class = ?');
        params.push(student_class);
      }

      if (student_grade !== undefined) {
        updates.push('student_grade = ?');
        params.push(student_grade);
      }

      if (student_level !== undefined) {
        updates.push('student_level = ?');
        params.push(student_level);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_UPDATES', message: '没有需要更新的字段' }
        });
      }

      params.push(userId);

      db.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `).run(params);

      saveDatabase();

      // 返回更新后的用户信息
      const updatedUser = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get([userId]);

      res.json({
        success: true,
        data: formatUserForResponse(updatedUser)
      });
    } catch (error) {
      console.error('更新用户信息错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_PROFILE_ERROR', message: '更新用户信息失败' }
      });
    }
  }

  /**
   * 获取个人Dashboard数据
   * GET /api/user/dashboard
   */
  async getDashboard(req, res) {
    try {
      const userId = req.user.id;
      const db = await getDB();

      // 获取用户信息
      const user = db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get([userId]);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: '用户不存在' }
        });
      }

      // 获取当月的日期范围
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const formatDate = (d) => d.toISOString().split('T')[0];

      // 本月浏览统计
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

      // 最近浏览的资源（取5条）
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

      // 教师角色：获取创建的资源数量
      let createdResourcesCount = 0;
      let createdResourcesViewsCount = 0;
      if (user.role === 'teacher' || user.role === 'admin') {
        const resourceStats = db.prepare(`
          SELECT COUNT(*) as count FROM resources WHERE user_id = ?
        `).get([userId]);
        createdResourcesCount = resourceStats.count;

        // 获取自己资源的总浏览量
        const viewsStats = db.prepare(`
          SELECT COALESCE(SUM(view_count), 0) as total_views
          FROM resources WHERE user_id = ?
        `).get([userId]);
        createdResourcesViewsCount = viewsStats.total_views;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            nickname: user.nickname,
            avatar_url: user.avatar_url,
            real_name: user.real_name,
            role: user.role,
            organization: user.organization || user.student_school,
            last_login: user.last_login,
            displayName: getDisplayName(user)
          },
          stats: {
            monthlyViews: monthlyStats.views,
            monthlyViewsChange: calculateChange(monthlyStats.views, lastMonthStats.views),
            totalViews: totalStats.views,
            monthlyDuration: monthlyStats.duration,
            monthlyDurationChange: calculateChange(monthlyStats.duration, lastMonthStats.duration),
            totalDuration: totalStats.duration,
            // 教师特有数据
            createdResourcesCount,
            createdResourcesViewsCount
          },
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
          })),
          dailyStats: dailyStats.map(d => ({
            date: d.date,
            views: d.views,
            duration: d.duration
          }))
        }
      });
    } catch (error) {
      console.error('获取Dashboard数据错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'GET_DASHBOARD_ERROR', message: '获取Dashboard数据失败' }
      });
    }
  }

  /**
   * 获取配置选项（职称、层次等）
   * GET /api/user/options
   */
  async getOptions(req, res) {
    try {
      res.json({
        success: true,
        data: {
          teacherTitles: TEACHER_TITLES,
          studentLevels: STUDENT_LEVELS
        }
      });
    } catch (error) {
      console.error('获取配置选项错误:', error);
      res.status(500).json({
        success: false,
        error: { code: 'GET_OPTIONS_ERROR', message: '获取配置选项失败' }
      });
    }
  }
}

module.exports = new UserController();
