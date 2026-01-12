/**
 * 用户路由
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 所有用户路由都需要登录
router.use(authMiddleware);

// 获取配置选项（职称、层次等）
router.get('/options', userController.getOptions);

// 获取当前用户完整信息
router.get('/profile', userController.getProfile);

// 更新个人信息
router.put('/profile', userController.updateProfile);

// 获取个人Dashboard数据
router.get('/dashboard', userController.getDashboard);

module.exports = router;
