const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 所有路由都需要认证 - 使用bind确保this上下文正确
router.post('/outline', authMiddleware, aiController.generateOutline.bind(aiController));
router.post('/content', authMiddleware, aiController.generateContent.bind(aiController));
router.post('/simple-content', authMiddleware, aiController.generateSimpleContent.bind(aiController));

module.exports = router;
