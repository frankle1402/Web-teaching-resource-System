<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">教学资源生成与管理系统</h1>
        <p class="login-subtitle">面向医卫类教师的智能化资源创作平台</p>
      </div>

      <el-tabs v-model="loginMode" class="login-tabs">
        <!-- 扫码登录 -->
        <el-tab-pane label="扫码登录" name="qrcode">
          <div class="qrcode-container">
            <div class="qrcode-wrapper">
              <div class="qrcode-placeholder">
                <el-icon :size="80"><Grid /></el-icon>
                <p class="qrcode-hint">微信扫码登录功能开发中</p>
                <p class="qrcode-sub-hint">请使用验证码登录方式</p>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 验��码登录 -->
        <el-tab-pane label="验证码登录" name="code">
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
                maxlength="11"
                :prefix-icon="Cellphone"
              >
                <template #append>
                  <el-button
                    :disabled="countdown > 0 || !loginForm.phone"
                    :loading="sendingCode"
                    @click="handleSendCode"
                  >
                    {{ countdown > 0 ? `${countdown}秒` : '发送验证码' }}
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item prop="code">
              <el-input
                v-model="loginForm.code"
                placeholder="请输入验证码"
                size="large"
                maxlength="6"
                :prefix-icon="Key"
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
          </el-form>
        </el-tab-pane>
      </el-tabs>

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
import { Cellphone, Key, Collection, Grid } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { authAPI } from '@/api/auth'

const router = useRouter()
const userStore = useUserStore()

// 登录方式：qrcode 或 code，默认使用验证码登录
const loginMode = ref('code')
const loginFormRef = ref(null)

// 登录表单
const loginForm = reactive({
  phone: '',
  code: ''
})

// 加载状态
const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)

// 表单验证规则
const loginRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号格式',
      trigger: 'blur'
    }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    {
      pattern: /^\d{6}$/,
      message: '验证码为6位数字',
      trigger: 'blur'
    }
  ]
}

/**
 * 发送验证码
 */
const handleSendCode = async () => {
  // 验证手机号
  if (!loginForm.phone || !/^1[3-9]\d{9}$/.test(loginForm.phone)) {
    loginFormRef.value?.validateField('phone')
    return
  }

  sendingCode.value = true

  try {
    const result = await authAPI.sendCode({ phone: loginForm.phone })

    // 弹窗显示验证码（模拟短信）
    await ElMessageBox.alert(
      `您的验证码是：<strong style="font-size: 24px; color: #409eff;">${result.code}</strong><br/>有效期5分钟`,
      '验证码',
      {
        confirmButtonText: '确定',
        dangerouslyUseHTMLString: true,
        customClass: 'verification-code-dialog'
      }
    )

    // 开始倒计时
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (error) {
    // 用户取消或错误
    if (error !== 'cancel') {
      console.error('发送验证码失败:', error)
    }
  } finally {
    sendingCode.value = false
  }
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

    const result = await userStore.loginWithCode(loginForm.phone, loginForm.code)

    if (result.isNewUser) {
      // 新用户跳转到注册页面，携带手机号和验证码
      ElMessage.info('检测到新用户，请完成注册')
      router.push({
        path: '/register',
        query: {
          phone: result.phone,
          code: result.code
        }
      })
    } else if (!result.success) {
      loading.value = false
    }
    // 登录成功会自动跳转
  } catch (error) {
    console.error('登录失败:', error)
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

<script>
export default {
  name: 'LoginPage'
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
  max-width: 450px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
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

.login-tabs {
  width: 100%;
}

.login-tabs :deep(.el-tabs__header) {
  margin-bottom: 24px;
}

.login-tabs :deep(.el-tabs__item) {
  font-size: 16px;
}

.login-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

/* 扫码登录样式 */
.qrcode-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 280px;
}

.qrcode-wrapper {
  width: 200px;
  height: 200px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}

.qrcode-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  padding: 20px;
  text-align: center;
}

.qrcode-placeholder .el-icon {
  margin-bottom: 12px;
  color: #94a3b8;
}

.qrcode-hint {
  font-size: 14px;
  margin: 0 0 8px 0;
}

.qrcode-sub-hint {
  font-size: 12px;
  margin: 0;
  color: #94a3b8;
}

/* 表单样式 */
.login-form {
  width: 100%;
}

.login-form :deep(.el-input-group__append) {
  padding: 0;
  background: transparent;
}

.login-form :deep(.el-input-group__append .el-button) {
  border: none;
  border-left: 1px solid #dcdfe6;
  border-radius: 0;
  background: #f5f7fa;
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

<style>
.verification-code-dialog {
  width: 300px !important;
}

.verification-code-dialog .el-message-box__content {
  padding: 20px !important;
}
</style>
