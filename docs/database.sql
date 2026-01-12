-- ====================================
-- 教学资源生成与管理系统 - 数据库Schema
-- 数据库: SQLite
-- 版本: 1.0.0
-- ====================================

-- ====================================
-- 1. 用户表
-- ====================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openid TEXT UNIQUE NOT NULL,              -- 微信openid（模拟登录使用UUID）
    phone TEXT NOT NULL,                      -- 手机号
    nickname TEXT,                            -- 用户昵称（可选）
    avatar_url TEXT,                          -- 头像URL（可选）
    real_name TEXT,                           -- 真实姓名
    organization TEXT,                        -- 单位/机构
    role TEXT DEFAULT 'user',                 -- 用户角色：'admin'=管理员, 'user'=普通用户
    profile_completed INTEGER DEFAULT 0,      -- 是否完善资料：0=未完善，1=已完善
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    last_login DATETIME DEFAULT (datetime('now', '+8 hours')),
    status INTEGER DEFAULT 1                  -- 账号状态：1=正常，0=禁用
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- ====================================
-- 2. 文件夹表（资源分类）
-- ====================================
CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                 -- 所属用户
    name TEXT NOT NULL,                       -- 文件夹名称
    parent_id INTEGER DEFAULT 0,              -- 父文件夹ID（0表示根目录）
    sort_order INTEGER DEFAULT 0,             -- 排序序号
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

-- ====================================
-- 3. 模板表（HTML结构模板）
-- ====================================
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                       -- 模板名称
    description TEXT,                         -- 模板描述
    thumbnail_url TEXT,                       -- 缩略图URL
    html_structure TEXT NOT NULL,             -- HTML结构（含占位符）
    css_cdn_urls TEXT,                        -- CSS CDN地址（JSON数组字符串）
    is_system INTEGER DEFAULT 1,              -- 是否系统模板：1=系统，0=用户自定义
    status INTEGER DEFAULT 1,                 -- 状态：1=启用，0=禁用
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '+8 hours'))
);

