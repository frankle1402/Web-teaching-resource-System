<template>
  <div class="auth-redirect-container">
    <div class="loading-card">
      <div class="spinner"></div>
      <p class="loading-text">正在登录...</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

onMounted(async () => {
  try {
    // 从URL获取token和redirect参数
    const token = route.query.token
    const redirectPath = route.query.redirect || '/dashboard/home'

    if (token) {
      // 存储token到localStorage
      localStorage.setItem('auth_token', token)

      // 更新用户状态
      await userStore.fetchUserInfo()

      // 跳转到目标页面
      router.replace(redirectPath)
    } else {
      // 没有token，跳转到登录页
      router.replace('/login')
    }
  } catch (error) {
    console.error('认证重定向失败:', error)
    router.replace('/login')
  }
})
</script>

<style scoped>
.auth-redirect-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 20px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  color: #333;
  margin: 0;
}
</style>
