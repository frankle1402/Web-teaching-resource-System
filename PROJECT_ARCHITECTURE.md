# 项目架构文档

> 最后更新：2026-01-08
> 版本：1.0.0

## 一、项目概述

**项目名称**：教学资源生成与管理系统
**目标用户**：医卫类教师
**核心功能**：通过AI和可视化编辑器创建HTML教学资源，管理、分类并发布到互联网

---

## 二、端口配置（重要）

| 服务 | 端口 | 说明 |
|------|------|------|
| **后端 Express** | 8080 | API服务、公开资源访问 |
| **前端 Vite** | 5173 | 开发服务器 |

### 端口配置文件位置

- 后端端口：`backend/.env` 中的 `PORT=8080`
- 前端端口：`frontend/vite.config.js` 中的 `server.port`
- 前端代理目标：`frontend/vite.config.js` 中的 `server.proxy`

---

## 三、技术栈

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | v18+ | 运行环境 |
| Express.js | ^4.18 | Web框架 |
| SQL.js | ^1.8 | SQLite数据库（纯JS实现） |
| JWT | jsonwebtoken | 用户认证 |
| dotenv | ^16.0 | 环境变量管理 |
| cors | ^2.8 | 跨域支持 |
| nodemon | ^3.0 | 开发热重载 |

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue.js | ^3.4 | 前端框架 |
| Vite | ^5.0 | 构建工具 |
| Vue Router | ^4.2 | 路由管理 |
| Pinia | ^2.1 | 状态管理 |
| Element Plus | ^2.4 | UI组件库 |
| TailwindCSS | ^3.4 | CSS框架 |
| TipTap | ^2.1 | 富文本编辑器 |
| Axios | ^1.6 | HTTP客户端 |

### AI服务

| 配置项 | 值 |
|--------|-----|
| 提供商 | 302.ai |
| 模型 | claude-opus-4-1-20250805 |
| API超时 | 300秒（5分钟） |

---

## 四、目录结构

```
Web-teaching-resource-System/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── app.js             # 应用入口
│   │   ├── controllers/       # 业务控制器
│   │   │   ├── auth.controller.js
│   │   │   ├── resource.controller.js
│   │   │   ├── folder.controller.js
│   │   │   ├── template.controller.js
│   │   │   └── ai.controller.js
│   │   ├── routes/            # 路由定义
│   │   │   ├── auth.routes.js
│   │   │   ├── resource.routes.js
│   │   │   ├── folder.routes.js
│   │   │   ├── template.routes.js
│   │   │   └── ai.routes.js
│   │   ├── middlewares/       # 中间件
│   │   │   ├── auth.middleware.js
│   │   │   └── error.middleware.js
│   │   └── database/          # 数据库
│   │       ├── connection.js  # 连接管理
│   │       └── init.js        # 初始化脚本
│   ├── database/              # 数据库文件存储
│   │   └── teaching_resources.sqlite
│   ├── .env                   # 环境配置
│   └── package.json
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── main.js            # 应用入口
│   │   ├── App.vue            # 根组件
│   │   ├── api/               # API封装
│   │   │   └── request.js     # Axios配置
│   │   ├── router/            # 路由配置
│   │   │   └── index.js
│   │   ├── store/             # Pinia状态
│   │   ├── pages/             # 页面组件
│   │   └── components/        # 通用组件
│   │       └── editor/
│   │           └── TipTapEditor.vue
│   ├── vite.config.js         # Vite配置
│   └── package.json
│
├── docs/                       # 文档
│   └── database.sql           # 数据库Schema
│
├── start.bat                   # 一键启动脚本
├── stop.bat                    # 停止服务脚本
├── CLAUDE.md                   # Claude Code指南
└── PROJECT_ARCHITECTURE.md     # 本文档
```

---

## 五、API接口

### 认证接口 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /mock-login | 模拟登录 | 否 |
| POST | /logout | 退出登录 | 是 |
| GET | /verify-token | 验证Token | 是 |

### 资源接口 `/api/resources`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | / | 获取资源列表 | 是 |
| GET | /:id | 获取单个资源 | 是 |
| POST | / | 创建资源 | 是 |
| PUT | /:id | 更新资源 | 是 |
| DELETE | /:id | 删除资源 | 是 |
| POST | /:id/publish | 发布资源 | 是 |
| POST | /:id/unpublish | 取消发布 | 是 |

### 文件夹接口 `/api/folders`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | / | 获取文件夹列表 | 是 |
| POST | / | 创建文件夹 | 是 |
| PUT | /:id | 更新文件夹 | 是 |
| DELETE | /:id | 删除文件夹 | 是 |

