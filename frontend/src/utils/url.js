/**
 * 获取 API 基础 URL，自动适配当前页面协议
 */
export function getApiBaseUrl() {
  const host = import.meta.env.VITE_API_HOST || 'aigc.osve.cn:8080'
  const protocol = window.location.protocol
  return `${protocol}//${host}`
}
