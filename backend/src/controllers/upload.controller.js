const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const debugLogger = require('../utils/debugLogger');

/**
 * 文件上传和解析控制器
 */
class UploadController {
  /**
   * 上传并解析教案文件
   * 支持格式：.docx, .pdf, .pptx, .txt
   */
  async parseDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE_UPLOADED',
            message: '请上传文件'
          }
        });
      }

      const file = req.file;
      const ext = path.extname(file.originalname).toLowerCase();
      let extractedText = '';

      console.log('✓ 开始解析文件:', file.originalname, '类型:', ext);

      switch (ext) {
        case '.docx':
          extractedText = await this.parseDocx(file.buffer);
          break;
        case '.pdf':
          extractedText = await this.parsePdf(file.buffer);
          break;
        case '.pptx':
          extractedText = await this.parsePptx(file.buffer);
          break;
        case '.txt':
          extractedText = file.buffer.toString('utf-8');
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'UNSUPPORTED_FORMAT',
              message: `不支持的文件格式: ${ext}，请上传 .docx, .pdf, .pptx 或 .txt 文件`
            }
          });
      }

      // 清理提取的文本
      extractedText = this.cleanText(extractedText);

      if (!extractedText || extractedText.trim().length < 50) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CONTENT_TOO_SHORT',
            message: '提取的内容过少，请确保文件包含足够的文本内容'
          }
        });
      }

      console.log('✓ 文件解析成功，提取字数:', extractedText.length);

      res.json({
        success: true,
        data: {
          filename: file.originalname,
          fileType: ext,
          contentLength: extractedText.length,
          content: extractedText
        }
      });
    } catch (error) {
      console.error('文件解析错误:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: '文件解析失败: ' + error.message
        }
      });
    }
  }

  /**
   * 解析 Word 文档 (.docx)
   */
  async parseDocx(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * 解析 PDF 文档
   */
  async parsePdf(buffer) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  /**
   * 解析 PowerPoint 文档 (.pptx)
   * 简化实现：提取文本内容
   */
  async parsePptx(buffer) {
    // PPTX 文件本质是 ZIP，包含 XML 文件
    // 这里使用简化方案：通过 mammoth 尝试提取（它可以处理部分 Office 格式）
    // 或者返回提示让用户转换为其他格式
    try {
      // 尝试使用 mammoth（可能不完全支持 pptx）
      const result = await mammoth.extractRawText({ buffer });
      if (result.value && result.value.length > 0) {
        return result.value;
      }
    } catch (e) {
      console.log('mammoth 无法解析 pptx，尝试其他方法');
    }

    // 如果 mammoth 无法解析，返回提示
    throw new Error('PPTX 文件解析暂不完全支持，建议将内容复制为文本后粘贴，或转换为 Word/PDF 格式');
  }

  /**
   * 清理提取的文本
   */
  cleanText(text) {
    if (!text) return '';

    return text
      // 移除多余空白
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      // 移除特殊字符
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .trim();
  }

  /**
   * 根据上传的教案内容生成教学大纲
   */
  async generateOutlineFromContent(req, res) {
    try {
      const { content, courseName, courseLevel, major, subject, teachingMethod, contentDirections } = req.body;

      if (!content || content.length < 50) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CONTENT_TOO_SHORT',
            message: '教案内容过少，请提供更详细的内容'
          }
        });
      }

      console.log('✓ 开始分析教案内容，生成大纲...');
      console.log('内容长度:', content.length, '字');
      console.log('教学法:', teachingMethod || 'auto', '内容方向:', contentDirections || []);

      // 构建教学法指引
      let methodGuide = '';
      if (teachingMethod && teachingMethod !== 'auto') {
        const methodGuides = {
          'cbl': `【教学法要求：CBL案例教学法】
请严格按照CBL案例教学法设计大纲结构：
1. 案例导入（真实临床情境，患者主诉、病史、体征）
2. 问题提出（引导学生思考可能的诊断）
3. 知识讲解（相关疾病的病因、机制、鉴别诊断）
4. 【考核点】诊断推理题
5. 处理方案（治疗原则、护理要点）
6. 案例延伸（并发症预防、健康教育）
7. 【自测】情境分析题`,
          'skill': `【教学法要求：操作技能四步法】
请严格按照操作技能教学法设计大纲结构：
1. 操作目的与意义（为什么要掌握这项操作）
2. 用物准备（器材清单、环境要求）
3. 操作步骤详解（分步骤说明，关键点和注意事项）
4. 【考核点】步骤排序题
5. 操作要点与常见错误（易错点警示）
6. 【考核点】错误识别题
7. 并发症预防与处理
8. 【自测】操作规范题`,
          'pbl': `【教学法要求：PBL问题导向法】
请严格按照PBL问题导向教学法设计大纲结构：
1. 问题情境（复杂临床问题呈现）
2. 问题分解（将大问题拆解为子问题）
3. 【考核点】问题识别题
4. 知识探索（相关知识点讲解，多学科知识整合）
5. 方案制定（解决问题的思路和方法）
6. 【考核点】方案评价题
7. 反思总结（知识框架构建）
8. 【自测】综合应用题`,
          'flipped': `【教学法要求：翻转课堂教学法】
请严格按照翻转课堂教学法设计大纲结构：
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
请严格按照循证护理/医学教学法设计大纲结构：
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

      // 构建 AI 提示词
      const prompt = `你是一位资深的${major || '医学'}教育专家。请分析以下教案/教材内容，提取核心知识点并生成结构化的教学大纲。

【课程信息】
- 课程名称：${courseName || '未指定'}
- 教学层次：${courseLevel || '高职'}
- 专业：${major || '护理'}
- 教学主题：${subject || '根据内容自动识别'}

${methodGuide}
${directionGuide}

【教案/教材内容】
${content.substring(0, 8000)}
${content.length > 8000 ? '\n...(内容过长，已截断)' : ''}

【重要约束 - 枚举值必须严格匹配】
- mediaType 只能是以下值之一: "none", "image", "video"
- quizType 只能是以下值之一: "choice", "order", "judge", "case"
- questionType 只能是以下值之一: "choice", "multiple", "judge"
- hasQuiz 是布尔值: true 或 false（不要全部设为true，根据内容重要性选择性设置）

【输出要求】
请生成JSON格式的教学大纲，包含以下结构：
{
  "title": "识别出的教学主题",
  "summary": "50字以内的内容概述",
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
    }
  ],
  "finalQuizTopics": [
    {
      "topic": "知识点名称",
      "questionType": "choice",
      "questionCount": 2,
      "randomOrder": true
    }
  ]
}

