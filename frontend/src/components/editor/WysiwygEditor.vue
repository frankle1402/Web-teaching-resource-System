<template>
  <div class="wysiwyg-editor-container">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="wysiwyg">
            <el-icon><Edit /></el-icon> 可视化编辑
          </el-radio-button>
          <el-radio-button value="code">
            <el-icon><Document /></el-icon> HTML代码
          </el-radio-button>
          <el-radio-button value="preview">
            <el-icon><View /></el-icon> 预览
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="toolbar-center" v-show="viewMode === 'wysiwyg'">
        <el-button-group size="small">
          <el-button @click="execCommand('undo')" :icon="RefreshLeft" title="撤销 (Ctrl+Z)" />
          <el-button @click="execCommand('redo')" :icon="RefreshRight" title="重做 (Ctrl+Y)" />
        </el-button-group>
        <el-divider direction="vertical" />
        <el-button size="small" @click="showFavoriteDialog = true">
          <el-icon><Star /></el-icon> 插入收藏夹
        </el-button>
      </div>

      <div class="toolbar-right">
        <el-text type="info" size="small">{{ contentStats }}</el-text>
      </div>
    </div>

    <!-- 编辑区域 -->
    <div class="editor-body">
      <!-- 可视化编辑模式 (contenteditable iframe) -->
      <div v-show="viewMode === 'wysiwyg'" class="wysiwyg-pane">
        <iframe
          ref="editFrame"
          class="edit-frame"
          @load="onFrameLoad"
        ></iframe>
        <!-- 浮动工具栏 -->
        <FloatingToolbar
          v-if="showFloatingToolbar"
          :style="floatingToolbarStyle"
          :iframe-doc="iframeDoc"
          @format="handleFormat"
        />
      </div>

      <!-- 代码编辑模式 -->
      <div v-show="viewMode === 'code'" class="code-pane">
        <el-input
          v-model="localContent"
          type="textarea"
          :rows="20"
          placeholder="在此输入 HTML 代码..."
          class="code-textarea"
          @input="handleCodeChange"
        />
      </div>

      <!-- 纯预览模式 -->
      <div v-show="viewMode === 'preview'" class="preview-pane">
        <iframe
          ref="previewFrame"
          class="preview-frame"
          sandbox="allow-scripts allow-same-origin"
        ></iframe>
      </div>
    </div>

    <!-- 收藏夹插入对话框 -->
    <FavoriteInsertDialog
      v-model:visible="showFavoriteDialog"
      @insert="handleInsertFavorite"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { Edit, Document, View, RefreshLeft, RefreshRight, Star } from '@element-plus/icons-vue'
import FloatingToolbar from './FloatingToolbar.vue'
import FavoriteInsertDialog from './FavoriteInsertDialog.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

// 状态
const viewMode = ref('wysiwyg')
const localContent = ref(props.modelValue)
const editFrame = ref(null)
const previewFrame = ref(null)
const iframeDoc = ref(null)
const showFavoriteDialog = ref(false)

// 浮动工具栏状态
const showFloatingToolbar = ref(false)
const floatingToolbarStyle = ref({})

// 内容统计
const contentStats = computed(() => {
  const length = localContent.value?.length || 0
  const textContent = localContent.value?.replace(/<[^>]*>/g, '') || ''
  const words = textContent.length
  return `字符: ${length} | 文字: ${words}`
})

// 基础样式
const baseStyles = `
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      margin: 0;
      min-height: 100%;
    }
    body:focus { outline: none; }
    h1, h2, h3, h4 { margin: 1em 0 0.5em; font-weight: 600; }
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1.1em; }
    p { margin: 0.5em 0; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding-left: 1em; color: #666; }
    ul, ol { padding-left: 2em; margin: 0.5em 0; }
    a { color: #409eff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
`

