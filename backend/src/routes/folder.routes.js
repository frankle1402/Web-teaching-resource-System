const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folder.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 所有路由都需要认证
router.get('/', authMiddleware, folderController.getFolders);
router.post('/', authMiddleware, folderController.createFolder);
router.put('/:id', authMiddleware, folderController.updateFolder);
router.delete('/:id', authMiddleware, folderController.deleteFolder);

module.exports = router;
