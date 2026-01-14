/**
 * 浏览记录路由
 */
const express = require('express');
const router = express.Router();
const viewController = require('../controllers/view.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { requireRole, requireAdmin } = require('../middlewares/role.middleware');

// 所有浏览记录路由都需要登录
router.use(authMiddleware);

// 开始浏览记录
router.post('/start', viewController.startView);

// 心跳更新浏览时长
router.post('/:viewId/heartbeat', viewController.heartbeat);

// 结束浏览（支持sendBeacon，可能没有完整的auth信息）
router.post('/:viewId/end', viewController.endView);

// 获取当前用户的浏览记录
router.get('/my', viewController.getMyViews);

// 获取浏览统计数据（用于Dashboard）
router.get('/stats', viewController.getViewStats);

// 教师/管理员查看指定资源的浏览记录
router.get('/resource/:resourceId', requireRole('teacher', 'admin'), viewController.getResourceViews);

// 获取当前用户在指定资源的累计学习时长
router.get('/resource/:resourceId/duration', viewController.getResourceDuration);

module.exports = router;
