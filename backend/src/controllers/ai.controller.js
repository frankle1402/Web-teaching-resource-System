const axios = require('axios');
const debugLogger = require('../utils/debugLogger');

/**
 * AI生成控制器（使用302.ai）
 */
class AIController {
  /**
   * 生成教学大纲
   */
  async generateOutline(req, res) {
    try {
      const { courseName, courseLevel, major, subject, teachingMethod, contentDirections } = req.body;

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

      // 构建教学法指引
      let methodGuide = '';
      if (teachingMethod && teachingMethod !== 'auto') {
        const methodGuides = {
          'cbl': `【教学法要求：CBL案例教学法】
请按照CBL案例教学法设计大纲结构：
1. 案例导入（真实临床情境，患者主诉、病史、体征）
2. 问题提出（引导学生思考可能的诊断）
3. 知识讲解（相关疾病的病因、机制、鉴别诊断）
4. 【考核点】诊断推理题
5. 处理方案（治疗原则、护理要点）
6. 案例延伸（并发症预防、健康教育）
7. 【自测】情境分析题`,
          'skill': `【教学法要求：操作技能四步法】
请按照操作技能教学法设计大纲结构：
1. 操作目的与意义（为什么要掌握这项操作）
2. 用物准备（器材清单、环境要求）
3. 操作步骤详解（分步骤说明，关键点和注意事项）
4. 【考核点】步骤排序题
5. 操作要点与常见错误（易错点警示）
6. 【考核点】错误识别题
7. 并发症预防与处理
8. 【自测】操作规范题`,
          'pbl': `【教学法要求：PBL问题导向法】
请按照PBL问题导向教学法设计大纲结构：
1. 问题情境（复杂临床问题呈现）
2. 问题分解（将大问题拆解为子问题）
3. 【考核点】问题识别题
4. 知识探索（相关知识点讲解，多学科知识整合）
5. 方案制定（解决问题的思路和方法）
6. 【考核点】方案评价题
7. 反思总结（知识框架构建）
8. 【自测】���合应用题`,
          'flipped': `【教学法要求：翻转课堂教学法】
请按照翻转课堂教学法设计大纲结构：
【课前自学部分】
1. 学习目标（本节课需要掌握的内容）
2. 核心概念（基础知识点讲解）
3. 【考核点】概念理解题
4. 重点难点（深入讲解）
5. 预习自测（3道基础题）
【课堂讨论部分】
6. 讨论问题（课堂需要讨论的问题清单）
7. 拓展思考（进阶问题）
8. 【自测】应用题`,
          'ebp': `【教学法要求：循证护理/医学教学法】
请按照循证护理/医学教学法设计大纲结构：
1. 临床问题（PICO格式问题构建）
2. 证据检索（如何查找最佳证据）
3. 【考核点】证据分级题
4. 证据评价（研究质量评价方法）
5. 证据应用（如何将证据应用于实践）
6. 【考核点】决策分析题
7. 效果评价（实践效果的评估方法）
8. 【自测】循证实践题`
        };
        methodGuide = methodGuides[teachingMethod] || '';
      }

      // 构建内容方向指引
      let directionGuide = '';
      if (contentDirections && contentDirections.length > 0) {
        const directionMap = {
          'operation': '强调操作步骤演示',
          'theory': '强调理论知识讲解',
          'case': '增加临床案例分析',
          'media': '增加视频/图片占位',
          'flipped': '适合翻转课堂',
          'self-study': '适合课后自学'
        };
        const directions = contentDirections.map(d => directionMap[d] || d).filter(Boolean);
        if (directions.length > 0) {
          directionGuide = `\n【内容方向要求】\n${directions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`;
        }
      }

      // 构建Prompt - 升级版（适配大纲编辑器新数据结构）
      const prompt = `作为一名专业的${major}教师，请为以下课程设计一个详细的教学大纲。

【课程信息】
- 课程名称：${courseName}
- 教学层次：${courseLevel}
- 专业：${major}
${subject ? `- 教学主题：${subject}` : ''}

${methodGuide}
${directionGuide}

【设计要求】
1. 大纲要包含4-6个章节（sections）
2. 内容要符合${courseLevel}学生的认知水平
3. 突出实践性和应用性
4. 符合${major}专业培养目标
5. 整体时长控制在90分钟（两节课）左右
6. 学习目标要符合布鲁姆目标分类法，使用"能够..."、"掌握..."、"理解..."等动词
${methodGuide ? '7. 严格按照上述教学法要求的章节结构设计大纲' : ''}

【重要约束 - 枚举值必须严格匹配】
- mediaType 只能是以下值之一: "none", "image", "video"
- quizType 只能是以下值之一: "choice", "order", "judge", "case"
- questionType 只能是以下值之一: "choice", "multiple", "judge"
- hasQuiz 是布尔值: true 或 false（不要全部设为true，根据内容重要性选择性设置）

请以JSON格式返回，格式如下：
{
  "title": "教学主题",
  "summary": "内容概述（50字以内）",
  "keywords": ["关键字1", "关键字2", "关键字3"],
  "learningObjectives": [
    "能够理解...",
    "能够掌握...",
    "能够应用..."
  ],
  "sections": [
    {
      "id": "section-1",
      "title": "章节标题",
      "type": "content",
      "description": "章节内容概要（1-2句话）",
      "duration": 15,
      "mediaType": "none",
      "hasQuiz": false,
      "quizType": "choice"
    },
    {
      "id": "section-2",
      "title": "重点章节标题",
      "type": "content",
      "description": "章节内容概要",
      "duration": 20,
      "mediaType": "image",
      "hasQuiz": true,
      "quizType": "choice"
    }
  ],
  "finalQuizTopics": [
    {
      "topic": "知识点名称1",
      "questionType": "choice",
      "questionCount": 2,
      "randomOrder": true
    },
    {
      "topic": "知识点名称2",
      "questionType": "judge",
      "questionCount": 1,
      "randomOrder": true
    }
  ]
}

【注意事项】
1. sections数量控制在4-6个
2. 每个section的duration是分钟数（数字），总和约90分钟
3. hasQuiz不要全部设为true，只在核心知识点后设置考核
4. mediaType: "none"表示无媒体，"image"表示需要图片，"video"表示需要视频
5. quizType: "choice"单选题，"order"排序题，"judge"判断题，"case"案例分析
6. finalQuizTopics的questionType: "choice"单选，"multiple"多选，"judge"判断
7. 每个知识点的questionCount在1-5之间
8. keywords最多5个，只包含中文、英文或数字
9. 只返回JSON，不要其他内容`;

      console.log('✓ 调用AI生成大纲（含交互设计）...');
      console.log('课程:', courseName, '层次:', courseLevel, '专业:', major);
      console.log('教学法:', teachingMethod || 'auto', '内容方向:', contentDirections || []);

      // 调用302.ai API
      const requestStartTime = new Date().toISOString();
      const aiResult = await this.callAIAPI(prompt);
      const responseTime = new Date().toISOString();
      const aiResponse = aiResult.content;

      // 保存调试日志
      await debugLogger.saveDebug({
        userId: req.user?.id,
        type: 'outline',
        prompt,
        response: aiResponse,
        courseInfo: { courseName, subject, courseLevel, major },
        usage: aiResult.usage,
        requestStartTime,
        responseTime
      });

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
      const requestStartTime2 = new Date().toISOString();
      const aiResult = await this.callAIAPI(prompt);
      const responseTime2 = new Date().toISOString();
      const aiResponse = aiResult.content;

      // 保存调试日志
      await debugLogger.saveDebug({
        userId: req.user?.id,
        type: 'content',
        prompt,
        response: aiResponse,
        courseInfo,
        usage: aiResult.usage,
        requestStartTime: requestStartTime2,
        responseTime: responseTime2
      });

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
      const { courseName, subject, courseLevel, major, additionalRequirements, contentDirections, teachingMethod } = req.body;

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

      // 构建内容方向提示
      let contentDirectionPrompt = '';
      if (contentDirections && contentDirections.length > 0) {
        const directionMap = {
          'operation': '强调操作步骤演示，详细分解每个操作环节',
          'theory': '强调理论知识讲解，深入阐述原理和机制',
          'case': '增加临床案例分析，通过真实案例加深理解',
          'media': '增加视频/图片占位，标注需要配图的位置',
          'flipped': '适合翻转课堂，设计课前预习和课堂讨论环节',
          'self-study': '适合课后自学，内容完整自洽，便于独立学习'
        };
        const directions = contentDirections.map(d => directionMap[d] || d).filter(Boolean);
        if (directions.length > 0) {
          contentDirectionPrompt = `\n【内容方向要求】\n${directions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`;
        }
      }

      // 构建教学法模板提示
      let teachingMethodPrompt = '';
      if (teachingMethod && teachingMethod !== 'auto') {
        const methodTemplates = {
          'cbl': `【教学法：CBL案例教学法】
按以下结构组织内容：
1. 案例导入：呈现真实临床情境（患者主诉、病史、体征）
2. 问题提出：引导学生思考可能的诊断或处理方案
3. 知识讲解：相关疾病的病因、机制、鉴别诊断
4. 【考核点】诊断推理题或临床决策题
5. 处理方案：治疗原则、护理要点
6. 案例延伸：并发症预防、健康教育
7. 【自测】5道情境分析题`,
          'skill': `【教学法：操作技能四步教学法】
按以下结构组织内容：
1. 操作目的与意义：为什么要掌握这项操作？
2. 用物准备：器材清单、环境要求（使用表格呈现）
3. 操作步骤详解（核心）：
   - 分步骤图文说明，每步标注序号
   - 每步的关键点用【要点】标注
   - 注意事项用⚠️警示标识
   - 【考核点】步骤排序题
4. 操作要点与常见错误：
   - 易错点用红色边框警示
   - 【考核点】错误识别题
5. 并发症预防与处理
6. 【自测】5道操作规范题`,
          'pbl': `【教学法：PBL问题导向教学法】
按以下结构组织内容：
1. 问题情境：呈现复杂临床问题
2. 问题分解：将大问题拆解为子问题
   - 【考核点】问题识别题
3. 知识探索：相关知识点讲解，多学科知识整合
4. 方案制定：解决问题的思路和方法
   - 【考核点】方案评价题
5. 反思总结：知识框架构建
6. 【自测】5道综合应用题`,
          'flipped': `【教学法：翻转课堂教学法】
按以下结构组织内容：
【课前自学部分】
1. 学习目标：本节课需要掌握的内容（3-5条）
2. 核心概念：基础知识点讲解
   - 【考核点】概念理解题
3. 重点难点：深入讲解
4. 预习自测：3道基础题

【课堂讨论提示】
5. 讨论问题：课堂需要讨论的问题清单
6. 拓展思考：进阶问题
7. 【自测】5道应用题`,
          'ebp': `【教学法：循证护理/医学教学法】
按以下结构组织内容：
1. 临床问题：PICO格式问题构建
   - P(Patient)：患者特征
   - I(Intervention)：干预措施
   - C(Comparison)：对照措施
   - O(Outcome)：结局指标
2. 证据检索：如何查找最佳证据
   - 【考核点】证据分级题
3. 证据评价：研究质量评价方法
4. 证据应用：如何将证据应用于实践
   - 【考核点】决策分析题
5. 效果评价：实践效果的评估方法
6. 【自测】5道循证实践题`
        };
        teachingMethodPrompt = methodTemplates[teachingMethod] || '';
      }

      // 构建专业化Prompt（整合完整设计规范）
      const prompt = `作为一名专业的${major || '医学'}教师，请为"${subject}"这个教学主题生成一个交互式HTML教学页面。

【课程信息】
- 课程名称：${courseName}
- 教学层次：${courseLevel || '高职'}
- 专业：${major || '护理'}
- 教学主题：${subject}
${additionalRequirements ? `- 其他要求：${additionalRequirements}` : ''}
${contentDirectionPrompt}
${teachingMethodPrompt}

【医卫类专业特点要求】
1. 操作步骤标准化呈现：
   - 步骤编号清晰（第1步、第2步...）
   - 关键点用【要点】或【关键】标注
   - 警示信息用⚠️图标和红色边框强调
2. 注意事项和禁忌症醒目标注：
   - 使用Bootstrap的alert-danger组件
   - 禁忌症单独列出，不可���漏
3. 临床案例/情境嵌入：
   - 每个核心概念配合实际案例说明
   - 案例要贴近临床实际
4. 安全警示视觉强调：
   - 无菌操作、感染控制等内容特别标注
   - 用药安全、剂量计算等内容加粗显示

【UI设计系统（强制使用）】
必须在<head>中引入Bootstrap 5.3.3（jsDelivr CDN）：
- CSS: https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css
- JS: https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js

【样式隔离要求（重要）】
所有内容必须包裹在 <div class="tr-resource-container"> 容器中，CSS变量定义在容器上：

.tr-resource-container {
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

  font-family: "PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,-apple-system,Segoe UI,Roboto,Arial;
  background: var(--c-bg);
  color: var(--c-text);
  line-height: 1.6;
  min-height: 100vh;
}

所有CSS选择器必须以 .tr-resource-container 为前缀，例如：
.tr-resource-container .content-card { ... }
.tr-resource-container .btn-primary-custom { ... }

【页面结构要求】
1. 完整的HTML5页面，包含<!DOCTYPE html>
2. 字符编码UTF-8，标题为"${subject} - ${courseName}"
3. body标签内第一个元素必须是 <div class="tr-resource-container">
4. 所有内容都在这个容器内

【内容组织】
1. 导航栏（Bootstrap navbar，深色主题）
2. 教师信息卡片：
   - 头像占位（圆形，80x80）
   - 教师名使用占位符：{{teacher_name}}
   - 显示"最后编辑者"
3. 主要内容区（使用Bootstrap container）：
   - h2标题显示"${subject}"
   - 学习目标（3-5条，使用有序列表）
   - 核心内容讲解（300-500字），包括：
     * 概念定义
     * 重要性/临床意义
     * 关键要点（使用Bootstrap Card组件）
   - 内容要符合${courseLevel || '高职'}学生的认知水平
   - 知识点之间要有逻辑关系（概念→原理→应用）
4. 交互考核点（强制，至少3个，分布在内容中）：
   - 使用Bootstrap Collapse实现关键点问答
   - 或使用Bootstrap Form + Alert实现单选题测验
   - 每个交互点都要有详细解析（不只是"正确/错误"）
   - 解析要有教学价值，帮助学生理解
5. 结尾自测（5题单选，强制）：
   - 使用Bootstrap List group或Form
   - 点击选项显示对错反馈（Bootstrap Alert）
   - 每题都有解析，解析要说明为什么对/错
6. 图片占位（至少2个）：
   - <img src="" alt="图片说明" class="img-fluid my-3 rounded">
   - 用注释标注图片用途（如：<!-- 此处放置操作流程图 -->）

【交互实现】
在<script>中实现：
1. checkAnswer(btn, isCorrect, explanation) - 检查答案函数
2. 使用Bootstrap的Alert组件显示反馈
3. 正确答案显示绿色alert-success，错误显示红色alert-danger
4. 显示解析内容
5. 不需要后端存储，纯前端交互

【响应式设计】
- 桌面：多列布局，卡片栅格
- 平板：两列布局
- 手机：单列堆叠，Bootstrap的响应式类（col-12 col-md-6 col-lg-4）

【重要】
- 只返回完整的HTML代码，不要其他解释文字
- 确保所有组件都来自Bootstrap 5.3.3
- 教师信息必须使用占位符{{teacher_name}}
- 必须包含至少3个交互点 + 5题自测
- 所有样式必须在.tr-resource-container命名空间内
- 保持教育性和专业性
- 内容要有深度，不能太浅显`;

      // 调用AI API
      const requestStartTime3 = new Date().toISOString();
      const aiResult = await this.callAIAPI(prompt);
      const responseTime3 = new Date().toISOString();
      const aiResponse = aiResult.content;
      const usage = aiResult.usage;

      // 保存调试日志
      await debugLogger.saveDebug({
        userId: req.user?.id,
        type: 'content',
        prompt,
        response: aiResponse,
        courseInfo: { courseName, subject, courseLevel, major },
        usage,
        requestStartTime: requestStartTime3,
        responseTime: responseTime3
      });

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
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    .tr-resource-container {
      --c-primary: #2563EB;
      --c-bg: #0B1220;
      --c-surface: #111A2E;
      --c-text: rgba(255,255,255,0.92);
      font-family: "PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui;
      background: var(--c-bg);
      color: var(--c-text);
      min-height: 100vh;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="tr-resource-container">
    ${htmlContent}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
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
   * @param {string} prompt - 提示词
   * @returns {Promise<{content: string, usage: Object}>} 返回内容和token消耗
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
          max_tokens: 16000,    // 显式设置，16K足够生成完整HTML内容
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 600000 // 600秒超时（10分钟）
        }
      );

      // 提取AI返回的内容和usage
      if (response.data && response.data.choices && response.data.choices[0]) {
        return {
          content: response.data.choices[0].message.content,
          usage: response.data.usage || null
        };
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
      summary: `${courseName}的基础教学内容`,
      keywords: [major, courseLevel, '教学'],
      learningObjectives: [
        '能够理解本课程的基本概念',
        '能够掌握核心知识点和技能',
        '能够在实践中应用所学知识'
      ],
      sections: [
        {
          id: 'section-1',
          title: '课程概述',
          type: 'content',
          description: '介绍课程背景、学习目标和考核方式',
          duration: 10,
          mediaType: 'none',
          hasQuiz: false,
          quizType: 'choice'
        },
        {
          id: 'section-2',
          title: '基本概念',
          type: 'content',
          description: '讲解核心概念和基本原理',
          duration: 20,
          mediaType: 'image',
          hasQuiz: true,
          quizType: 'choice'
        },
        {
          id: 'section-3',
          title: '核心知识点',
          type: 'content',
          description: '深入讲解重点内容和关键技能',
          duration: 25,
          mediaType: 'image',
          hasQuiz: true,
          quizType: 'choice'
        },
        {
          id: 'section-4',
          title: '实践应用',
          type: 'content',
          description: '案例分析和实操训练',
          duration: 25,
          mediaType: 'none',
          hasQuiz: true,
          quizType: 'case'
        },
        {
          id: 'section-5',
          title: '总结回顾',
          type: 'summary',
          description: '要点回顾和注意事项',
          duration: 10,
          mediaType: 'none',
          hasQuiz: false,
          quizType: 'choice'
        }
      ],
      finalQuizTopics: [
        {
          topic: '概念理解',
          questionType: 'choice',
          questionCount: 2,
          randomOrder: true
        },
        {
          topic: '原理应用',
          questionType: 'choice',
          questionCount: 2,
          randomOrder: true
        },
        {
          topic: '操作规范',
          questionType: 'judge',
          questionCount: 1,
          randomOrder: true
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
