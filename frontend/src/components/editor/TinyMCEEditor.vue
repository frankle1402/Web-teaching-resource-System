<template>
  <div class="tinymce-editor-container">
    <Editor
      v-model="localContent"
      :init="editorConfig"
      :disabled="disabled"
      :api-key="apiKey"
      @init="handleEditorInit"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import Editor from '@tinymce/tinymce-vue'

// 设置全局 license key（必须在组件导入前设置）
if (typeof window !== 'undefined' && window.tinymce) {
  window.tinymce.OptionManager.items = window.tinymce.OptionManager.items || {}
}

// 导入 TinyMCE 核心和必要插件
import 'tinymce/tinymce'
import 'tinymce/themes/silver'
import 'tinymce/icons/default'
import 'tinymce/models/dom'

// 导入插件
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/link'
import 'tinymce/plugins/image'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/anchor'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/visualblocks'
import 'tinymce/plugins/code'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/insertdatetime'
import 'tinymce/plugins/media'
import 'tinymce/plugins/table'
import 'tinymce/plugins/help'
import 'tinymce/plugins/wordcount'

// 导入皮肤样式
import 'tinymce/skins/ui/oxide/skin.min.css'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  height: {
    type: Number,
    default: 500
  }
})

const emit = defineEmits(['update:modelValue', 'init'])

// GPL license key for TinyMCE
const apiKey = 'gpl'

// 从完整 HTML 中提取 body 内容以及内联样式
const extractBodyContent = (html) => {
  if (!html) return ''

  // 如果包含完整 HTML 结构，提取 body 内容
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    return bodyMatch[1].trim()
  }

  // 如果是完整 HTML 文档但没有 body 标签，尝试提取内容
  if (html.includes('<!DOCTYPE') || html.includes('<html')) {
    const contentMatch = html.match(/<html[^>]*>([\s\S]*?)<\/html>/i)
    if (contentMatch) {
      // 移除 head 标签及其内容
      let content = contentMatch[1].replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      // 移除注释
      content = content.replace(/<!--[\s\S]*?-->/g, '')
      return content.trim()
    }
  }

  return html
}

// 从完整 HTML 中提取 head 中的样式
const extractHeadStyles = (html) => {
  if (!html) return ''

  // 提取 <style> 标签内容
  const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  if (styleMatches) {
    return styleMatches.map(match => match.replace(/<\/?style[^>]*>/gi, '')).join('\n')
  }

  // 提取外部 CSS 链接（如果是 CDN 链接）
  const linkMatches = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi)
  let cssUrls = []
  if (linkMatches) {
    linkMatches.forEach(link => {
      const hrefMatch = link.match(/href=["']([^"']+)["']/)
      if (hrefMatch) {
        cssUrls.push(`@import url('${hrefMatch[1]}');`)
      }
    })
  }

  return cssUrls.join('\n')
}

const localContent = ref(extractBodyContent(props.modelValue))
const editorInstance = ref(null)

// 合并提取的样式和基础样式
const computedContentStyle = computed(() => {
  const headStyles = extractHeadStyles(props.modelValue)
  const baseStyles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      padding: 16px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 { margin: 16px 0 8px; font-weight: 600; }
    h1 { font-size: 24px; }
    h2 { font-size: 20px; }
    h3 { font-size: 18px; }
    h4 { font-size: 16px; }
    p { margin: 8px 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    table td, table th {
      border: 1px solid #ddd;
      padding: 8px 12px;
    }
    table th {
      background-color: #f5f7fa;
      font-weight: 600;
    }
    img { max-width: 100%; height: auto; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: Monaco, Menlo, monospace; }
    blockquote { border-left: 4px solid #409eff; margin: 16px 0; padding: 8px 16px; background: #f9f9f9; }
    ul, ol { margin: 8px 0; padding-left: 24px; }
    li { margin: 4px 0; }
    .alert { padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
    .alert-info { background: #e6f7ff; border: 1px solid #91d5ff; color: #0050b3; }
    .alert-warning { background: #fffbe6; border: 1px solid #ffe58f; color: #ad6800; }
    .alert-success { background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d; }
    .alert-danger { background: #fff2f0; border: 1px solid #ffccc7; color: #cf1322; }
    .card { border: 1px solid #e8e8e8; border-radius: 4px; padding: 16px; margin: 16px 0; }
    .section { margin: 24px 0; padding: 16px; background: #fafafa; border-radius: 4px; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 16px; }
    .row { display: flex; flex-wrap: wrap; margin: 0 -8px; }
    .col { flex: 1; padding: 0 8px; }
    .btn { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; }
    .btn-primary { background: #409eff; color: white; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .badge-info { background: #e6f7ff; color: #1890ff; }
  `

  return headStyles + '\n' + baseStyles
})

// TinyMCE 配置
const editorConfig = {
  height: props.height,
  license_key: 'gpl',
  language: 'zh_CN',
  language_url: '/tinymce/langs/zh_CN.js',
  skin: false,
  content_css: false,
  plugins: [
    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
    'insertdatetime', 'media', 'table', 'help', 'wordcount'
  ],
  toolbar: [
    'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor',
    'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link image media | code fullscreen'
  ],
  menubar: 'file edit view insert format tools table help',
  branding: false,
  promotion: false,
  resize: true,
  statusbar: true,
  elementpath: true,
  paste_data_images: true,
  automatic_uploads: false,
  // 表格配置
  table_default_attributes: {
    border: '1'
  },
  table_default_styles: {
    'border-collapse': 'collapse',
    'width': '100%'
  },
  table_responsive_width: true,
  // 图片配置
  image_advtab: true,
  image_caption: true,
  // 链接配置
  link_default_target: '_blank',
  // 内容样式（动态计算）
  content_style: computedContentStyle.value,
  // 设置回调
  setup: (editor) => {
    editor.on('change', () => {
      const content = editor.getContent()
      localContent.value = content
      emit('update:modelValue', content)
    })
    editor.on('input', () => {
      const content = editor.getContent()
      localContent.value = content
      emit('update:modelValue', content)
    })
  }
}

// 编辑器初始化完成
const handleEditorInit = (e, editor) => {
  editorInstance.value = editor
  emit('init', editor)
}

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  const extractedContent = extractBodyContent(newValue)
  if (extractedContent !== localContent.value) {
    localContent.value = extractedContent
    if (editorInstance.value) {
      editorInstance.value.setContent(extractedContent || '')
    }
  }
})

// 暴露方法
defineExpose({
  getEditor: () => editorInstance.value,
  getContent: () => editorInstance.value?.getContent() || '',
  setContent: (content) => {
    if (editorInstance.value) {
      editorInstance.value.setContent(content)
    }
  },
  insertContent: (content) => {
    if (editorInstance.value) {
      editorInstance.value.insertContent(content)
    }
  }
})
</script>

<style scoped>
.tinymce-editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

/* 覆盖 TinyMCE 默认样式 */
:deep(.tox-tinymce) {
  border: none !important;
  border-radius: 0 !important;
}

:deep(.tox-editor-header) {
  border-bottom: 1px solid #dcdfe6 !important;
}

:deep(.tox-statusbar) {
  border-top: 1px solid #dcdfe6 !important;
}
</style>
