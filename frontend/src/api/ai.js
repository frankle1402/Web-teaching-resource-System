import request from '@/api/request'

/**
 * AI生成API
 */
export const aiAPI = {
  /**
   * 生成教学大纲
   */
  generateOutline(data) {
    return request({
      url: '/ai/outline',
      method: 'post',
      data
    })
  },

  /**
   * 生成HTML内容
   */
  generateContent(data) {
    return request({
      url: '/ai/content',
      method: 'post',
      data
    })
  },

  /**
   * 生成简单HTML内容（用于简化版）
   */
  generateSimpleContent(data) {
    return request({
      url: '/ai/simple-content',
      method: 'post',
      data
    })
  }
}
