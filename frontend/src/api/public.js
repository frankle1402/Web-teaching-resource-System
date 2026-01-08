import axios from 'axios'

/**
 * 公开API模块（无需认证）
 */
const BASE_URL = '/api'

export const publicAPI = {
  /**
   * 获取公开资源列表
   */
  getResources(params) {
    return axios.get(`${BASE_URL}/public/resources`, { params })
  },

  /**
   * 获取专业列表
   */
  getMajors() {
    return axios.get(`${BASE_URL}/public/majors`)
  }
}
