const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resource.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 需要认证的路由
router.get('/', authMiddleware, resourceController.getResources);
router.get('/used-fields', authMiddleware, resourceController.getUsedFields);
router.get('/:id', authMiddleware, resourceController.getResourceById);
router.post('/', authMiddleware, resourceController.createResource);
router.put('/:id', authMiddleware, resourceController.updateResource);
router.delete('/:id', authMiddleware, resourceController.deleteResource);
router.get('/:id/versions', authMiddleware, resourceController.getResourceVersions);
router.post('/:id/versions/:versionId/restore', authMiddleware, resourceController.restoreResourceVersion);
router.post('/:id/publish', authMiddleware, resourceController.publishResource);
router.post('/:id/unpublish', authMiddleware, resourceController.unpublishResource);

module.exports = router;
