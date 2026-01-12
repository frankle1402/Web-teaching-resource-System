const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDB, saveDatabase } = require('../database/connection');
const { formatUserForResponse } = require('../utils/userHelper');

/**
 * 验证码存储（内存存储，模拟短信验证码）
 * key: phone, value: { code, expireAt }
 */
const verificationCodes = new Map();

/**
 * 清理过期验证码（每5分钟清理一次）
 */
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of verificationCodes.entries()) {
    if (data.expireAt < now) {
      verificationCodes.delete(phone);
    }
  }
}, 5 * 60 * 1000);

/**
 * 认证控制器
 */
class AuthController {
  /**
   * 模拟登录（MVP版本）
   */
  async mockLogin(req, res) {
    try {
      const { phone } = req.body;

      // 验证手机号格式
      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PHONE',
            message: '请输入正确的手机号格式'
          }
        });
      }

      const db = await getDB();

      // 查找用户是否存在
      let user = db.prepare('SELECT * FROM users WHERE phone = ?').get([phone]);

      if (!user) {
        // 用户不存在，自动创建
        const openid = uuidv4();
        const result = db.prepare(`
          INSERT INTO users (openid, phone, created_at, last_login)
          VALUES (?, ?, datetime('now', '+8 hours'), datetime('now', '+8 hours'))
        `).run([openid, phone]);

        user = db.prepare('SELECT * FROM users WHERE id = ?').get([result.lastInsertRowid]);

        // 保存数据库
        saveDatabase();

        console.log(`✓ 新用户注册: ${phone}`);
      } else {
        // 更新最后登录时间
        db.prepare("UPDATE users SET last_login = datetime('now', '+8 hours') WHERE id = ?").run([user.id]);

        // 保存数据库
        saveDatabase();

        console.log(`✓ 用户登录: ${phone}, 角色: ${user.role || 'user'}`);
      }

      // 生成JWT Token
      const token = jwt.sign(
        {
          userId: user.id,
          phone: user.phone
        },
        process.env.JWT_SECRET || 'default_secret_key',
        {
          expiresIn: '30d' // Token有效期30天
        }
      );

      // 返回的用户数据（包含role）
      const userData = {
        id: user.id,
        phone: user.phone,
        openid: user.openid,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        role: user.role || 'user'
      };

      console.log('登录返回的用户数据:', userData);

      // 返回登录成功信息
      res.json({
        success: true,
        data: {
          token,
          user: userData
        },
        message: '登录成功'
      });
    } catch (error) {
      console.error('登录失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: '登录失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 退出登录
   */
  async logout(req, res) {
    try {
      // MVP阶段，退出登录只需返回成功即可
      // 真实场景可能需要将Token加入黑名单
      res.json({
        success: true,
        message: '退出成功'
      });
    } catch (error) {
      console.error('退出失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: '退出失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 验证Token
   */
  async verifyToken(req, res) {
    try {
      // Token验证由auth中间件完成
      // 如果执行到这里，说明Token有效

      // 从数据库重新获取完整用户信息（包括role）
      const { getDB } = require('../database/connection');
      const db = await getDB();
      const user = db.prepare('SELECT id, phone, nickname, avatar_url, real_name, organization, role, profile_completed FROM users WHERE id = ?').get([req.user.id]);

      res.json({
        success: true,
        data: {
          valid: true,
          user: user || req.user
        }
      });
    } catch (error) {
      console.error('Token验证失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFY_ERROR',
          message: '验证失败'
        }
      });
    }
  }

  /**
   * 发送验证码（模拟短信）
   */
  async sendVerificationCode(req, res) {
    try {
      const { phone } = req.body;

      // 验证手机号格式
      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PHONE',
            message: '请输入正确的手机号格式'
          }
        });
      }

      // 生成6位数字验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expireAt = Date.now() + 5 * 60 * 1000; // 5分钟后过期

      // 存储验证码
      verificationCodes.set(phone, { code, expireAt });

      console.log(`✓ 发送验证码到 ${phone}: ${code}`);

      // 返回验证码（模拟短信，实际项目应该通过短信服务商发送）
      res.json({
        success: true,
        data: {
          code, // 模拟短信，直接返回验证码
          expiresIn: 300 // 5分钟有效期
        }
      });
    } catch (error) {
      console.error('发送验证码失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEND_CODE_ERROR',
          message: '发送验证码失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 验证码登录
   */
  async loginWithCode(req, res) {
    try {
      const { phone, code } = req.body;

      // 验证手机号格式
      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PHONE',
            message: '请输入正确的手机号格式'
          }
        });
      }

      // 验证验证码
      if (!code || code.length !== 6) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: '请输入正确的验证码'
          }
        });
      }

      // 检查验证码是否正确
      const storedCode = verificationCodes.get(phone);
      if (!storedCode || storedCode.code !== code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CODE_MISMATCH',
            message: '验证码错误或已过期'
          }
        });
      }

      // 检查验证码是否过期
      if (storedCode.expireAt < Date.now()) {
        verificationCodes.delete(phone);
        return res.status(400).json({
          success: false,
          error: {
            code: 'CODE_EXPIRED',
            message: '验证码已过期，请重新获取'
          }
        });
      }

      // 清除已使用的验证码
      verificationCodes.delete(phone);

      const db = await getDB();

      // 查找用户是否存在
      let user = db.prepare('SELECT * FROM users WHERE phone = ?').get([phone]);
      let isNewUser = false;

      if (!user) {
        // 用户不存在，标记为新用户（不自动创建，等待注册流程）
        isNewUser = true;

        // 返回需要注册的响应
        return res.json({
          success: true,
          data: {
            isNewUser: true,
            phone: phone
          },
          message: '新用户，请完成注册'
        });
      } else {
        // 更新最后登录时间
        db.prepare("UPDATE users SET last_login = datetime('now', '+8 hours') WHERE id = ?").run([user.id]);
        saveDatabase();

        console.log(`✓ 用户登录: ${phone}, 角色: ${user.role || 'teacher'}`);
      }

      // 生成JWT Token
      const token = jwt.sign(
        {
          userId: user.id,
          phone: user.phone
        },
        process.env.JWT_SECRET || 'default_secret_key',
        {
          expiresIn: '30d'
        }
      );

      // 判断是否需要完善资料
      const needCompleteProfile = !user.profile_completed || user.profile_completed === 0;

      res.json({
        success: true,
        data: {
          token,
          user: formatUserForResponse(user),
          isNewUser: false,
          needCompleteProfile
        },
        message: '登录成功'
      });
    } catch (error) {
      console.error('验证码登录失败:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: '登录失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 新用户注册
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const {
        phone,
        code,
        role,
        real_name,
        nickname,
        avatar_url,
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

      // 验证手机号格式
      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PHONE', message: '请输入正确的手机号格式' }
        });
      }

      // 验证验证码
      if (!code || code.length !== 6) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CODE', message: '请输入正确的验证码' }
        });
      }

      // 检查验证码是否正确
      const storedCode = verificationCodes.get(phone);
      if (!storedCode || storedCode.code !== code) {
        return res.status(400).json({
          success: false,
          error: { code: 'CODE_MISMATCH', message: '验证码错误或已过期' }
        });
      }

      // 检查验证码是否过期
      if (storedCode.expireAt < Date.now()) {
        verificationCodes.delete(phone);
        return res.status(400).json({
          success: false,
          error: { code: 'CODE_EXPIRED', message: '验证码已过期，请重新获取' }
        });
      }

      // 验证角色
      if (!role || !['teacher', 'student'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ROLE', message: '请选择正确的角色' }
        });
      }

      // 验证必填字段
      if (!real_name) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_REQUIRED_FIELDS', message: '请填写真实姓名' }
        });
      }

      // 教师必须填写单位
      if (role === 'teacher' && !organization) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_REQUIRED_FIELDS', message: '教师必须填写单位/机构' }
        });
      }

      // 学生必须填写学校
      if (role === 'student' && !student_school) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_REQUIRED_FIELDS', message: '学生必须填写学校' }
        });
      }

      const db = await getDB();

      // 检查用户是否已存在
      const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get([phone]);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: { code: 'USER_EXISTS', message: '该手机号已注册' }
        });
      }

      // 清除验证码
      verificationCodes.delete(phone);

      // 创建用户
      const openid = uuidv4();
      const result = db.prepare(`
        INSERT INTO users (
          openid, phone, nickname, avatar_url, real_name, organization,
          role, profile_completed,
          teacher_title, teacher_field,
          student_school, student_major, student_class, student_grade, student_level,
          created_at, last_login
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, 1,
          ?, ?,
          ?, ?, ?, ?, ?,
          datetime('now', '+8 hours'), datetime('now', '+8 hours')
        )
      `).run([
        openid, phone, nickname || real_name, avatar_url || null, real_name, organization || null,
        role,
        teacher_title || null, teacher_field || null,
        student_school || null, student_major || null, student_class || null, student_grade || null, student_level || null
      ]);

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get([result.lastInsertRowid]);
      saveDatabase();

      console.log(`✓ 新用户注册成功: ${phone}, 角色: ${role}`);

      // 生成JWT Token
      const token = jwt.sign(
        {
          userId: user.id,
          phone: user.phone
        },
        process.env.JWT_SECRET || 'default_secret_key',
        {
          expiresIn: '30d'
        }
      );

      res.json({
        success: true,
        data: {
          token,
          user: formatUserForResponse(user)
        },
        message: '注册成功'
      });
    } catch (error) {
      console.error('注册失败:', error);
      res.status(500).json({
        success: false,
        error: { code: 'REGISTER_ERROR', message: '注册失败，请稍后重试' }
      });
    }
  }

  /**
   * 完善用户资料
   */
  async completeProfile(req, res) {
    try {
      const {
        real_name,
        organization,
        nickname,
        avatar_url,
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
      const userId = req.user.id;

      // 检查用户是否存在
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get([userId]);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: '用户不存在' }
        });
      }

      // 根据角色验证必填字段
      if (user.role === 'teacher' && !organization) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_REQUIRED_FIELDS', message: '教师必须填写单位/机构' }
        });
      }

      if (user.role === 'student' && !student_school) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_REQUIRED_FIELDS', message: '学生必须填写学校' }
        });
      }

      // 构建更新SQL
      const updateFields = ['profile_completed = 1'];
      const updateParams = [];

      if (real_name !== undefined) {
        updateFields.push('real_name = ?');
        updateParams.push(real_name);
      }

      if (organization !== undefined) {
        updateFields.push('organization = ?');
        updateParams.push(organization);
      }

      if (nickname !== undefined) {
        updateFields.push('nickname = ?');
        updateParams.push(nickname);
      }

      if (avatar_url !== undefined) {
        updateFields.push('avatar_url = ?');
        updateParams.push(avatar_url);
      }

      // 教师字段
      if (teacher_title !== undefined) {
        updateFields.push('teacher_title = ?');
        updateParams.push(teacher_title);
      }

      if (teacher_field !== undefined) {
        updateFields.push('teacher_field = ?');
        updateParams.push(teacher_field);
      }

      // 学生字段
      if (student_school !== undefined) {
        updateFields.push('student_school = ?');
        updateParams.push(student_school);
      }

      if (student_major !== undefined) {
        updateFields.push('student_major = ?');
        updateParams.push(student_major);
      }

      if (student_class !== undefined) {
        updateFields.push('student_class = ?');
        updateParams.push(student_class);
      }

      if (student_grade !== undefined) {
        updateFields.push('student_grade = ?');
        updateParams.push(student_grade);
      }

      if (student_level !== undefined) {
        updateFields.push('student_level = ?');
        updateParams.push(student_level);
      }

      updateParams.push(userId);

      db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(updateParams);
      saveDatabase();

      // 获取更新后的用户信息
      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get([userId]);

      console.log(`✓ 用户 ${userId} 完善资料成功`);

      res.json({
        success: true,
        data: {
          user: formatUserForResponse(updatedUser)
        },
        message: '资料完善成功'
      });
    } catch (error) {
      console.error('完善资料失败:', error);
      res.status(500).json({
        success: false,
        error: { code: 'COMPLETE_PROFILE_ERROR', message: '完善资料失败，请稍后重试' }
      });
    }
  }
}

module.exports = new AuthController();
