require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/init');

// 导入路由
const authRoutes = require('./routes/auth.routes');
const resourceRoutes = require('./routes/resource.routes');
const folderRoutes = require('./routes/folder.routes');
const templateRoutes = require('./routes/template.routes');
const aiRoutes = require('./routes/ai.routes');
const resourceController = require('./controllers/resource.controller');

// 导入中间件
const errorMiddleware = require('./middlewares/error.middleware');

/**
 * Express应用配置
 */
const app = express();
const PORT = process.env.PORT || 3001;

// ====================================
// 中间件配置
// ====================================

// CORS配置
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// JSON解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, '../public')));

// ====================================
// 路由配置
// ====================================

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: Date.now()
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/ai', aiRoutes);

// 公开资源访问（无需认证）
app.get('/r/:uuid', resourceController.getPublicResource);

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在'
    },
    timestamp: Date.now()
  });
});

// ====================================
// 错误处理
// ====================================

app.use(errorMiddleware);

// ====================================
// 启动服务器
// ====================================

async function startServer() {
  try {
    // 初始化数据库
    console.log('正在初始化数据库...');
    await initDatabase();
    console.log('✓ 数据库初始化成功\n');

    // 启动Express服务器
    app.listen(PORT, 'localhost', () => {
      console.log('╔════════════════════════════════════════╗');
      console.log('║   教学资源生成与管理系统 - 后端服务    ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║   环境: ${process.env.NODE_ENV || 'development'}                          ║`);
      console.log(`║   端口: ${PORT}                           ║`);
      console.log(`║   地址: http://localhost:${PORT}           ║`);
      console.log(`╠════════════════════════════════════════╣`);
      console.log('║   API端点:                               ║');
      console.log('║   - POST   /api/auth/mock-login         ║');
      console.log('║   - POST   /api/auth/logout             ║');
      console.log('║   - GET    /api/auth/verify-token       ║');
      console.log('║   - GET    /api/resources               ║');
      console.log('║   - POST   /api/resources               ║');
      console.log('║   - GET    /api/folders                 ║');
      console.log('║   - GET    /api/templates               ║');
      console.log('║   - GET    /r/:uuid (公开资源)          ║');
      console.log('║   - GET    /health                      ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('✗ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n正在关闭服务器...');
  process.exit(0);
});

module.exports = app;
// trigger reload
// Force reload 2026年01月 3日  2:27:26
