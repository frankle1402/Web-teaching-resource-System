<template>
  <div class="grapes-editor-wrapper">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <el-button-group>
        <el-button @click="undo" :disabled="!canUndo" size="small">
          <el-icon><RefreshLeft /></el-icon>
        </el-button>
        <el-button @click="redo" :disabled="!canRedo" size="small">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <!-- 设备预览 -->
      <el-button-group>
        <el-button @click="setDevice('Desktop')" :type="device === 'Desktop' ? 'primary' : ''" size="small">
          <el-icon><Monitor /></el-icon>
        </el-button>
        <el-button @click="setDevice('Tablet')" :type="device === 'Tablet' ? 'primary' : ''" size="small">
          <el-icon><Iphone /></el-icon>
        </el-button>
        <el-button @click="setDevice('Mobile')" :type="device === 'Mobile' ? 'primary' : ''" size="small">
          <el-icon><Cellphone /></el-icon>
        </el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button @click="toggleCode" size="small">
        <el-icon><Edit /></el-icon>
        {{ showCode ? '可视化' : '源代码' }}
      </el-button>

      <el-button @click="exportHTML" size="small">
        <el-icon><Download /></el-icon>
        导出
      </el-button>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-main" :style="{ height: height + 'px' }">
      <!-- 左侧组件面板 -->
      <div class="editor-sidebar" v-show="!showCode">
        <el-tabs v-model="activeTab" class="sidebar-tabs">
          <el-tab-pane label="组件" name="blocks">
            <div id="blocks-container" class="panel-content"></div>
          </el-tab-pane>
          <el-tab-pane label="图层" name="layers">
            <div id="layers-container" class="panel-content"></div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 画布区域 -->
      <div class="editor-canvas" v-show="!showCode">
        <div id="gjs"></div>
      </div>

      <!-- 右侧样式面板 -->
      <div class="editor-styles" v-show="!showCode">
        <el-tabs v-model="styleTab" class="sidebar-tabs">
          <el-tab-pane label="样式" name="styles">
            <div id="styles-container" class="panel-content"></div>
          </el-tab-pane>
          <el-tab-pane label="属性" name="traits">
            <div id="traits-container" class="panel-content"></div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 代码编辑器 -->
      <div class="code-editor" v-show="showCode">
        <el-tabs v-model="codeTab">
          <el-tab-pane label="HTML" name="html">
            <el-input v-model="htmlCode" type="textarea" :rows="20" placeholder="HTML 代码" />
          </el-tab-pane>
          <el-tab-pane label="CSS" name="css">
            <el-input v-model="cssCode" type="textarea" :rows="20" placeholder="CSS 样式" />
          </el-tab-pane>
        </el-tabs>
        <div class="code-actions">
          <el-button type="primary" @click="applyCode">应用代码</el-button>
          <el-button @click="showCode = false">取消</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import grapesjs from 'grapesjs'
import gjsPresetWebpage from 'grapesjs-preset-webpage'
import gjsBlocksBootstrap4 from 'grapesjs-blocks-bootstrap4'
import gjsPluginForms from 'grapesjs-plugin-forms'
import { RefreshLeft, RefreshRight, Monitor, Iphone, Cellphone, Edit, Download } from '@element-plus/icons-vue'

// 引入 GrapesJS 样式
import 'grapesjs/dist/css/grapes.min.css'

const props = defineProps({
  modelValue: { type: String, default: '' },
  height: { type: Number, default: 600 }
})

const emit = defineEmits(['update:modelValue', 'init'])

// 状态
const editor = ref(null)
const device = ref('Desktop')
const showCode = ref(false)
const activeTab = ref('blocks')
const styleTab = ref('styles')
const codeTab = ref('html')
const htmlCode = ref('')
const cssCode = ref('')
const canUndo = ref(false)
const canRedo = ref(false)

