# 第三阶段开发指南 - AI智能生成功能

## 📋 当前完成状态

### ✅ 已完成
1. **后端AI控制器** (`backend/src/controllers/ai.controller.js`)
   - ✅ `POST /api/ai/outline` - 生成教学大纲
   - ✅ `POST /api/ai/content` - 生成HTML内容
   - ✅ 集成302.ai API
   - ✅ 默认大纲生成（备用方案）
   - ✅ 内容注入模板

2. **后端AI路由** (`backend/src/routes/ai.routes.js`)
   - ✅ 已创建并集成到app.js

3. **前端AI API封装** (`frontend/src/api/ai.js`)
   - ✅ generateOutline()
   - ✅ generateContent()

### ⏳ 待完成
1. 安装TipTap编辑器依赖
2. 创建TipTap编辑器组件
3. 重构CreateResource.vue页面
4. 实现完整的AI生成流程
5. 添加草稿自动保存
6. UI/UX优化

---

## 🔧 接下来的开发步骤

### 步骤1: 安装TipTap依赖

```bash
cd frontend
pnpm add @tiptap/vue-3 @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-table
```

### 步骤2: 创建TipTap编辑器组件

创建文件: `frontend/src/components/editor/TipTapEditor.vue`

```vue
<template>
  <div class="tiptap-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <button @click="editor.chain().focus().toggleBold().run()">
        粗体
      </button>
      <button @click="editor.chain().focus().toggleItalic().run()">
        斜体
      </button>
      <!-- 更多工具按钮 -->

      <button @click="toggleMode" class="mode-toggle">
        {{ isCodeMode ? '可视化模式' : 'HTML模式' }}
      </button>
    </div>

    <!-- 编辑区域 -->
    <div v-show="!isCodeMode">
      <editor-content :editor="editor" />
    </div>

    <!-- HTML代码编辑 -->
    <div v-show="isCodeMode">
      <textarea
        v-model="htmlContent"
        @input="updateFromHTML"
        class="code-editor"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

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
    extensions: [StarterKit],
    content: props.modelValue,
    onUpdate: ({ editor }) => {
      emit('update:modelValue', editor.getHTML())
    }
  })
  htmlContent.value = props.modelValue
})

const toggleMode = () => {
  if (!isCodeMode.value) {
    htmlContent.value = editor.value.getHTML()
  }
  isCodeMode.value = !isCodeMode.value
}

const updateFromHTML = () => {
  if (isCodeMode.value) {
    emit('update:modelValue', htmlContent.value)
    editor.value.commands.setContent(htmlContent.value)
  }
}

watch(() => props.modelValue, (newValue) => {
  if (editor.value && editor.value.getHTML() !== newValue) {
    editor.value.commands.setContent(newValue)
    htmlContent.value = newValue
  }
})

onBeforeUnmount(() => {
  editor.value.destroy()
})
</script>
```

### 步骤3: 重构CreateResource.vue

创建文件: `frontend/src/pages/CreateResource.vue` (完整版本)

关键功能点:
1. **BasicInfoForm** - 基础信息表单
2. **TemplateSelector** - 模板选择
3. **AIGenerationPanel** - AI生成面板
   - 生成大纲按钮
   - 大纲展示区域
   - 生成内容按钮
4. **TipTapEditor** - 编辑器
5. **ActionFooter** - 保存/发布按钮

### 步骤4: 实现完整流程

```javascript
// CreateResource.vue 核心逻辑

const generateOutline = async () => {
  loadingOutline.value = true
  try {
    const { data } = await aiAPI.generateOutline({
      courseName: form.courseName,
      courseLevel: form.courseLevel,
      major: form.major,
      subject: form.subject
    })
    outline.value = data
    showOutline.value = true
  } catch (error) {
    ElMessage.error('生成大纲失败')
  } finally {
    loadingOutline.value = false
  }
}

const generateContent = async () => {
  loadingContent.value = true
  try {
    const { data } = await aiAPI.generateContent({
      outline: outline.value,
      templateId: form.templateId,
      courseInfo: {
        courseName: form.courseName,
        courseLevel: form.courseLevel,
        major: form.major,
        subject: form.subject
      }
    })
    form.contentHtml = data.html
    showEditor.value = true
  } catch (error) {
    ElMessage.error('生成内容失败')
  } finally {
    loadingContent.value = false
  }
}
```

