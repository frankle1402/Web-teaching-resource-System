/**
 * 用户API模块
 */
import request from './request'

export const userAPI = {
  /**
   * 获取当前用户完整信息
   */
  getProfile() {
    return request({
      url: '/user/profile',
      method: 'get'
    })
  },

  /**
   * 更新个人信息
   */
  updateProfile(data) {
    return request({
      url: '/user/profile',
      method: 'put',
      data
    })
  },

  /**
   * 获取个人Dashboard数据
   */
  getDashboard() {
    return request({
      url: '/user/dashboard',
      method: 'get'
    })
  },

  /**
   * 获取配置选项（职称、层次等）
   */
  getOptions() {
    return request({
      url: '/user/options',
      method: 'get'
    })
  }
}

export default userAPI
