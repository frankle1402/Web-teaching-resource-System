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
    userInfo: JSON.parse(localStorage.getItem('user_info') || '{}'),
    needCompleteProfile: false
  }),

  getters: {
    /**
     * 是否已登录
     */
    isLoggedIn: (state) => !!state.token && !!state.userInfo.id,

    /**
     * 是否为管理员
     */
    isAdmin: (state) => state.userInfo.role === 'admin',

    /**
     * 获取用户手机号
     */
    userPhone: (state) => state.userInfo.phone || '',

    /**
     * 获取用户ID
     */
    userId: (state) => state.userInfo.id || null,

    /**
     * 获取用户角色
     */
    userRole: (state) => state.userInfo.role || 'user',

    /**
     * 是否需要完善资料
     */
    isProfileIncomplete: (state) => !state.userInfo.profile_completed || state.userInfo.profile_completed === 0
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
        router.push('/dashboard')

        return true
      } catch (error) {
        console.error('登录失败:', error)
        return false
      }
    },

    /**
     * 验证码登录
     */
    async loginWithCode(phone, code) {
      try {
        const data = await authAPI.loginWithCode({ phone, code })

        this.token = data.token
        this.userInfo = data.user
        this.needCompleteProfile = data.needCompleteProfile || false

        // 保存到localStorage
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user_info', JSON.stringify(data.user))

        ElMessage.success('登录成功')

        // 根据是否需要完善资料决定跳转
        if (this.needCompleteProfile) {
          router.push('/complete-profile')
        } else {
          router.push('/dashboard')
        }

        return true
      } catch (error) {
        console.error('登录失败:', error)
        return false
      }
    },

    /**
     * 完善用户资料
     */
    async completeProfile(profileData) {
      try {
        const data = await authAPI.completeProfile(profileData)

        this.userInfo = data.user
        this.needCompleteProfile = false

        localStorage.setItem('user_info', JSON.stringify(data.user))

        ElMessage.success('资料完善成功')
        router.push('/dashboard')

        return true
      } catch (error) {
        console.error('完善资料失败:', error)
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
        this.needCompleteProfile = false
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_info')

        ElMessage.success('已退出登录')

        // 使用 window.location.href 确保跳转
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
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
        const result = await authAPI.verifyToken()
        // 更新用户信息（确保获取最新的role）
        if (result.user) {
          this.userInfo = result.user
          localStorage.setItem('user_info', JSON.stringify(result.user))
        }
        return true
      } catch (error) {
        // Token无效，清除本地数据
        this.token = ''
        this.userInfo = {}
        this.needCompleteProfile = false
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_info')
        return false
      }
    }
  }
})
