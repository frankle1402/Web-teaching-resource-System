const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favorite.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require('multer');

// 配置multer用于图片上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式'));
    }
  }
});

// ==================== 公开路由（无需认证）====================

// 获取收藏的图片文件（公开访问，因为<img>标签无法携带JWT token）
router.get('/images/:uuid', favoriteController.getImagePublic.bind(favoriteController));

// B站图片代理（解决防盗链问题）
router.get('/proxy/bilibili', favoriteController.proxyBilibiliImage.bind(favoriteController));

// ==================== 以下路由需要认证 ====================
router.use(authMiddleware);

// ==================== 收藏文件夹路由 ====================

// 获取收藏文件夹树
router.get('/folders', favoriteController.getFolders.bind(favoriteController));

// 创建收藏文件夹
router.post('/folders', favoriteController.createFolder.bind(favoriteController));

// 更新收藏文件夹
router.put('/folders/:id', favoriteController.updateFolder.bind(favoriteController));

// 删除收藏文件夹
router.delete('/folders/:id', favoriteController.deleteFolder.bind(favoriteController));

// ==================== 元数据抓取路由（必须在 /:id 之前）====================

// 抓取B站视频元数据
router.get('/meta/bilibili', favoriteController.fetchBilibiliMeta.bind(favoriteController));

// 抓取公众号文章元数据
router.get('/meta/wechat', favoriteController.fetchWechatMeta.bind(favoriteController));

// 上传/下载图片
router.post('/upload/image', upload.single('file'), favoriteController.uploadImage.bind(favoriteController));

// ==================== 批量操作路由（必须在 /:id 之前）====================

// 批量删除收藏
router.post('/batch-delete', favoriteController.batchDelete.bind(favoriteController));

// 批量移动收藏
router.post('/batch-move', favoriteController.batchMove.bind(favoriteController));

// 检查资源收藏状态
router.get('/check-resources', favoriteController.checkResourceFavorites.bind(favoriteController));

// ==================== 收藏资源路由 ====================

// 获取收藏列表
router.get('/', favoriteController.getFavorites.bind(favoriteController));

// 添加收藏
router.post('/', favoriteController.createFavorite.bind(favoriteController));

// 获取单个收藏详情（通配符路由放最后）
router.get('/:id', favoriteController.getFavorite.bind(favoriteController));

// 更新收藏
router.put('/:id', favoriteController.updateFavorite.bind(favoriteController));

// 删除收藏
router.delete('/:id', favoriteController.deleteFavorite.bind(favoriteController));

module.exports = router;
