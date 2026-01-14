<template>
  <el-dialog
    v-model="visible"
    :title="null"
    width="420px"
    :close-on-click-modal="false"
    :show-close="true"
    class="login-dialog"
    @close="handleClose"
  >
    <UnifiedLoginForm
      :show-header="true"
      title="登录"
      subtitle="登录后继续操作"
      :show-explore-entry="false"
      :compact="true"
      @success="handleSuccess"
    />
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import UnifiedLoginForm from './UnifiedLoginForm.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success', 'close'])

const visible = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleSuccess = () => {
  visible.value = false
  emit('success')
}

const handleClose = () => {
  emit('close')
}
</script>

<script>
export default {
  name: 'LoginDialog'
}
</script>

<style scoped>
.login-dialog :deep(.el-dialog__header) {
  padding: 0;
  margin: 0;
}

.login-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.login-dialog :deep(.el-dialog__headerbtn) {
  top: 12px;
  right: 12px;
  z-index: 10;
}
</style>
