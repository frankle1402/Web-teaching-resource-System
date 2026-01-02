const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * 认证路由
 */

// 模拟登录（不需要Token）
router.post('/mock-login', authController.mockLogin);

// 退出登录（不需要Token，MVP阶段）
router.post('/logout', authController.logout);

// 验证Token（需要Token）
router.get('/verify-token', authMiddleware, authController.verifyToken);

module.exports = router;
