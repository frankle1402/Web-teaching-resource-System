# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

教学资源生成与管理系统 - 面向医卫类教师的教学资源生成平台。系统允许教师通过AI和可视化编辑器创建HTML教学资源，管理、分类并发布到互联网进行公开访问与嵌入。

## 开发工作流

### 1. 任务规划与跟踪
- **待办任务管理**：在开始开发前，先将商定的待办任务添加到待办列表中
- **完成标记**：每完成一个任务时，立即将对应的任务标记为已完成
- **并行开发**：合理使用Task工具创建多个子代理来提高开发效率，每个子代理负责一个独立的任务

### 2. 开发流程
- **方案确认制**：执行任何任务前必须先提出方案并等待确认，未经批准不得执行
- **沟通语言**：协作全程使用中文
- **文档同步**：重要成果交付后需同步更新相关文档与脚本注释

## 常用命令

### 一键启动（推荐）
```bash
# Windows 用户
start.bat               # 一键启动后端+前端，自动安装依赖并打开浏览器
stop.bat                # 停止所有 Node.js 服务
```

### 后端开发
```bash
cd backend
npm install              # 安装依赖
npm run dev             # 启动开发服务器（端口8080，默认配置）
npm start               # 启动生产服务器
```

### 前端开发
```bash
cd frontend
npm install              # 安装依赖
npm run dev             # 启动开发服务器（端口5173）
npm run build           # 构建生产版本
npm run preview         # 预览生产构建
```

### 数据库操作
```bash
# Windows: 初始化或重置数据库
cd backend
del database\teaching_resources.sqlite
npm run dev             # 数据库会自动重新初始化

# Linux/Mac: 初始化或重置数据库
cd backend
rm ./database/teaching_resources.sqlite
npm run dev

# 直接操作数据库（需安装sqlite3命令行工具）
sqlite3 backend/database/teaching_resources.sqlite

# 手动初始化数据库
node src/database/init.js
```

### 测试账号
系统使用模拟登录，手机号格式：`13800138000`、`13900139000`等（任意13X00的手机号均可）

**管理员账号**：`13800138000`（系统自动设置为管理员角色）

## 技术架构

### 后端架构
- **框架**：Express.js
- **数据库**：SQLite (通过SQL.js实现，无需编译)
- **认证**：JWT
- **AI服务**：302.ai (Claude Opus 4.1)

**核心目录结构**：
- `src/app.js` - 应用入口，路由配置
- `src/database/connection.js` - 数据库连接管理（SQL.js封装）
- `src/database/init.js` - 数据库初始化（自动设置管理员账号）
- `src/controllers/` - 业务逻辑控制器
- `src/routes/` - API路由定义
- `src/middlewares/` - 中间件（认证、管理员权限、错误处理）

**重要设计决策**：
- 使用SQL.js而非原生sqlite3，避免编译问题
- 数据库自动保存：每30秒或进程退出时（见connection.js）
- DatabaseHelper类封装了SQL.js API，提供类似better-sqlite3的链式调用接口
- `template_id`字段可为NULL，支持不使用模板创建资源
- JWT token存储在localStorage，通过请求拦截器自动添加到Authorization header
- AI请求超时配置为300秒（5分钟），适配长内容生成场景

### 前端架构
- **框架**：Vue 3 + Vite
- **UI库**：Element Plus + TailwindCSS
- **���态管理**：Pinia
- **路由**：Vue Router
- **编辑器**：TipTap (富文本编辑器)

**核心目录结构**：
- `src/main.js` - 应用入口
- `src/App.vue` - 根组件
- `src/router/index.js` - 路由配置（含路由守卫）
- `src/store/` - Pinia状态管理
- `src/api/` - API封装（request.js统一处理认证和错误）
- `src/pages/` - 页面组件
- `src/components/editor/TipTapEditor.vue` - 富文本编辑器

**路由架构**：
- `/login` - 登录页（无需认证）
- `/` - Dashboard布局（需要认证）
  - `/resources` - 资源列表
  - `/resources/create` - 创建资源
  - `/resources/edit/:id` - 编辑资源
  - `/folders` - 文件夹管理
  - `/templates` - 模板中心
  - `/help` - 帮助中心

### 数据库Schema
**核心表结构**：
- `users` - 用户表（手机号登录）
- `folders` - 文件夹表（支持层级结构，parent_id=0表示根目录）
- `templates` - 模板表（包含预置HTML结构和CSS）
- `resources` - 教学资源表（核心业务表）
- `resource_versions` - 版本历史表
- `ai_generation_logs` - AI生成记录表

**重要字段**：
- `resources.uuid` - 资源唯一标识，用于公开访问URL
- `resources.template_id` - 可为NULL，表示不使用模板
- `resources.status` - 'draft'（草稿）或 'published'（已发布）

