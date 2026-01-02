<template>
  <div class="tiptap-editor-container">
    <!-- ���具栏 -->
    <div v-if="editor" class="editor-toolbar">
      <el-button-group>
        <el-button
          :type="editor.isActive('bold') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <strong>B</strong>
        </el-button>
        <el-button
          :type="editor.isActive('italic') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <em>I</em>
        </el-button>
        <el-button
          :type="editor.isActive('strike') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleStrike().run()"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button-group>
        <el-button
          :type="editor.isActive('heading', { level: 1 }) ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        >
          H1
        </el-button>
        <el-button
          :type="editor.isActive('heading', { level: 2 }) ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        >
          H2
        </el-button>
        <el-button
          :type="editor.isActive('heading', { level: 3 }) ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        >
          H3
        </el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button-group>
        <el-button
          :type="editor.isActive('bulletList') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <el-icon><List /></el-icon>
        </el-button>
        <el-button
          :type="editor.isActive('orderedList') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <el-icon><DocumentCopy /></el-icon>
        </el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button-group>
        <el-button
          :type="editor.isActive('codeBlock') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleCodeBlock().run()"
        >
          <el-icon><Document /></el-icon>
          代码
        </el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button
        size="small"
        @click="toggleMode"
      >
        {{ isCodeMode ? '可视化模式' : 'HTML代码' }}
      </el-button>

      <el-button
        size="small"
        @click="resetEditor"
      >
        清空
      </el-button>
    </div>

    <!-- 可视化编辑器 -->
    <editor-content v-show="!isCodeMode" :editor="editor" class="editor-content" />

    <!-- HTML代码编辑 -->
    <el-input
      v-show="isCodeMode"
      v-model="htmlContent"
      type="textarea"
      :rows="15"
      placeholder="HTML代码..."
      @input="updateFromHTML"
      class="code-editor"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Folder, Delete, List, DocumentCopy, Document } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const editor = ref(null)
const isCodeMode = ref(false)
const htmlContent = ref('')

onMounted(() => {
  editor.value = new Editor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      })
    ],
    content: props.modelValue,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      emit('update:modelValue', html)
      if (!isCodeMode.value) {
        htmlContent.value = html
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none'
      }
    }
  })
  htmlContent.value = props.modelValue
})

const toggleMode = () => {
  if (!isCodeMode.value) {
    // 切换到代码模式，保存当前HTML
    htmlContent.value = editor.value.getHTML()
  } else {
    // 从代码模式切回可视化，应用HTML内容
    if (htmlContent.value !== editor.value.getHTML()) {
      editor.value.commands.setContent(htmlContent.value)
    }
  }
  isCodeMode.value = !isCodeMode.value
}

const updateFromHTML = () => {
  if (isCodeMode.value) {
    emit('update:modelValue', htmlContent.value)
  }
}

const resetEditor = () => {
  editor.value.commands.setContent('')
  htmlContent.value = ''
  emit('update:modelValue', '')
}

watch(() => props.modelValue, (newValue) => {
  if (editor.value && newValue !== editor.value.getHTML()) {
    editor.value.commands.setContent(newValue)
    htmlContent.value = newValue
  }
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style scoped>
.tiptap-editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.editor-toolbar {
  padding: 10px;
  border-bottom: 1px solid #dcdfe6;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.editor-content {
  padding: 20px;
  min-height: 400px;
  background: white;
}

.code-editor {
  padding: 20px;
}

.code-editor :deep(textarea) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

/* TipTap 编辑器样式 */
:deep(.ProseMirror) {
  outline: none;
}

:deep(.ProseMirror p) {
  margin: 1em 0;
}

:deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: bold;
  margin: 0.67em 0;
}

:deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0.75em 0;
}

:deep(.ProseMirror h3) {
  font-size: 1.17em;
  font-weight: bold;
  margin: 0.83em 0;
}

:deep(.ProseMirror ul), :deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin: 1em 0;
}

:deep(.ProseMirror li) {
  margin: 0.5em 0;
}

:deep(.ProseMirror code) {
  background: #f1f1f1;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

:deep(.ProseMirror pre) {
  background: #f1f1f1;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
}

:deep(.ProseMirror pre code) {
  background: transparent;
  padding: 0;
}
</style>