// 受保护的 CSS（教学资源设计系统）
const protectedCss = `
/* 覆盖 GrapesJS 默认的白色背景 */
body {
  background-color: #0B1220 !important;
  margin: 0;
  padding: 0;
}

/* 教学资源容器样式 - 受保护 */
.tr-resource-container {
  --c-primary: #2563EB;
  --c-accent: #F97316;
  --c-success: #22C55E;
  --c-warning: #F59E0B;
  --c-danger: #EF4444;
  --c-bg: #0B1220;
  --c-surface: #111A2E;
  --c-border: rgba(255,255,255,0.10);
  --c-text: rgba(255,255,255,0.92);
  --c-muted: rgba(255,255,255,0.70);
  --radius: 16px;
  --shadow: 0 10px 30px rgba(0,0,0,0.35);
  font-family: "PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui;
  line-height: 1.6;
  background-color: var(--c-bg);
  color: var(--c-text);
  min-height: 100vh;
}
`

onMounted(() => {
  initEditor()
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})

const initEditor = () => {
  // 将 CSS 变量转换为 data URI，注入到 canvas iframe 中
  const cssDataUri = `data:text/css;charset=utf-8,${encodeURIComponent(protectedCss)}`

  editor.value = grapesjs.init({
    container: '#gjs',
    height: '100%',
    width: 'auto',
    fromElement: false,

    // 存储配置
    storageManager: false,

    // 画布配置
    canvas: {
      styles: [
        cssDataUri,  // 先注入 CSS 变量，确保深色主题生效
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css'
      ],
      scripts: [
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
      ]
    },

    // 面板配置
    panels: { defaults: [] },

    // 块管理器
    blockManager: {
      appendTo: '#blocks-container'
    },

    // 图层管理器
    layerManager: {
      appendTo: '#layers-container'
    },

    // 样式管理器
    styleManager: {
      appendTo: '#styles-container',
      sectors: [
        {
          name: '布局',
          open: true,
          properties: ['display', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'gap']
        },
        {
          name: '尺寸',
          properties: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'padding', 'margin']
        },
        {
          name: '排版',
          properties: ['font-family', 'font-size', 'font-weight', 'line-height', 'text-align', 'color']
        },
        {
          name: '装饰',
          properties: ['background-color', 'background', 'border', 'border-radius', 'box-shadow']
        }
      ]
    },

    // 特征管理器
    traitManager: {
      appendTo: '#traits-container'
    },

    // 设备管理器
    deviceManager: {
      devices: [
        { name: 'Desktop', width: '' },
        { name: 'Tablet', width: '768px', widthMedia: '992px' },
        { name: 'Mobile', width: '375px', widthMedia: '480px' }
      ]
    },

    // 插件
    plugins: [
      gjsPresetWebpage,
      gjsBlocksBootstrap4,
      gjsPluginForms
    ],

    pluginsOpts: {
      [gjsBlocksBootstrap4]: {
        blocks: {
          container: true,
          row: true,
          column: true,
          button: true,
          button_group: true,
          card: true,
          alert: true,
          tabs: true,
          collapse: true,
          image: true,
          video: true
        },
        blockCategories: {
          container: 'Bootstrap 布局',
          components: 'Bootstrap 组件'
        }
      }
    },

    // 受保护的 CSS
    protectedCss: protectedCss
  })

  // 注册自定义教学组件块
  registerTeachingBlocks()
  registerQuizBlocks()

  // 加载初始内容
  if (props.modelValue) {
    loadContent(props.modelValue)
  }

  // 监听变化
  editor.value.on('change:changesCount', () => {
    const html = editor.value.getHtml()
    const css = editor.value.getCss()
    emit('update:modelValue', wrapContent(html, css))
    updateUndoRedo()
  })

  emit('init', editor.value)
}

