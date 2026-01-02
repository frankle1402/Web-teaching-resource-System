import axios from 'axios'
import { ElMessage } from 'element-plus'

/**
 * Axios请求封装
 */
const request = axios.create({
  baseURL: '/api',
  timeout: 300000, // 300秒超时（5分钟），适配AI生成长内容
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * 请求拦截器
 */
request.interceptors.request.use(
  config => {
    // 从localStorage获取token
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器
 */
request.interceptors.response.use(
  response => {
    const res = response.data

    // 如果响应包含success字段
    if (res.hasOwnProperty('success')) {
      if (res.success) {
        return res.data || res
      } else {
        // 业务错误
        ElMessage.error(res.error?.message || '操作失败')
        return Promise.reject(new Error(res.error?.message || '操作失败'))
      }
    }

    // 直接返回响应数据
    return res
  },
  error => {
    console.error('响应错误:', error)

    // 处理HTTP错误状态码
    if (error.response) {
      switch (error.response.status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_info')
          window.location.href = '/login'
          break
        case 403:
          ElMessage.error('拒绝访问')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(error.response.data?.error?.message || '请求失败')
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接')
    } else {
      ElMessage.error('请求配置错误')
    }

    return Promise.reject(error)
  }
)

export default request
