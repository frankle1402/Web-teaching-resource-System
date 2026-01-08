<template>
  <div class="create-resource-container">
    <el-page-header @back="handleBack">
      <template #content>
        <span class="page-title">{{ isEditMode ? '编辑教学资源' : '创建教学资源' }}</span>
      </template>
    </el-page-header>

    <!-- 步骤指示器 -->
    <el-card class="steps-card">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="基础信息" description="填写课程信息" />
        <el-step title="AI生成" description="生成教学内容" />
        <el-step title="编辑发布" description="编辑并发布" />
      </el-steps>
    </el-card>

    <!-- 第1步: 基础信息 -->
    <el-card class="form-card" v-show="currentStep === 0">
      <template #header>
        <div class="card-header">
          <span>基础信息</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        size="large"
      >
        <el-form-item label="教学主题" prop="subject">
          <el-input
            v-model="form.subject"
            placeholder="如：静脉注射、心肺复苏"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="课程名称" prop="courseName">
          <el-autocomplete
            v-model="form.courseName"
            :fetch-suggestions="queryCourseNames"
            placeholder="输入关键字搜索课程，如：基础、护理"
            clearable
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="教学层次" prop="courseLevel">
          <el-select v-model="form.courseLevel" placeholder="请选择教学层次">
            <el-option label="中职" value="中职" />
            <el-option label="高职" value="高职" />
            <el-option label="本科" value="本科" />
          </el-select>
        </el-form-item>

        <el-form-item label="专业" prop="major">
          <el-autocomplete
            v-model="form.major"
            :fetch-suggestions="queryMajors"
            placeholder="输入关键字搜索专业，如：医学、护理"
            clearable
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="其他要求">
          <el-input
            v-model="form.additionalRequirements"
            type="textarea"
            :rows="4"
            placeholder="可选：补充相关要求或教学内容的部分，如：重点讲解操作步骤、增加案例分析等"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="nextStep">
            下一步：AI生成
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 第2步: AI生成 -->
    <el-card class="form-card" v-show="currentStep === 1">
      <template #header>
        <div class="card-header">
          <span>AI生成教学内容</span>
        </div>
      </template>

      <div class="ai-generation-panel">
        <el-alert
          title="AI将根据您提供的信息生成教学内容"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        >
          <p>课程：{{ form.courseName }}</p>
          <p>主题：{{ form.subject }}</p>
          <p>层次：{{ form.courseLevel }}</p>
        </el-alert>

        <div style="text-align: center; margin: 30px 0">
          <el-button
            type="primary"
            size="large"
            :loading="generating"
            @click="generateContent"
            :disabled="!!form.contentHtml"
          >
            <el-icon v-if="!generating"><MagicStick /></el-icon>
            {{ generating ? 'AI正在生成中（预计1-5分钟，请耐心等待）...' : form.contentHtml ? '已生成内容' : '开始AI生成' }}
          </el-button>
        </div>

        <!-- AI生成等待提示 -->
        <el-alert
          v-if="generating"
          title="AI正在生成教学内容，请稍候..."
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        >
          <p>AI生成通常需要 30-60 秒，请耐心等待</p>
          <p>正在分析课程信息并生成个性化教学内容...</p>
        </el-alert>

        <el-alert
          v-if="form.contentHtml"
          title="内容生成成功"
          type="success"
          :closable="false"
          show-icon
        >
          教学内容已生成，请点击"下一步"进入编辑器进行调整和完善
        </el-alert>

        <el-alert
          v-if="generateError"
          title="生成失败"
          type="error"
          :closable="false"
          show-icon
        >
          {{ generateError }}
        </el-alert>
      </div>

      <div class="step-actions" style="margin-top: 20px">
        <el-button @click="prevStep">上一步</el-button>
        <el-button
          type="primary"
          @click="nextStep"
          :disabled="!form.contentHtml"
        >
          下一步
        </el-button>
      </div>
    </el-card>

    <!-- 第3步: 编辑内容 -->
    <el-card class="form-card editor-card" v-show="currentStep === 2">
      <template #header>
        <div class="card-header">
          <span>编辑内容</span>
          <el-text type="info">使用可视化编辑器完善教学内容</el-text>
        </div>
      </template>

      <TipTapEditor v-model="form.contentHtml" />

      <div class="step-actions">
        <el-button @click="prevStep">上一步</el-button>
        <el-button @click="handleSaveDraft" :loading="submitting">
          保存草稿
        </el-button>
        <el-button type="primary" @click="handlePublish" :loading="publishing">
          发布资源
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick } from '@element-plus/icons-vue'
import { resourceAPI } from '@/api/resource'
import { aiAPI } from '@/api/ai'
import TipTapEditor from '@/components/editor/TipTapEditor.vue'