// 注册教学组件块
const registerTeachingBlocks = () => {
  const bm = editor.value.BlockManager

  // 知识点卡片
  bm.add('knowledge-card', {
    label: '知识点卡片',
    category: '教学组件',
    content: `
      <div class="content-card" style="background: #111A2E; border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 24px; margin: 16px 0;">
        <h4 style="color: #2563EB; margin-bottom: 16px;">
          <span style="margin-right: 8px;">📚</span>知识点标题
        </h4>
        <p style="color: rgba(255,255,255,0.92);">在此输入知识点内容...</p>
      </div>
    `,
    attributes: { class: 'gjs-block-knowledge' }
  })

  // 警告提示框
  bm.add('alert-box', {
    label: '警告提示',
    category: '教学组件',
    content: `
      <div class="alert-box" style="background: rgba(245,158,11,0.15); border: 1px solid #F59E0B; border-radius: 16px; padding: 16px; margin: 16px 0;">
        <strong style="color: #F59E0B;">⚠️ 注意事项</strong>
        <p style="color: rgba(255,255,255,0.92); margin-top: 8px;">在此输入警告内容...</p>
      </div>
    `,
    attributes: { class: 'gjs-block-alert' }
  })

  // 成功提示框
  bm.add('success-box', {
    label: '成功提示',
    category: '教学组件',
    content: `
      <div class="success-box" style="background: rgba(34,197,94,0.15); border: 1px solid #22C55E; border-radius: 16px; padding: 16px; margin: 16px 0;">
        <strong style="color: #22C55E;">✅ 要点提示</strong>
        <p style="color: rgba(255,255,255,0.92); margin-top: 8px;">在此输入要点内容...</p>
      </div>
    `,
    attributes: { class: 'gjs-block-success' }
  })

  // 操作步骤
  bm.add('step-list', {
    label: '操作步骤',
    category: '教学组件',
    content: `
      <div class="step-container" style="margin: 20px 0;">
        <h5 style="color: rgba(255,255,255,0.92); margin-bottom: 16px;">操作步骤</h5>
        <div class="step-item" style="display: flex; gap: 16px; margin-bottom: 12px;">
          <span style="width: 32px; height: 32px; background: #2563EB; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</span>
          <div style="flex: 1;">
            <strong style="color: rgba(255,255,255,0.92);">步骤标题</strong>
            <p style="color: rgba(255,255,255,0.70); margin-top: 4px;">步骤描述...</p>
          </div>
        </div>
        <div class="step-item" style="display: flex; gap: 16px; margin-bottom: 12px;">
          <span style="width: 32px; height: 32px; background: #2563EB; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</span>
          <div style="flex: 1;">
            <strong style="color: rgba(255,255,255,0.92);">步骤标题</strong>
            <p style="color: rgba(255,255,255,0.70); margin-top: 4px;">步骤描述...</p>
          </div>
        </div>
      </div>
    `,
    attributes: { class: 'gjs-block-steps' }
  })

  // 视频占位符
  bm.add('video-placeholder', {
    label: '视频占位',
    category: '教学组件',
    content: `
      <div class="video-placeholder" style="width: 100%; aspect-ratio: 16/9; background: #111A2E; border: 2px dashed rgba(255,255,255,0.10); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 20px 0;">
        <div style="text-align: center; color: rgba(255,255,255,0.70);">
          <div style="font-size: 48px; margin-bottom: 8px;">🎬</div>
          <p>视频占位区域</p>
          <small>请在此处嵌入视频代码</small>
        </div>
      </div>
    `,
    attributes: { class: 'gjs-block-video' }
  })

  // 图片画廊
  bm.add('image-gallery', {
    label: '图片画廊',
    category: '教学组件',
    content: `
      <div class="image-gallery" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 20px 0;">
        <div class="gallery-item" style="aspect-ratio: 4/3; background: #111A2E; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.70);">
          <span>图片 1</span>
        </div>
        <div class="gallery-item" style="aspect-ratio: 4/3; background: #111A2E; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.70);">
          <span>图片 2</span>
        </div>
      </div>
    `,
    attributes: { class: 'gjs-block-gallery' }
  })
}