-- 初始化默认模板
INSERT OR IGNORE INTO templates (id, name, description, html_structure, css_cdn_urls) VALUES
(1, '简洁风格', '适合基础理论课程，结构清晰',
'<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header .meta { font-size: 14px; opacity: 0.9; }
        .content { padding: 30px; }
        .content h2 { color: #667eea; margin: 20px 0 15px; font-size: 22px; border-bottom: 2px solid #667eea; padding-bottom: 8px; }
        .content h3 { color: #764ba2; margin: 15px 0 10px; font-size: 18px; }
        .content p { margin-bottom: 12px; line-height: 1.8; }
        .content ul, .content ol { margin-left: 25px; margin-bottom: 15px; }
        .content li { margin-bottom: 8px; }
        .content img { max-width: 100%; height: auto; border-radius: 4px; margin: 15px 0; }
        .content table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .content table th, .content table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .content table th { background: #667eea; color: white; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 14px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{title}}</h1>
            <div class="meta">{{course_name}} | {{education_level}} | {{major}}</div>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>创建时间: {{created_at}}</p>
        </div>
    </div>
</body>
</html>',
'[]'),

(2, '板书风格', '适合实操类课程，突出步骤和要点',
'<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Courier New", Courier, monospace; line-height: 1.6; color: #333; background: #1a1a1a; padding: 20px; }
        .blackboard { max-width: 900px; margin: 0 auto; background: #2d5a27; border: 8px solid #8b4513; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); overflow: hidden; }
        .board-header { background: #1e3d1a; color: #fff; padding: 20px; border-bottom: 3px solid #8b4513; }
        .board-header h1 { font-size: 26px; margin-bottom: 8px; }
        .board-header .meta { font-size: 13px; opacity: 0.8; }
        .board-content { padding: 25px; color: #fff; }
        .board-content h2 { color: #ffd700; margin: 18px 0 12px; font-size: 20px; border-bottom: 2px dashed #ffd700; padding-bottom: 6px; }
        .board-content h3 { color: #87ceeb; margin: 12px 0 8px; font-size: 17px; }
        .board-content p { margin-bottom: 10px; line-height: 1.7; }
        .board-content ul, .board-content ol { margin-left: 25px; margin-bottom: 12px; }
        .board-content li { margin-bottom: 8px; }
        .board-content img { max-width: 100%; height: auto; border: 3px solid #ffd700; margin: 12px 0; }
        .board-content table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .board-content table th, .board-content table td { border: 2px solid #ffd700; padding: 10px; text-align: left; }
        .board-content table th { background: #1e3d1a; color: #ffd700; }
        .board-footer { text-align: center; padding: 15px; color: #ccc; font-size: 13px; border-top: 2px solid #8b4513; }
    </style>
</head>
<body>
    <div class="blackboard">
        <div class="board-header">
            <h1>{{title}}</h1>
            <div class="meta">{{course_name}} | {{education_level}} | {{major}}</div>
        </div>
        <div class="board-content">
            {{content}}
        </div>
        <div class="board-footer">
            <p>创建时间: {{created_at}}</p>
        </div>
    </div>
</body>
</html>',
'[]');

-- ====================================
-- 4. 资源表（教学资源核心表）
-- ====================================
CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,                -- 资源唯一标识（用于公开访问）
    user_id INTEGER NOT NULL,                 -- 创建者
    folder_id INTEGER DEFAULT NULL,           -- 所属文件夹（NULL表示未分类）
    template_id INTEGER DEFAULT NULL,         -- 使用的模板ID（NULL表示不使用模板）

    -- 基础信息
    title TEXT NOT NULL,                      -- 资源标题
    course_name TEXT NOT NULL,                -- 课程名称
    course_level TEXT NOT NULL,               -- 教学层次：中职/高职/本科
    major TEXT NOT NULL,                      -- 所属专业
    subject TEXT,                             -- 教学主题

    -- AI生成相关
    outline TEXT,                             -- AI生成的大纲（JSON格式）
    prompt_text TEXT,                         -- 用户输入的提示词

    -- HTML内容
    content_html TEXT,                        -- 完整HTML内容

    -- 发布信息
    status TEXT DEFAULT 'draft',                -- 状态：draft=草稿，published=已发布
    public_url TEXT,                          -- 公开访问URL
    published_at DATETIME,                    -- 发布时间
    view_count INTEGER DEFAULT 0,             -- 浏览次数
    like_count INTEGER DEFAULT 0,             -- 点赞数
    dislike_count INTEGER DEFAULT 0,          -- 点踩数

    -- 管理员禁用相关
    is_disabled INTEGER DEFAULT 0,            -- 是否被管理员禁用：0=正常, 1=已禁用
    disabled_at DATETIME,                     -- 禁用时间
    disabled_by INTEGER,                      -- 禁用操作的管理员ID
    disabled_reason TEXT,                     -- 禁用原因

    -- 时间戳
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '+8 hours')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (disabled_by) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_resources_uuid ON resources(uuid);
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_folder_id ON resources(folder_id);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);

-- ====================================
-- 5. 资源版本历史表
-- ====================================
CREATE TABLE IF NOT EXISTS resource_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,             -- 关联资源ID
    version_number INTEGER NOT NULL,          -- 版本号
    content_html TEXT NOT NULL,               -- 该版本的HTML内容
    outline TEXT,                             -- 该版本的大纲
    change_description TEXT,                  -- 变更说明（可选）
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_resource_versions_resource_id ON resource_versions(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_versions_version ON resource_versions(resource_id, version_number);

-- ====================================
-- 6. AI生成记录表（可选，用于计费或统计分析）
-- ====================================
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    resource_id INTEGER,                      -- 关联资源ID（可为空）
    generation_type TEXT NOT NULL,            -- 生成类型：outline/content
    input_prompt TEXT,                        -- 输入提示词
    output_text TEXT,                         -- AI输出结果
    token_count INTEGER DEFAULT 0,            -- 消耗token数
    status TEXT DEFAULT 'success',            -- 状态：success/failed
    error_message TEXT,                       -- 错误信息
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_generation_logs(created_at);

-- ====================================
-- 7. 资源点赞/点踩表
-- ====================================
CREATE TABLE IF NOT EXISTS resource_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,             -- 资源ID
    user_id INTEGER NOT NULL,                 -- 用户ID
    like_type TEXT NOT NULL,                  -- 'like' 或 'dislike'
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    UNIQUE(resource_id, user_id),             -- 每个用户对每个资源只能点赞或点踩一次
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_resource_likes_resource_id ON resource_likes(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_likes_user_id ON resource_likes(user_id);

-- ====================================
-- 8. 管理员操作日志表
-- ====================================
CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,                -- 管理员ID
    action TEXT NOT NULL,                     -- 操作类型：disable_user/enable_user/disable_resource/unpublish_resource等
    target_type TEXT NOT NULL,                -- 目标类型：user/resource
    target_id INTEGER NOT NULL,               -- 目标ID
    details TEXT,                             -- 操作详情(JSON格式)
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);

-- ====================================
-- 9. 收藏文件夹表
-- ====================================
CREATE TABLE IF NOT EXISTS favorite_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                 -- 所属用户
    name TEXT NOT NULL,                       -- 文件夹名称
    parent_id INTEGER DEFAULT 0,              -- 父文件夹ID（0表示根目录）
    sort_order INTEGER DEFAULT 0,             -- 排序序号
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_favorite_folders_user_id ON favorite_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_folders_parent_id ON favorite_folders(parent_id);

-- ====================================
-- 10. 收藏资源表
-- ====================================
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                 -- 所属用户
    folder_id INTEGER DEFAULT NULL,           -- 所属收藏夹（NULL表示未分类）

    -- 资源类型
    type TEXT NOT NULL,                       -- 'bilibili'/'wechat_article'/'image'

    -- 通用字段
    title TEXT NOT NULL,                      -- 标题
    description TEXT,                         -- 描述/摘要
    thumbnail_url TEXT,                       -- 封面图URL
    source_url TEXT NOT NULL,                 -- 原始URL

    -- B站视频专用字段
    bvid TEXT,                                -- B站视频BV号
    video_duration INTEGER,                   -- 视频时长（秒）
    author_name TEXT,                         -- UP主名称
    play_count INTEGER,                       -- 播放量

    -- 公众号文章专用字段
    article_author TEXT,                      -- 公众号名称
    publish_time DATETIME,                    -- 发布时间

    -- 图片专用字段
    local_path TEXT,                          -- 本地存储路径
    original_filename TEXT,                   -- 原始文件名
    file_size INTEGER,                        -- 文件大小（字节）
    mime_type TEXT,                           -- MIME类型
    width INTEGER,                            -- 图片宽度
    height INTEGER,                           -- 图片高度

    -- 元数据
    metadata TEXT,                            -- 额外元数据（JSON格式）
    fetch_time DATETIME DEFAULT (datetime('now', '+8 hours')), -- 抓取时间

    -- 时间戳
    created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
    updated_at DATETIME DEFAULT (datetime('now', '+8 hours')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES favorite_folders(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_folder_id ON favorites(folder_id);
CREATE INDEX IF NOT EXISTS idx_favorites_type ON favorites(type);
CREATE INDEX IF NOT EXISTS idx_favorites_bvid ON favorites(bvid);
CREATE INDEX IF NOT EXISTS idx_favorites_source_url ON favorites(source_url);

