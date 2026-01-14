<template>
  <div class="login-card">
    <UnifiedLoginForm
      :show-header="true"
      title="欢迎登录"
      subtitle="医教智创 - 智能医学教育平台"
      :show-explore-entry="true"
      :show-explore-hint="false"
    />
  </div>
</template>

<script setup>
import UnifiedLoginForm from '@/components/common/UnifiedLoginForm.vue'
</script>

<script>
export default {
  name: 'LoginForm'
}
</script>

<style scoped>
.login-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}
</style>
