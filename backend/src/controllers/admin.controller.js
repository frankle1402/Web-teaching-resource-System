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
      VALUES (?, ?, ?, ?, ?, datetime('now', '+8 hours'))
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
          id, phone, nickname, avatar_url, real_name, organization, role, status,
          disabled_at, disabled_by, disabled_reason,
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
      const { status, reason } = req.body; // 1=启用, 0=禁用

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

      if (status === 0) {
        // 禁用用户 - 记录禁用原因
        db.prepare(`
          UPDATE users
          SET status = 0, disabled_at = datetime('now', '+8 hours'), disabled_by = ?, disabled_reason = ?
          WHERE id = ?
        `).run([req.user.id, reason || '', id]);
      } else {
        // 启用用户 - 清除禁用信息
        db.prepare(`
          UPDATE users
          SET status = 1, disabled_at = NULL, disabled_by = NULL, disabled_reason = NULL
          WHERE id = ?
        `).run([id]);
      }
      saveDatabase();

      // 记录操作日志
      await this._logAction(db, req.user.id, status === 1 ? 'enable_user' : 'disable_user', 'user', id, {
        targetUser: user.phone,
        previousStatus: user.status,
        newStatus: status,
        reason: status === 0 ? reason : null
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
      const {
        nickname,
        role,
        real_name,
        // 教师字段
        organization,
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

      // 通用字段
      if (nickname !== undefined) {
        updateFields.push('nickname = ?');
        updateParams.push(nickname || null);
      }
      if (real_name !== undefined) {
        updateFields.push('real_name = ?');
        updateParams.push(real_name);
      }

      // 支持的角色：admin, teacher, student
      if (role !== undefined && ['admin', 'teacher', 'student'].includes(role)) {
        updateFields.push('role = ?');
        updateParams.push(role);
      }

      // 教师字段
      if (organization !== undefined) {
        updateFields.push('organization = ?');
        updateParams.push(organization || null);
      }
      if (teacher_title !== undefined) {
        updateFields.push('teacher_title = ?');
        updateParams.push(teacher_title || null);
      }
      if (teacher_field !== undefined) {
        updateFields.push('teacher_field = ?');
        updateParams.push(teacher_field || null);
      }

      // 学生字段
      if (student_school !== undefined) {
        updateFields.push('student_school = ?');
        updateParams.push(student_school || null);
      }
      if (student_major !== undefined) {
        updateFields.push('student_major = ?');
        updateParams.push(student_major || null);
      }
      if (student_class !== undefined) {
        updateFields.push('student_class = ?');
        updateParams.push(student_class || null);
      }
      if (student_grade !== undefined) {
        updateFields.push('student_grade = ?');
        updateParams.push(student_grade || null);
      }
      if (student_level !== undefined) {
        updateFields.push('student_level = ?');
        updateParams.push(student_level || null);
      }

      if (updateFields.length > 0) {
        updateParams.push(id);
        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        console.log('更新用户SQL:', sql);
        console.log('更新参数:', updateParams);
        db.prepare(sql).run(updateParams);
        saveDatabase();

        // 记录操作日志
        await this._logAction(db, req.user.id, 'update_user', 'user', id, {
          targetUser: user.phone,
          changes: { nickname, role, real_name }
        });

        console.log(`✓ 用户 ${user.phone} 信息已更新`);
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
   * 删除用户（物理删除）
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

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

      // 不允许删除自己
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_DELETE_SELF',
            message: '不能删除自己'
          }
        });
      }

      // 检查用户是否有资源
      const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources WHERE user_id = ?').get([id]).count;
      if (resourceCount > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'USER_HAS_RESOURCES',
            message: `该用户有 ${resourceCount} 个资源，无法删除。请先转移或删除这些资源。`
          }
        });
      }

      // 删��用户相关的收藏记录
      db.prepare('DELETE FROM favorites WHERE user_id = ?').run([id]);

      // 删除用户
      db.prepare('DELETE FROM users WHERE id = ?').run([id]);

      // 记录操作日志
      await this._logAction(db, req.user.id, 'delete_user', 'user', id, {
        targetUser: user.phone,
        targetUserName: user.real_name,
        deletedRole: user.role
      });

      console.log(`✓ 管理员 ${req.user.phone} 删除了用户 ${user.phone}`);

      res.json({
        success: true,
        message: '用户已删除'
      });
    } catch (error) {
      console.error('删除用户错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_USER_ERROR',
          message: '删除用户失败'
        }
      });
    }
  }

  /**
   * 创建新用户（管理员功能）
   */
  async createUser(req, res) {
    try {
      const {
        phone,
        real_name,
        nickname,
        avatar_url,
        role
      } = req.body;

      // 教师字段
      const {
        organization,
        teacher_title,
        teacher_field
      } = req.body;

      // 学生字段
      const {
        student_school,
        student_major,
        student_class,
        student_grade,
        student_level
      } = req.body;

      // 验证必填字段
      if (!phone || !real_name) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '请填写手机号和真实姓名'
          }
        });
      }

      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PHONE',
            message: '请输入正确的手机号格式'
          }
        });
      }

      // 验证角色：支持 admin, teacher, student
      if (!role || !['admin', 'teacher', 'student'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: '角色只能是 admin、teacher 或 student'
          }
        });
      }

      // 教师必须填写单位/机构
      if (role === 'teacher' && !organization) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '教师必须填写单位/机构'
          }
        });
      }

      // 学生必须填写学校
      if (role === 'student' && !student_school) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '学生必须填写学校'
          }
        });
      }

      const db = await getDB();

      // 检查手机号是否已存在
      const existingUser = db.prepare('SELECT * FROM users WHERE phone = ?').get([phone]);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PHONE_EXISTS',
            message: '该手机号已被注册'
          }
        });
      }

      // 生成openid
      const { v4: uuidv4 } = require('uuid');
      const openid = uuidv4();

      // 构建插入字段和值 - 分离固定字段、SQL函数字段和动态字段
      const fixedFields = ['openid', 'phone', 'real_name', 'role', 'profile_completed'];
      const fixedValues = [openid, phone, real_name, role, 1];

      const sqlFields = ['created_at', 'last_login'];
      const sqlValues = ["datetime('now', '+8 hours')", "datetime('now', '+8 hours')"];

      const dynamicFields = [];
      const dynamicValues = [];

      // 可选字段
      if (nickname) {
        dynamicFields.push('nickname');
        dynamicValues.push(nickname);
      }
      if (avatar_url) {
        dynamicFields.push('avatar_url');
        dynamicValues.push(avatar_url);
      }

      // 教师字段
      if (role === 'teacher') {
        dynamicFields.push('organization');
        dynamicValues.push(organization);

        if (teacher_title) {
          dynamicFields.push('teacher_title');
          dynamicValues.push(teacher_title);
        }
        if (teacher_field) {
          dynamicFields.push('teacher_field');
          dynamicValues.push(teacher_field);
        }
      }

      // 学生字段
      if (role === 'student') {
        if (student_school) {
          dynamicFields.push('student_school');
          dynamicValues.push(student_school);
        }

        if (student_major) {
          dynamicFields.push('student_major');
          dynamicValues.push(student_major);
        }
        if (student_class) {
          dynamicFields.push('student_class');
          dynamicValues.push(student_class);
        }
        if (student_grade) {
          dynamicFields.push('student_grade');
          dynamicValues.push(student_grade);
        }
        if (student_level) {
          dynamicFields.push('student_level');
          dynamicValues.push(student_level);
        }
      }

      // 合并所有字段
      const allFields = [...fixedFields, ...sqlFields, ...dynamicFields];

      // 构建VALUES部分 - 固定字段用?，SQL字段直接用函数，动态字段用?
      const placeholderParts = [
        fixedValues.map(() => '?'),
        sqlValues,
        dynamicValues.map(() => '?')
      ].filter(part => part.length > 0); // 过滤掉空数组

      const placeholders = placeholderParts.map(part =>
        Array.isArray(part) ? part.join(',') : part
      ).join(',');

      const allValues = [...fixedValues, ...dynamicValues];

      // 插入新用户
      const sql = `
        INSERT INTO users (${allFields.join(', ')})
        VALUES (${placeholders})
      `;

      console.log('创建用户SQL:', sql);
      console.log('参数值:', allValues);

      const result = db.prepare(sql).run(allValues);

      // 获取新创建的用户
      const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get([result.lastInsertRowid]);

      // 记录操作日志
      if (newUser && newUser.id) {
        await this._logAction(db, req.user.id, 'create_user', 'user', newUser.id, {
          phone,
          real_name,
          role
        });
      }

      res.json({
        success: true,
        data: newUser,
        message: '用户创建成功'
      });
    } catch (error) {
      console.error('创建用户错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_USER_ERROR',
          message: '创建用户失败'
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
          SET is_disabled = 1, disabled_at = datetime('now', '+8 hours'), disabled_by = ?, disabled_reason = ?
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
        SET status = 'draft', updated_at = datetime('now', '+8 hours')
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

  /**
   * 批量更新用户状态
   */
  async batchUpdateUserStatus(req, res) {
    try {
      const { userIds, status, reason } = req.body;

      // 验证参数
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_IDS',
            message: '请选择要操作的用户'
          }
        });
      }

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
      const currentAdminId = req.user.id;

      // 过滤掉自己的ID
      const filteredUserIds = userIds.filter(id => parseInt(id) !== currentAdminId);

      if (filteredUserIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_OPERATE_SELF',
            message: '不能对自己进行批量操作'
          }
        });
      }

      // 检查是否包含自己
      const hasSelf = userIds.some(id => parseInt(id) === currentAdminId);
      if (hasSelf) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INCLUDES_SELF',
            message: '批量操作不能包含当前管理员'
          }
        });
      }

      // 获取要操作的用户信息
      const placeholders = filteredUserIds.map(() => '?').join(',');
      const users = db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`).all(filteredUserIds);

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USERS_NOT_FOUND',
            message: '未找到指定的用户'
          }
        });
      }

      // 执行批量更新
      if (status === 0) {
        // 批量禁用
        db.prepare(`
          UPDATE users
          SET status = 0, disabled_at = datetime('now', '+8 hours'), disabled_by = ?, disabled_reason = ?
          WHERE id IN (${placeholders})
        `).run([currentAdminId, reason || '', ...filteredUserIds]);
      } else {
        // 批量启用
        db.prepare(`
          UPDATE users
          SET status = 1, disabled_at = NULL, disabled_by = NULL, disabled_reason = NULL
          WHERE id IN (${placeholders})
        `).run(filteredUserIds);
      }
      saveDatabase();

      // 记录操作日志
      await this._logAction(db, currentAdminId, status === 1 ? 'batch_enable_user' : 'batch_disable_user', 'user', null, {
        userIds: filteredUserIds,
        count: filteredUserIds.length,
        reason: status === 0 ? reason : null
      });

      console.log(`✓ 管理员 ${req.user.phone} 批量${status === 1 ? '启用' : '禁用'}了 ${filteredUserIds.length} 个用户`);

      res.json({
        success: true,
        message: `已${status === 1 ? '启用' : '禁用'} ${filteredUserIds.length} 个用户`,
        data: {
          count: filteredUserIds.length
        }
      });
    } catch (error) {
      console.error('批量更新用户状态错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_UPDATE_STATUS_ERROR',
          message: '批量操作失败'
        }
      });
    }
  }

  /**
   * 批量更新用户角色
   */
  async batchUpdateUserRole(req, res) {
    try {
      const { userIds, role } = req.body;

      // 验证参数
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_IDS',
            message: '请选择要操作的用户'
          }
        });
      }

      // 验证角色
      if (!['admin', 'teacher', 'student'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: '角色只能是 admin、teacher 或 student'
          }
        });
      }

      const db = await getDB();
      const currentAdminId = req.user.id;

      // 过滤掉自己的ID
      const filteredUserIds = userIds.filter(id => parseInt(id) !== currentAdminId);

      if (filteredUserIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_OPERATE_SELF',
            message: '不能对自己进行批量操作'
          }
        });
      }

      // 检查是否包含自己
      const hasSelf = userIds.some(id => parseInt(id) === currentAdminId);
      if (hasSelf) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INCLUDES_SELF',
            message: '批量操作不能包含当前管理员'
          }
        });
      }

      // 获取要操作的用户信息
      const placeholders = filteredUserIds.map(() => '?').join(',');
      const users = db.prepare(`SELECT * FROM users WHERE id IN (${placeholders})`).all(filteredUserIds);

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USERS_NOT_FOUND',
            message: '未找到指定的用户'
          }
        });
      }

      // 执行批量更新
      db.prepare(`
        UPDATE users
        SET role = ?
        WHERE id IN (${placeholders})
      `).run([role, ...filteredUserIds]);
      saveDatabase();

      // 记录操作日志
      await this._logAction(db, currentAdminId, 'batch_update_role', 'user', null, {
        userIds: filteredUserIds,
        count: filteredUserIds.length,
        newRole: role
      });

      console.log(`✓ 管理员 ${req.user.phone} 批量修改了 ${filteredUserIds.length} 个用户的角色为 ${role}`);

      res.json({
        success: true,
        message: `已修改 ${filteredUserIds.length} 个用户的角色`,
        data: {
          count: filteredUserIds.length,
          role
        }
      });
    } catch (error) {
      console.error('批量更新用户角色错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_UPDATE_ROLE_ERROR',
          message: '批量操作失败'
        }
      });
    }
  }
}

module.exports = new AdminController();