---

## 📝 完整的CreateResource.vue结构

```vue
<template>
  <div class="create-resource-page">
    <!-- 步骤指示器 -->
    <el-steps :active="currentStep" finish-status="success">
      <el-step title="基础信息" />
      <el-step title="选择模板" />
      <el-step title="AI生成" />
      <el-step title="编辑内容" />
    </el-steps>

    <!-- 第1步: 基础信息 -->
    <el-card v-show="currentStep === 0">
      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item label="课程名称" prop="courseName">
          <el-input v-model="form.courseName" />
        </el-form-item>
        <el-form-item label="教学层次" prop="courseLevel">
          <el-select v-model="form.courseLevel">
            <el-option label="中职" value="中职" />
            <el-option label="高职" value="高职" />
            <el-option label="本科" value="本科" />
          </el-select>
        </el-form-item>
        <el-form-item label="专业" prop="major">
          <el-input v-model="form.major" placeholder="如：护理" />
        </el-form-item>
        <el-form-item label="教学主题" prop="subject">
          <el-input v-model="form.subject" placeholder="如：静脉注射" />
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="nextStep">下一步</el-button>
    </el-card>

    <!-- 第2步: 选择模板 -->
    <el-card v-show="currentStep === 1">
      <div class="template-selector">
        <el-row :gutter="20">
          <el-col
            v-for="tpl in templates"
            :key="tpl.id"
            :span="12"
          >
            <el-card
              :class="{ selected: form.templateId === tpl.id }"
              @click="form.templateId = tpl.id"
              shadow="hover"
            >
              <h3>{{ tpl.name }}</h3>
              <p>{{ tpl.description }}</p>
            </el-card>
          </el-col>
        </el-row>
      </div>
      <el-button @click="prevStep">上一步</el-button>
      <el-button type="primary" @click="nextStep">下一步</el-button>
    </el-card>

    <!-- 第3步: AI生成 -->
    <el-card v-show="currentStep === 2">
      <!-- 生成大纲 -->
      <el-button
        type="primary"
        :loading="loadingOutline"
        @click="generateOutline"
      >
        生成教学大纲
      </el-button>

      <!-- 大纲展示 -->
      <div v-if="outline" class="outline-preview">
        <h3>{{ outline.title }}</h3>
        <div
          v-for="(chapter, index) in outline.chapters"
          :key="index"
        >
          <h4>{{ chapter.title }}</h4>
          <ul>
            <li
              v-for="(section, sIndex) in chapter.sections"
              :key="sIndex"
            >
              {{ section.title }} ({{ section.duration }}课时)
            </li>
          </ul>
        </div>
      </div>

      <!-- 生成内容 -->
      <el-button
        v-if="outline"
        type="success"
        :loading="loadingContent"
        @click="generateContent"
      >
        生成教学内容
      </el-button>

      <el-button @click="prevStep">上一步</el-button>
      <el-button
        v-if="form.contentHtml"
        type="primary"
        @click="nextStep"
      >
        下一步
      </el-button>
    </el-card>

    <!-- 第4步: 编辑内容 -->
    <el-card v-show="currentStep === 3">
      <TipTapEditor v-model="form.contentHtml" />

      <el-button @click="prevStep">上一步</el-button>
      <el-button @click="handleSave">保存草稿</el-button>
      <el-button type="primary" @click="handlePublish">
        发布
      </el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { resourceAPI } from '@/api/resource'
import { templateAPI } from '@/api/template'
import { aiAPI } from '@/api/ai'
import TipTapEditor from '@/components/editor/TipTapEditor.vue'

const router = useRouter()

// 状态管理
const currentStep = ref(0)
const loadingOutline = ref(false)
const loadingContent = ref(false)
const templates = ref([])
const outline = ref(null)

// 表单数据
const form = reactive({
  courseName: '',
  courseLevel: '',
  major: '',
  subject: '',
  templateId: null,
  contentHtml: ''
})

// 加载模板
onMounted(async () => {
  const { data } = await templateAPI.getList()
  templates.value = data
  if (data.length > 0) {
    form.templateId = data[0].id
  }
})

// 步骤控制
const nextStep = async () => {
  if (currentStep.value === 0) {
    // 验证基础信息
    if (!form.courseName || !form.courseLevel || !form.major) {
      ElMessage.warning('请填写完整的基础信息')
      return
    }
  }
  currentStep.value++
}

const prevStep = () => {
  currentStep.value--
}

// AI生成
const generateOutline = async () => {
  loadingOutline.value = true
  try {
    const { data } = await aiAPI.generateOutline({
      courseName: form.courseName,
      courseLevel: form.courseLevel,
      major: form.major,
      subject: form.subject
    })
    outline.value = data
  } catch (error) {
    ElMessage.error('生成大纲失败')
  } finally {
    loadingOutline.value = false
  }
}

const generateContent = async () => {
  loadingContent.value = true
  try {
    const { data } = await aiAPI.generateContent({
      outline: outline.value,
      templateId: form.templateId,
      courseInfo: {
        courseName: form.courseName,
        courseLevel: form.courseLevel,
        major: form.major,
        subject: form.subject
      }
    })
    form.contentHtml = data.html
    ElMessage.success('内容生成成功')
  } catch (error) {
    ElMessage.error('生成内容失败')
  } finally {
    loadingContent.value = false
  }
}

// 保存和发布
const handleSave = async () => {
  try {
    await resourceAPI.create({
      title: form.courseName,
      courseName: form.courseName,
      courseLevel: form.courseLevel,
      major: form.major,
      subject: form.subject,
      templateId: form.templateId,
      contentHtml: form.contentHtml
    })
    ElMessage.success('保存成功')
    router.push('/resources')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const handlePublish = async () => {
  try {
    const { data } = await resourceAPI.create({
      title: form.courseName,
      courseName: form.courseName,
      courseLevel: form.courseLevel,
      major: form.major,
      subject: form.subject,
      templateId: form.templateId,
      contentHtml: form.contentHtml
    })
    await resourceAPI.publish(data.id)
    ElMessage.success('发布成功')
    router.push('/resources')
  } catch (error) {
    ElMessage.error('发布失败')
  }
}
</script>

<style scoped>
.template-selector .selected {
  border: 2px solid #409eff;
}

.outline-preview {
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
```