const router = useRouter()
const route = useRoute()
const formRef = ref(null)
const submitting = ref(false)
const publishing = ref(false)
const generating = ref(false)
const generateError = ref('')
const loading = ref(false)

// 判断是否为编辑模式
const resourceId = computed(() => route.params.id)
const isEditMode = computed(() => !!resourceId.value)

// 步骤控制
const currentStep = ref(0)

// 表单数据
const form = reactive({
  subject: '',
  courseName: '',
  courseLevel: '',
  major: '',
  additionalRequirements: '',
  contentHtml: ''
})

// 预设课程名称推荐列表
const presetCourseNames = [
  '基础护理学', '人体结构基础', '人体解剖学', '生理学', '病理学',
  '药理学', '内科护理学', '外科护理学', '妇产科护理学', '儿科护理学',
  '急救护理学', '社区护理学', '护理管理学', '护理伦理学', '护理心理学',
  '健康评估', '医学影像学', '临床检验学', '医学免疫学', '医学微生物学',
  '中医护理学', '老年护理学', '精神科护理学', '康复护理学', '手术室护理学',
  '传染病护理学', '皮肤与性病护理学', '五官科护理学', '肿瘤护理学'
]

// 预设专业推荐列表
const presetMajors = [
  '护理', '护理学', '助产', '临床医学', '预防医学',
  '口腔医学', '中医学', '针灸推拿', '康复治疗技术', '医学检验技术',
  '医学影像技术', '药学', '中药学', '药品经营与管理', '卫生信息管理',
  '公共卫生管理', '健康管理', '老年保健与管理', '医学营养', '眼视光技术',
  '医学美容技术', '口腔医学技术'
]

// 动态数据（从数据库获取）
const usedCourseNames = ref([])
const usedMajors = ref([])

// 合并预设和动态数据（去重）
const courseNameOptions = computed(() => {
  const all = [...new Set([...presetCourseNames, ...usedCourseNames.value])]
  return all.sort()
})

const majorOptions = computed(() => {
  const all = [...new Set([...presetMajors, ...usedMajors.value])]
  return all.sort()
})

// 获取用户已使用的��程名称和专业
const loadUsedFields = async () => {
  try {
    const response = await resourceAPI.getUsedFields()
    if (response && response.data) {
      usedCourseNames.value = response.data.courseNames || []
      usedMajors.value = response.data.majors || []
    }
  } catch (error) {
    console.error('获取已使用字段失败:', error)
  }
}

// 课程名称自动完成
const queryCourseNames = (queryString, cb) => {
  const results = queryString
    ? courseNameOptions.value.filter(item => item.toLowerCase().includes(queryString.toLowerCase()))
    : courseNameOptions.value
  cb(results.map(item => ({ value: item })))
}

// 专业自动完成
const queryMajors = (queryString, cb) => {
  const results = queryString
    ? majorOptions.value.filter(item => item.toLowerCase().includes(queryString.toLowerCase()))
    : majorOptions.value
  cb(results.map(item => ({ value: item })))
}

// 表单验证规则
const rules = {
  subject: [{ required: true, message: '请输入教学主题', trigger: 'blur' }],
  courseName: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
  courseLevel: [{ required: true, message: '请选择教学层次', trigger: 'change' }],
  major: [{ required: true, message: '请输入专业', trigger: 'blur' }]
}

// 步骤控制
const nextStep = async () => {
  if (currentStep.value === 0) {
    // 验证基础信息
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
  }

  currentStep.value++
}

const prevStep = () => {
  currentStep.value--
}

