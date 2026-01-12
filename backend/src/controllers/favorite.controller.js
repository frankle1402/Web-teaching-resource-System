const { getDB, saveDatabase } = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * 收藏夹管理控制器
 * 包含收藏文件夹和收藏资源的CRUD操作
 */
class FavoriteController {
  // ==================== 收藏文件夹相关 ====================

  /**
   * 获取收藏文件夹树（带收藏数量统计）
   */
  async getFolders(req, res) {
    try {
      const userId = req.user.id;
      const db = await getDB();

      // 查询所有收藏文件夹
      const folders = db.prepare(`
        SELECT id, name, parent_id, created_at
        FROM favorite_folders
        WHERE user_id = ?
        ORDER BY sort_order ASC, created_at DESC
      `).all([userId]);

      // 统计每个文件夹的收藏数量
      const favoriteCounts = db.prepare(`
        SELECT folder_id, COUNT(*) as count
        FROM favorites
        WHERE user_id = ?
        GROUP BY folder_id
      `).all([userId]);

      // 创建数量映射
      const countMap = {};
      favoriteCounts.forEach(row => {
        countMap[row.folder_id || 'null'] = row.count;
      });

      // 递归统计子文件夹的收藏数量
      const countFavorites = (folderId) => {
        let count = countMap[folderId] || 0;
        const children = folders.filter(f => f.parent_id === folderId);
        children.forEach(child => {
          count += countFavorites(child.id);
        });
        return count;
      };

      // 构建树形结构 - 修复：使用0作为根节点parent_id
      const buildTree = (parentId = 0) => {
        return folders
          .filter(folder => folder.parent_id === parentId)
          .map(folder => ({
            ...folder,
            favoriteCount: countFavorites(folder.id),
            canDelete: countFavorites(folder.id) === 0 &&
                       !folders.some(f => f.parent_id === folder.id),
            children: buildTree(folder.id)
          }));
      };

      const tree = buildTree();

      // 未分类收藏数量
      const unclassifiedCount = countMap['null'] || 0;

      // 统计各类型收藏数量
      const typeCounts = db.prepare(`
        SELECT type, COUNT(*) as count
        FROM favorites
        WHERE user_id = ?
        GROUP BY type
      `).all([userId]);

      const typeCountMap = {};
      typeCounts.forEach(row => {
        typeCountMap[row.type] = row.count;
      });

      res.json({
        success: true,
        data: {
          tree,
          unclassifiedCount,
          typeCounts: typeCountMap,
          totalCount: favoriteCounts.reduce((sum, r) => sum + r.count, 0)
        }
      });
    } catch (error) {
      console.error('获取收藏文件夹列表错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FAVORITE_FOLDERS_ERROR',
          message: '获取收藏文件夹列表失败'
        }
      });
    }
  }

  /**
   * 创建收藏文件夹
   */
  async createFolder(req, res) {
    try {
      const { name, parentId } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FOLDER_NAME',
            message: '文件夹名称不能为空'
          }
        });
      }

      const userId = req.user.id;
      const db = await getDB();

      // 如果指定了父文件夹，检查层级限制（最多5层）
      if (parentId) {
        const folders = db.prepare('SELECT id, parent_id FROM favorite_folders WHERE user_id = ?').all([userId]);

        const getDepth = (folderId) => {
          let depth = 1;
          let currentId = folderId;
          while (currentId && currentId !== 0) {
            const folder = folders.find(f => f.id === currentId);
            if (!folder || !folder.parent_id || folder.parent_id === 0) break;
            depth++;
            currentId = folder.parent_id;
          }
          return depth;
        };

        const parentDepth = getDepth(parseInt(parentId));
        if (parentDepth >= 5) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MAX_DEPTH_EXCEEDED',
              message: '文件夹最多支持5层嵌套，无法继续创建子文件夹'
            }
          });
        }
      }

      const result = db.prepare(`
        INSERT INTO favorite_folders (user_id, name, parent_id, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now', '+8 hours'), datetime('now', '+8 hours'))
      `).run([userId, name.trim(), parentId || 0]);

      saveDatabase();

      const folder = db.prepare('SELECT * FROM favorite_folders WHERE id = ?').get([result.lastInsertRowid]);

      console.log(`✓ 创建收藏文件夹: ${name} (用户: ${req.user.phone})`);

      res.status(201).json({
        success: true,
        data: folder
      });
    } catch (error) {
      console.error('创建收藏文件夹错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAVORITE_FOLDER_ERROR',
          message: '创建收藏文件夹失败'
        }
      });
    }
  }

  /**
   * 重命名收藏文件夹
   */
  async updateFolder(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FOLDER_NAME',
            message: '文件夹名称不能为空'
          }
        });
      }

      const userId = req.user.id;
      const db = await getDB();

      const folder = db.prepare('SELECT * FROM favorite_folders WHERE id = ? AND user_id = ?').get([id, userId]);

      if (!folder) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: '收藏文件夹不存在'
          }
        });
      }

      db.prepare(`
        UPDATE favorite_folders
        SET name = ?, updated_at = datetime('now', '+8 hours')
        WHERE id = ?
      `).run([name.trim(), id]);

      saveDatabase();

      console.log(`✓ 重命名收藏文件夹: ${folder.name} -> ${name} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: '收藏文件夹已更新'
      });
    } catch (error) {
      console.error('更新收藏文件夹错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAVORITE_FOLDER_ERROR',
          message: '更新收藏文件夹失败'
        }
      });
    }
  }

  /**
   * 删除收藏文件夹
   */
  async deleteFolder(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const db = await getDB();

      const folder = db.prepare('SELECT * FROM favorite_folders WHERE id = ? AND user_id = ?').get([id, userId]);

      if (!folder) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: '收藏文件夹不存在'
          }
        });
      }

      // 检查是否有子文件夹
      const childFoldersCount = db.prepare('SELECT COUNT(*) as count FROM favorite_folders WHERE parent_id = ?').get([id]).count;

      if (childFoldersCount > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FOLDER_HAS_CHILDREN',
            message: '文件夹下有子文件夹，无法删除'
          }
        });
      }

      // 检查文件夹下是否有收藏
      const favoritesCount = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE folder_id = ?').get([id]).count;

      if (favoritesCount > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FOLDER_HAS_FAVORITES',
            message: '文件夹下有收藏内容，无法删除'
          }
        });
      }

      db.prepare('DELETE FROM favorite_folders WHERE id = ?').run([id]);
      saveDatabase();

      console.log(`✓ 删除收藏文件夹: ${folder.name} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: '收藏文件夹已删除'
      });
    } catch (error) {
      console.error('删除收藏文件夹错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAVORITE_FOLDER_ERROR',
          message: '删除收藏文件夹失败'
        }
      });
    }
  }

  // ==================== 收藏资源相关 ====================

  /**
   * 获取收藏列表
   */
  async getFavorites(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        pageSize = 20,
        folderId = 'all',
        type = '',
        keyword = ''
      } = req.query;

      const db = await getDB();
      const offset = (parseInt(page) - 1) * parseInt(pageSize);

      // 构建查询条件
      let whereClause = 'WHERE f.user_id = ?';
      const params = [userId];

      // 文件夹筛选
      if (folderId === 'uncategorized') {
        whereClause += ' AND f.folder_id IS NULL';
      } else if (folderId !== 'all' && folderId) {
        whereClause += ' AND f.folder_id = ?';
        params.push(parseInt(folderId));
      }

      // 类型筛选
      if (type && type !== 'all') {
        whereClause += ' AND f.type = ?';
        params.push(type);
      }

      // 关键词搜索
      if (keyword) {
        whereClause += ' AND (f.title LIKE ? OR f.description LIKE ? OR f.author_name LIKE ?)';
        const kw = `%${keyword}%`;
        params.push(kw, kw, kw);
      }

      // 查询总数
      const countResult = db.prepare(`
        SELECT COUNT(*) as total FROM favorites f ${whereClause}
      `).get(params);

      // 查询列表
      const favorites = db.prepare(`
        SELECT f.*, ff.name as folder_name
        FROM favorites f
        LEFT JOIN favorite_folders ff ON f.folder_id = ff.id
        ${whereClause}
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `).all([...params, parseInt(pageSize), offset]);

      res.json({
        success: true,
        data: {
          list: favorites,
          total: countResult.total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(countResult.total / parseInt(pageSize))
        }
      });
    } catch (error) {
      console.error('获取收藏列表错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FAVORITES_ERROR',
          message: '获取收藏列表失败'
        }
      });
    }
  }

  /**
   * 获取单个收藏详情
   */
  async getFavorite(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const db = await getDB();

      const favorite = db.prepare(`
        SELECT f.*, ff.name as folder_name
        FROM favorites f
        LEFT JOIN favorite_folders ff ON f.folder_id = ff.id
        WHERE f.id = ? AND f.user_id = ?
      `).get([id, userId]);

      if (!favorite) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FAVORITE_NOT_FOUND',
            message: '收藏不存在'
          }
        });
      }

      res.json({
        success: true,
        data: favorite
      });
    } catch (error) {
      console.error('获取收藏详情错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FAVORITE_ERROR',
          message: '获取收藏详情失败'
        }
      });
    }
  }

  /**
   * 添加收藏
   */
  async createFavorite(req, res) {
    try {
      const userId = req.user.id;
      const {
        type,
        title,
        description,
        thumbnailUrl,
        sourceUrl,
        folderId,
        // B站视频字段
        bvid,
        videoDuration,
        authorName,
        playCount,
        // 公众号文章字段
        articleAuthor,
        publishTime,
        // 图片字段
        localPath,
        originalFilename,
        fileSize,
        mimeType,
        width,
        height,
        // 元数据
        metadata
      } = req.body;

      // 验证必填字段
      if (!type || !title || !sourceUrl) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '缺少必填字段：type, title, sourceUrl'
          }
        });
      }

      // 验证类型
      const validTypes = ['bilibili', 'wechat_article', 'image'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: '无效的资源类型，必须是 bilibili, wechat_article 或 image'
          }
        });
      }

      const db = await getDB();

      // 检查是否已存在相同的收藏（通过source_url或bvid判断）
      let existing = null;
      if (type === 'bilibili' && bvid) {
        existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND bvid = ?').get([userId, bvid]);
      } else {
        existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND source_url = ?').get([userId, sourceUrl]);
      }

      if (existing) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FAVORITE_EXISTS',
            message: '该资源已收藏'
          }
        });
      }

      // 验证文件夹是否存在
      if (folderId) {
        const folder = db.prepare('SELECT id FROM favorite_folders WHERE id = ? AND user_id = ?').get([folderId, userId]);
        if (!folder) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FOLDER_NOT_FOUND',
              message: '收藏文件夹不存在'
            }
          });
        }
      }

      const result = db.prepare(`
        INSERT INTO favorites (
          user_id, folder_id, type, title, description, thumbnail_url, source_url,
          bvid, video_duration, author_name, play_count,
          article_author, publish_time,
          local_path, original_filename, file_size, mime_type, width, height,
          metadata, fetch_time, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, datetime('now', '+8 hours'), datetime('now', '+8 hours'), datetime('now', '+8 hours')
        )
      `).run([
        userId, folderId || null, type, title, description || null, thumbnailUrl || null, sourceUrl,
        bvid || null, videoDuration || null, authorName || null, playCount || null,
        articleAuthor || null, publishTime || null,
        localPath || null, originalFilename || null, fileSize || null, mimeType || null, width || null, height || null,
        metadata ? JSON.stringify(metadata) : null
      ]);

      saveDatabase();

      const favorite = db.prepare('SELECT * FROM favorites WHERE id = ?').get([result.lastInsertRowid]);

      console.log(`✓ 添加收藏: ${title} (类型: ${type}, 用户: ${req.user.phone})`);

      res.status(201).json({
        success: true,
        data: favorite
      });
    } catch (error) {
      console.error('添加收藏错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAVORITE_ERROR',
          message: '添加收藏失败'
        }
      });
    }
  }

  /**
   * 更新收藏（移动文件夹、修改标题等）
   */
  async updateFavorite(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, description, folderId } = req.body;

      const db = await getDB();

      const favorite = db.prepare('SELECT * FROM favorites WHERE id = ? AND user_id = ?').get([id, userId]);

      if (!favorite) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FAVORITE_NOT_FOUND',
            message: '收藏不存在'
          }
        });
      }

      // 验证文件夹是否存在
      if (folderId !== undefined && folderId !== null) {
        const folder = db.prepare('SELECT id FROM favorite_folders WHERE id = ? AND user_id = ?').get([folderId, userId]);
        if (!folder) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FOLDER_NOT_FOUND',
              message: '收藏文件夹不存在'
            }
          });
        }
      }

      // 构建更新字段
      const updates = [];
      const updateParams = [];

      if (title !== undefined) {
        updates.push('title = ?');
        updateParams.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        updateParams.push(description);
      }
      if (folderId !== undefined) {
        updates.push('folder_id = ?');
        updateParams.push(folderId);
      }

      updates.push("updated_at = datetime('now', '+8 hours')");

      if (updates.length > 1) {
        db.prepare(`
          UPDATE favorites SET ${updates.join(', ')} WHERE id = ?
        `).run([...updateParams, id]);

        saveDatabase();
      }

      console.log(`✓ 更新收藏: ${favorite.title} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: '收藏已更新'
      });
    } catch (error) {
      console.error('更新收藏错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAVORITE_ERROR',
          message: '更新收藏失败'
        }
      });
    }
  }

  /**
   * 删除收藏
   */
  async deleteFavorite(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const db = await getDB();

      const favorite = db.prepare('SELECT * FROM favorites WHERE id = ? AND user_id = ?').get([id, userId]);

      if (!favorite) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FAVORITE_NOT_FOUND',
            message: '收藏不存在'
          }
        });
      }

      // 如果是图片类型且有本地文件，删除本地文件
      if (favorite.type === 'image' && favorite.local_path) {
        const localFilePath = path.join(__dirname, '../../', favorite.local_path);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
          console.log(`✓ 删除本地图片文件: ${favorite.local_path}`);
        }
      }

      db.prepare('DELETE FROM favorites WHERE id = ?').run([id]);
      saveDatabase();

      console.log(`✓ 删除收藏: ${favorite.title} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: '收藏已删除'
      });
    } catch (error) {
      console.error('删除收藏错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAVORITE_ERROR',
          message: '删除收藏失败'
        }
      });
    }
  }

  /**
   * 批量删除收藏
   */
  async batchDelete(req, res) {
    try {
      const { ids } = req.body;
      const userId = req.user.id;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_IDS',
            message: '请提供要删除的收藏ID列表'
          }
        });
      }

      const db = await getDB();

      // 获取所有要删除的收藏
      const placeholders = ids.map(() => '?').join(',');
      const favorites = db.prepare(`
        SELECT * FROM favorites WHERE id IN (${placeholders}) AND user_id = ?
      `).all([...ids, userId]);

      // 删除本地图片文件
      for (const favorite of favorites) {
        if (favorite.type === 'image' && favorite.local_path) {
          const localFilePath = path.join(__dirname, '../../', favorite.local_path);
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
          }
        }
      }

      // 批量删除
      db.prepare(`
        DELETE FROM favorites WHERE id IN (${placeholders}) AND user_id = ?
      `).run([...ids, userId]);

      saveDatabase();

      console.log(`✓ 批量删除收藏: ${favorites.length}个 (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: `已删除 ${favorites.length} 个收藏`
      });
    } catch (error) {
      console.error('批量删除收藏错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_DELETE_ERROR',
          message: '批量删除收藏失败'
        }
      });
    }
  }

  /**
   * 批量移动收藏到指定文件夹
   */
  async batchMove(req, res) {
    try {
      const { ids, folderId } = req.body;
      const userId = req.user.id;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_IDS',
            message: '请提供要移动的收藏ID列表'
          }
        });
      }

      const db = await getDB();

      // 验证目标文件夹
      if (folderId !== null && folderId !== undefined) {
        const folder = db.prepare('SELECT id FROM favorite_folders WHERE id = ? AND user_id = ?').get([folderId, userId]);
        if (!folder) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'FOLDER_NOT_FOUND',
              message: '目标文件夹不存在'
            }
          });
        }
      }

      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`
        UPDATE favorites
        SET folder_id = ?, updated_at = datetime('now', '+8 hours')
        WHERE id IN (${placeholders}) AND user_id = ?
      `).run([folderId || null, ...ids, userId]);

      saveDatabase();

      console.log(`✓ 批量移动收藏: ${ids.length}个到文件夹${folderId || '未分类'} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: `已移动 ${ids.length} 个收藏`
      });
    } catch (error) {
      console.error('批量移动收藏错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_MOVE_ERROR',
          message: '批量移动收藏失败'
        }
      });
    }
  }

  // ==================== 元数据抓取 ====================

  /**
   * 抓取B站视频元数据
   */
  async fetchBilibiliMeta(req, res) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_URL',
            message: '请提供B站视频URL'
          }
        });
      }

      // 提取BV号
      const bvMatch = url.match(/BV[a-zA-Z0-9]+/);
      if (!bvMatch) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_URL',
            message: '无法识别B站视频地址，请确保包含BV号'
          }
        });
      }

      const bvid = bvMatch[0];

      // 调用B站API
      const response = await axios.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.bilibili.com'
        },
        timeout: 10000
      });

      if (response.data.code !== 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BILIBILI_API_ERROR',
            message: response.data.message || '获取视频信息失败'
          }
        });
      }

      const data = response.data.data;

      res.json({
        success: true,
        data: {
          bvid: data.bvid,
          title: data.title,
          description: data.desc,
          thumbnailUrl: data.pic,
          videoDuration: data.duration,
          authorName: data.owner?.name,
          playCount: data.stat?.view,
          sourceUrl: `https://www.bilibili.com/video/${data.bvid}`
        }
      });
    } catch (error) {
      console.error('抓取B站视频元数据错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_BILIBILI_META_ERROR',
          message: '抓取B站视频信息失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 抓取公众号文章元数据
   */
  async fetchWechatMeta(req, res) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_URL',
            message: '请提供公众号文章URL'
          }
        });
      }

      // 验证是否为微信公众号文章链接
      if (!url.includes('mp.weixin.qq.com')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_URL',
            message: '请提供有效的微信公众号文章链接'
          }
        });
      }

      // 获取文章页面
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      const html = response.data;

      // 使用正则表达式提取元数据
      const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/) ||
                         html.match(/<meta name="twitter:title" content="([^"]*)"/) ||
                         html.match(/<title>([^<]*)<\/title>/);

      const descMatch = html.match(/<meta property="og:description" content="([^"]*)"/) ||
                        html.match(/<meta name="description" content="([^"]*)"/);

      const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/);

      // 提取公众号名称
      const authorMatch = html.match(/var nickname\s*=\s*htmlDecode\("([^"]*)"\)/) ||
                          html.match(/id="js_name">([^<]*)</) ||
                          html.match(/<a class="weui-cells_link"[^>]*>([^<]*)<\/a>/);

      // 提取发布时间
      const timeMatch = html.match(/var publish_time\s*=\s*"([^"]*)"/) ||
                        html.match(/id="publish_time"[^>]*>([^<]*)</);

      const title = titleMatch ? titleMatch[1].trim() : '未知标题';
      const description = descMatch ? descMatch[1].trim() : '';
      const thumbnailUrl = imageMatch ? imageMatch[1] : '';
      const articleAuthor = authorMatch ? authorMatch[1].trim() : '';
      const publishTime = timeMatch ? timeMatch[1].trim() : '';

      res.json({
        success: true,
        data: {
          title,
          description,
          thumbnailUrl,
          articleAuthor,
          publishTime,
          sourceUrl: url
        }
      });
    } catch (error) {
      console.error('抓取公众号文章元数据错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_WECHAT_META_ERROR',
          message: '抓取公众号文章信息失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 下载/上传图片到本地
   */
  async uploadImage(req, res) {
    try {
      const { url, file } = req.body;
      const userId = req.user.id;

      // 确保上传目录存在
      const uploadDir = path.join(__dirname, '../../userdata/uploads/images');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      let imageBuffer;
      let mimeType;
      let originalFilename;

      if (url) {
        // 从URL下载图片
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        imageBuffer = Buffer.from(response.data);
        mimeType = response.headers['content-type'];

        // 从URL提取文件名
        const urlPath = new URL(url).pathname;
        originalFilename = path.basename(urlPath) || 'image';
      } else if (req.file) {
        // 处理上传的文件
        imageBuffer = req.file.buffer;
        mimeType = req.file.mimetype;
        originalFilename = req.file.originalname;
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_IMAGE',
            message: '请提供图片URL或上传图片文件'
          }
        });
      }

      // 验证是否为图片
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!validMimeTypes.some(type => mimeType?.includes(type.split('/')[1]))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_IMAGE_TYPE',
            message: '不支持的图片格式，请上传 JPEG、PNG、GIF、WebP 或 SVG 格式的图片'
          }
        });
      }

      // 生成UUID文件名
      const fileUuid = uuidv4();
      const ext = path.extname(originalFilename) || '.jpg';
      const filename = `${fileUuid}${ext}`;
      const localPath = `userdata/uploads/images/${filename}`;
      const fullPath = path.join(__dirname, '../../', localPath);

      // 保存文件
      fs.writeFileSync(fullPath, imageBuffer);

      // 获取图片尺寸（简单方式，不依赖sharp）
      let width = null;
      let height = null;

      res.json({
        success: true,
        data: {
          localPath,
          originalFilename,
          fileSize: imageBuffer.length,
          mimeType,
          width,
          height,
          sourceUrl: url || null,
          fetchTime: new Date().toISOString()
        }
      });

      console.log(`✓ 图片已保存: ${filename} (用户: ${req.user.phone})`);
    } catch (error) {
      console.error('上传图片错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_IMAGE_ERROR',
          message: '上传图片失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 获取收藏的图片文件
   */
  async getImage(req, res) {
    try {
      const { uuid } = req.params;
      const userId = req.user.id;

      // 在userdata目录下查找匹配的图片
      const uploadDir = path.join(__dirname, '../../userdata/uploads/images');
      const files = fs.readdirSync(uploadDir);
      const matchedFile = files.find(f => f.startsWith(uuid));

      if (!matchedFile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: '图片不存在'
          }
        });
      }

      const filePath = path.join(uploadDir, matchedFile);

      // 验证用户是否有权限访问这个图片
      const db = await getDB();
      const favorite = db.prepare(`
        SELECT id FROM favorites
        WHERE user_id = ? AND local_path LIKE ?
      `).get([userId, `%${uuid}%`]);

      if (!favorite) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权访问此图片'
          }
        });
      }

      // 返回图片文件
      res.sendFile(filePath);
    } catch (error) {
      console.error('获取图片错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_IMAGE_ERROR',
          message: '获取图片失败'
        }
      });
    }
  }
}

module.exports = new FavoriteController();
