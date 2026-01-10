const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/upload.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// 配置 multer 内存存储
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf', // .pdf
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain' // .txt
    ];

    const allowedExtensions = ['.docx', '.pdf', '.pptx', '.txt'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，请上传 .docx, .pdf, .pptx 或 .txt 文件'));
    }
  }
});

// 上传并解析教案文件
router.post('/parse-document', authMiddleware, upload.single('file'), uploadController.parseDocument.bind(uploadController));

// 根据教案内容生成大纲
router.post('/generate-outline', authMiddleware, uploadController.generateOutlineFromContent.bind(uploadController));

module.exports = router;