---

## 🎯 后续开发建议

由于代码量较大且需要前端依赖安装，建议分步骤完成：

### 今天完成（高优先级）
1. ✅ 后端AI接口已完成
2. ✅ 前端API封装已完成
3. ⏳ 测试后端AI接口是否正常调用302.ai

### 明天完成（中优先级）
1. 安装TipTap依赖
2. 创建TipTap编辑器组件
3. 简化版CreateResource.vue（不使用步骤器）

### 后天完成（低优先级）
1. 完整版CreateResource.vue（带步骤指示器）
2. 草稿自动保存
3. UI/UX优化

---

## 🧪 测试AI接口

使用curl测试后端AI接口：

```bash
# 1. 先登录获取Token
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. 测试生成大纲
curl -X POST http://localhost:3002/api/ai/outline \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseName": "人体解剖学",
    "courseLevel": "高职",
    "major": "护理",
    "subject": "静脉注射技术"
  }'

# 3. 测试生成内容
curl -X POST http://localhost:3002/api/ai/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "outline": {"title": "人体解剖学", "chapters": [...]},
    "templateId": 1,
    "courseInfo": {
      "courseName": "人体解剖学",
      "courseLevel": "高职",
      "major": "护理"
    }
  }'
```

---

## 📚 相关文档

- [002.resource-generation.md](../MVP/002.resource-generation.md) - 原始需求文档
- [issues-log.md](issues-log.md) - 问题记录文档
- [stage2-complete.md](stage2-complete.md) - 第二阶段完成报告

---

*文档创建时间: 2026年1月2日*
*当前进度: 后端完成50%，前端完成10%*
