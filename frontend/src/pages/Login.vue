<template>
  <div class="login-container">
    <div class="login-card">
      <UnifiedLoginForm
        :show-header="true"
        title="教学资源生成与管理系统"
        subtitle="面向医卫类教师的智能化资源创作平台"
        :show-explore-entry="true"
        :show-explore-hint="true"
      />
    </div>
  </div>
</template>

<script setup>
import UnifiedLoginForm from '@/components/common/UnifiedLoginForm.vue'
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

/* 覆盖通用组件样式以适配登录页 */
.login-card :deep(.login-title) {
  font-size: 26px;
}

.login-card :deep(.login-subtitle) {
  font-size: 14px;
}

.login-card :deep(.login-header) {
  margin-bottom: 32px;
}

.login-card :deep(.login-tabs .el-tabs__header) {
  margin-bottom: 24px;
}

.login-card :deep(.login-tabs .el-tabs__item) {
  font-size: 16px;
}

.login-card :deep(.qrcode-container) {
  min-height: 280px;
}

.login-card :deep(.qrcode-wrapper) {
  width: 200px;
  height: 200px;
}

.login-card :deep(.explore-entry) {
  margin-top: 32px;
  padding-top: 32px;
}

.login-card :deep(.entry-divider) {
  margin-bottom: 20px;
}

.login-card :deep(.explore-button) {
  height: 48px;
  font-size: 16px;
}

.login-card :deep(.login-button) {
  font-size: 16px;
}
</style>
