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
router.get('/stats', adminController.getStats.bind(adminController));

// 用户管理
router.get('/users', adminController.getUsers.bind(adminController));
router.post('/users', adminController.createUser.bind(adminController));
router.put('/users/:id/status', adminController.updateUserStatus.bind(adminController));
router.put('/users/:id', adminController.updateUser.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));
router.get('/users/:id/resources', adminController.getUserResources.bind(adminController));

// 批量用户操作
router.put('/users/batch/status', adminController.batchUpdateUserStatus.bind(adminController));
router.put('/users/batch/role', adminController.batchUpdateUserRole.bind(adminController));

// 资源管理（全站）
router.get('/all-resources', adminController.getAllResources.bind(adminController));
router.put('/resources/:id/disable', adminController.toggleResourceDisabled.bind(adminController));
router.put('/resources/:id/unpublish', adminController.forceUnpublishResource.bind(adminController));

// 操作日志
router.get('/logs', adminController.getLogs.bind(adminController));

module.exports = router;
