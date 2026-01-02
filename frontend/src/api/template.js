import request from '@/api/request'

/**
 * 模板管理API
 */
export const templateAPI = {
  /**
   * 获取模板列表
   */
  getList() {
    return request({
      url: '/templates',
      method: 'get'
    })
  },

  /**
   * 获取模板详情
   */
  getById(id) {
    return request({
      url: `/templates/${id}`,
      method: 'get'
    })
  }
}
