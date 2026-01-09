<template>
  <el-dialog
    v-model="dialogVisible"
    :title="resource?.title || '资源预览'"
    width="90%"
    :fullscreen="isFullscreen"
    destroy-on-close
    @close="handleClose"
  >
    <template #header>
      <div class="dialog-header">
        <span class="header-title">{{ resource?.title }}</span>
        <el-button
          :icon="isFullscreen ? Crop : FullScreen"
          circle
          size="small"
          @click="isFullscreen = !isFullscreen"
        />
      </div>
    </template>

    <div v-loading="loading" class="preview-content">
      <iframe
        v-if="htmlContent"
        :srcdoc="htmlContent"
        class="preview-iframe"
        sandbox="allow-same-origin allow-scripts"
      />
      <el-empty v-else description="无法加载预览" />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { FullScreen, Crop } from '@element-plus/icons-vue'
import { resourceAPI } from '@/api/resource'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  resource: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const htmlContent = ref('')
const isFullscreen = ref(false)

const loadResourceContent = async () => {
  if (!props.resource) return

  loading.value = true
  try {
    const response = await resourceAPI.getById(props.resource.id)
    if (response.content_html) {
      htmlContent.value = response.content_html
    } else {
      htmlContent.value = ''
    }
  } catch (error) {
    console.error('加载资源内容失败:', error)
    htmlContent.value = ''
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  htmlContent.value = ''
  isFullscreen.value = false
}

watch(() => props.modelValue, (val) => {
  if (val) {
    loadResourceContent()
  }
})
</script>

<style scoped>
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 20px;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-content {
  height: 70vh;
  min-height: 400px;
}

.preview-content:fullscreen {
  height: 100vh;
  min-height: 100vh;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
  border-radius: 4px;
}

:deep(.el-dialog.is-fullscreen) .preview-content {
  height: calc(100vh - 120px);
  min-height: calc(100vh - 120px);
}
</style>