// AI生成内容
const generateContent = async () => {
  generating.value = true
  generateError.value = ''

  try {
    console.log('开始AI生成...', {
      courseName: form.courseName,
      subject: form.subject,
      courseLevel: form.courseLevel
    })

    // 提示用户开始生成
    ElMessage.info({
      message: 'AI正在生成教学内容，这可能需要1-5分钟，请耐心等待...',
      duration: 5000
    })

    const response = await aiAPI.generateSimpleContent({
      courseName: form.courseName,
      subject: form.subject,
      courseLevel: form.courseLevel,
      major: form.major,
      additionalRequirements: form.additionalRequirements
    })

    console.log('AI生成响应:', response)

    // 响应拦截器已经返回了 res.data，所以直接访问 content
    if (response && response.content) {
      form.contentHtml = response.content
      ElMessage.success('内容生成成功！')
    } else {
      console.error('响应格式错误:', response)
      throw new Error('生成内容格式错误')
    }
  } catch (error) {
    console.error('AI生成失败:', error)
    generateError.value = error.message || '生成失败，请稍后重试'
    ElMessage.error('AI生成失败: ' + (error.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

// 保存草稿
const handleSaveDraft = async () => {
  if (!form.contentHtml) {
    ElMessage.warning('请先生成或输入内容')
    return
  }

  submitting.value = true
  try {
    const submitData = {
      ...form,
      status: 'draft'
    }

    if (isEditMode.value) {
      // 编辑模式：更新资源
      await resourceAPI.update(resourceId.value, submitData)
      ElMessage.success('保存成功')
    } else {
      // 创建模式：创建新资源
      await resourceAPI.create(submitData)
      ElMessage.success('草稿保存成功')
    }

    router.push('/resources')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// 发布资源
const handlePublish = async () => {
  if (!form.contentHtml) {
    ElMessage.warning('请先生成或输入内容')
    return
  }

  try {
    await ElMessageBox.confirm('发布后资源将公开访问，确认发布？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  publishing.value = true
  try {
    const submitData = {
      ...form,
      status: 'published'
    }

    let response
    if (isEditMode.value) {
      // 编辑模式：更新并发布
      response = await resourceAPI.update(resourceId.value, submitData)
      ElMessage.success('资源更新并发布成功！')
    } else {
      // 创建模式：创建并发布
      response = await resourceAPI.create(submitData)
      ElMessage.success('资源发布成功！')
    }

    if (response && response.publicUrl) {
      ElMessageBox.alert(
        `资源已成功发布！\n\n公开访问链接：\n${response.publicUrl}`,
        '发布成功',
        { type: 'success' }
      )
    }

    router.push('/resources')
  } catch (error) {
    console.error('发布失败:', error)
    ElMessage.error('发布失败: ' + (error.message || '未知错误'))
  } finally {
    publishing.value = false
  }
}

// 返回
const handleBack = () => {
  router.back()
}

// 加载资源数据（编辑模式）
const loadResource = async () => {
  if (!isEditMode.value) return

  loading.value = true
  try {
    console.log('加载资源数据，ID:', resourceId.value)
    // 响应拦截器已经返回了 res.data
    const response = await resourceAPI.getById(resourceId.value)

    // 填充表单数据
    Object.assign(form, {
      subject: response.title || response.subject || '',
      courseName: response.course_name || '',
      courseLevel: response.course_level || '',
      major: response.major || '',
      additionalRequirements: response.additional_requirements || '',
      contentHtml: response.content_html || ''
    })

    // 编辑模式直接跳到第3步
    currentStep.value = 2
    console.log('资源数据加载成功')
  } catch (error) {
    console.error('加载资源失败:', error)
    ElMessage.error('加载资源失败: ' + (error.message || '未知错误'))
    router.push('/resources')
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(async () => {
  try {
    console.log('CreateResource component mounted', {
      isEditMode: isEditMode.value,
      resourceId: resourceId.value
    })

    // 加载用户已使用的课程名称和专业（用于推荐）
    await loadUsedFields()

    // 如果是编辑模式，加载资源数据
    if (isEditMode.value) {
      await loadResource()
    }
  } catch (error) {
    console.error('CreateResource initialization error:', error)
    ElMessage.error('页面初始化失败: ' + error.message)
  }
})
</script>

<style scoped>
.create-resource-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
}

.steps-card {
  margin-top: 20px;
}

.form-card {
  margin-top: 20px;
}

.editor-card {
  max-width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* AI生成面板样式 */
.ai-generation-panel {
  padding: 20px 0;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}
</style>
