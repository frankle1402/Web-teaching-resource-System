<template>
  <div class="html-editor-container">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <el-radio-group v-model="viewMode" size="small">
        <el-radio-button label="preview">
          <el-icon><View /></el-icon> 预览模式
        </el-radio-button>
        <el-radio-button label="code">
          <el-icon><Document /></el-icon> HTML代码
        </el-radio-button>
        <el-radio-button label="split">
          <el-icon><CopyDocument /></el-icon> 分屏
        </el-radio-button>
      </el-radio-group>

      <div class="toolbar-info">
        <el-text type="info" size="small">
          {{ contentStats }}
        </el-text>
      </div>
    </div>

    <!-- 编辑区域 -->
    <div class="editor-body" :class="`view-${viewMode}`">
      <!-- 预览模式 (iframe) -->
      <div v-show="viewMode === 'preview' || viewMode === 'split'" class="preview-pane">
        <iframe
          ref="previewFrame"
          class="preview-frame"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        ></iframe>
      </div>

      <!-- 代码编辑模式 -->
      <div v-show="viewMode === 'code' || viewMode === 'split'" class="code-pane">
        <el-input
          v-model="localContent"
          type="textarea"
          :rows="20"
          placeholder="在此输入 HTML 代码..."
          class="code-textarea"
          @input="handleCodeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { View, Document, CopyDocument } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const viewMode = ref('preview')
const localContent = ref(props.modelValue)
const previewFrame = ref(null)

// 内容统计
const contentStats = computed(() => {
  const length = localContent.value?.length || 0
  const words = localContent.value?.replace(/<[^>]*>/g, '').length || 0
  return `字符: ${length} | 内容: ${words}`
})

// 更新预览
const updatePreview = () => {
  if (!previewFrame.value) return

  const iframe = previewFrame.value
  const doc = iframe.contentDocument || iframe.contentWindow.document

  // 设置 iframe 内容
  doc.open()
  doc.write(localContent.value || '<p style="padding: 20px; color: #999;">暂无内容</p>')
  doc.close()

  // 设置 iframe 样式
  iframe.style.height = '100%'
}

// 代码变化处理
const handleCodeChange = () => {
  emit('update:modelValue', localContent.value)
  if (viewMode.value === 'preview') {
    updatePreview()
  }
}

// 监听 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== localContent.value) {
    localContent.value = newValue
    updatePreview()
  }
})

// 监听视图模式变化
watch(viewMode, () => {
  nextTick(() => {
    if (viewMode.value === 'preview' || viewMode.value === 'split') {
      updatePreview()
    }
  })
})

// 初始化
onMounted(() => {
  updatePreview()
})
</script>

<style scoped>
.html-editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.editor-toolbar {
  padding: 10px 15px;
  border-bottom: 1px solid #dcdfe6;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor-body {
  display: flex;
  min-height: 500px;
}

.editor-body.view-preview .preview-pane {
  width: 100%;
}

.editor-body.view-code .code-pane {
  width: 100%;
}

.editor-body.view-split .preview-pane,
.editor-body.view-split .code-pane {
  width: 50%;
}

.preview-pane {
  position: relative;
  background: #fff;
}

.preview-frame {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: none;
  display: block;
}

.code-pane {
  background: #f8f9fa;
}

.code-textarea {
  width: 100%;
  height: 100%;
}

.code-textarea :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  border: none;
  border-radius: 0;
  resize: none;
  background: transparent;
}

.code-textarea :deep(.el-textarea__inner):focus {
  box-shadow: none;
}
</style>
