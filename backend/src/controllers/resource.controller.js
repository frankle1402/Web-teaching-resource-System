const { v4: uuidv4 } = require('uuid');
const { getDB, saveDatabase } = require('../database/connection');

/**
 * 资源管理控制器
 */
class ResourceController {
  /**
   * 获取资源列表（支持分页、筛选）
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
      const db = await getDB();

      // 构建查询条件
      let whereConditions = ['user_id = ?'];
      let params = [userId];

      if (folderId) {
        whereConditions.push('folder_id = ?');
        params.push(folderId);
      }

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

      const whereClause = whereConditions.join(' AND ');

      // 查询总数
      const countResult = db.prepare(`SELECT COUNT(*) as total FROM resources WHERE ${whereClause}`).get(params);
      const total = countResult.total;

      // 查询资源列表
      const offset = (page - 1) * pageSize;
      const resources = db.prepare(`
        SELECT
          id, uuid, title, course_name, course_level, major, subject,
          template_id, folder_id, status, public_url,
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
   */
  async getResourceById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const db = await getDB();

      const resource = db.prepare(`
        SELECT * FROM resources WHERE id = ? AND user_id = ?
      `).get([id, userId]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在'
          }
        });
      }

      res.json({
        success: true,
        data: resource
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
        title,
        courseName,
        courseLevel,
        major,
        subject,
        contentHtml,
        templateId,
        folderId,
        status
      } = req.body;

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
          major, subject, content_html, template_id, folder_id,
          status, public_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run([
        uuid, userId, title, courseName, courseLevel,
        major, subject, contentHtml || '',
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
          VALUES (?, ?, 1, '初始版本', datetime('now'))
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
   */
  async updateResource(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        courseName,
        courseLevel,
        major,
        subject,
        contentHtml,
        templateId,
        folderId,
        status
      } = req.body;

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

      // 如果内容发生变化，创建版本快照
      if (contentHtml && contentHtml !== resource.content_html) {
        const versionCount = db.prepare(`
          SELECT COUNT(*) as count FROM resource_versions WHERE resource_id = ?
        `).get([id]).count;

        db.prepare(`
          INSERT INTO resource_versions (resource_id, content_html, version_number, change_description, created_at)
          VALUES (?, ?, ?, '自动保存', datetime('now'))
        `).run([id, contentHtml, versionCount + 1]);
      }

      // 确定新的状态和public_url
      const newStatus = status || resource.status;
      let publicUrl = resource.public_url;

      // 如果状态从非发布变为发布，生成public_url
      if (newStatus === 'published' && resource.status !== 'published') {
        publicUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/r/${resource.uuid}`;
      }

      // 更新资源
      db.prepare(`
        UPDATE resources
        SET title = ?,
            course_name = ?,
            course_level = ?,
            major = ?,
            subject = ?,
            content_html = COALESCE(?, content_html),
            template_id = COALESCE(?, template_id),
            folder_id = COALESCE(?, folder_id),
            status = ?,
            public_url = ?,
            updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run([
        title, courseName, courseLevel, major, subject,
        contentHtml || null,
        templateId || null,
        folderId || null,
        newStatus,
        publicUrl,
        id, userId
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
   */
  async deleteResource(req, res) {
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
        SET content_html = ?, updated_at = datetime('now')
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
            updated_at = datetime('now')
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
        SET status = 'draft', updated_at = datetime('now')
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
   */
  async getPublicResource(req, res) {
    try {
      const { uuid } = req.params;
      const db = await getDB();

      const resource = db.prepare(`
        SELECT title, course_name, course_level, major, subject, content_html
        FROM resources
        WHERE uuid = ? AND status = 'published'
      `).get([uuid]);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '资源不存在或未发布'
          }
        });
      }

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
}

module.exports = new ResourceController();