// 初始化可编辑 iframe
const initEditableFrame = () => {
  if (!editFrame.value) return

  const iframe = editFrame.value
  const doc = iframe.contentDocument || iframe.contentWindow.document

  // 提取 body 内容
  let bodyContent = localContent.value || '<p>点击此处开始编辑...</p>'

  // 如果内容包含完整 HTML 结构，提取 body 部分
  const bodyMatch = bodyContent.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  if (bodyMatch) {
    bodyContent = bodyMatch[1]
  }

  // 写入可编辑内容
  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      ${baseStyles}
    </head>
    <body contenteditable="true">
      ${bodyContent}
    </body>
    </html>
  `)
  doc.close()

  iframeDoc.value = doc

  // 监听内容变化
  doc.body.addEventListener('input', handleContentChange)

  // 监听选区变化（用于浮动工具栏）
  doc.addEventListener('selectionchange', handleSelectionChange)

  // 监听鼠标抬起（用于显示浮动工具栏）
  doc.addEventListener('mouseup', handleMouseUp)

  // 监听键盘事件
  doc.addEventListener('keydown', handleKeyDown)
}

// 更新预览 iframe
const updatePreview = () => {
  if (!previewFrame.value) return

  const iframe = previewFrame.value
  const doc = iframe.contentDocument || iframe.contentWindow.document

  doc.open()
  doc.write(localContent.value || '<p style="padding: 20px; color: #999;">暂无内容</p>')
  doc.close()
}

// 内容变化处理
const handleContentChange = () => {
  if (!iframeDoc.value) return

  const bodyContent = iframeDoc.value.body.innerHTML
  let fullHtml = localContent.value

  // 检查是否是完整的 HTML 文档
  if (fullHtml.includes('<!DOCTYPE') || fullHtml.includes('<html')) {
    // 使用更健壮的方式替换 body 内容
    const bodyStartMatch = fullHtml.match(/<body[^>]*>/i)
    const bodyEndIndex = fullHtml.lastIndexOf('</body>')

    if (bodyStartMatch && bodyEndIndex > -1) {
      const bodyStartIndex = bodyStartMatch.index + bodyStartMatch[0].length
      fullHtml = fullHtml.substring(0, bodyStartIndex) + bodyContent + fullHtml.substring(bodyEndIndex)
    } else {
      fullHtml = bodyContent
    }
  } else {
    fullHtml = bodyContent
  }

  localContent.value = fullHtml
  emit('update:modelValue', fullHtml)
}

// 代码编辑变化处理
const handleCodeChange = () => {
  emit('update:modelValue', localContent.value)
}

// 选区变化处理
const handleSelectionChange = () => {
  if (!iframeDoc.value) return

  const selection = iframeDoc.value.getSelection()
  if (!selection || selection.isCollapsed) {
    showFloatingToolbar.value = false
  }
}

// 鼠标抬起处理（显示浮动工具栏）
const handleMouseUp = (e) => {
  if (!iframeDoc.value) return

  const selection = iframeDoc.value.getSelection()
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    showFloatingToolbar.value = false
    return
  }

  // 计算工具栏位置
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  const iframeRect = editFrame.value.getBoundingClientRect()

  floatingToolbarStyle.value = {
    position: 'absolute',
    left: `${rect.left + rect.width / 2}px`,
    top: `${iframeRect.top + rect.top - 50}px`,
    transform: 'translateX(-50%)',
    zIndex: 1000
  }

  showFloatingToolbar.value = true
}

// 键盘事件处理
const handleKeyDown = (e) => {
  // Ctrl+Z 撤销
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault()
    execCommand('undo')
  }
  // Ctrl+Y 重做
  if (e.ctrlKey && e.key === 'y') {
    e.preventDefault()
    execCommand('redo')
  }
  // 隐藏浮动工具栏
  showFloatingToolbar.value = false
}

// 执行编辑命令
const execCommand = (command, value = null) => {
  if (!iframeDoc.value) return
  iframeDoc.value.execCommand(command, false, value)
  handleContentChange()
}

// 处理格式化命令（来自浮动工具栏）
const handleFormat = (command, value) => {
  execCommand(command, value)
  showFloatingToolbar.value = false
}

// 插入收藏夹内容
const handleInsertFavorite = (html) => {
  if (!iframeDoc.value) return

  // 在光标位置插入内容
  iframeDoc.value.execCommand('insertHTML', false, html)
  handleContentChange()
}

// iframe 加载完成
const onFrameLoad = () => {
  initEditableFrame()
}

// 监听 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== localContent.value) {
    localContent.value = newValue
    if (viewMode.value === 'wysiwyg') {
      initEditableFrame()
    } else if (viewMode.value === 'preview') {
      updatePreview()
    }
  }
})

// 监听视图模式变化
watch(viewMode, (newMode, oldMode) => {
  nextTick(() => {
    if (newMode === 'wysiwyg') {
      // 从代码模式切换回来时，重新初始化
      if (oldMode === 'code') {
        initEditableFrame()
      }
    } else if (newMode === 'preview') {
      updatePreview()
    } else if (newMode === 'code') {
      // 从可视化模式切换到代码模式时，同步内容
      if (oldMode === 'wysiwyg' && iframeDoc.value) {
        handleContentChange()
      }
    }
    showFloatingToolbar.value = false
  })
})

// 初始化
onMounted(() => {
  nextTick(() => {
    initEditableFrame()
  })
})

// 清理
onUnmounted(() => {
  if (iframeDoc.value) {
    iframeDoc.value.body.removeEventListener('input', handleContentChange)
    iframeDoc.value.removeEventListener('selectionchange', handleSelectionChange)
    iframeDoc.value.removeEventListener('mouseup', handleMouseUp)
    iframeDoc.value.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<style scoped>
.wysiwyg-editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  position: relative;
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

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-center {
  flex: 1;
  justify-content: center;
}

.editor-body {
  min-height: 500px;
  position: relative;
}

.wysiwyg-pane,
.code-pane,
.preview-pane {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.edit-frame,
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
  min-height: 500px;
}

.code-textarea :deep(.el-textarea__inner):focus {
  box-shadow: none;
}
</style>
