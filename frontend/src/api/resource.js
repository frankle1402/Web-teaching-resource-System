import request from '@/api/request'

/**
 * 资源管理API
 */
export const resourceAPI = {
  /**
   * 获取资源列表
   */
  getList(params) {
    return request({
      url: '/resources',
      method: 'get',
      params
    })
  },

  /**
   * 获取资源详情
   */
  getById(id) {
    return request({
      url: `/resources/${id}`,
      method: 'get'
    })
  },

  /**
   * 创建资源
   */
  create(data) {
    return request({
      url: '/resources',
      method: 'post',
      data
    })
  },

  /**
   * 更新资源
   */
  update(id, data) {
    return request({
      url: `/resources/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除资源
   */
  delete(id) {
    return request({
      url: `/resources/${id}`,
      method: 'delete'
    })
  },

  /**
   * 获取版本历史
   */
  getVersions(id) {
    return request({
      url: `/resources/${id}/versions`,
      method: 'get'
    })
  },

  /**
   * 恢复版本
   */
  restoreVersion(id, versionId) {
    return request({
      url: `/resources/${id}/versions/${versionId}/restore`,
      method: 'post'
    })
  },

  /**
   * 发布资源
   */
  publish(id) {
    return request({
      url: `/resources/${id}/publish`,
      method: 'post'
    })
  },

  /**
   * 回收资源为草稿
   */
  unpublish(id) {
    return request({
      url: `/resources/${id}/unpublish`,
      method: 'post'
    })
  }
}
