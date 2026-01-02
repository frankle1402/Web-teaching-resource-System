const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 所有路由都需要认证
router.get('/', authMiddleware, templateController.getTemplates);
router.get('/:id', authMiddleware, templateController.getTemplateById);

module.exports = router;