【注意事项】
1. sections 数量控制在 4-6 个
2. 每个section的duration是分钟数（数字），总和约90分钟
3. hasQuiz不要全部设为true，只在核心知识点后设置考核
4. mediaType: "none"表示无媒体，"image"表示需要图片，"video"表示需要视频
5. quizType: "choice"单选题，"order"排序题，"judge"判断题，"case"案例分析
6. finalQuizTopics的questionType: "choice"单选，"multiple"多选，"judge"判断
7. 每个知识点的questionCount在1-5之间
8. keywords最多5个，只包含中文、英文或数字
9. 只返回JSON，不要其他内容
${methodGuide ? '10. 严格按照上述教学法要求的章节结构设计大纲' : ''}`;

      // 调用 AI API
      const requestStartTime = new Date().toISOString();
      const aiResult = await this.callAIAPI(prompt);
      const responseTime = new Date().toISOString();
      const aiResponse = aiResult.content;
      const usage = aiResult.usage;

      // 保存调试日志
      await debugLogger.saveDebug({
        userId: req.user?.id,
        type: 'outline',
        prompt,
        response: aiResponse,
        courseInfo: { courseName, subject, courseLevel, major },
        usage,
        requestStartTime,
        responseTime
      });

      // 解析 AI 返回的 JSON
      let outlineData;
      try {
        let jsonStr = aiResponse.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        outlineData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('解析大纲JSON失败:', parseError);
        // 返回默认大纲
        outlineData = this.generateDefaultOutline(subject || '教学内容', content);
      }

      console.log('✓ 大纲生成成功，章节数:', outlineData.sections?.length || 0);

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
          message: '生成大纲失败: ' + error.message
        }
      });
    }
  }

  /**
   * 调用 AI API
   * @param {string} prompt - 提示词
   * @returns {Promise<{content: string, usage: Object}>} 返回内容和token消耗
   */
  async callAIAPI(prompt) {
    const apiKey = process.env.AI_API_KEY;
    const apiUrl = process.env.AI_API_BASE_URL;
    const model = process.env.AI_MODEL || 'claude-opus-4-1-20250805';

    const response = await axios.post(
      apiUrl,
      {
        model: model,
        messages: [{ role: 'user', content: prompt }],
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

    if (response.data && response.data.choices && response.data.choices[0]) {
      return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage || null
      };
    }

    throw new Error('AI返回格式错误');
  }

  /**
   * 生成默认大纲（备用）
   */
  generateDefaultOutline(title, content) {
    // 简单分析内容，提取关键词
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const sections = [];

    // 尝试识别章节标题（通常是较短的行）
    let sectionCount = 0;
    for (const line of lines) {
      if (line.length < 50 && (line.includes('一、') || line.includes('二、') || line.includes('1.') || line.includes('第') || /^[一二三四五六七八九十]+、/.test(line))) {
        sectionCount++;
        if (sectionCount <= 6) {
          sections.push({
            id: `section-${sectionCount}`,
            title: line.trim(),
            type: 'content',
            description: '待补充',
            duration: 15,
            mediaType: 'none',
            hasQuiz: sectionCount % 2 === 0,
            quizType: 'choice'
          });
        }
      }
    }

    // 如果没有识别到章节，创建默认章节
    if (sections.length === 0) {
      sections.push(
        { id: 'section-1', title: '概述', type: 'content', description: '基本概念介绍', duration: 10, mediaType: 'none', hasQuiz: false, quizType: 'choice' },
        { id: 'section-2', title: '核心内容', type: 'content', description: '重点知识讲解', duration: 25, mediaType: 'image', hasQuiz: true, quizType: 'choice' },
        { id: 'section-3', title: '实践应用', type: 'content', description: '案例与应用', duration: 25, mediaType: 'none', hasQuiz: true, quizType: 'case' },
        { id: 'section-4', title: '总结', type: 'summary', description: '要点回顾', duration: 10, mediaType: 'none', hasQuiz: false, quizType: 'choice' }
      );
    }

    return {
      title: title,
      summary: '根据上传的教案内容自动生成的教学大纲',
      keywords: ['教学', '课程', '学习'],
      learningObjectives: ['能够理解核心概念', '能够掌握关键技能', '能够在实践中应用'],
      sections: sections,
      finalQuizTopics: [
        { topic: '概念理解', questionType: 'choice', questionCount: 2, randomOrder: true },
        { topic: '原理应用', questionType: 'choice', questionCount: 2, randomOrder: true },
        { topic: '操作规范', questionType: 'judge', questionCount: 1, randomOrder: true }
      ]
    };
  }
}

module.exports = new UploadController();