### 模板接口 `/api/templates`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | / | 获取模板列表 | 是 |
| GET | /:id | 获取单个模板 | 是 |

### AI接口 `/api/ai`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /generate | AI生成内容 | 是 |

### 公开接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /r/:uuid | 公开资源访问 | 否 |
| GET | /health | 健康检查 | 否 |

---

## 六、数据库Schema

### 核心表

#### users - 用户表
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone VARCHAR(20) UNIQUE NOT NULL,
  openid VARCHAR(100),
  nickname VARCHAR(50),
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### folders - 文件夹表
```sql
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  parent_id INTEGER DEFAULT 0,  -- 0表示根目录
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### templates - 模板表
```sql
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  html_structure TEXT,
  css_styles TEXT,
  preview_image TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### resources - 教学资源表
```sql
CREATE TABLE resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  folder_id INTEGER,
  template_id INTEGER,           -- 可为NULL
  title VARCHAR(200) NOT NULL,
  description TEXT,
  html_content TEXT,
  css_content TEXT,
  status VARCHAR(20) DEFAULT 'draft',  -- draft/published
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### resource_versions - 版本历史表
```sql
CREATE TABLE resource_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  html_content TEXT,
  css_content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### ai_generation_logs - AI生成记录表
```sql
CREATE TABLE ai_generation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  resource_id INTEGER,
  prompt TEXT,
  generated_content TEXT,
  model VARCHAR(50),
  tokens_used INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 七、环境配置

### 后端配置 `backend/.env`

```env
PORT=8080
NODE_ENV=development
DB_PATH=./database/teaching_resources.sqlite
JWT_SECRET=teaching_resource_mvp_secret_key_2026_change_in_production
AI_API_KEY=sk-xxx（实际密钥）
AI_API_BASE_URL=https://api.302.ai/v1/chat/completions
AI_MODEL=claude-opus-4-1-20250805
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:8080
```

### 前端配置 `frontend/vite.config.js`

```javascript
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

---

## 八、启动流程

### 方式一：一键启动（推荐）

```bash
# Windows
start.bat    # 启动所有服务
stop.bat     # 停止所有服务
```

### 方式二：分别启动

```bash
# 终端1：启动后端
cd backend
npm install
npm run dev

# 终端2：启动前端
cd frontend
npm install
npm run dev
```

### 启动顺序

1. 后端服务启动，监听8080端口
2. 数据库初始化（如果文件存在则加载，不存在则创建）
3. 前端服务启动，监听5173端口
4. 访问 http://localhost:5173

---

## 九、数据持久化

### 数据库保存机制

1. **自动保存**：每30秒自动保存一次
2. **进程退出保存**：进程退出时自动保存
3. **手动保存**：调用`saveDatabase()`函数

### 数据库文件位置

```
backend/database/teaching_resources.sqlite
```

### 注意事项

- SQL.js在内存中操作数据库，定期持久化到文件
- 不要在数据库操作过程中强制关闭进程
- 如需重置数据库，手动删除sqlite文件后重启服务

---

## 十、测试账号

系统使用模拟登录，任意符合格式的手机号均可登录：

- `13800138000`
- `13900139000`
- `13X00XXXXXX`（任意13X开头的11位手机号）

---

## 十一、常见问题排查

### 端口被占用

```bash
# 查看端口占用
netstat -ano | findstr :8080
netstat -ano | findstr :5173

# 使用PowerShell停止Node进程
powershell -Command "Stop-Process -Name node -Force"

# 或运行stop.bat
stop.bat
```

### 数据库问题

```bash
# 重置数据库（会清空数据）
cd backend
del database\teaching_resources.sqlite
npm run dev
```

### AI生成超时

1. 检查`AI_API_KEY`是否有效
2. 确认网络连接正常
3. 前端请求超时已设置为300秒

---

## 十二、API响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

---

## 十三、前端路由

| 路径 | 组件 | 说明 | 认证 |
|------|------|------|------|
| /login | Login.vue | 登录页 | 否 |
| / | Dashboard | 布局容器 | 是 |
| /resources | ResourceList.vue | 资源列表 | 是 |
| /resources/create | ResourceCreate.vue | 创建资源 | 是 |
| /resources/edit/:id | ResourceEdit.vue | 编辑资源 | 是 |
| /folders | FolderList.vue | 文件夹管理 | 是 |
| /templates | TemplateList.vue | 模板中心 | 是 |
| /help | Help.vue | 帮助中心 | 是 |

---

## 十四、安全要求

1. JWT Token存储在localStorage
2. 所有API请求（除公开接口）需携带Authorization header
3. 敏感配置使用.env文件，不提交到仓库
4. 生产环境需更换JWT_SECRET

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-01-08 | 初始架构文档 |
