<template>
  <div class="login-embed">
    <UnifiedLoginForm
      :show-header="true"
      title="登录后开始学习"
      subtitle="登录后可记录学习时长，查看学习进度"
      :show-explore-entry="false"
      :compact="true"
      :on-success="handleLoginSuccess"
    />

    <!-- 游客模式按钮 -->
    <div class="guest-section">
      <div class="divider">
        <span class="divider-line"></span>
        <span class="divider-text">或</span>
        <span class="divider-line"></span>
      </div>
      <button class="guest-btn" @click="handleGuestMode">
        游客模式浏览（不记录时长）
      </button>
    </div>
  </div>
</template>

<script setup>
import UnifiedLoginForm from '@/components/common/UnifiedLoginForm.vue'

// 登录成功后通知父窗口
const handleLoginSuccess = () => {
  // 通过 postMessage 通知父窗口登录成功
  if (window.parent !== window) {
    const token = localStorage.getItem('auth_token')
    const userInfo = localStorage.getItem('user_info')
    window.parent.postMessage({
      type: 'LOGIN_SUCCESS',
      token,
      userInfo: userInfo ? JSON.parse(userInfo) : null
    }, '*')
  }
}

// 游客模式
const handleGuestMode = () => {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'GUEST_MODE' }, '*')
  }
}
</script>

<script>
export default {
  name: 'LoginEmbed'
}
</script>

<style scoped>
.login-embed {
  padding: 24px;
  background: white;
}

.guest-section {
  margin-top: 20px;
}

.divider {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.divider-text {
  padding: 0 12px;
  font-size: 13px;
  color: #9ca3af;
}

.guest-btn {
  width: 100%;
  height: 44px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 15px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.guest-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}
</style>
