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

      // 构建Prompt - 升级版（增加交互设计和微测验规划）
      const prompt = `作为一名专业的${major}教师，请为以下课程设计一个详细的教学大纲，包含交互设计和考核点规划：

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
6. **交互设计要求**：为每个小节规划至少1个交互考核点（关键点问答/单题测验/判断题）
7. **图片占位策略**：标注需要配图的小节（流程图/要点图/对比图等）
8. **结尾自测**：规划5题单选自测题（覆盖整个课程重点）

请以JSON格式返回，格式如下：
{
  "title": "课程标题",
  "chapters": [
    {
      "title": "章节标题",
      "sections": [
        {
          "title": "小节标题",
          "duration": "课时数",
          "interaction": {
            "type": "关键点问答/单选题/判断题",
            "description": "交互点描述",
            "keyPoint": "考核的知识点"
          },
          "needImage": true/false,
          "imageType": "流程图/要点图/对比图（如果needImage为true）"
        }
      ]
    }
  ],
  "finalQuiz": [
    {
      "question": "题目",
      "options": ["A选项", "B选项", "C选项", "D选项"],
      "answer": "A",
      "explanation": "解析"
    }
  ]
}

只返回JSON，不要其他内容。`;

      console.log('✓ 调用AI生成大纲（含交互设计）...');
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

      // 构建Prompt - 专业版（整合UI设计系统、Bootstrap组件和微测验）
      const prompt = `作为一名专业的${courseInfo.major}教师，请根据以下教学大纲生成完整的交互式HTML教学页面。

【课程信息】
- 课程名称：${courseInfo.courseName}
- 教学层次：${courseInfo.courseLevel}
- 专业：${courseInfo.major}
${courseInfo.subject ? `- 学科：${courseInfo.subject}` : ''}

【教学大纲】
${JSON.stringify(outline, null, 2)}

【UI设计系统（强制使用）】
1. CSS变量（必须在<style>中定义）：
   - --c-primary: #2563EB（主色）
   - --c-accent: #F97316（强调色）
   - --c-success: #22C55E（成功色）
   - --c-warning: #F59E0B（警示色）
   - --c-danger: #EF4444（危险色）
   - --c-bg: #0B1220（深色背景）
   - --c-surface: #111A2E（卡片底）
   - --c-border: rgba(255,255,255,0.10)（边框）
   - --c-text: rgba(255,255,255,0.92)（文字主色）
   - --c-muted: rgba(255,255,255,0.70)（次级文字）
   - --radius: 16px（圆角）
   - --shadow: 0 10px 30px rgba(0,0,0,0.35)（阴影）
   字体：font-family: "PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,-apple-system,Segoe UI,Roboto,Arial;

2. 必须引入Bootstrap 5（使用国内CDN）：
   - 阿里云CDN：https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css
   - 或腾讯云CDN作为fallback

【内容要求】
1. 为每个小节生成200-400字的教学内容
2. 内容要符合${courseInfo.courseLevel}学生的认知水平
3. 突出重点概念和关键知识点
4. 可以加入一些实例或案例
5. 保持教育性和专业性

【交互设计要求（强制）】
1. 每个小节必须包含至少1个交互考核点：
   - 关键点问答（使用Bootstrap Collapse显示答案）
   - 单选题测验（使用Bootstrap Form + Alert显示反馈）
   - 判断题（使用Bootstrap Buttons）
2. 每个交互点都要有解析/理由
3. 图片占位：如果大纲中标记needImage，添加<img src="" alt="图片说明" class="img-fluid my-3">

【页面结构要求】
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${courseInfo.subject || courseInfo.courseName} - ${courseInfo.courseName}</title>
  <!-- Bootstrap CDN（国内） -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    /* 在这里定义CSS变量和自定义样式 */
    :root {
      --c-primary: #2563EB;
      --c-accent: #F97316;
      --c-success: #22C55E;
      --c-warning: #F59E0B;
      --c-danger: #EF4444;
      --c-bg: #0B1220;
      --c-surface: #111A2E;
      --c-border: rgba(255,255,255,0.10);
      --c-text: rgba(255,255,255,0.92);
      --c-muted: rgba(255,255,255,0.70);
      --radius: 16px;
      --shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    body {
      font-family: "PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,-apple-system,Segoe UI,Roboto,Arial;
      background: var(--c-bg);
      color: var(--c-text);
      line-height: 1.6;
    }
    /* 自定义卡片样式 */
    .content-card {
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 2rem;
      margin-bottom: 2rem;
    }
    /* 自定义按钮样式 */
    .btn-primary-custom {
      background: var(--c-primary);
      border: none;
      border-radius: var(--radius);
    }
  </style>
</head>
<body>
  <!-- 导航栏 -->
  <nav class="navbar navbar-dark bg-dark">
    <div class="container">
      <span class="navbar-brand mb-0 h1">${courseInfo.courseName}</span>
    </div>
  </nav>

  <!-- 主内容区 -->
  <div class="container py-5">
    <!-- 教师信息卡片 -->
    <div class="content-card text-center mb-4">
      <div class="mb-3">
        <img src="" alt="教师头像" class="rounded-circle" style="width: 80px; height: 80px; object-fit: cover;">
      </div>
      <h5>{{teacher_name}}</h5>
      <p class="text-muted">最后编辑者</p>
      <p class="small text-muted">提示：可在HTML中替换为真实姓名和头像URL</p>
    </div>

    <!-- 课程章节内容（根据大纲生成） -->
    <section class="content-card">
      <h2>第一章标题</h2>
      <h4>小节标题</h4>
      <p>教学内容...</p>

      <!-- 交互考核点示例 -->
      <div class="card bg-dark border-secondary mt-4">
        <div class="card-header">
          <h6 class="mb-0">📝 随堂测验</h6>
        </div>
        <div class="card-body">
          <p class="mb-3">题目内容...</p>
          <div class="list-group">
            <button class="list-group-item list-group-item-action bg-dark text-white" onclick="checkAnswer(this, true)">A. 选项A</button>
            <button class="list-group-item list-group-item-action bg-dark text-white" onclick="checkAnswer(this, false)">B. 选项B</button>
          </div>
          <div class="alert alert-success mt-3 d-none" id="feedback">
            <strong>✓ 正确！</strong> 解析内容...
          </div>
        </div>
      </div>
    </section>

    <!-- 结尾自测（5题） -->
    <section class="content-card">
      <h2>🎯 课程自测</h2>
      <p class="text-muted">完成以下5道题目，检验学习效果</p>
      <!-- 5道单选题 -->
    </section>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    // 交互逻辑
    function checkAnswer(btn, isCorrect) {
      // 显示对错反馈
    }
  </script>
</body>
</html>

【重要】
- 只返回完整的HTML代码，不要其他内容
- 确保所有交互都使用Bootstrap组件实现
- 每个章节至少1个交互点
- 结尾必须有5题自测
- 教师信息使用占位符{{teacher_name}}`;

      console.log('✓ 调用AI生成内容（含交互设计）...');
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
      const { courseName, subject, courseLevel, major, additionalRequirements } = req.body;

      if (!courseName || !subject) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '缺少必填字段：课程名称和教学主题'
          }
        });
      }

      console.log('✓ 调用AI生成简单内容（专业版）...');
      console.log('课程:', courseName, '主题:', subject, '层次:', courseLevel);

      // 构建专业化Prompt（整合完整设计规范）
      const prompt = `作为一名专业的${major || '医学'}教师，请为"${subject}"这个教学主题生成一个交互式HTML教学页面。

【课程信息】
- 课程名称：${courseName}
- 教学层次：${courseLevel || '高职'}
- 专业：${major || '护理'}
- 教学主题：${subject}
${additionalRequirements ? `- 其他要求：${additionalRequirements}` : ''}

【UI设计系统（强制使用）】
必须在<head>中引入Bootstrap 5（国内CDN）：
- CSS: https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css
- JS: https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js

必须在<style>中定义CSS变量：
:root {
  --c-primary: #2563EB;
  --c-accent: #F97316;
  --c-success: #22C55E;
  --c-warning: #F59E0B;
  --c-danger: #EF4444;
  --c-bg: #0B1220;
  --c-surface: #111A2E;
  --c-border: rgba(255,255,255,0.10);
  --c-text: rgba(255,255,255,0.92);
  --c-muted: rgba(255,255,255,0.70);
  --radius: 16px;
  --shadow: 0 10px 30px rgba(0,0,0,0.35);
}

【页面结构要求】
1. 完整的HTML5页面，包含<!DOCTYPE html>
2. 字符编码UTF-8，标题为"${subject} - ${courseName}"
3. 使用统一字体：font-family: "PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,-apple-system,Segoe UI,Roboto,Arial;
4. 深色背景（var(--c-bg)），白色文字（var(--c-text)）

【内容组织】
1. 导航栏（Bootstrap navbar）
2. 教师信息卡片：
   - 头像占位（圆形，80x80）
   - 教师名使用占位符：{{teacher_name}}
   - 显示"最后编辑者"
   - 提示：可在HTML中替换为真实姓名和头像URL
3. 主要内容区（使用Bootstrap container）：
   - h2标题显示"${subject}"
   - 150-200字的教学内容介绍，包括：概念、重要性、关键要点
   - 使用Bootstrap Card组件组织内容
   - 内容要符合${courseLevel || '高职'}学生的认知水平
4. 交互考核点（强制，至少2个）：
   - 使用Bootstrap Collapse实现关键点问答
   - 或使用Bootstrap Form + Alert实现单选题测验
   - 每个交互点都要有解析/理由
5. 结尾自测（5题单选，强制）：
   - 使用Bootstrap List group或Form
   - 点击选项显示对错反馈（Bootstrap Alert）
   - 每题都有解析
6. 图片占位（至少1个）：
   - <img src="" alt="图片说明" class="img-fluid my-3">

【交互实现】
在<script>中实现：
1. checkAnswer(btn, isCorrect) - 检查答案函数
2. 使用Bootstrap的Alert组件显示反馈
3. 不需要后端存储，纯前端交互

【响应式设计】
- 桌面：多列布局，卡片栅格
- 手机：单列堆叠，Bootstrap的响应式类

【重要】
- 只返回完整的HTML代码，不要其他解释文字
- 确保所有组件都来自Bootstrap 5
- 教师信息必须使用占位符{{teacher_name}}
- 必须包含至少2个交互点 + 5题自测
- 保持教育性和专业性`;

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
          timeout: 300000 // 300秒超时（5分钟）
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
