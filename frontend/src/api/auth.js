import request from './request'

/**
 * 认证相关API
 */
export const authAPI = {
  /**
   * 模拟登录
   * @param {Object} data - { phone: string }
   */
  mockLogin(data) {
    return request({
      url: '/auth/mock-login',
      method: 'post',
      data
    })
  },

  /**
   * 退出登录
   */
  logout() {
    return request({
      url: '/auth/logout',
      method: 'post'
    })
  },

  /**
   * 验证Token
   */
  verifyToken() {
    return request({
      url: '/auth/verify-token',
      method: 'get'
    })
  }
}
