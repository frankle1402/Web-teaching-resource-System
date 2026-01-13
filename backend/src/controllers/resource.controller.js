const { v4: uuidv4 } = require('uuid');
const { getDB, saveDatabase } = require('../database/connection');

/**
 * 解析 major 字段（兼容旧的单字符串格式和新的 JSON 数组格式）
 * @param {string} majorStr - 数据库中的 major 字段值
 * @returns {string[]} - 专业数组
 */
function parseMajor(majorStr) {
  if (!majorStr) return [];

  try {
    const parsed = JSON.parse(majorStr);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // 如果解析结果不是数组，当作单字符串处理
    return [majorStr];
  } catch (e) {
    // JSON 解析失败，当作单字符串处理（兼容旧数据）
    return [majorStr];
  }
}

/**
 * 序列化 major 字段为 JSON 数组字符串
 * @param {string|string[]} major - 专业（字符串或数组）
 * @returns {string} - JSON 数组字符串
 */
function serializeMajor(major) {
  if (Array.isArray(major)) {
    return JSON.stringify(major);
  }
  // 如果是单字符串，转换为数组
  return JSON.stringify([major]);
}

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
        // 使用 LIKE 匹配 JSON 数组中的专业（匹配 "专业名" 格式）
        whereConditions.push('major LIKE ?');
        params.push(`%"${major}"%`);
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

      // 解析每条资源的 major 字段
      const parsedResources = resources.map(r => ({
        ...r,
        major: parseMajor(r.major)
      }));

      res.json({
        success: true,
        data: {
          list: parsedResources,
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
        major: parseMajor(resource.major),
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
        serializeMajor(major), title, additionalRequirements || '', contentHtml || '',
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
          major: parseMajor(resource.major),
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
        title, courseName, courseLevel, serializeMajor(major), title, additionalRequirements || '',
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
          major: parseMajor(updatedResource.major),
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

      // 获取所有资源的 major 字段，解析 JSON 数组并统计频率
      const majorRecords = db.prepare(`
        SELECT major
        FROM resources
        WHERE major IS NOT NULL AND major != '' AND major != '[]'
      `).all([]);

      // 统计每个专业���使用次数
      const majorCount = {};
      for (const record of majorRecords) {
        const majors = parseMajor(record.major);
        for (const m of majors) {
          majorCount[m] = (majorCount[m] || 0) + 1;
        }
      }

      // 按使用频率排序
      const sortedMajors = Object.entries(majorCount)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([name]) => name);

      res.json({
        success: true,
        data: {
          courseNames: courseNames.map(item => item.name),
          majors: sortedMajors
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
   * 获取资源的原始HTML内容（用于iframe加载）
   */
  async getPublicResourceContent(req, res) {
    try {
      const { uuid } = req.params;
      const db = await getDB();

      const resource = db.prepare(`
        SELECT content_html, is_disabled, status
        FROM resources
        WHERE uuid = ? AND status = 'published'
      `).get([uuid]);

      if (!resource || resource.is_disabled) {
        return res.status(404).send('<h1>资源不存在或已被禁用</h1>');
      }

      res.send(resource.content_html);
    } catch (error) {
      console.error('获取资源内容错误:', error);
      res.status(500).send('<h1>获取资源失败</h1>');
    }
  }

  /**
   * 公开访问资源（无需认证）
   * 返回包含计时器的容器页面，支持移动端自适应
   */
  async getPublicResource(req, res) {
    try {
      const { uuid } = req.params;
      const db = await getDB();

      const resource = db.prepare(`
        SELECT r.id, r.title, r.course_name, r.course_level, r.major, r.subject, r.content_html, r.is_disabled, r.user_id
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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
    @media (max-width: 480px) {
      .container { padding: 32px 24px; }
      h1 { font-size: 20px; }
      .message { font-size: 14px; }
      .btn { padding: 12px 20px; font-size: 14px; }
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

      const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // 返回带计时器和登录弹窗的容器页面（移动端自适应）
      const containerHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <meta name="format-detection" content="telephone=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <title>${resource.title} - 医教智创云平台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      -webkit-overflow-scrolling: touch;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    /* 资源内容iframe - 完全自适应 */
    #resource-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    /* 计时器悬浮组件 - 左上角 */
    .timer-widget {
      position: fixed;
      top: 20px;
      left: 20px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      z-index: 9998;
      cursor: move;
      user-select: none;
      min-width: 140px;
      transition: transform 0.2s, box-shadow 0.2s, opacity 0.3s;
      touch-action: none;
    }

    .timer-widget:hover {
      transform: scale(1.02);
      box-shadow: 0 6px 24px rgba(99, 102, 241, 0.5);
    }

    .timer-widget.minimized {
      padding: 8px 12px;
      min-width: auto;
    }

    .timer-widget.minimized .timer-details {
      display: none;
    }

    .timer-widget.dragging {
      opacity: 0.9;
      transform: scale(1.05);
    }

    .timer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    .timer-widget.minimized .timer-header {
      margin-bottom: 0;
    }

    .timer-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 12px;
      opacity: 0.9;
    }

    .timer-title svg {
      width: 14px;
      height: 14px;
    }

    .timer-user {
      font-size: 11px;
      opacity: 0.85;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .timer-footer {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }

    .timer-finish-btn {
      width: 100%;
      height: 28px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .timer-finish-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .timer-finish-btn svg {
      width: 14px;
      height: 14px;
    }

    .timer-toggle {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: background 0.2s;
      -webkit-tap-highlight-color: transparent;
    }

    .timer-toggle:hover,
    .timer-toggle:active {
      background: rgba(255, 255, 255, 0.3);
    }

    .timer-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .timer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .timer-label {
      font-size: 11px;
      opacity: 0.8;
    }

    .timer-value {
      font-size: 14px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .timer-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.2);
      margin: 4px 0;
    }

    /* 登录弹窗遮罩 */
    .login-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .login-overlay.hidden {
      display: none;
    }

    /* 登录卡片 */
    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 400px;
      padding: 32px;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .login-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .login-icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .login-icon svg {
      width: 32px;
      height: 32px;
      color: white;
    }

    .login-title {
      font-size: 22px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .login-subtitle {
      font-size: 14px;
      color: #64748b;
    }

    /* 表单样式 */
    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      gap: 8px;
    }

    .form-input {
      flex: 1;
      height: 44px;
      padding: 0 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 15px;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
    }

    .form-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .form-input::placeholder {
      color: #9ca3af;
    }

    .send-code-btn {
      height: 44px;
      padding: 0 16px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      color: #374151;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .send-code-btn:hover:not(:disabled) {
      background: #e5e7eb;
    }

    .send-code-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .login-btn {
      width: 100%;
      height: 48px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      color: white;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 8px;
    }

    .login-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .login-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 20px 0;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: #e5e7eb;
    }

    .divider-text {
      padding: 0 12px;
      font-size: 13px;
      color: #9ca3af;
    }

    .guest-btn {
      width: 100%;
      height: 44px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      font-size: 15px;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s;
    }

    .guest-btn:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    .error-message {
      color: #ef4444;
      font-size: 13px;
      margin-top: 8px;
      display: none;
    }

    .error-message.show {
      display: block;
    }

    /* 验证码弹窗 */
    .code-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      z-index: 10001;
      text-align: center;
      display: none;
    }

    .code-popup.show {
      display: block;
    }

    .code-popup-title {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 12px;
    }

    .code-popup-code {
      font-size: 32px;
      font-weight: 700;
      color: #6366f1;
      letter-spacing: 4px;
      margin-bottom: 12px;
    }

    .code-popup-hint {
      font-size: 13px;
      color: #64748b;
    }

    /* 注册表单样式 */
    .register-card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      width: 100%;
      max-width: 420px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .register-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .register-title {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .register-subtitle {
      font-size: 14px;
      color: #64748b;
    }

    .register-phone-display {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .register-phone-display .phone-number {
      font-size: 15px;
      font-weight: 500;
      color: #1e293b;
    }

    .register-phone-display .change-phone-btn {
      font-size: 13px;
      color: #6366f1;
      background: none;
      border: none;
      cursor: pointer;
    }

    .register-phone-display .change-phone-btn:hover {
      text-decoration: underline;
    }

    .role-selector {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .role-option {
      flex: 1;
      padding: 16px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
      background: white;
    }

    .role-option:hover {
      border-color: #c7d2fe;
      background: #f8fafc;
    }

    .role-option.selected {
      border-color: #6366f1;
      background: #eef2ff;
    }

    .role-option-icon {
      width: 40px;
      height: 40px;
      margin: 0 auto 8px;
      background: #e0e7ff;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .role-option.selected .role-option-icon {
      background: #6366f1;
    }

    .role-option-icon svg {
      width: 22px;
      height: 22px;
      color: #6366f1;
    }

    .role-option.selected .role-option-icon svg {
      color: white;
    }

    .role-option-label {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
    }

    .role-option-desc {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }

    .register-form-group {
      margin-bottom: 16px;
    }

    .register-form-group .form-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }

    .register-form-group .form-label .required {
      color: #ef4444;
      margin-left: 2px;
    }

    .register-form-group .form-input {
      width: 100%;
      height: 44px;
      padding: 0 14px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      font-size: 15px;
      background: white;
      box-sizing: border-box;
    }

    .register-form-group .form-input:focus {
      border-color: #6366f1;
      outline: none;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .register-btn {
      width: 100%;
      height: 48px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
    }

    .register-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .register-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .back-to-login-btn {
      width: 100%;
      height: 44px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      font-size: 15px;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 12px;
    }

    .back-to-login-btn:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    /* 移动端响应式样式 */
    @media (max-width: 768px) {
      .timer-widget {
        top: 12px;
        left: 12px;
        font-size: 12px;
        padding: 10px 14px;
        border-radius: 10px;
        min-width: 130px;
        max-width: calc(100vw - 24px);
      }

      .timer-widget.minimized {
        padding: 8px 10px;
        min-width: auto;
      }

      .timer-header {
        gap: 6px;
        margin-bottom: 6px;
      }

      .timer-title {
        font-size: 11px;
      }

      .timer-title svg {
        width: 12px;
        height: 12px;
      }

      .timer-toggle {
        width: 28px;
        height: 28px;
        font-size: 18px;
      }

      .timer-label {
        font-size: 10px;
      }

      .timer-value {
        font-size: 13px;
      }

      .login-card {
        padding: 24px;
        margin: 16px;
      }

      .login-title {
        font-size: 20px;
      }

      .login-icon {
        width: 56px;
        height: 56px;
      }

      .login-icon svg {
        width: 28px;
        height: 28px;
      }
    }

    /* 小屏手机 */
    @media (max-width: 375px) {
      .timer-widget {
        top: 8px;
        left: 8px;
        padding: 8px 12px;
        font-size: 11px;
        min-width: 120px;
      }

      .login-card {
        padding: 20px;
      }
    }

    /* 横屏模式 */
    @media (max-height: 500px) and (orientation: landscape) {
      .timer-widget {
        top: 8px;
        left: 8px;
        padding: 6px 10px;
        font-size: 11px;
      }

      .timer-header {
        margin-bottom: 4px;
      }

      .timer-details {
        gap: 2px;
      }

      .login-card {
        max-height: 90vh;
        overflow-y: auto;
      }
    }

    /* 安全区域适配（iPhone X及以上） */
    @supports (padding-top: env(safe-area-inset-top)) {
      .timer-widget {
        top: calc(12px + env(safe-area-inset-top));
        left: calc(12px + env(safe-area-inset-left));
      }
    }
  </style>
</head>
<body>
  <!-- 资源内容iframe -->
  <iframe id="resource-frame" src="${baseUrl}/r/${uuid}/content" title="${resource.title}"></iframe>

  <!-- 计时器组件 -->
  <div id="timer-widget" class="timer-widget">
    <div class="timer-header">
      <span class="timer-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12,6 12,12 16,14"></polyline>
        </svg>
        学习计时
      </span>
      <span class="timer-user" id="timer-user" title="当前用户">用户</span>
      <button class="timer-toggle" id="timer-toggle" title="最小化/展开">−</button>
    </div>
    <div class="timer-details" id="timer-details">
      <div class="timer-row">
        <span class="timer-label">本次学习</span>
        <span class="timer-value" id="current-time">00:00:00</span>
      </div>
      <div class="timer-divider"></div>
      <div class="timer-row">
        <span class="timer-label">累计学习</span>
        <span class="timer-value" id="total-time">00:00:00</span>
      </div>
      <div class="timer-footer">
        <button class="timer-finish-btn" id="timer-finish-btn" title="结束学习并返回">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16,17 21,12 16,7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          结束学习
        </button>
      </div>
    </div>
  </div>

  <!-- 登录弹窗 -->
  <div id="login-overlay" class="login-overlay hidden">
    <div class="login-card">
      <div class="login-header">
        <div class="login-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h2 class="login-title">登录后开始学习</h2>
        <p class="login-subtitle">登录后可记录学习时长，查看学习进度</p>
      </div>

      <form id="login-form">
        <div class="form-group">
          <label class="form-label">手机号</label>
          <div class="input-wrapper">
            <input type="tel" id="phone-input" class="form-input" placeholder="请输入手机号" maxlength="11" autocomplete="tel">
            <button type="button" id="send-code-btn" class="send-code-btn">发送验证码</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">验证码</label>
          <input type="text" id="code-input" class="form-input" placeholder="请输入6位验证码" maxlength="6" autocomplete="one-time-code">
        </div>

        <div id="error-message" class="error-message"></div>

        <button type="submit" id="login-btn" class="login-btn">登录</button>
      </form>

      <div class="divider">
        <div class="divider-line"></div>
        <span class="divider-text">或</span>
        <div class="divider-line"></div>
      </div>

      <button type="button" id="guest-btn" class="guest-btn">游客模式浏览（不记录时长）</button>
    </div>
  </div>

  <!-- 验证码显示弹窗 -->
  <div id="code-popup" class="code-popup">
    <div class="code-popup-title">您的验证码</div>
    <div id="code-display" class="code-popup-code">------</div>
    <div class="code-popup-hint">验证码5分钟内有效</div>
  </div>

  <!-- 注册弹窗 -->
  <div id="register-overlay" class="login-overlay hidden">
    <div class="register-card">
      <div class="register-header">
        <h2 class="register-title">创建账号</h2>
        <p class="register-subtitle">填写基本信息完成注册</p>
      </div>

      <div class="register-phone-display">
        <span class="phone-number" id="register-phone">138****0000</span>
        <button type="button" id="change-phone-btn" class="change-phone-btn">修改手机号</button>
      </div>

      <!-- 角色选择 -->
      <div class="role-selector">
        <div class="role-option" data-role="teacher" id="role-teacher">
          <div class="role-option-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div class="role-option-label">我是教师</div>
          <div class="role-option-desc">上传资源，创建课程</div>
        </div>
        <div class="role-option" data-role="student" id="role-student">
          <div class="role-option-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
          </div>
          <div class="role-option-label">我是学生</div>
          <div class="role-option-desc">学习资源，记录进度</div>
        </div>
      </div>

      <!-- 注册表单 -->
      <form id="register-form">
        <div class="register-form-group">
          <label class="form-label">真实姓名<span class="required">*</span></label>
          <input type="text" id="real-name-input" class="form-input" placeholder="请输入您的真实姓名" autocomplete="name">
        </div>

        <!-- 教师字段 -->
        <div id="teacher-fields" style="display: none;">
          <div class="register-form-group">
            <label class="form-label">单位/机构<span class="required">*</span></label>
            <input type="text" id="organization-input" class="form-input" placeholder="请输入您的单位或机构名称" autocomplete="organization">
          </div>
          <div class="register-form-group">
            <label class="form-label">职称</label>
            <select id="teacher-title-input" class="form-input">
              <option value="">请选择职称</option>
              <option value="教授">教授</option>
              <option value="副教授">副教授</option>
              <option value="讲师">讲师</option>
              <option value="助教">助教</option>
              <option value="主治医师">主治医师</option>
              <option value="副主任医师">副主任医师</option>
              <option value="主任医师">主任医师</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="register-form-group">
            <label class="form-label">专业领域</label>
            <input type="text" id="teacher-field-input" class="form-input" placeholder="如：护理学、内科学等">
          </div>
        </div>

        <!-- 学生字段 -->
        <div id="student-fields" style="display: none;">
          <div class="register-form-group">
            <label class="form-label">学校<span class="required">*</span></label>
            <input type="text" id="student-school-input" class="form-input" placeholder="请输入您的学校名称" autocomplete="organization">
          </div>
          <div class="register-form-group">
            <label class="form-label">专业</label>
            <input type="text" id="student-major-input" class="form-input" placeholder="请输入您的专业">
          </div>
        </div>

        <div id="register-error-message" class="error-message"></div>

        <button type="submit" id="register-btn" class="register-btn" disabled>完成注册</button>
      </form>

      <button type="button" id="back-to-login-btn" class="back-to-login-btn">返回登录</button>
    </div>
  </div>

  <script>
    (function() {
      // 配置
      var API_BASE = '${baseUrl}';
      var RESOURCE_ID = ${resource.id};
      var HEARTBEAT_INTERVAL = 30000;

      // 状态
      var viewId = null;
      var currentSeconds = 0;
      var totalSeconds = 0;
      var isLoggedIn = false;
      var token = null;
      var heartbeatTimer = null;
      var timerInterval = null;
      var isMinimized = false;
      var countdownTimer = null;
      var countdown = 0;

      // 暂停计时相关状态
      var isPaused = false;
      var pausedAt = 0;
      var activeStartTime = Date.now();

      // DOM元素
      var widget = document.getElementById('timer-widget');
      var currentTimeEl = document.getElementById('current-time');
      var totalTimeEl = document.getElementById('total-time');
      var toggleBtn = document.getElementById('timer-toggle');
      var timerDetails = document.getElementById('timer-details');
      var timerUserEl = document.getElementById('timer-user');
      var loginOverlay = document.getElementById('login-overlay');
      var loginForm = document.getElementById('login-form');
      var phoneInput = document.getElementById('phone-input');
      var codeInput = document.getElementById('code-input');
      var sendCodeBtn = document.getElementById('send-code-btn');
      var loginBtn = document.getElementById('login-btn');
      var guestBtn = document.getElementById('guest-btn');
      var errorMessage = document.getElementById('error-message');
      var codePopup = document.getElementById('code-popup');
      var codeDisplay = document.getElementById('code-display');
      var finishBtn = document.getElementById('timer-finish-btn');

      // 注册相关DOM元素
      var registerOverlay = document.getElementById('register-overlay');
      var registerForm = document.getElementById('register-form');
      var registerPhoneEl = document.getElementById('register-phone');
      var changePhoneBtn = document.getElementById('change-phone-btn');
      var roleTeacher = document.getElementById('role-teacher');
      var roleStudent = document.getElementById('role-student');
      var teacherFields = document.getElementById('teacher-fields');
      var studentFields = document.getElementById('student-fields');
      var registerBtn = document.getElementById('register-btn');
      var backToLoginBtn = document.getElementById('back-to-login-btn');
      var registerErrorMessage = document.getElementById('register-error-message');

      // 注册流程状态
      var pendingPhone = '';      // 待注册的手机号
      var pendingCode = '';       // 待注册的验证码
      var pendingRegisterToken = ''; // 注册令牌（替代验证码验证）
      var selectedRole = '';      // 选择的角色

      var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // 手机号脱敏
      function maskPhone(phone) {
        if (!phone || phone.length !== 11) return '用户';
        return phone.substring(0, 3) + '****' + phone.substring(7);
      }

      // 获取显示名称
      function getDisplayName() {
        try {
          var userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
          if (userInfo.nickname) return userInfo.nickname;
          if (userInfo.phone) return maskPhone(userInfo.phone);
        } catch (e) {}
        return '用户';
      }

      // 更新用户名显示
      function updateUserDisplay() {
        if (isLoggedIn) {
          var name = getDisplayName();
          timerUserEl.textContent = name;
          timerUserEl.title = name;
        } else {
          timerUserEl.textContent = '未登录';
          timerUserEl.title = '未登录';
        }
      }

      function formatTime(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        return [h, m, s].map(function(v) { return String(v).padStart(2, '0'); }).join(':');
      }

      function updateDisplay() {
        // 暂停时不更新计时
        if (isPaused) return;

        // 计算当前活跃周期的秒数
        var activeSeconds = Math.floor((Date.now() - activeStartTime) / 1000);
        currentSeconds = pausedAt + activeSeconds;

        currentTimeEl.textContent = formatTime(currentSeconds);
        totalTimeEl.textContent = formatTime(totalSeconds + currentSeconds);
      }

      // 暂停计时
      function pauseTimer() {
        if (isPaused || !isLoggedIn) return;
        isPaused = true;
        pausedAt = currentSeconds;
        heartbeat(); // 发送心跳保存当前进度
        console.log('计时已暂停，当前时长:', currentSeconds);
      }

      // 恢复计时
      function resumeTimer() {
        if (!isPaused || !isLoggedIn) return;
        isPaused = false;
        activeStartTime = Date.now();
        console.log('计时已恢复');
      }

      function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.add('show');
      }

      function hideError() {
        errorMessage.classList.remove('show');
      }

      function validatePhone(phone) {
        return /^1[3-9]\\d{9}$/.test(phone);
      }

      // 显示注册表单
      function showRegisterForm(phone, code, registerToken) {
        pendingPhone = phone;
        pendingCode = code;
        pendingRegisterToken = registerToken || '';
        selectedRole = '';

        // 显示脱敏手机号
        registerPhoneEl.textContent = maskPhone(phone);

        // 重置表单
        document.getElementById('real-name-input').value = '';
        document.getElementById('organization-input').value = '';
        document.getElementById('teacher-title-input').value = '';
        document.getElementById('teacher-field-input').value = '';
        document.getElementById('student-school-input').value = '';
        document.getElementById('student-major-input').value = '';

        // 重置角色选择
        roleTeacher.classList.remove('selected');
        roleStudent.classList.remove('selected');
        teacherFields.style.display = 'none';
        studentFields.style.display = 'none';
        registerBtn.disabled = true;

        // 切换弹窗
        loginOverlay.classList.add('hidden');
        registerOverlay.classList.remove('hidden');
      }

      // 隐藏注册表单，返回登录
      function hideRegisterForm() {
        registerOverlay.classList.add('hidden');
        loginOverlay.classList.remove('hidden');
        pendingPhone = '';
        pendingCode = '';
        pendingRegisterToken = '';
        selectedRole = '';
      }

      // 角色选择处理
      function selectRole(role) {
        selectedRole = role;

        // 更新UI
        roleTeacher.classList.toggle('selected', role === 'teacher');
        roleStudent.classList.toggle('selected', role === 'student');
        teacherFields.style.display = role === 'teacher' ? 'block' : 'none';
        studentFields.style.display = role === 'student' ? 'block' : 'none';

        // 检查表单是否可提交
        checkRegisterFormValid();
      }

      // 检查注册表单是否可提交
      function checkRegisterFormValid() {
        var realName = document.getElementById('real-name-input').value.trim();
        var isValid = selectedRole !== '' && realName !== '';

        if (selectedRole === 'teacher') {
          var organization = document.getElementById('organization-input').value.trim();
          isValid = isValid && organization !== '';
        } else if (selectedRole === 'student') {
          var school = document.getElementById('student-school-input').value.trim();
          isValid = isValid && school !== '';
        }

        registerBtn.disabled = !isValid;
      }

      // 角色选择事件
      roleTeacher.addEventListener('click', function() { selectRole('teacher'); });
      roleStudent.addEventListener('click', function() { selectRole('student'); });

      // 修改手机号
      changePhoneBtn.addEventListener('click', hideRegisterForm);

      // 表单输入监听
      registerForm.addEventListener('input', checkRegisterFormValid);

      // 注册表单提交
      registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!selectedRole) {
          showRegisterError('请选择角色');
          return;
        }

        var realName = document.getElementById('real-name-input').value.trim();
        if (!realName) {
          showRegisterError('请输入真实姓名');
          return;
        }

        var registerData = {
          phone: pendingPhone,
          code: pendingCode,
          registerToken: pendingRegisterToken,  // 使用registerToken替代验证码验证
          role: selectedRole,
          real_name: realName,
          nickname: realName // 默认昵称为真实姓名
        };

        // 根据角色添加字段
        if (selectedRole === 'teacher') {
          registerData.organization = document.getElementById('organization-input').value.trim();
          registerData.teacher_title = document.getElementById('teacher-title-input').value;
          registerData.teacher_field = document.getElementById('teacher-field-input').value.trim();
        } else if (selectedRole === 'student') {
          registerData.student_school = document.getElementById('student-school-input').value.trim();
          registerData.student_major = document.getElementById('student-major-input').value.trim();
        }

        hideRegisterError();
        registerBtn.disabled = true;
        registerBtn.textContent = '注册中...';

        fetch(API_BASE + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerData)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success && data.data && data.data.token) {
            // 注册成功，自动登录
            token = data.data.token;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_info', JSON.stringify(data.data.user || {}));
            isLoggedIn = true;
            registerOverlay.classList.add('hidden');

            // 更新用户名显示
            updateUserDisplay();

            // 重置计时器状态
            pausedAt = 0;
            activeStartTime = Date.now();
            isPaused = false;

            // 开始浏览记录
            startView().then(function() {
              heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);
            });
            loadTotalDuration();
          } else {
            showRegisterError(data.error?.message || '注册失败');
            registerBtn.disabled = false;
            registerBtn.textContent = '完成注册';
          }
        })
        .catch(function(err) {
          showRegisterError('网络错误，请重试');
          registerBtn.disabled = false;
          registerBtn.textContent = '完成注册';
        });
      });

      // 返回登录按钮
      backToLoginBtn.addEventListener('click', hideRegisterForm);

      function showRegisterError(msg) {
        registerErrorMessage.textContent = msg;
        registerErrorMessage.classList.add('show');
      }

      function hideRegisterError() {
        registerErrorMessage.classList.remove('show');
      }

      function startCountdown() {
        countdown = 60;
        sendCodeBtn.disabled = true;
        sendCodeBtn.textContent = countdown + '秒';
        countdownTimer = setInterval(function() {
          countdown--;
          if (countdown <= 0) {
            clearInterval(countdownTimer);
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = '发送验证码';
          } else {
            sendCodeBtn.textContent = countdown + '秒';
          }
        }, 1000);
      }

      // 发送验证码
      sendCodeBtn.addEventListener('click', function() {
        var phone = phoneInput.value.trim();
        if (!validatePhone(phone)) {
          showError('请输入正确的手机号格式');
          return;
        }
        hideError();
        sendCodeBtn.disabled = true;

        fetch(API_BASE + '/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success) {
            startCountdown();
            // 显示验证码弹窗（模拟短信）
            if (data.data && data.data.code) {
              codeDisplay.textContent = data.data.code;
              codePopup.classList.add('show');
              setTimeout(function() {
                codePopup.classList.remove('show');
              }, 5000);
            }
          } else {
            showError(data.error?.message || '发送验证码失败');
            sendCodeBtn.disabled = false;
          }
        })
        .catch(function(err) {
          showError('网络错误，请重试');
          sendCodeBtn.disabled = false;
        });
      });

      // 登录表单提交
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var phone = phoneInput.value.trim();
        var code = codeInput.value.trim();

        if (!validatePhone(phone)) {
          showError('请输入正确的手机号格式');
          return;
        }
        if (!/^\\d{6}$/.test(code)) {
          showError('请输入6位数字验证码');
          return;
        }

        hideError();
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';

        fetch(API_BASE + '/api/auth/login-with-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone, code: code })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success && data.data && data.data.token) {
            // 登录成功
            token = data.data.token;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_info', JSON.stringify(data.data.user || {}));
            isLoggedIn = true;
            loginOverlay.classList.add('hidden');

            // 更新用户名显示
            updateUserDisplay();

            // 重置计时器状态
            pausedAt = 0;
            activeStartTime = Date.now();
            isPaused = false;

            // 开始浏览记录
            startView().then(function() {
              heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);
            });
            loadTotalDuration();
          } else if (data.data && data.data.isNewUser) {
            // 新用户，切换到注册流程（带上registerToken）
            showRegisterForm(phone, code, data.data.registerToken);
          } else {
            showError(data.error?.message || '登录失败');
            loginBtn.disabled = false;
            loginBtn.textContent = '登录';
          }
        })
        .catch(function(err) {
          showError('网络错误，请重试');
          loginBtn.disabled = false;
          loginBtn.textContent = '登录';
        });
      });

      // 游客模式
      guestBtn.addEventListener('click', function() {
        loginOverlay.classList.add('hidden');
      });

      function checkLoginStatus() {
        try {
          token = localStorage.getItem('auth_token');
          isLoggedIn = !!token;
        } catch (e) {
          isLoggedIn = false;
        }
        return isLoggedIn;
      }

      // 验证token是否有效（通过API）
      function verifyToken() {
        if (!token) return Promise.resolve(false);

        return fetch(API_BASE + '/api/auth/verify', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          }
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.success && data.data && data.data.valid) {
            // Token有效，更新用户信息
            if (data.data.user) {
              localStorage.setItem('user_info', JSON.stringify(data.data.user));
            }
            isLoggedIn = true;
            return true;
          } else {
            // Token无效，清除本地存储
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            token = null;
            isLoggedIn = false;
            return false;
          }
        })
        .catch(function() {
          // API请求失败，假设token无效
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_info');
          token = null;
          isLoggedIn = false;
          return false;
        });
      }

      function apiRequest(url, options) {
        options = options || {};
        if (!token) return Promise.resolve(null);

        return fetch(url, Object.assign({}, options, {
          headers: Object.assign({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          }, options.headers || {})
        }))
        .then(function(response) {
          if (!response.ok) throw new Error('API请求失败');
          return response.json();
        })
        .catch(function(error) {
          console.error('API请求错误:', error);
          return null;
        });
      }

      function startView() {
        if (!isLoggedIn) return Promise.resolve();

        return apiRequest(API_BASE + '/api/views/start', {
          method: 'POST',
          body: JSON.stringify({
            resourceId: RESOURCE_ID,
            userAgent: navigator.userAgent
          })
        }).then(function(result) {
          if (result && result.success) {
            viewId = result.data.viewId;
            console.log('浏览记录已开始:', viewId);
          }
        });
      }

      function heartbeat() {
        if (!viewId || !isLoggedIn) return Promise.resolve();

        return apiRequest(API_BASE + '/api/views/' + viewId + '/heartbeat', {
          method: 'POST',
          body: JSON.stringify({ duration: currentSeconds })
        });
      }

      function endView() {
        if (!viewId || !token) return;

        var data = JSON.stringify({ duration: currentSeconds });
        var url = API_BASE + '/api/views/' + viewId + '/end';

        if (navigator.sendBeacon) {
          var blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon(url + '?token=' + token, blob);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open('POST', url, false);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Authorization', 'Bearer ' + token);
          xhr.send(data);
        }
      }

      function loadTotalDuration() {
        if (!isLoggedIn) return Promise.resolve();

        return apiRequest(API_BASE + '/api/views/stats').then(function(result) {
          if (result && result.success && result.data) {
            totalSeconds = result.data.stats && result.data.stats.totalDuration || 0;
            updateDisplay();
          }
        });
      }

      function toggleMinimize(e) {
        if (e) e.stopPropagation();
        isMinimized = !isMinimized;
        widget.classList.toggle('minimized', isMinimized);
        toggleBtn.textContent = isMinimized ? '+' : '−';
      }

      function initDrag() {
        var isDragging = false;
        var startX, startY, initialX, initialY;
        var hasMoved = false;

        function handleDragStart(e) {
          if (e.target === toggleBtn || e.target.tagName === 'A') return;

          var touch = e.touches ? e.touches[0] : e;
          isDragging = true;
          hasMoved = false;

          var rect = widget.getBoundingClientRect();
          startX = touch.clientX;
          startY = touch.clientY;
          initialX = rect.left;
          initialY = rect.top;

          widget.classList.add('dragging');
          widget.style.transition = 'none';

          if (e.touches) {
            e.preventDefault();
          }
        }

        function handleDragMove(e) {
          if (!isDragging) return;

          var touch = e.touches ? e.touches[0] : e;
          var deltaX = touch.clientX - startX;
          var deltaY = touch.clientY - startY;

          if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            hasMoved = true;
          }

          var x = initialX + deltaX;
          var y = initialY + deltaY;

          x = Math.max(0, Math.min(window.innerWidth - widget.offsetWidth, x));
          y = Math.max(0, Math.min(window.innerHeight - widget.offsetHeight, y));

          widget.style.left = x + 'px';
          widget.style.right = 'auto';
          widget.style.top = y + 'px';
          widget.style.bottom = 'auto';

          if (e.touches) {
            e.preventDefault();
          }
        }

        function handleDragEnd(e) {
          if (!isDragging) return;
          isDragging = false;
          widget.classList.remove('dragging');
          widget.style.transition = '';
        }

        widget.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);

        widget.addEventListener('touchstart', handleDragStart, { passive: false });
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
        document.addEventListener('touchcancel', handleDragEnd);
      }

      function init() {
        initDrag();
        toggleBtn.addEventListener('click', toggleMinimize);

        // 结束学习按钮
        finishBtn.addEventListener('click', function() {
          // 结束浏览记录
          if (isLoggedIn && viewId) {
            endView();
          }
          // 跳转到前端个人主页，携带登录状态
          var redirectUrl = '${frontendUrl}/dashboard';
          if (isLoggedIn && token) {
            redirectUrl = '${frontendUrl}/auth-redirect?token=' + encodeURIComponent(token) + '&redirect=/dashboard';
          }
          window.location.href = redirectUrl;
        });

        if (isMobile) {
          toggleMinimize();
        }

        // 从 session API 获取 token（用户在前端登录后同步的）
        function initFromSession() {
          return fetch(API_BASE + '/api/auth/session-token', {
            method: 'GET',
            credentials: 'include'  // 重要：发送 session cookie
          })
          .then(function(res) { return res.json(); })
          .then(function(data) {
            if (data.success && data.data && data.data.token) {
              // Session 中有 token，直接使用
              token = data.data.token;
              localStorage.setItem('auth_token', token);
              if (data.data.user) {
                localStorage.setItem('user_info', JSON.stringify(data.data.user));
              }
              console.log('从 session 获取到 token');
              isLoggedIn = true;
              return true;
            } else {
              // Session 中没有 token，说明用户已退出，清除本地存储
              console.log('session 中没有 token，清除本地登录状态');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user_info');
              token = null;
              isLoggedIn = false;
              return false;
            }
          })
          .catch(function(error) {
            console.error('获取 session token 失败:', error);
            return false;
          });
        }

        // 检查本地存储的 token
        function checkLocalToken() {
          checkLoginStatus();
          if (token) {
            console.log('从 localStorage 获取到 token');
            return true;
          } else {
            console.log('未找到 token');
            return false;
          }
        }

        // 初始化登录状态 - Session 是权威来源
        initFromSession().then(function(hasSessionToken) {
          // Session 检查结果是权威的，不再检查本地存储
          updateUserDisplay();

          // 如果有 token，验证是否有效
          if (hasSessionToken) {
            return verifyToken();
          }
          return false;
        }).then(function(isValid) {
          updateUserDisplay();

          if (isValid) {
            // Token有效，隐藏弹窗，开始计时
            loginOverlay.classList.add('hidden');
            loadTotalDuration().then(function() {
              return startView();
            }).then(function() {
              heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);
            });
          } else {
            // Token无效或不存在，显示登录弹窗
            loginOverlay.classList.remove('hidden');
          }
        });

        timerInterval = setInterval(updateDisplay, 1000);
        updateDisplay();

        // 页面关闭时结束计时
        window.addEventListener('beforeunload', endView);
        window.addEventListener('pagehide', endView);

        // 页面可见性变化（tab切换、最小化）
        document.addEventListener('visibilitychange', function() {
          if (document.visibilityState === 'hidden') {
            pauseTimer();
          } else {
            resumeTimer();
          }
        });

        // 窗口焦点变化（切换到其他程序）
        window.addEventListener('blur', pauseTimer);
        window.addEventListener('focus', resumeTimer);
      }

      init();
    })();
  </script>
</body>
</html>
      `;

      res.send(containerHtml);
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
        // 使用 LIKE 匹配 JSON 数组中的专业（匹配 "专业名" 格式）
        whereConditions.push('major LIKE ?');
        params.push(`%"${major}"%`);
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

      // 解析每条资源的 major 字段
      const parsedResources = resources.map(r => ({
        ...r,
        major: parseMajor(r.major)
      }));

      res.json({
        success: true,
        data: {
          list: parsedResources,
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

      // 获取所有已发布资源的 major 字段
      const majorRecords = db.prepare(`
        SELECT major
        FROM resources
        WHERE status = 'published' AND major IS NOT NULL AND major != '' AND major != '[]'
      `).all();

      // 解析 JSON 数组并去重
      const majorSet = new Set();
      for (const record of majorRecords) {
        const majors = parseMajor(record.major);
        for (const m of majors) {
          majorSet.add(m);
        }
      }

      // 转换为数组并排序
      const sortedMajors = Array.from(majorSet).sort();

      res.json({
        success: true,
        data: sortedMajors
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
