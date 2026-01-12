/**
 * 浏览记录API模块
 */
import request from './request'

export const viewAPI = {
  /**
   * 开始浏览记录
   * @param {object} data - { resourceId, userAgent }
   * @returns {Promise<{viewId: number}>}
   */
  startView(data) {
    return request({
      url: '/views/start',
      method: 'post',
      data
    })
  },

  /**
   * 心跳更新浏览时长
   * @param {number} viewId - 浏览记录ID
   * @param {object} data - { duration }
   */
  heartbeat(viewId, data) {
    return request({
      url: `/views/${viewId}/heartbeat`,
      method: 'post',
      data
    })
  },

  /**
   * 结束浏览
   * @param {number} viewId - 浏览记录ID
   * @param {object} data - { duration }
   */
  endView(viewId, data) {
    return request({
      url: `/views/${viewId}/end`,
      method: 'post',
      data
    })
  },

  /**
   * 获取当前用户的浏览记录
   * @param {object} params - { page, pageSize }
   */
  getMyViews(params) {
    return request({
      url: '/views/my',
      method: 'get',
      params
    })
  },

  /**
   * 获取浏览统计数据（用于Dashboard）
   */
  getViewStats() {
    return request({
      url: '/views/stats',
      method: 'get'
    })
  },

  /**
   * 教师查看资源的浏览记录
   * @param {number} resourceId - 资源ID
   * @param {object} params - { page, pageSize }
   */
  getResourceViews(resourceId, params) {
    return request({
      url: `/views/resource/${resourceId}`,
      method: 'get',
      params
    })
  }
}

export default viewAPI