### 公开资源访问
- 路由：`GET /r/:uuid` (无需认证)
- 由`resourceController.getPublicResource`处理
- 生成嵌入代码示例：`<iframe src="http://localhost:8080/r/{uuid}"></iframe>`

## API响应格式

所有API遵循统一响应格式：
```javascript
// 成功响应
{
  success: true,
  data: { ... }  // 或直接返回数据
}

// 错误响应
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: '错误描述信息'
  }
}
```

## 环境配置

后端配置文件：`backend/.env`（注意：实际端口为8080）
```env
PORT=8080
NODE_ENV=development
DB_PATH=./database/teaching_resources.sqlite
JWT_SECRET=teaching_resource_mvp_secret_key_2026_change_in_production
AI_API_KEY=sk-WFTYHjly4CR0zk91KqPnl1fev3gohkc4VvLp5VFXDRu7mOAX
AI_API_BASE_URL=https://api.302.ai/v1/chat/completions
AI_MODEL=claude-opus-4-1-20250805
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:8080
```

前端代理配置：`frontend/vite.config.js`
```javascript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',  // 后端地址
      changeOrigin: true
    }
  }
}
```

## 开发规范

### 1. 编码规范
- 遵循项目既有结构与命名规范
- 代码改动需最小化、可追溯
- 关键逻辑需补充简洁注释
- 避免引入不必要的依赖

### 2. API设计
- 统一响应格式：`{ success: boolean, data?: any, error?: { code: string, message: string } }`
- 认证接口：`/api/auth/*`
- 资源接口：`/api/resources/*`
- 文件夹接口：`/api/folders/*`
- 模板接口：`/api/templates/*`
- AI接口：`/api/ai/*`

### 3. 前端开发
- 使用`<script setup>`语法糖
- API调用统一通过`src/api/`模块
- 状态管理优先使用Pinia store
- 路由跳转使用`router.push()`

### 4. 数据库操作
- 使用`getDB()`获取DatabaseHelper实例（定义在connection.js）
- 支持链式调用：`db.prepare(sql).all(params)` / `.get(params)` / `.run(params)`
- DatabaseHelper封装了SQL.js API，模拟better-sqlite3的使用方式
- 每次数据库修改后无需手动save，系统会自动保存（30秒间隔或进程退出时）
- 数据库文件在内存中操作，定期持久化到文件系统

**DatabaseHelper使用示例**：
```javascript
const { getDB } = require('./database/connection');

const db = await getDB();

// 查询多行
const users = db.prepare('SELECT * FROM users WHERE status = ?').all([1]);

// 查询单行
const user = db.prepare('SELECT * FROM users WHERE id = ?').get([userId]);

// 插入/更新
const result = db.prepare('INSERT INTO users (phone, openid) VALUES (?, ?)').run([phone, openid]);
console.log(result.lastInsertRowid); // 新插入的ID
console.log(result.changes);         // 受影响的行数
```

### 5. 安全要求
- 真实密钥、密码不得提交到仓库
- 敏感配置使用`.env`文件
- 所有API路由（除`/r/:uuid`和`/health`）都需要JWT认证
- 用户认证通过`auth.middleware.js`中间件验证

## 已知问题和注意事项

1. **数据库缓存**：SQL.js会在内存中加载数据库，修改后需要等待自动保存（30秒）或进程退出时才会写入文件
2. **端口配置**：默认后端端口为8080（非3002），前端端口为5173
3. **模板系统**：模板中包含���位符（如`{{title}}`、`{{content}}`），在生成HTML时需要替换
4. **AI生成**：通过302.ai调用Claude API，需要配置有效的API密钥
5. **版本控制**：每次保存资源时自动创建版本快照到`resource_versions`表
6. **请求超时**：前端API请求超时设置为300秒（5分钟），专门适配AI长内容生成场景
7. **数据库Schema更新**：如需更新表结构，需手动删除数据库文件后重新初始化（connection.js已注释掉自动重建逻辑）

## 快速故障排查

### 端口占用
```bash
# Windows 查看端口占用
netstat -ano | findstr :8080
netstat -ano | findstr :5173

# 停止占用端口的进程
taskkill /F /PID <进程ID>

# 或使用 stop.bat 停止所有 Node.js 进程
```

### 数据库问题
```bash
# 数据库损坏或Schema不匹配
cd backend
del database\teaching_resources.sqlite  # Windows
# rm ./database/teaching_resources.sqlite  # Linux/Mac
npm run dev  # 重新初始化
```

### AI生成超时
- 检查 `AI_API_KEY` 是否有效
- 确认 `frontend/src/api/request.js` 中 timeout 设置为 300000（5分钟）
- 检查302.ai账户额度

## 参考文档

项目内重要文档位置：
- `MVP/000.PRD.md` - 产品需求文档
- `docs/database.sql` - 完整数据库Schema
- `使用指南.md` - 用户使用手册
- `README.md` - 项目基础说明