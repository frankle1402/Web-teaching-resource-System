<template>
  <div class="floating-toolbar" @mousedown.prevent>
    <!-- 文字格式 -->
    <el-button-group size="small">
      <el-button @click="format('bold')" :class="{ active: isBold }" title="加粗">
        <strong>B</strong>
      </el-button>
      <el-button @click="format('italic')" :class="{ active: isItalic }" title="斜体">
        <em>I</em>
      </el-button>
      <el-button @click="format('underline')" :class="{ active: isUnderline }" title="下划线">
        <u>U</u>
      </el-button>
      <el-button @click="format('strikeThrough')" title="删除线">
        <s>S</s>
      </el-button>
    </el-button-group>

    <el-divider direction="vertical" />

    <!-- 标题级别 -->
    <el-dropdown trigger="click" @command="handleHeading">
      <el-button size="small">
        标题 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="p">正文</el-dropdown-item>
          <el-dropdown-item command="h1">标题 1</el-dropdown-item>
          <el-dropdown-item command="h2">标题 2</el-dropdown-item>
          <el-dropdown-item command="h3">标题 3</el-dropdown-item>
          <el-dropdown-item command="h4">标题 4</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-divider direction="vertical" />

    <!-- 文字颜色 -->
    <el-color-picker
      v-model="textColor"
      size="small"
      @change="handleTextColor"
      :predefine="predefineColors"
    />

    <!-- 背景颜色 -->
    <el-color-picker
      v-model="bgColor"
      size="small"
      @change="handleBgColor"
      :predefine="predefineColors"
    />

    <el-divider direction="vertical" />

    <!-- 对齐方式 -->
    <el-button-group size="small">
      <el-button @click="format('justifyLeft')" title="左对齐">
        <el-icon><DArrowLeft /></el-icon>
      </el-button>
      <el-button @click="format('justifyCenter')" title="居中">
        <el-icon><Minus /></el-icon>
      </el-button>
      <el-button @click="format('justifyRight')" title="右对齐">
        <el-icon><DArrowRight /></el-icon>
      </el-button>
    </el-button-group>

    <el-divider direction="vertical" />

    <!-- 插入链接 -->
    <el-button size="small" @click="showLinkDialog = true" title="插入链接">
      <el-icon><Link /></el-icon>
    </el-button>

    <!-- 链接对话框 -->
    <el-dialog v-model="showLinkDialog" title="插入链接" width="400px" append-to-body>
      <el-form :model="linkForm" label-width="60px">
        <el-form-item label="链接">
          <el-input v-model="linkForm.url" placeholder="https://" />
        </el-form-item>
        <el-form-item label="文字">
          <el-input v-model="linkForm.text" placeholder="链接文字（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showLinkDialog = false">取消</el-button>
        <el-button type="primary" @click="insertLink">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ArrowDown, Link, DArrowLeft, DArrowRight, Minus } from '@element-plus/icons-vue'

const props = defineProps({
  iframeDoc: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['format'])

// 颜色状态
const textColor = ref('#000000')
const bgColor = ref('#ffffff')

// 链接对话框
const showLinkDialog = ref(false)
const linkForm = ref({
  url: '',
  text: ''
})

// 预设颜色
const predefineColors = [
  '#000000', '#333333', '#666666', '#999999',
  '#ff0000', '#ff6600', '#ffcc00', '#33cc33',
  '#0099ff', '#6633ff', '#ff33cc', '#ffffff'
]

// 检查当前格式状态
const isBold = computed(() => {
  if (!props.iframeDoc) return false
  return props.iframeDoc.queryCommandState('bold')
})

const isItalic = computed(() => {
  if (!props.iframeDoc) return false
  return props.iframeDoc.queryCommandState('italic')
})

const isUnderline = computed(() => {
  if (!props.iframeDoc) return false
  return props.iframeDoc.queryCommandState('underline')
})

// 执行格式化命令
const format = (command, value = null) => {
  emit('format', command, value)
}

// 处理标题
const handleHeading = (tag) => {
  emit('format', 'formatBlock', `<${tag}>`)
}

// 处理文字颜色
const handleTextColor = (color) => {
  if (color) {
    emit('format', 'foreColor', color)
  }
}

// 处理背景颜色
const handleBgColor = (color) => {
  if (color) {
    emit('format', 'hiliteColor', color)
  }
}

// 插入链接
const insertLink = () => {
  if (!linkForm.value.url) {
    showLinkDialog.value = false
    return
  }

  let url = linkForm.value.url
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  if (linkForm.value.text) {
    // 插入带文字的链接
    emit('format', 'insertHTML', `<a href="${url}" target="_blank">${linkForm.value.text}</a>`)
  } else {
    // 将选中文字变成链接
    emit('format', 'createLink', url)
  }

  // 重置表单
  linkForm.value = { url: '', text: '' }
  showLinkDialog.value = false
}
</script>

<style scoped>
.floating-toolbar {
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.floating-toolbar .el-button {
  padding: 5px 8px;
}

.floating-toolbar .el-button.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.floating-toolbar .el-divider--vertical {
  height: 20px;
  margin: 0 4px;
}

.floating-toolbar :deep(.el-color-picker__trigger) {
  width: 24px;
  height: 24px;
  padding: 2px;
}
</style>
