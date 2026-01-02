const { getDB } = require('../database/connection');

/**
 * 模板管理控制器
 */
class TemplateController {
  /**
   * 获取模板列表
   */
  async getTemplates(req, res) {
    try {
      const db = await getDB();

      const templates = db.prepare(`
        SELECT id, name, description, preview_image, is_active, created_at
        FROM templates
        WHERE is_active = 1
        ORDER BY created_at DESC
      `).all([]);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('获取模板列表错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TEMPLATES_ERROR',
          message: '获取模板列表失败'
        }
      });
    }
  }

  /**
   * 获取模板详情
   */
  async getTemplateById(req, res) {
    try {
      const { id } = req.params;
      const db = await getDB();

      const template = db.prepare(`
        SELECT * FROM templates WHERE id = ? AND is_active = 1
      `).get([id]);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: '模板不存在'
          }
        });
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('获取模板详情错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TEMPLATE_ERROR',
          message: '获取模板详情失败'
        }
      });
    }
  }
}

module.exports = new TemplateController();
