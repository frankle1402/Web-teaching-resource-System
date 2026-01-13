import request from './request'

/**
 * 管理员API封装
 */
export const adminAPI = {
  /**
   * 获取统计数据
   */
  getStats() {
    return request({
      url: '/admin/stats',
      method: 'get'
    })
  },

  /**
   * 获取用户列表
   */
  getUsers(params) {
    return request({
      url: '/admin/users',
      method: 'get',
      params
    })
  },

  /**
   * 创建新用户
   */
  createUser(data) {
    return request({
      url: '/admin/users',
      method: 'post',
      data
    })
  },

  /**
   * 启用/禁用用户
   */
  updateUserStatus(id, status, reason) {
    return request({
      url: `/admin/users/${id}/status`,
      method: 'put',
      data: { status, reason }
    })
  },

  /**
   * 编辑用户信息
   */
  updateUser(id, data) {
    return request({
      url: `/admin/users/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除用户
   */
  deleteUser(id) {
    return request({
      url: `/admin/users/${id}`,
      method: 'delete'
    })
  },

  /**
   * 批量更新用户状态
   */
  batchUpdateUserStatus(data) {
    return request({
      url: '/admin/users/batch/status',
      method: 'put',
      data
    })
  },

  /**
   * 批量更新用户角色
   */
  batchUpdateUserRole(data) {
    return request({
      url: '/admin/users/batch/role',
      method: 'put',
      data
    })
  },

  /**
   * 获取指定用户的资源列表
   */
  getUserResources(id, params) {
    return request({
      url: `/admin/users/${id}/resources`,
      method: 'get',
      params
    })
  },

  /**
   * 获取所有用户的资源列表
   */
  getAllResources(params) {
    return request({
      url: '/admin/all-resources',
      method: 'get',
      params
    })
  },

  /**
   * 禁用/启用资源
   */
  toggleResourceDisabled(id, isDisabled, reason = '') {
    return request({
      url: `/admin/resources/${id}/disable`,
      method: 'put',
      data: { isDisabled, reason }
    })
  },

  /**
   * 强制下架资源（退回草稿状态）
   */
  forceUnpublishResource(id) {
    return request({
      url: `/admin/resources/${id}/unpublish`,
      method: 'put'
    })
  },

  /**
   * 获取操作日志
   */
  getLogs(params) {
    return request({
      url: '/admin/logs',
      method: 'get',
      params
    })
  }
}
