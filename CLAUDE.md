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

### 后端开发
```bash
cd backend
npm install              # 安装依赖
npm run dev             # 启动开发服务器（端口3002）
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
# 初始化或重置数据库（删除数据库文件后重启后端）
cd backend
rm ./database/teaching_resources.sqlite
npm run dev             # 数据库会自动重新初始化

# 直接操作数据库
sqlite3 backend/database/teaching_resources.sqlite
```

### 测试账号
系统使用模拟登录，手机号格式：`13800138000`、`13900139000`等

## 技术架构

### 后端架构
- **框架**：Express.js
- **数据库**：SQLite (通过SQL.js实现，无需编译)
- **认证**：JWT
- **AI服务**：302.ai (Claude Opus 4.1)

**核心目录结构**：
- `src/app.js` - 应用入口，路由配置
- `src/database/connection.js` - 数据库连接管理（SQL.js封装）
- `src/database/init.js` - 数据库初始化
- `src/controllers/` - 业务逻辑控制器
- `src/routes/` - API路由定义
- `src/middlewares/` - 中间件（认证、错误处理）

**重要设计决策**：
- 使用SQL.js而非原生sqlite3，避免编译问题
- 数据库自动保存：每30秒或进程退出时
- `template_id`字段可为NULL，支持不使用模板创建资源
- JWT token存储在localStorage，通过请求拦截器自动添加

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
- 生成嵌入代码示例：`<iframe src="http://localhost:3002/r/{uuid}"></iframe>`

## 环境配置

后端配置文件：`backend/.env`
```env
PORT=3002
NODE_ENV=development
DB_PATH=./database/teaching_resources.sqlite
JWT_SECRET=your_secret_key
AI_API_KEY=your_302_ai_api_key
AI_API_BASE_URL=https://api.302.ai/v1/chat/completions
AI_MODEL=claude-opus-4-1-20250805
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:3002
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
- 使用`getDB()`获取DatabaseHelper实例
- 支持链式调用：`prepare(sql).all(params)`
- 每次数据库修改后无需手动save，系统会自动保存

### 5. 安全要求
- 真实密钥、密码不得提交到仓库
- 敏感配置使用`.env`文件
- 所有API路由（除`/r/:uuid`和`/health`）都需要JWT认证
- 用户认证通过`auth.middleware.js`中间件验证

## 已知问题和注意事项

1. **数据库缓存**：SQL.js会在内存中加载数据库，修改后需要等待自动保存（30秒）或进程退出时才会写入文件
2. **模板系统**：模板中包含占位符（如`{{title}}`），在生成HTML时需要替换
3. **AI生成**：通过302.ai调用Claude API，需要配置有效的API密钥
4. **版本控制**：每次保存资源时自动创建版本快照到`resource_versions`表