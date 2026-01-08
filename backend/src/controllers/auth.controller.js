const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDB, saveDatabase } = require('../database/connection');

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
          VALUES (?, ?, datetime('now'), datetime('now'))
        `).run([openid, phone]);

        user = db.prepare('SELECT * FROM users WHERE id = ?').get([result.lastInsertRowid]);

        // 保存数据库
        saveDatabase();

        console.log(`✓ 新用户注册: ${phone}`);
      } else {
        // 更新最后登录时间
        db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run([user.id]);

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
      const user = db.prepare('SELECT id, phone, nickname, avatar_url, role FROM users WHERE id = ?').get([req.user.id]);

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
}

module.exports = new AuthController();