// 注册测验组件块
const registerQuizBlocks = () => {
  const bm = editor.value.BlockManager

  // 单选题
  bm.add('quiz-choice', {
    label: '单选题',
    category: '测验组件',
    content: `
      <div class="quiz-card" style="background: #111A2E; border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 24px; margin: 20px 0;">
        <h5 style="color: rgba(255,255,255,0.92); margin-bottom: 16px;">📝 随堂测验</h5>
        <p style="color: rgba(255,255,255,0.92); margin-bottom: 16px;">题目内容...</p>
        <div class="quiz-options">
          <button class="quiz-option" style="display: block; width: 100%; text-align: left; padding: 12px 16px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); border-radius: 8px; color: rgba(255,255,255,0.92); cursor: pointer;">
            A. 选项内容
          </button>
          <button class="quiz-option" style="display: block; width: 100%; text-align: left; padding: 12px 16px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); border-radius: 8px; color: rgba(255,255,255,0.92); cursor: pointer;">
            B. 选项内容
          </button>
          <button class="quiz-option" style="display: block; width: 100%; text-align: left; padding: 12px 16px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); border-radius: 8px; color: rgba(255,255,255,0.92); cursor: pointer;">
            C. 选项内容
          </button>
          <button class="quiz-option" style="display: block; width: 100%; text-align: left; padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); border-radius: 8px; color: rgba(255,255,255,0.92); cursor: pointer;">
            D. 选项内容
          </button>
        </div>
      </div>
    `,
    attributes: { class: 'gjs-block-quiz' }
  })

  // 判断题
  bm.add('quiz-judge', {
    label: '判断题',
    category: '测验组件',
    content: `
      <div class="quiz-card" style="background: #111A2E; border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 24px; margin: 20px 0;">
        <h5 style="color: rgba(255,255,255,0.92); margin-bottom: 16px;">✅ 判断题</h5>
        <p style="color: rgba(255,255,255,0.92); margin-bottom: 16px;">判断题内容...</p>
        <div style="display: flex; gap: 16px;">
          <button style="flex: 1; padding: 12px; background: rgba(34,197,94,0.15); border: 1px solid #22C55E; border-radius: 8px; color: #22C55E; cursor: pointer;">
            ✓ 正确
          </button>
          <button style="flex: 1; padding: 12px; background: rgba(239,68,68,0.15); border: 1px solid #EF4444; border-radius: 8px; color: #EF4444; cursor: pointer;">
            ✗ 错误
          </button>
        </div>
      </div>
    `,
    attributes: { class: 'gjs-block-judge' }
  })

  // 折叠问答
  bm.add('collapse-qa', {
    label: '折叠问答',
    category: '测验组件',
    content: `
      <div class="accordion" style="margin: 20px 0;">
        <div class="accordion-item" style="background: #111A2E; border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; overflow: hidden;">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse1" style="background: #111A2E; color: rgba(255,255,255,0.92);">
              💡 点击查看答案：问题内容
            </button>
          </h2>
          <div id="collapse1" class="accordion-collapse collapse">
            <div class="accordion-body" style="color: rgba(255,255,255,0.92); padding: 16px;">
              答案内容...
            </div>
          </div>
        </div>
      </div>
    `,
    attributes: { class: 'gjs-block-collapse' }
  })
}

// 加载内容
const loadContent = (content) => {
  if (!editor.value || !content) return

  // 解析完整 HTML
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/html')

  // 提取 body 内容
  let bodyContent = doc.body.innerHTML

  // 如果没有 body 标签，直接使用内容
  if (!bodyContent || bodyContent.trim() === '') {
    bodyContent = content
  }

  // 提取 style 标签内容
  const styles = Array.from(doc.querySelectorAll('style'))
    .map(s => s.textContent)
    .join('\n')

  // 设置内容
  editor.value.setComponents(bodyContent)

  // 总是添加 protectedCss，确保 CSS 变量可用
  editor.value.setStyle(protectedCss + '\n' + styles)
}

