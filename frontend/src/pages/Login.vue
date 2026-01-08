<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">教学资源生成与管理系统</h1>
        <p class="login-subtitle">面向医卫类教师的智能化资源创作平台</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="phone">
          <el-input
            v-model="loginForm.phone"
            placeholder="请输入手机号"
            size="large"
            :prefix-icon="Cellphone"
            maxlength="11"
            show-word-limit
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-button"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>

        <div class="login-tips">
          <el-icon><InfoFilled /></el-icon>
          <span>MVP阶段：输入任意手机号即可登录</span>
        </div>
      </el-form>

      <!-- 资源中心入口 -->
      <div class="explore-entry">
        <div class="entry-divider">
          <span>或</span>
        </div>
        <el-button
          class="explore-button"
          @click="goToExplore"
        >
          <el-icon><Collection /></el-icon>
          浏览教学资源中心
        </el-button>
        <p class="entry-hint">无需登录，免费浏览优质教学资源</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { Cellphone, InfoFilled, Collection } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 表单引用
const loginFormRef = ref(null)

// 登录表单
const loginForm = reactive({
  phone: ''
})

// 加载状态
const loading = ref(false)

// 表单验证规则
const loginRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号格式',
      trigger: 'blur'
    }
  ]
}

/**
 * 处理登录
 */
const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return

    loading.value = true

    const success = await userStore.login(loginForm.phone)

    if (success) {
      // 登录成功，路由会自动跳转
    }
  } catch (error) {
    console.error('登录失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 跳转到资源中心
 */
const goToExplore = () => {
  router.push('/explore')
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #38bdf8 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 48px 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-title {
  font-size: 26px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.login-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.login-form {
  width: 100%;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
  border: none;
  margin-top: 8px;
}

.login-button:hover {
  background: linear-gradient(135deg, #0284c7 0%, #0284c7 100%);
}

.login-tips {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 20px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 6px;
  color: #0369a1;
  font-size: 13px;
}

.login-tips .el-icon {
  font-size: 16px;
}

/* 资源中心入口 */
.explore-entry {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #e2e8f0;
}

.entry-divider {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.entry-divider::before,
.entry-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.entry-divider span {
  padding: 0 16px;
  font-size: 14px;
  color: #94a3b8;
}

.explore-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  border: 2px solid #3b82f6;
  color: #3b82f6;
  background: white;
  border-radius: 8px;
  transition: all 0.3s;
}

.explore-button:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.entry-hint {
  text-align: center;
  margin-top: 12px;
  font-size: 13px;
  color: #94a3b8;
}
</style>
