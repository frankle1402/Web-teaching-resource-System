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
   * 发送验证码
   * @param {Object} data - { phone: string }
   */
  sendCode(data) {
    return request({
      url: '/auth/send-code',
      method: 'post',
      data
    })
  },

  /**
   * 验证码登录
   * @param {Object} data - { phone: string, code: string }
   * @returns {Promise<{token?, user?, isNewUser, phone?}>}
   */
  loginWithCode(data) {
    return request({
      url: '/auth/login-with-code',
      method: 'post',
      data
    })
  },

  /**
   * 新用户注册
   * @param {Object} data - { phone, code, role, real_name, ... }
   */
  register(data) {
    return request({
      url: '/auth/register',
      method: 'post',
      data
    })
  },

  /**
   * 完善用户资料
   * @param {Object} data - { real_name, organization, nickname?, avatar_url?, ... }
   */
  completeProfile(data) {
    return request({
      url: '/auth/complete-profile',
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
  },

  /**
   * 同步 token 到后端 session（用于跨端口登录状态同步）
   */
  syncToken() {
    return request({
      url: '/auth/sync-token',
      method: 'post'
    })
  },

  /**
   * 清除后端 session 中的 token
   */
  clearSessionToken() {
    return request({
      url: '/auth/session-token',
      method: 'delete'
    })
  }
}
