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

// 退出登录（不需要Token，MVP阶段）
router.post('/logout', authController.logout);

// 验证Token（需要Token）
router.get('/verify-token', authMiddleware, authController.verifyToken);

// 完善用户资料（需要Token）
router.post('/complete-profile', authMiddleware, authController.completeProfile);

module.exports = router;
