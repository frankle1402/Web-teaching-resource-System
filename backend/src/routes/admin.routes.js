const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// 所有管理员路由都需要认证和管理员权限
router.use(authMiddleware, adminMiddleware);

/**
 * 管理员API路由
 */

// 统计数据
router.get('/stats', adminController.getStats);

// 用户管理
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id', adminController.updateUser);
router.get('/users/:id/resources', adminController.getUserResources);

// 资源管理（全站）
router.get('/all-resources', adminController.getAllResources);
router.put('/resources/:id/disable', adminController.toggleResourceDisabled);
router.put('/resources/:id/unpublish', adminController.forceUnpublishResource);

// 操作日志
router.get('/logs', adminController.getLogs);

module.exports = router;
