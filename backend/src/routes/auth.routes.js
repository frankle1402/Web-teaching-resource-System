const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * 认证路由
 */

// 模拟登录（不需要Token）
router.post('/mock-login', authController.mockLogin);

// 发送验证码（不需要Token）
router.post('/send-code', authController.sendVerificationCode);

// 验证码登录（不需要Token）
router.post('/login-with-code', authController.loginWithCode);

// 新用户注册（不需要Token）
router.post('/register', authController.register);

// 退出登录（不需要Token，MVP阶段）
router.post('/logout', authController.logout);

// 验证Token（需要Token）
router.get('/verify-token', authMiddleware, authController.verifyToken);
router.get('/verify', authMiddleware, authController.verifyToken);  // 容器页面使用的别名

// 完善用户资料（需要Token）
router.post('/complete-profile', authMiddleware, authController.completeProfile);

// ========== Session 同步相关路由（用于跨端口登录状态同步）==========

// 同步 token 到 session（需要Token）- 用户在前端登录后调用
router.post('/sync-token', authMiddleware, authController.syncToken);

// 获取 session 中的 token（不需要Token）- 容器页面调用
router.get('/session-token', authController.getSessionToken);

// 清除 session 中的 token（需要Token）- 用户退出登录时调用
router.delete('/session-token', authMiddleware, authController.clearSessionToken);

module.exports = router;
