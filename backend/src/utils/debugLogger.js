const fs = require('fs');
const path = require('path');

/**
 * AI 调试日志工具类
 * 保存提示词、AI 返回内容和 Token 消耗到 debug 目录
 */
class DebugLogger {
  constructor() {
    this.debugDir = path.join(__dirname, '../../debug');
    this.ensureDebugDir();
  }

  ensureDebugDir() {
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }

  /**
   * 生成文件名：YYYYMMDD-序号
   */
  generateFileName(date = new Date()) {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const files = fs.readdirSync(this.debugDir).filter(f => f.startsWith(dateStr));
    const seq = files.length + 1;
    return `${dateStr}-${String(seq).padStart(3, '0')}`;
  }

  /**
   * 保存调试日志
   * @param {Object} options
   * @param {number} options.userId - 用户ID
   * @param {string} options.type - 类型：outline / content
   * @param {string} options.prompt - 完整提示词
   * @param {string} options.response - AI 返回内容
   * @param {Object} options.courseInfo - 课程信息
   * @param {Object} options.usage - Token 消耗 { prompt_tokens, completion_tokens, total_tokens }
   * @param {string} options.requestStartTime - 请求开始时间 ISO 字符串
   * @param {string} options.responseTime - 响应返回时间 ISO 字符串
   */
  async saveDebug({ userId, type, prompt, response, courseInfo, usage, requestStartTime, responseTime }) {
    try {
      const fileName = this.generateFileName();
      const timestamp = new Date().toISOString();

      // 计算耗时
      let durationStr = '-';
      if (requestStartTime && responseTime) {
        const start = new Date(requestStartTime);
        const end = new Date(responseTime);
        const durationMs = end - start;
        const durationSec = (durationMs / 1000).toFixed(2);
        durationStr = `${durationSec} 秒 (${durationMs} ms)`;
      }

      // Markdown 文件：完整调试信息
      const mdContent = `# AI 生成调试日志

## 基本信息
- 时间: ${timestamp}
- 用户ID: ${userId || '-'}
- 类型: ${type}
- 课程: ${courseInfo?.courseName || '-'}
- 主题: ${courseInfo?.subject || '-'}
- 层次: ${courseInfo?.courseLevel || '-'}
- 专业: ${courseInfo?.major || '-'}

## 时间统计
- 请求开始时间: ${requestStartTime || '-'}
- 响应返回时间: ${responseTime || '-'}
- 总耗时: ${durationStr}

## Token 消耗
- 上行 Tokens (prompt): ${usage?.prompt_tokens || '-'}
- 下行 Tokens (completion): ${usage?.completion_tokens || '-'}
- 总计: ${usage?.total_tokens || '-'}

## 提示词
\`\`\`
${prompt}
\`\`\`

## AI 返回内容
\`\`\`
${response}
\`\`\`
`;

      fs.writeFileSync(path.join(this.debugDir, `${fileName}.md`), mdContent, 'utf-8');

      // 如果是 HTML 内容，单独保存便于预览
      if (type === 'content' && response && (response.includes('<!DOCTYPE') || response.includes('<html'))) {
        fs.writeFileSync(path.join(this.debugDir, `${fileName}.html`), response, 'utf-8');
      }

      console.log(`✓ 调试日志已保存: ${fileName}.md`);
      return fileName;
    } catch (error) {
      console.error('保存调试日志失败:', error);
      return null;
    }
  }
}

module.exports = new DebugLogger();
