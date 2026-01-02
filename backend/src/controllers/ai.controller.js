const axios = require('axios');

/**
 * AI生成控制器（使用302.ai）
 */
class AIController {
  /**
   * 生成教学大纲
   */
  async generateOutline(req, res) {
    try {
      const { courseName, courseLevel, major, subject } = req.body;

      // 验证必填字段
      if (!courseName || !courseLevel || !major) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '缺少必填字段'
          }
        });
      }

      // 构建Prompt
      const prompt = `作为一名专业的${major}教师，请为以下课程设计一个详细的教学大纲：

课程名称：${courseName}
教学层次：${courseLevel}
专业：${major}
${subject ? `学科：${subject}` : ''}

要求：
1. 大纲要包含3-6个章节
2. 每个章节包含2-4个小节
3. 内容要符合${courseLevel}学生的认知水平
4. 突出实践性和应用性
5. 符合${major}专业培养目标

请以JSON格式返回，格式如下：
{
  "title": "课程标题",
  "chapters": [
    {
      "title": "章节标题",
      "sections": [
        {"title": "小节标题", "duration": "课时数"}
      ]
    }
  ]
}

只返回JSON，不要其他内容。`;

      console.log('✓ 调用AI生成大纲...');
      console.log('课程:', courseName, '层次:', courseLevel, '专业:', major);

      // 调用302.ai API
      const aiResponse = await this.callAIAPI(prompt);

      // 解析AI返回的JSON
      let outlineData;
      try {
        // 清理可能的markdown代码块标记
        let jsonStr = aiResponse.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        outlineData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('解析AI返回的JSON失败:', parseError);
        console.error('AI返回内容:', aiResponse);

        // 如果解析失败，生成一个默认大纲
        outlineData = this.generateDefaultOutline(courseName, courseLevel, major);
      }

      console.log('✓ 大纲生成成功');

      res.json({
        success: true,
        data: outlineData
      });
    } catch (error) {
      console.error('生成大纲错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATE_OUTLINE_ERROR',
          message: '生成大纲失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 生成HTML内容
   */
  async generateContent(req, res) {
    try {
      const { outline, templateId, courseInfo } = req.body;

      if (!outline || !templateId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '缺少必填字段'
          }
        });
      }

      const { getDB } = require('../database/connection');
      const db = await getDB();

      // 获取模板信息
      const template = db.prepare('SELECT * FROM templates WHERE id = ?').get([templateId]);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: '模板不存在'
          }
        });
      }

      console.log('✓ 调用AI生成内容...');
      console.log('模板:', template.name);

      // 构建Prompt - 按章节生成内容
      const prompt = `作为一名专业的${courseInfo.major}教师，请根据以下教学大纲生成HTML教学内容：

课程信息：
- 课程名称：${courseInfo.courseName}
- 教学层次：${courseInfo.courseLevel}
- 专业：${courseInfo.major}
${courseInfo.subject ? `- 学科：${courseInfo.subject}` : ''}

教学大纲：
${JSON.stringify(outline, null, 2)}

要求：
1. 为每个小节生成200-400字的HTML教学内容
2. 内容要符合${courseInfo.courseLevel}学生的认知水平
3. 使用简洁的HTML标签：h3, h4, p, strong, em, ul, ol, li
4. 突出重点概念和关键知识点
5. 可以加入一些实例或案例
6. 保持教育性和专业性

请返回完整的HTML代码，格式如下：
<section>
  <h3>章节1标题</h3>
  <h4>小节1标题</h4>
  <p>内容...</p>
  ...
</section>
...

只返回HTML代码，不要其他内容。`;

      // 调用302.ai API
      const aiResponse = await this.callAIAPI(prompt);

      // 清理AI返回的HTML
      let htmlContent = aiResponse.trim();
      if (htmlContent.startsWith('```')) {
        htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
      }

      // 注入到模板
      const finalHTML = this.injectContentToTemplate(htmlContent, template.html_structure);

      console.log('✓ 内容生成成功');

      res.json({
        success: true,
        data: {
          html: finalHTML
        }
      });
    } catch (error) {
      console.error('生成内容错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATE_CONTENT_ERROR',
          message: '生成内容失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 生成简单HTML内容（不依赖模板，直接生成完整HTML页面）
   */
  async generateSimpleContent(req, res) {
    try {
      const { courseName, subject, courseLevel, major } = req.body;

      if (!courseName || !subject) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '缺少必填字段：课程名称和教学主题'
          }
        });
      }

      console.log('✓ 调用AI生成简单内容...');
      console.log('课程:', courseName, '主题:', subject, '层次:', courseLevel);

      // 构建简化的Prompt
      const prompt = `作为一名专业的${major || '医学'}教师，请为"${subject}"这个教学主题生成一个简洁的HTML教学页面。

课程信息：
- 课程名称：${courseName}
- 教学层次：${courseLevel || '高职'}
- 专业：${major || '护理'}
- 教学主题：${subject}

要求：
1. 生成一个完整的HTML5页面，包含<!DOCTYPE html>
2. 在<head>中设置字符编码为UTF-8，页面标题为"${subject} - ${courseName}"
3. 添加简洁的内嵌CSS样式：
   - 使用sans-serif字体，字号16px
   - 页面最大宽度800px，居中显示
   - 标题使用深蓝色(#2c3e50)
   - 段落行高1.6，颜色#333
4. <body>内容：
   - h1标题显示"${subject}"
   - 生成150-200字的教学内容介绍，包括：概念、重要性、关键要点
   - 使用<p>、<h2>、<ul>/<ol>等标签组织内容
   - 内容要符合${courseLevel || '高职'}学生的认知水平
   - 保持教育性和专业性

请直接返回完整的HTML代码，不要添加任何解释文字。`;

      // 调用AI API
      const aiResponse = await this.callAIAPI(prompt);

      // 清理AI返回的HTML
      let htmlContent = aiResponse.trim();

      // 移除可能的markdown代码块标记
      if (htmlContent.includes('```html')) {
        htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
      } else if (htmlContent.includes('```')) {
        htmlContent = htmlContent.replace(/```\n?/g, '');
      }

      // 确保是完整的HTML文档
      if (!htmlContent.includes('<!DOCTYPE') && !htmlContent.includes('<html')) {
        // 如果AI没有返回完整HTML，包装它
        htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject} - ${courseName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
    h1, h2 {
      color: #2c3e50;
    }
    h1 {
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    ul, ol {
      padding-left: 20px;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
      }

      console.log('✓ 简单内容生成成功');

      res.json({
        success: true,
        data: {
          content: htmlContent
        }
      });
    } catch (error) {
      console.error('生成简单内容错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATE_SIMPLE_CONTENT_ERROR',
          message: error.message || '生成内容失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 调用302.ai API
   */
  async callAIAPI(prompt) {
    const apiKey = process.env.AI_API_KEY;
    const apiUrl = process.env.AI_API_BASE_URL;
    const model = process.env.AI_MODEL || 'claude-opus-4-1-20250805';

    try {
      const response = await axios.post(
        apiUrl,
        {
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60秒超时
        }
      );

      // 提取AI返回的内容
      if (response.data && response.data.choices && response.data.choices[0]) {
        return response.data.choices[0].message.content;
      }

      throw new Error('AI返回格式错误');
    } catch (error) {
      console.error('调用302.ai失败:', error.message);
      throw error;
    }
  }

  /**
   * 生成默认大纲（备用方案）
   */
  generateDefaultOutline(courseName, courseLevel, major) {
    return {
      title: courseName,
      chapters: [
        {
          title: '第一章 概述',
          sections: [
            { title: '课程简介', duration: 2 },
            { title: '学习目标', duration: 1 },
            { title: '考核方式', duration: 1 }
          ]
        },
        {
          title: '第二章 基础知识',
          sections: [
            { title: '基本概念', duration: 4 },
            { title: '基本原理', duration: 4 },
            { title: '常用方法', duration: 4 }
          ]
        },
        {
          title: '第三章 实践应用',
          sections: [
            { title: '案例分析', duration: 4 },
            { title: '实操训练', duration: 6 },
            { title: '注意事项', duration: 2 }
          ]
        }
      ]
    };
  }

  /**
   * 将内容注入到模板
   */
  injectContentToTemplate(content, templateStructure) {
    // 在模板中找到 <!-- CONTENT --> 标记并替换
    if (templateStructure.includes('<!-- CONTENT -->')) {
      return templateStructure.replace('<!-- CONTENT -->', content);
    }
    // 如果没有标记，直接追加到</body>前
    if (templateStructure.includes('</body>')) {
      return templateStructure.replace('</body>', `${content}</body>`);
    }
    // 都没有，直接拼接
    return templateStructure + content;
  }
}

module.exports = new AIController();