// 包装内容为完整 HTML
const wrapContent = (html, css) => {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>教学资源</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
${css}
  </style>
</head>
<body>
  <div class="tr-resource-container">
${html}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"><\/script>
</body>
</html>`
}

// 工具方法
const undo = () => editor.value?.UndoManager.undo()
const redo = () => editor.value?.UndoManager.redo()
const setDevice = (d) => {
  device.value = d
  editor.value?.setDevice(d)
}
const updateUndoRedo = () => {
  canUndo.value = editor.value?.UndoManager.hasUndo()
  canRedo.value = editor.value?.UndoManager.hasRedo()
}

const toggleCode = () => {
  if (!showCode.value) {
    htmlCode.value = editor.value.getHtml()
    cssCode.value = editor.value.getCss()
  }
  showCode.value = !showCode.value
}

const applyCode = () => {
  editor.value.setComponents(htmlCode.value)
  editor.value.setStyle(cssCode.value)
  showCode.value = false
}

const exportHTML = () => {
  const html = editor.value.getHtml()
  const css = editor.value.getCss()
  const fullHtml = wrapContent(html, css)

  const blob = new Blob([fullHtml], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'teaching-resource.html'
  a.click()
  URL.revokeObjectURL(url)
}

// 监听外部值变化
watch(() => props.modelValue, (newVal, oldVal) => {
  if (editor.value && newVal && newVal !== oldVal) {
    const currentHtml = editor.value.getHtml()
    // 避免循环更新
    if (!newVal.includes(currentHtml)) {
      loadContent(newVal)
    }
  }
})

// 暴露方法
defineExpose({
  getEditor: () => editor.value,
  getHtml: () => editor.value?.getHtml(),
  getCss: () => editor.value?.getCss(),
  setContent: loadContent
})
</script>

<style scoped>
.grapes-editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid #dcdfe6;
  background: #f5f7fa;
}

.editor-main {
  display: flex;
  overflow: hidden;
}

.editor-sidebar {
  width: 220px;
  border-right: 1px solid #dcdfe6;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-canvas {
  flex: 1;
  overflow: hidden;
}

.editor-styles {
  width: 260px;
  border-left: 1px solid #dcdfe6;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.sidebar-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow-y: auto;
}

.panel-content {
  padding: 8px;
}

.code-editor {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.code-editor :deep(.el-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.code-editor :deep(.el-tabs__content) {
  flex: 1;
}

.code-editor :deep(.el-tab-pane) {
  height: 100%;
}

.code-editor :deep(.el-textarea) {
  height: 100%;
}

.code-editor :deep(.el-textarea__inner) {
  height: 100% !important;
  font-family: Monaco, Menlo, monospace;
  font-size: 13px;
}

.code-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* GrapesJS 样式覆盖 */
:deep(.gjs-one-bg) {
  background-color: #f5f7fa;
}

:deep(.gjs-two-color) {
  color: #303133;
}

:deep(.gjs-three-bg) {
  background-color: #fff;
}

:deep(.gjs-four-color) {
  color: #606266;
}

:deep(.gjs-block) {
  padding: 8px;
  margin: 4px;
  border-radius: 4px;
  min-height: auto;
}

:deep(.gjs-block:hover) {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

:deep(.gjs-block__media) {
  display: none;
}

:deep(.gjs-block-label) {
  font-size: 12px;
}

:deep(.gjs-category-title) {
  font-size: 13px;
  font-weight: 500;
  padding: 8px 12px;
}

:deep(.gjs-sm-sector-title) {
  font-size: 13px;
  font-weight: 500;
}

:deep(.gjs-field) {
  background-color: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

:deep(.gjs-field:focus) {
  border-color: #409eff;
}

/* 画布样式 */
:deep(.gjs-cv-canvas) {
  background-color: #e8e8e8;
}

:deep(.gjs-frame-wrapper) {
  background-color: #fff;
}
</style>
