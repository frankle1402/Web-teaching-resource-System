import { defineStore } from 'pinia'
import { authAPI } from '@/api/auth'
import { ElMessage } from 'element-plus'
import router from '@/router'

/**
 * 用户状态管理
 */
export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('auth_token') || '',
    userInfo: JSON.parse(localStorage.getItem('user_info') || '{}')
  }),

  getters: {
    /**
     * 是否已登录
     */
    isLoggedIn: (state) => !!state.token && !!state.userInfo.id,

    /**
     * 获取用户手机号
     */
    userPhone: (state) => state.userInfo.phone || '',

    /**
     * 获取用户ID
     */
    userId: (state) => state.userInfo.id || null
  },

  actions: {
    /**
     * 登录
     */
    async login(phone) {
      try {
        const data = await authAPI.mockLogin({ phone })

        this.token = data.token
        this.userInfo = data.user

        // 保存到localStorage
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user_info', JSON.stringify(data.user))

        ElMessage.success('登录成功')

        // 跳转到Dashboard
        router.push('/')

        return true
      } catch (error) {
        console.error('登录失败:', error)
        return false
      }
    },

    /**
     * 退出登录
     */
    async logout() {
      try {
        await authAPI.logout()
      } catch (error) {
        console.error('退出登录失败:', error)
      } finally {
        // 清除本地数据
        this.token = ''
        this.userInfo = {}
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_info')

        ElMessage.success('已退出登录')
        router.push('/login')
      }
    },

    /**
     * 验证Token
     */
    async verifyToken() {
      if (!this.token) {
        return false
      }

      try {
        await authAPI.verifyToken()
        return true
      } catch (error) {
        // Token无效，清除本地数据
        this.token = ''
        this.userInfo = {}
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_info')
        return false
      }
    }
  }
})
