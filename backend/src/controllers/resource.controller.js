const { v4: uuidv4 } = require('uuid');
const { getDB, saveDatabase } = require('../database/connection');

/**
 * 资源管理控制器
 */
class ResourceController {
  /**
   * 获取资源列表（支持分页、筛选）
   * 管理员可获取所有资源，普通用户只能获取自己的资源
   */
  async getResources(req, res) {
    try {
      const {
        page = 1,
        pageSize = 10,
        folderId,
        status,
        courseLevel,
        major,
        keyword
      } = req.query;

      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const db = await getDB();

      // 构建查询条件
      // myResources=true 时，即使是管理员也只返���自己的资源
      // 未指定 myResources 且用户是管理员时，返回所有资源（用于全站资源管理）
      const myResourcesOnly = req.query.myResources === 'true';
      let whereConditions = (isAdmin && !myResourcesOnly) ? [] : ['user_id = ?'];
      let params = (isAdmin && !myResourcesOnly) ? [] : [userId];

      // folderId 特殊值处理
      // 'all' - 全部资源（不筛选文件夹）
      // 'uncategorized' 或 'null' - 未分类资源（folder_id IS NULL）
      // 其他数字 - 指定文件夹
      if (folderId === 'uncategorized' || folderId === 'null') {
        whereConditions.push('folder_id IS NULL');
      } else if (folderId && folderId !== 'all') {
        whereConditions.push('folder_id = ?');
        params.push(folderId);
      }
      // folderId === 'all' 或 undefined 时不添加文件夹筛选条件

      if (status) {
        whereConditions.push('status = ?');
        params.push(status);
      }

      if (courseLevel) {
        whereConditions.push('course_level = ?');
        params.push(courseLevel);
      }

      if (major) {
        whereConditions.push('major = ?');
        params.push(major);
      }

      if (keyword) {
        whereConditions.push('(title LIKE ? OR course_name LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      // 排除被禁用的资源（管理员可以看到）
      if (!isAdmin) {
        whereConditions.push('is_disabled = 0');
      }

      const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';

      // 查询总数
      const countResult = db.prepare(`SELECT COUNT(*) as total FROM resources WHERE ${whereClause}`).get(params);
      const total = countResult.total;

      // 查询资源列表
      const offset = (page - 1) * pageSize;
      const resources = db.prepare(`
        SELECT
          id, uuid, title, course_name, course_level, major, subject,
          template_id, folder_id, status, public_url, is_disabled, disabled_reason,
          created_at, updated_at
        FROM resources
        WHERE ${whereClause}
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
      `).all([...params, parseInt(pageSize), offset]);

      res.json({
        success: true,
        data: {
          list: resources,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取资源列表错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_RESOURCES_ERROR',
          message: '获取资源列表失败'
        }
      });
    }
  }

  /**
   * 获取资源详情
   * 管理员可以获取任何资源，普通用户只能获取自己的资源
   */
  async getResourceById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const db = await getDB();

      // 管理员可以查看任何资源，普通用户只能查看自己的
      const resource = db.prepare(`
        SELECT * FROM resources WHERE id = ? ${!isAdmin ? 'AND user_id = ?' : ''}
      `).get(isAdmin ? [id] : [id, userId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      // 检查资源是否被禁用
      if (resource.is_disabled && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'RESOURCE_DISABLED',
            message: '该资源已被管理员禁用'
          }
        });
      }

      // 映射字段：prompt_text -> additional_requirements
      const responseData = {
        ...resource,
        additional_requirements: resource.prompt_text || ''
      };

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('获取资源详情错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_RESOURCE_ERROR',
          message: '获取资源详情失败'
        }
      });
    }
  }

  /**
   * 创建新资源
   */
  async createResource(req, res) {
    try {
      const {
        subject,
        courseName,
        courseLevel,
        major,
        additionalRequirements,
        contentHtml,
        templateId,
        folderId,
        status
      } = req.body;

      // 字段映射：前端的subject对应数据库的title（教学主题）
      const title = subject;

      // 验证必填字段
      if (!title || !courseName || !courseLevel) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '缺少必填字段'
          }
        });
      }

      const userId = req.user.id;
      const db = await getDB();

      // 生成UUID
      const uuid = uuidv4();

      // 确定资源状态（默认为draft）
      const resourceStatus = status || 'draft';

      // 如果是发布状态，生成公开URL
      let publicUrl = null;
      if (resourceStatus === 'published') {
        publicUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/r/${uuid}`;
      }

      // 创建资源
      const result = db.prepare(`
        INSERT INTO resources (
          uuid, user_id, title, course_name, course_level,
          major, subject, prompt_text, content_html, template_id, folder_id,
          status, public_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+8 hours'), datetime('now', '+8 hours'))
      `).run([
        uuid, userId, title, courseName, courseLevel,
        major, title, additionalRequirements || '', contentHtml || '',
        templateId || null,  // 将 undefined 转换为 null
        folderId || null,    // 将 undefined 转换为 null
        resourceStatus,
        publicUrl
      ]);

      // 保存数据库
      saveDatabase();

      // 获取创建的资源
      const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get([result.lastInsertRowid]);

      // 创建初始版本
      if (contentHtml) {
        db.prepare(`
          INSERT INTO resource_versions (resource_id, content_html, version_number, change_description, created_at)
          VALUES (?, ?, 1, '初始版本', datetime('now', '+8 hours'))
        `).run([resource.id, contentHtml]);
        saveDatabase();
      }

      console.log(`✓ 创建资源: ${title} (状态: ${resourceStatus}, 用户: ${req.user.phone})`);

      res.status(201).json({
        success: true,
        data: {
          ...resource,
          publicUrl: resource.public_url
        }
      });
    } catch (error) {
      console.error('创建资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_RESOURCE_ERROR',
          message: '创建资源失败'
        }
      });
    }
  }

  /**
   * 更新资源
   * 管理员可以更新任何资源，普通用户只能更新自己的资源
   */
  async updateResource(req, res) {
    try {
      const { id } = req.params;
      const {
        subject,
        courseName,
        courseLevel,
        major,
        additionalRequirements,
        contentHtml,
        templateId,
        folderId,
        status
      } = req.body;

      // 字段映射：前端的subject对应数据库的title（教学主题）
      const title = subject;

      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const db = await getDB();

      // 检查资源是否存在（管理员可以编辑任何资源，普通用户只能编辑自己的）
      const resource = db.prepare(`
        SELECT * FROM resources WHERE id = ? ${!isAdmin ? 'AND user_id = ?' : ''}
      `).get(isAdmin ? [id] : [id, userId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      // 检查资源是否被禁用
      if (resource.is_disabled && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'RESOURCE_DISABLED',
            message: '该资源已被管理员禁用，无法修改'
          }
        });
      }

      // 如果内容发生变化，创建版本快照
      if (contentHtml && contentHtml !== resource.content_html) {
        const versionCount = db.prepare(`
          SELECT COUNT(*) as count FROM resource_versions WHERE resource_id = ?
        `).get([id]).count;

        db.prepare(`
          INSERT INTO resource_versions (resource_id, content_html, version_number, change_description, created_at)
          VALUES (?, ?, ?, '自动保存', datetime('now', '+8 hours'))
        `).run([id, contentHtml, versionCount + 1]);
      }

      // 确定新的状态和public_url
      const newStatus = status || resource.status;
      let publicUrl = resource.public_url;

      // 如果状态从非发布变为发布，生成public_url
      if (newStatus === 'published' && resource.status !== 'published') {
        publicUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/r/${resource.uuid}`;
      }

      // 更新资源（管理员更新时不限制user_id）
      db.prepare(`
        UPDATE resources
        SET title = ?,
            course_name = ?,
            course_level = ?,
            major = ?,
            subject = ?,
            prompt_text = ?,
            content_html = COALESCE(?, content_html),
            template_id = COALESCE(?, template_id),
            folder_id = COALESCE(?, folder_id),
            status = ?,
            public_url = ?,
            updated_at = datetime('now', '+8 hours')
        WHERE id = ? ${!isAdmin ? 'AND user_id = ?' : ''}
      `).run([
        title, courseName, courseLevel, major, title, additionalRequirements || '',
        contentHtml || null,
        templateId || null,
        folderId || null,
        newStatus,
        publicUrl,
        id, ...(isAdmin ? [] : [userId])
      ]);

      // 保存数据库
      saveDatabase();

      // 获取更新后的资源
      const updatedResource = db.prepare('SELECT * FROM resources WHERE id = ?').get([id]);

      console.log(`✓ 更新资源: ${title} (状态: ${newStatus}, 用户: ${req.user.phone})`);

      res.json({
        success: true,
        data: {
          ...updatedResource,
          publicUrl: updatedResource.public_url
        }
      });
    } catch (error) {
      console.error('更新资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_RESOURCE_ERROR',
          message: '更新资源失败'
        }
      });
    }
  }

  /**
   * 删除资源
   * 管理员可以删除任何资源，普通用户只能删除自己的资源
   */
  async deleteResource(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const db = await getDB();

      // 检查资源是否存在（管理员可以删除任何资源，普通用户只能删除自己的）
      const resource = db.prepare(`
        SELECT * FROM resources WHERE id = ? ${!isAdmin ? 'AND user_id = ?' : ''}
      `).get(isAdmin ? [id] : [id, userId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      // 检查资源是否被禁用
      if (resource.is_disabled && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'RESOURCE_DISABLED',
            message: '该资源已被管理员禁用，无法删除'
          }
        });
      }

      // 删除资源（级联删除版本历史）
      db.prepare('DELETE FROM resource_versions WHERE resource_id = ?').run([id]);
      db.prepare('DELETE FROM resources WHERE id = ?').run([id]);

      // 保存数据库
      saveDatabase();

      console.log(`✓ 删除资源: ${resource.title} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: '资源已删除'
      });
    } catch (error) {
      console.error('删除资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_RESOURCE_ERROR',
          message: '删除资源失败'
        }
      });
    }
  }

  /**
   * 获取资源版本历史
   */
  async getResourceVersions(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const db = await getDB();

      // 检查资源是否存在且属于当前用户
      const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND user_id = ?').get([id, userId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      // 获取版本历史
      const versions = db.prepare(`
        SELECT id, version_number, version_note, created_at
        FROM resource_versions
        WHERE resource_id = ?
        ORDER BY version_number DESC
      `).all([id]);

      res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      console.error('获取版本历史错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_VERSIONS_ERROR',
          message: '获取版本历史失败'
        }
      });
    }
  }

  /**
   * 回滚到指定版本
   */
  async restoreResourceVersion(req, res) {
    try {
      const { id, versionId } = req.params;
      const userId = req.user.id;
      const db = await getDB();

      // 检查资源是否存在且属于当前用户
      const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND user_id = ?').get([id, userId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      // 获取要恢复的版本
      const version = db.prepare(`
        SELECT * FROM resource_versions WHERE id = ? AND resource_id = ?
      `).get([versionId, id]);

      if (!version) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VERSION_NOT_FOUND',
            message: '版本不存在'
          }
        });
      }

      // 更新资源内容
      db.prepare(`
        UPDATE resources
        SET content_html = ?, updated_at = datetime('now', '+8 hours')
        WHERE id = ?
      `).run([version.content_html, id]);

      // 保存数据库
      saveDatabase();

      console.log(`✓ 回滚资源到版本 ${version.version_number} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: '版本已恢复',
        data: {
          versionNumber: version.version_number
        }
      });
    } catch (error) {
      console.error('恢复版本错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RESTORE_VERSION_ERROR',
          message: '恢复版本失败'
        }
      });
    }
  }

  /**
   * 获取已使用的课程名称和专业列表（用于前端自动完成推荐）
   * 查询整个系统所有用户使用过的课程名称和专业，去重后按使用频率排序
   */
  async getUsedFields(req, res) {
    try {
      const db = await getDB();

      // 获取整个系统已使用的课程名称（去重、按使用频率排序）
      const courseNames = db.prepare(`
        SELECT course_name as name, COUNT(*) as count
        FROM resources
        WHERE course_name IS NOT NULL AND course_name != ''
        GROUP BY course_name
        ORDER BY count DESC, course_name ASC
      `).all([]);

      // 获取整个系统已使用的专业（去重、按使用频率排序）
      const majors = db.prepare(`
        SELECT major as name, COUNT(*) as count
        FROM resources
        WHERE major IS NOT NULL AND major != ''
        GROUP BY major
        ORDER BY count DESC, major ASC
      `).all([]);

      res.json({
        success: true,
        data: {
          courseNames: courseNames.map(item => item.name),
          majors: majors.map(item => item.name)
        }
      });
    } catch (error) {
      console.error('获取字段列表错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_USED_FIELDS_ERROR',
          message: '获取字段列表失败'
        }
      });
    }
  }

  /**
   * 发布资源（生成公开访问URL）
   */
  async publishResource(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const db = await getDB();

      // 检查资源是否存在且属于当前用户
      const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND user_id = ?').get([id, userId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      if (!resource.content_html) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_CONTENT',
            message: '资源内容为空，无法发布'
          }
        });
      }

      // 生成UUID（如果还没有）
      if (!resource.uuid) {
        const uuid = uuidv4();
        resource.uuid = uuid;
      }

      // 生成公开访问URL
      const publicUrl = `${process.env.BASE_URL}/r/${resource.uuid}`;

      // 更新状态为已发布，并保存public_url
      db.prepare(`
        UPDATE resources
        SET status = 'published',
            uuid = ?,
            public_url = ?,
            updated_at = datetime('now', '+8 hours')
        WHERE id = ?
      `).run([resource.uuid, publicUrl, id]);

      // 保存数据库
      saveDatabase();

      console.log(`✓ 发布资源: ${resource.title} (URL: ${publicUrl})`);

      res.json({
        success: true,
        data: {
          publicUrl
        }
      });
    } catch (error) {
      console.error('发布资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PUBLISH_RESOURCE_ERROR',
          message: '发布资源失败'
        }
      });
    }
  }

  /**
   * 回收资源为草稿（下架）
   */
  async unpublishResource(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const db = await getDB();

      // 检查资源是否存在且属于当前用户
      const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND user_id = ?').get([id, userId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      if (resource.status !== 'published') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NOT_PUBLISHED',
            message: '该资源不是已发布状态'
          }
        });
      }

      // 更新状态为草稿��保留 public_url 但用户无法访问
      db.prepare(`
        UPDATE resources
        SET status = 'draft', updated_at = datetime('now', '+8 hours')
        WHERE id = ?
      `).run([id]);

      // 保存数据库
      saveDatabase();

      console.log(`✓ 回收资源为草稿: ${resource.title}`);

      res.json({
        success: true,
        data: {
          message: '资源已回收为草稿'
        }
      });
    } catch (error) {
      console.error('回收资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UNPUBLISH_RESOURCE_ERROR',
          message: '回收资源失败'
        }
      });
    }
  }

  /**
   * 公开访问资源（无需认证）
   * 检查资源是否被禁用
   */
  async getPublicResource(req, res) {
    try {
      const { uuid } = req.params;
      const db = await getDB();

      const resource = db.prepare(`
        SELECT r.title, r.course_name, r.course_level, r.major, r.subject, r.content_html, r.is_disabled, r.user_id
        FROM resources r
        WHERE r.uuid = ? AND r.status = 'published'
      `).get([uuid]);

      if (!resource) {
        // 资源不存在或未发布，查询作者信息
        const authorInfo = db.prepare(`
          SELECT r.user_id, u.nickname
          FROM resources r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE r.uuid = ?
        `).get([uuid]);

        const authorNickname = authorInfo?.nickname || '未知作者';
        const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // 返回美观的下架提示页面
        return res.status(404).send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>资源已下架 - 教学资源平台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      padding: 48px 40px;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #fef3c7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 {
      color: #1e293b;
      font-size: 24px;
      margin-bottom: 16px;
    }
    .message {
      color: #64748b;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .author-info {
      background: #f8fafc;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 32px;
    }
    .author-label {
      color: #94a3b8;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .author-name {
      color: #1e293b;
      font-size: 18px;
      font-weight: 600;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 24px 0;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.3s;
    }
    .btn-primary {
      background: #3b82f6;
      color: white;
    }
    .btn-primary:hover {
      background: #2563eb;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    .btn-outline {
      background: white;
      color: #3b82f6;
      border: 2px solid #3b82f6;
    }
    .btn-outline:hover {
      background: #eff6ff;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .footer-logo {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .footer-logo strong {
      color: #3b82f6;
    }
    .footer-text {
      font-size: 12px;
      color: #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📦</div>
    <h1>资源已下架</h1>
    <p class="message">
      该教学资源已被作者下架，暂时无法访问。<br>
      如有需要，请联系资源作者。
    </p>
    <div class="author-info">
      <div class="author-label">资源作者</div>
      <div class="author-name">${authorNickname}</div>
    </div>
    <div class="actions">
      <a href="${frontendUrl}/explore" class="btn btn-primary">浏览资源中心</a>
      <a href="${frontendUrl}" class="btn btn-outline">返回首页</a>
    </div>
    <div class="footer">
      <div class="footer-logo"><strong>教学资源平台</strong></div>
      <div class="footer-text">面向医卫类教师的新一代教学资源生成平台</div>
    </div>
  </div>
</body>
</html>
        `);
      }

      // 检查资源是否被管理员禁用
      if (resource.is_disabled) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'RESOURCE_DISABLED',
            message: '该资源已被管理员禁用'
          }
        });
      }

      // 增加浏览量
      db.prepare(`
        UPDATE resources
        SET view_count = view_count + 1
        WHERE uuid = ?
      `).run([uuid]);
      saveDatabase();

      // 返回HTML内容
      res.send(resource.content_html);
    } catch (error) {
      console.error('访问公开资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PUBLIC_RESOURCE_ERROR',
          message: '访问资源失败'
        }
      });
    }
  }

  /**
   * 获取公开资源列表（无需认证）
   * 只显示已发布的资源，支持分页和筛选
   */
  async getPublicResources(req, res) {
    try {
      const {
        page = 1,
        pageSize = 12,
        keyword,
        courseLevel,
        major,
        sortBy = 'latest'
      } = req.query;

      const db = await getDB();

      // 构建查询条件（只查询已发布资源）
      let whereConditions = ['status = ?'];
      let params = ['published'];

      if (keyword) {
        // 支持标题、课程名、专业、内容搜索
        whereConditions.push('(title LIKE ? OR course_name LIKE ? OR major LIKE ? OR content_html LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      if (courseLevel) {
        whereConditions.push('course_level = ?');
        params.push(courseLevel);
      }

      if (major) {
        whereConditions.push('major = ?');
        params.push(major);
      }

      const whereClause = whereConditions.join(' AND ');

      // 排序规则
      let orderClause = 'updated_at DESC';
      if (sortBy === 'popular') {
        orderClause = 'view_count DESC, updated_at DESC';
      } else if (sortBy === 'liked') {
        orderClause = 'like_count DESC, updated_at DESC';
      }

      // 查询总��
      const countResult = db.prepare(`SELECT COUNT(*) as total FROM resources WHERE ${whereClause}`).get(params);
      const total = countResult.total;

      // 查询资源列表
      const offset = (page - 1) * pageSize;
      const resources = db.prepare(`
        SELECT
          id, uuid, title, course_name, course_level, major, subject,
          view_count, like_count, dislike_count, created_at, updated_at
        FROM resources
        WHERE ${whereClause}
        ORDER BY ${orderClause}
        LIMIT ? OFFSET ?
      `).all([...params, parseInt(pageSize), offset]);

      res.json({
        success: true,
        data: {
          list: resources,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      });
    } catch (error) {
      console.error('获取公开资源列表错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PUBLIC_RESOURCES_ERROR',
          message: '获取公开资源列表失败'
        }
      });
    }
  }

  /**
   * 获取所有专业列表（用于公开页面的筛选）
   */
  async getPublicMajors(req, res) {
    try {
      const db = await getDB();

      const majors = db.prepare(`
        SELECT DISTINCT major
        FROM resources
        WHERE status = 'published' AND major IS NOT NULL AND major != ''
        ORDER BY major ASC
      `).all();

      res.json({
        success: true,
        data: majors.map(m => m.major)
      });
    } catch (error) {
      console.error('获取专业列表错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_MAJORS_ERROR',
          message: '获取专业列表失败'
        }
      });
    }
  }

  /**
   * 点赞或点踩资源（需要认证）
   */
  async toggleLike(req, res) {
    try {
      const { id } = req.params;
      const { likeType } = req.body; // 'like' 或 'dislike'
      const userId = req.user.id;
      const db = await getDB();

      // 验证like_type
      if (!['like', 'dislike'].includes(likeType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LIKE_TYPE',
            message: '点赞类型无效'
          }
        });
      }

      // 检查资源是否存在且已发布
      const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND status = ?').get([id, 'published']);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在或未发布'
          }
        });
      }

      // 检查用户是否已经点赞或点踩过
      const existingLike = db.prepare('SELECT * FROM resource_likes WHERE resource_id = ? AND user_id = ?').get([id, userId]);

      if (existingLike) {
        if (existingLike.like_type === likeType) {
          // 取消点赞/点踩
          db.prepare('DELETE FROM resource_likes WHERE resource_id = ? AND user_id = ?').run([id, userId]);
        } else {
          // 切换类型（从点赞变点踩，或反之）
          db.prepare('UPDATE resource_likes SET like_type = ? WHERE resource_id = ? AND user_id = ?').run([likeType, id, userId]);
        }
      } else {
        // 新增点赞/点踩
        db.prepare('INSERT INTO resource_likes (resource_id, user_id, like_type) VALUES (?, ?, ?)').run([id, userId, likeType]);
      }

      // 更新统计
      const likeCount = db.prepare('SELECT COUNT(*) as count FROM resource_likes WHERE resource_id = ? AND like_type = ?').get([id, 'like']).count;
      const dislikeCount = db.prepare('SELECT COUNT(*) as count FROM resource_likes WHERE resource_id = ? AND like_type = ?').get([id, 'dislike']).count;

      db.prepare('UPDATE resources SET like_count = ?, dislike_count = ? WHERE id = ?').run([likeCount, dislikeCount, id]);

      saveDatabase();

      res.json({
        success: true,
        data: {
          likeCount,
          dislikeCount,
          userAction: existingLike?.like_type === likeType ? null : likeType // null表示已取消
        }
      });
    } catch (error) {
      console.error('点赞/点踩错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TOGGLE_LIKE_ERROR',
          message: '操作失败'
        }
      });
    }
  }

  /**
   * 获取用户对多个资源的点赞状态
   */
  async getUserLikeStatus(req, res) {
    try {
      const { resourceIds } = req.query; // 逗号分隔的资源ID
      const userId = req.user.id;
      const db = await getDB();

      if (!resourceIds) {
        return res.json({
          success: true,
          data: {}
        });
      }

      const ids = resourceIds.split(',').map(id => parseInt(id));

      const likes = db.prepare(`
        SELECT resource_id, like_type
        FROM resource_likes
        WHERE resource_id IN (${ids.map(() => '?').join(',')}) AND user_id = ?
      `).all([...ids, userId]);

      const statusMap = {};
      likes.forEach(like => {
        statusMap[like.resource_id] = like.like_type;
      });

      res.json({
        success: true,
        data: statusMap
      });
    } catch (error) {
      console.error('获取点赞状态错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_LIKE_STATUS_ERROR',
          message: '获取点赞状态失败'
        }
      });
    }
  }

  /**
   * 移动资源到指定文件夹
   */
  async moveResource(req, res) {
    try {
      const { id } = req.params;
      const { folderId } = req.body; // 目标文件夹ID，null表示移到未分类

      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const db = await getDB();

      // 检查资源是否存在
      const resource = db.prepare(`
        SELECT * FROM resources WHERE id = ? ${!isAdmin ? 'AND user_id = ?' : ''}
      `).get(isAdmin ? [id] : [id, userId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      // 如果指定了文件夹，验证文件夹是否存在且属于当前用户
      if (folderId !== null && folderId !== '') {
        const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get([folderId, userId]);
        if (!folder) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'FOLDER_NOT_FOUND',
              message: '目标文件夹不存在'
            }
          });
        }
      }

      // 更新资源的文件夹
      db.prepare('UPDATE resources SET folder_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run([folderId || null, id]);
      saveDatabase();

      console.log(`✓ 移动资源: ${resource.title} -> 文件夹${folderId || '未分类'} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: '资源已移动'
      });
    } catch (error) {
      console.error('移动资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MOVE_RESOURCE_ERROR',
          message: '移动资源失败'
        }
      });
    }
  }

  /**
   * 批量移动资源到指定文件夹
   */
  async batchMoveResources(req, res) {
    try {
      const { resourceIds, folderId } = req.body; // resourceIds: 资源ID数组，folderId: 目标文件夹ID（null表示移到未分类）

      if (!resourceIds || !Array.isArray(resourceIds) || resourceIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RESOURCE_IDS',
            message: '资源ID无效'
          }
        });
      }

      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const db = await getDB();

      // 如果指定了文件夹，验证文件夹是否存在且属于当前用户
      if (folderId !== null && folderId !== '') {
        const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get([folderId, userId]);
        if (!folder) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'FOLDER_NOT_FOUND',
              message: '目标文件夹不存在'
            }
          });
        }
      }

      // 构建查询条件：管理员可以操作所有资源，普通用户只能操作自己的
      let whereClause = `id IN (${resourceIds.map(() => '?').join(',')})`;
      let params = [...resourceIds];

      if (!isAdmin) {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }

      // 批量更新资源的文件夹
      const result = db.prepare(`UPDATE resources SET folder_id = ?, updated_at = datetime('now', '+8 hours') WHERE ${whereClause}`).run([folderId || null, ...params]);

      saveDatabase();

      console.log(`✓ 批量移动资源: ${result.changes} 个资源 -> 文件夹${folderId || '未分类'} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: `已移动 ${result.changes} 个资源`,
        data: {
          movedCount: result.changes
        }
      });
    } catch (error) {
      console.error('批量移动资源错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_MOVE_RESOURCES_ERROR',
          message: '批量移动资源失败'
        }
      });
    }
  }
}

module.exports = new ResourceController();
