const { getDB, saveDatabase } = require('../database/connection');

/**
 * 文件夹管理控制器
 */
class FolderController {
  /**
   * 获取文件夹树
   */
  async getFolders(req, res) {
    try {
      const userId = req.user.id;
      const db = await getDB();

      // ���询所有文件夹
      const folders = db.prepare(`
        SELECT id, name, parent_id, created_at
        FROM folders
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all([userId]);

      // 构建树形结构
      const buildTree = (parentId = null) => {
        return folders
          .filter(folder => folder.parent_id === parentId)
          .map(folder => ({
            ...folder,
            children: buildTree(folder.id)
          }));
      };

      const tree = buildTree();

      res.json({
        success: true,
        data: tree
      });
    } catch (error) {
      console.error('获取文件夹列表错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_FOLDERS_ERROR',
          message: '获取文件夹列表失败'
        }
      });
    }
  }

  /**
   * 创建文件夹
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

      const result = db.prepare(`
        INSERT INTO folders (user_id, name, parent_id, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run([userId, name.trim(), parentId || null]);

      // 保存数据库
      saveDatabase();

      // 获取创建的文件夹
      const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get([result.lastInsertRowid]);

      console.log(`✓ 创建文件夹: ${name} (用户: ${req.user.phone})`);

      res.status(201).json({
        success: true,
        data: folder
      });
    } catch (error) {
      console.error('创建文件夹错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FOLDER_ERROR',
          message: '创建文件夹失败'
        }
      });
    }
  }

  /**
   * 重命名文件夹
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

      // 检查文件夹是否存在且属于当前用户
      const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get([id, userId]);

      if (!folder) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: '文件夹不存在'
          }
        });
      }

      // 更新文件夹
      db.prepare('UPDATE folders SET name = ? WHERE id = ?').run([name.trim(), id]);

      // 保存数据库
      saveDatabase();

      console.log(`✓ 重命名文件夹: ${folder.name} -> ${name} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: '文件夹已更新'
      });
    } catch (error) {
      console.error('更新文件夹错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FOLDER_ERROR',
          message: '更新文件夹失败'
        }
      });
    }
  }

  /**
   * 删除文件夹
   */
  async deleteFolder(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const db = await getDB();

      // 检查文件夹是否存在且属于当前用户
      const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get([id, userId]);

      if (!folder) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FOLDER_NOT_FOUND',
            message: '文件夹不存在'
          }
        });
      }

      // 检查是否有子文件夹
      const childFoldersCount = db.prepare('SELECT COUNT(*) as count FROM folders WHERE parent_id = ?').get([id]).count;

      if (childFoldersCount > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FOLDER_HAS_CHILDREN',
            message: '文件夹下有子文件夹，无法删除'
          }
        });
      }

      // 检查文件夹下是否有资源
      const resourcesCount = db.prepare('SELECT COUNT(*) as count FROM resources WHERE folder_id = ?').get([id]).count;

      if (resourcesCount > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FOLDER_HAS_RESOURCES',
            message: '文件夹下有资源，无法删除'
          }
        });
      }

      // 删除文件夹
      db.prepare('DELETE FROM folders WHERE id = ?').run([id]);

      // 保存数据库
      saveDatabase();

      console.log(`✓ 删除文件夹: ${folder.name} (用户: ${req.user.phone})`);

      res.json({
        success: true,
        message: '文件夹已删除'
      });
    } catch (error) {
      console.error('删除文件夹错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FOLDER_ERROR',
          message: '删除文件夹失败'
        }
      });
    }
  }
}

module.exports = new FolderController();
