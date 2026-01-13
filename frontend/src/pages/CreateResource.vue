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
          <div class="major-tags-container">
            <div class="major-tags-list">
              <el-tag
                v-for="(majorItem, index) in form.major"
                :key="index"
                closable
                @close="removeMajor(index)"
                style="margin: 4px"
              >
                {{ majorItem }}
              </el-tag>
              <el-autocomplete
                v-if="form.major.length < 5"
                v-model="newMajorInput"
                :fetch-suggestions="queryMajors"
                placeholder="添加专业"
                size="small"
                style="width: 180px; margin: 4px"
                @select="handleMajorSelect"
                @keyup.enter="addMajor"
                @blur="handleMajorBlur"
              >
                <template #append>
                  <el-button @click="addMajor">
                    <el-icon><Plus /></el-icon>
                  </el-button>
                </template>
              </el-autocomplete>
            </div>
            <div class="form-tip">
              最多选择 5 个专业，当前已选 {{ form.major.length }} 个
              <span v-if="form.major.length >= 5" style="color: #e6a23c">（已达上限）</span>
            </div>
          </div>
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

        <!-- 内容方向选择（多选） -->
        <el-form-item label="内容方向">
          <el-checkbox-group v-model="form.contentDirections">
            <el-checkbox label="operation">强调操作步骤演示</el-checkbox>
            <el-checkbox label="theory">强调理论知识讲解</el-checkbox>
            <el-checkbox label="case">增加临床案例分析</el-checkbox>
            <el-checkbox label="media">增加视频/图片占位</el-checkbox>
            <el-checkbox label="flipped">适合翻转课堂</el-checkbox>
            <el-checkbox label="self-study">适合课后自学</el-checkbox>
          </el-checkbox-group>
          <div class="form-tip">可多选，AI将根据您的选择调整生成内容的侧重点</div>
        </el-form-item>

        <!-- 教学法模板选择 -->
        <el-form-item label="教学法模板">
          <el-radio-group v-model="form.teachingMethod">
            <el-radio label="auto">
              <span class="method-label">AI智能生成</span>
              <span class="method-desc">根据内容自动匹配最适合的教学结构</span>
            </el-radio>
            <el-radio label="cbl">
              <span class="method-label">CBL案例教学法</span>
              <span class="method-desc">案例导入→问题提出→知识讲解→处理方案</span>
            </el-radio>
            <el-radio label="skill">
              <span class="method-label">操作技能四步法</span>
              <span class="method-desc">目的意义→用物准备→操作步骤→要点错误</span>
            </el-radio>
            <el-radio label="pbl">
              <span class="method-label">PBL问题导向法</span>
              <span class="method-desc">问题情境→问题分解→知识探索→方案制定</span>
            </el-radio>
            <el-radio label="flipped">
              <span class="method-label">翻转课堂教学法</span>
              <span class="method-desc">课前自学→核心概念→课堂讨论→拓展思考</span>
            </el-radio>
            <el-radio label="ebp">
              <span class="method-label">循证护理/医学法</span>
              <span class="method-desc">临床问题(PICO)→证据检索→评价→应用</span>
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="nextStep">
            下一步：AI生成
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 第2步: AI生成（统一流程：大纲生成 → 大纲编辑 → 内容生成） -->
    <el-card class="form-card" v-show="currentStep === 1">
      <template #header>
        <div class="card-header">
          <span>AI生成教学内容</span>
        </div>
      </template>

      <div class="ai-generation-panel">
        <!-- 课程信息提示 -->
        <el-alert
          title="课程信息"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        >
          <p>课程：{{ form.courseName }} | 主题：{{ form.subject }} | 层次：{{ form.courseLevel }}</p>
        </el-alert>

        <!-- 第一阶段：生成大纲（如果大纲为空显示） -->
        <div v-if="!outline.sections || outline.sections.length === 0" class="outline-generation-phase">
          <el-tabs type="border-card" class="input-tabs">
            <!-- 方式A：快速生成大纲 -->
            <el-tab-pane label="快速生成大纲">
              <div class="quick-outline-panel">
                <p class="panel-desc">AI将根据您填写的课程信息，自动生成教学大纲</p>
                <div style="text-align: center; margin: 30px 0">
                  <el-button
                    type="primary"
                    size="large"
                    :loading="generatingOutline"
                    @click="generateQuickOutline"
                  >
                    <el-icon v-if="!generatingOutline"><MagicStick /></el-icon>
                    {{ generatingOutline ? '正在生成大纲...' : '一键生成大纲' }}
                  </el-button>
                </div>
              </div>
            </el-tab-pane>

            <!-- 方式B：上传教案生成大纲 -->
            <el-tab-pane label="上传教案生成大纲">
              <el-tabs type="card" class="upload-sub-tabs">
                <el-tab-pane label="上传文件">
                  <el-upload
                    class="upload-area"
                    drag
                    :auto-upload="false"
                    :show-file-list="false"
                    :on-change="handleFileChange"
                    accept=".docx,.pdf,.pptx,.txt"
                  >
                    <el-icon class="el-icon--upload" v-if="!uploadedFile"><Upload /></el-icon>
                    <div class="el-upload__text" v-if="!uploadedFile">
                      拖拽文件到此处，或<em>点击上传</em>
                      <div class="upload-tip">支持 .docx, .pdf, .pptx, .txt 格式</div>
                    </div>
                    <div v-else class="uploaded-file">
                      <el-icon><Document /></el-icon>
                      <span>{{ uploadedFile.name }}</span>
                      <el-button type="danger" link @click.stop="clearUploadedFile">删除</el-button>
                    </div>
                  </el-upload>
                  <div style="text-align: center; margin-top: 16px">
                    <el-button type="primary" :loading="uploading" :disabled="!uploadedFile" @click="parseUploadedFile">
                      {{ uploading ? '解析中...' : '解析文件' }}
                    </el-button>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="粘贴内容">
                  <el-input v-model="uploadedContent" type="textarea" :rows="8" placeholder="将教案或教材内容粘贴到此处..." maxlength="10000" show-word-limit />
                </el-tab-pane>
              </el-tabs>
              <div style="text-align: center; margin: 20px 0" v-if="uploadedContent">
                <el-button type="primary" size="large" :loading="generatingOutline" @click="generateOutlineFromContent">
                  {{ generatingOutline ? '正在分析内容...' : '根据教案生成大纲' }}
                </el-button>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 第二阶段：编辑大纲（大纲已生成时显示） -->
        <div v-if="outline.sections && outline.sections.length > 0" class="outline-edit-phase">
          <el-divider><el-icon><EditPen /></el-icon> 编辑教学大纲</el-divider>
          <p class="phase-desc">您可以拖拽调整章节顺序、编辑标题和描述、添加或删除章节</p>
          <OutlineEditor v-model="outline" />
          <div style="text-align: center; margin-top: 16px">
            <el-button type="info" link @click="resetOutline"><el-icon><RefreshRight /></el-icon> 重新生成大纲</el-button>
          </div>
          <div style="text-align: center; margin-top: 20px">
            <el-button type="primary" size="large" :loading="generating" @click="generateFromOutline">
              <el-icon v-if="!generating"><MagicStick /></el-icon>
              {{ generating ? 'AI正在生成内容（预计1-5分钟）...' : '根据大纲生成教学内容' }}
            </el-button>
          </div>
        </div>

        <!-- 提示信息 -->
        <el-alert v-if="generating" title="AI正在生成教学内容，请稍候..." type="info" :closable="false" show-icon style="margin-top: 20px">
          <p>AI生成通常需要 1-5 分钟，请耐心等待</p>
        </el-alert>
        <el-alert v-if="form.contentHtml" title="内容生成成功" type="success" :closable="false" show-icon style="margin-top: 20px">
          教学内容已生成，请点击"下一步"进入编辑器进行调整和完善
        </el-alert>
        <el-alert v-if="generateError" title="生成失败" type="error" :closable="false" show-icon style="margin-top: 20px">{{ generateError }}</el-alert>
      </div>

      <div class="step-actions" style="margin-top: 20px">
        <el-button @click="prevStep">上一步</el-button>
        <el-button type="primary" @click="nextStep" :disabled="!form.contentHtml">下一步</el-button>
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

      <HTMLEditor v-model="form.contentHtml" />

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

    <!-- AI 生成内容倒计时模态框 -->
    <el-dialog
      v-model="aiGenerating"
      title="AI 正在生成教学内容"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      center
    >
      <div class="ai-generating-content">
        <el-icon class="is-loading" :size="60" color="#409eff">
          <Loading />
        </el-icon>

        <div class="countdown-container">
          <div class="countdown-time">{{ formatCountdown(countdown) }}</div>
          <div class="countdown-label">剩余等待时间</div>
        </div>

        <el-alert
          title="温馨提示"
          type="info"
          :closable="false"
          show-icon
        >
          <p>AI 正在为您生成教学内容，这可能需要 1-10 分钟。</p>
          <p>您可以离开页面做其他事情，但请不要关闭此页面。</p>
          <p>生成完成后页面会自动更新。</p>
        </el-alert>

        <div class="progress-container">
          <el-progress
            :percentage="aiProgress"
            :stroke-width="20"
            :show-text="false"
          />
          <p class="progress-text">已用时间: {{ formatElapsedTime(elapsedTime) }}</p>
        </div>
      </div>
    </el-dialog>

    <!-- AI 生成大纲倒计时模态框 -->
    <el-dialog
      v-model="outlineGenerating"
      title="AI 正在生成教学大纲"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      center
    >
      <div class="ai-generating-content">
        <el-icon class="is-loading" :size="60" color="#67c23a">
          <Loading />
        </el-icon>

        <div class="countdown-container">
          <div class="countdown-time outline-countdown">{{ formatCountdown(outlineCountdown) }}</div>
          <div class="countdown-label">剩余等待时间</div>
        </div>

        <el-alert
          title="温馨提示"
          type="success"
          :closable="false"
          show-icon
        >
          <p>AI 正在为您生成教学大纲，预计需要 1-3 分钟。</p>
          <p>您可以离开页面做其他事情，但请不要关闭此页面。</p>
          <p>生成完成后页面会自动显示大纲编辑器。</p>
        </el-alert>

        <div class="progress-container">
          <el-progress
            :percentage="outlineProgress"
            :stroke-width="20"
            :show-text="false"
            status="success"
          />
          <p class="progress-text">已用时间: {{ formatElapsedTime(outlineElapsedTime) }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick, Upload, Document, EditPen, RefreshRight, Loading, Plus } from '@element-plus/icons-vue'
import { resourceAPI } from '@/api/resource'
import { aiAPI } from '@/api/ai'
import { uploadAPI } from '@/api/upload'
import TipTapEditor from '@/components/editor/TipTapEditor.vue'
import HTMLEditor from '@/components/editor/HTMLEditor.vue'
import OutlineEditor from '@/components/OutlineEditor.vue'

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

// 文件上传相关
const uploadedFile = ref(null)
const uploadedContent = ref('')
const uploading = ref(false)
const generatingOutline = ref(false)

// AI 生成倒计时状态
const aiGenerating = ref(false)
const countdown = ref(600)  // 600秒 = 10分钟
const elapsedTime = ref(0)   // 已用时间（秒）
const aiProgress = ref(0)    // 进度条百分比
let countdownTimer = null
let elapsedTimer = null

// 大纲生成倒计时状态
const outlineGenerating = ref(false)
const outlineCountdown = ref(180)  // 180秒 = 3分钟
const outlineElapsedTime = ref(0)
const outlineProgress = ref(0)
let outlineCountdownTimer = null
let outlineElapsedTimer = null

// 大纲数据
const outline = reactive({
  title: '',
  summary: '',
  keywords: [],
  learningObjectives: [],
  sections: [],
  finalQuizTopics: []
})

// 步骤控制
const currentStep = ref(0)

// 专业标签输入
const newMajorInput = ref('')

// 表单数据
const form = reactive({
  subject: '',
  courseName: '',
  courseLevel: '',
  major: [],  // 改为数组，支持多专业
  additionalRequirements: '',
  contentDirections: [],
  teachingMethod: 'auto',
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

// 获取用户已使用的课程名称和专业
const loadUsedFields = async () => {
  try {
    const response = await resourceAPI.getUsedFields()
    if (response) {
      usedCourseNames.value = response.courseNames || []
      usedMajors.value = response.majors || []
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
  // 过滤掉已选择的专业
  const availableMajors = majorOptions.value.filter(item => !form.major.includes(item))
  const results = queryString
    ? availableMajors.filter(item => item.toLowerCase().includes(queryString.toLowerCase()))
    : availableMajors
  cb(results.map(item => ({ value: item })))
}

// 添加专业
const addMajor = () => {
  if (form.major.length >= 5) {
    ElMessage.warning('最多只能选择5个专业')
    return
  }

  const major = newMajorInput.value.trim()
  if (!major) return

  // 检查重复
  if (form.major.includes(major)) {
    ElMessage.warning('该专业已添加')
    newMajorInput.value = ''
    return
  }

  form.major.push(major)
  newMajorInput.value = ''

  // 触发表单验证
  formRef.value?.validateField('major')
}

// 从自动完成选择专业
const handleMajorSelect = (item) => {
  if (form.major.length >= 5) {
    ElMessage.warning('最多只能选择5个专业')
    newMajorInput.value = ''
    return
  }

  const major = item.value
  if (form.major.includes(major)) {
    ElMessage.warning('该专业已添加')
    newMajorInput.value = ''
    return
  }

  form.major.push(major)
  newMajorInput.value = ''

  // 触发表单验证
  formRef.value?.validateField('major')
}

// 专业输入框失焦时添加
const handleMajorBlur = () => {
  if (newMajorInput.value.trim()) {
    addMajor()
  }
}

// 删除专业
const removeMajor = (index) => {
  form.major.splice(index, 1)
  // 触发表单验证
  formRef.value?.validateField('major')
}

// 表单验证规则
const rules = {
  subject: [{ required: true, message: '请输入教学主题', trigger: 'blur' }],
  courseName: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
  courseLevel: [{ required: true, message: '请选择教学层次', trigger: 'change' }],
  major: [{
    validator: (rule, value, callback) => {
      if (!value || value.length === 0) {
        callback(new Error('请至少选择一个专业'))
      } else {
        callback()
      }
    },
    trigger: 'change'
  }]
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

// 快速生成大纲（根据基础信息）
const generateQuickOutline = async () => {
  generatingOutline.value = true
  startOutlineCountdown()  // 开始大纲倒计时
  try {
    const response = await aiAPI.generateOutline({
      courseName: form.courseName,
      courseLevel: form.courseLevel,
      major: form.major,
      subject: form.subject,
      teachingMethod: form.teachingMethod,  // 传递教学法参数
      contentDirections: form.contentDirections  // 传递内容方向
    })
    if (response) {
      Object.assign(outline, {
        title: response.title || form.subject,
        summary: response.summary || '',
        keywords: response.keywords || [],
        learningObjectives: response.learningObjectives || [],
        sections: response.sections || (response.chapters ? convertChaptersToSections(response.chapters) : []),
        finalQuizTopics: response.finalQuizTopics || []
      })
      ElMessage.success('大纲生成成功，请查看并编辑')
    }
  } catch (error) {
    console.error('生成大纲失败:', error)
    ElMessage.error('生成大纲失败: ' + (error.message || '未知错误'))
  } finally {
    generatingOutline.value = false
    stopOutlineCountdown()  // 停止大纲倒计时
  }
}

// 将 chapters 格式转换为 sections 格式
const convertChaptersToSections = (chapters) => {
  const sections = []
  chapters.forEach((chapter, ci) => {
    chapter.sections?.forEach((section, si) => {
      sections.push({
        id: `section-${ci}-${si}`,
        title: section.title,
        type: 'content',
        description: section.duration ? `课时：${section.duration}` : '',
        keyPoints: [],
        hasQuiz: section.interaction?.type ? true : false,
        quizType: section.interaction?.type || 'choice'
      })
    })
  })
  return sections
}

// 重置大纲
const resetOutline = () => {
  Object.assign(outline, {
    title: '',
    summary: '',
    keywords: [],
    learningObjectives: [],
    sections: [],
    finalQuizTopics: []
  })
  form.contentHtml = ''
}

// 重置所有状态（用于创建新资源时）
const resetAllState = () => {
  // 重置步骤
  currentStep.value = 0

  // 重置专业输入
  newMajorInput.value = ''

  // 重置表单
  Object.assign(form, {
    subject: '',
    courseName: '',
    courseLevel: '',
    major: [],  // 改为空数组
    additionalRequirements: '',
    contentDirections: [],
    teachingMethod: 'auto',
    contentHtml: ''
  })

  // 重置大纲
  Object.assign(outline, {
    title: '',
    summary: '',
    keywords: [],
    learningObjectives: [],
    sections: [],
    finalQuizTopics: []
  })

  // 重置文件上传
  uploadedFile.value = null
  uploadedContent.value = ''

  // 重置错误状态
  generateError.value = ''

  // 重置加载状态
  generating.value = false
  generatingOutline.value = false
  uploading.value = false
  submitting.value = false
  publishing.value = false

  console.log('✓ 页面状态已重置')
}

// 监听路由变化，当进入创建模式时重置状态
watch(
  () => route.path,
  (newPath, oldPath) => {
    // 如果是从其他页面进入创建页面（非编辑模式），重置状态
    if (newPath.includes('/create') && !isEditMode.value && oldPath !== newPath) {
      console.log('路由变化，重置创建页面状态', { newPath, oldPath })
      resetAllState()
    }
  }
)

// AI生成内容（保留用于兼容）
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
      additionalRequirements: form.additionalRequirements,
      contentDirections: form.contentDirections,
      teachingMethod: form.teachingMethod
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

// 文件上传处理
const handleFileChange = (file) => {
  uploadedFile.value = file.raw
}

const clearUploadedFile = () => {
  uploadedFile.value = null
  uploadedContent.value = ''
}

// 解析上传的文件
const parseUploadedFile = async () => {
  if (!uploadedFile.value) return

  uploading.value = true
  try {
    const response = await uploadAPI.parseDocument(uploadedFile.value)
    if (response && response.content) {
      uploadedContent.value = response.content
      ElMessage.success(`文件解析成功，提取了 ${response.contentLength} 字内容`)
    }
  } catch (error) {
    console.error('文件解析失败:', error)
    ElMessage.error('文件解析失败: ' + (error.message || '未知错误'))
  } finally {
    uploading.value = false
  }
}

// 根据上传内容生成大纲
const generateOutlineFromContent = async () => {
  if (!uploadedContent.value || uploadedContent.value.length < 50) {
    ElMessage.warning('请先上传或粘贴教案内容（至少50字）')
    return
  }

  generatingOutline.value = true
  startOutlineCountdown()  // 开始大纲倒计时
  try {
    const response = await uploadAPI.generateOutline({
      content: uploadedContent.value,
      courseName: form.courseName,
      courseLevel: form.courseLevel,
      major: form.major,
      subject: form.subject,
      teachingMethod: form.teachingMethod,
      contentDirections: form.contentDirections  // 传递内容方向
    })

    if (response) {
      Object.assign(outline, {
        title: response.title || form.subject,
        summary: response.summary || '',
        keywords: response.keywords || [],
        learningObjectives: response.learningObjectives || [],
        sections: response.sections || [],
        finalQuizTopics: response.finalQuizTopics || []
      })
      ElMessage.success('大纲生成成功，请查看并编辑')
    }
  } catch (error) {
    console.error('生成大纲失败:', error)
    ElMessage.error('生成大纲失败: ' + (error.message || '未知错误'))
  } finally {
    generatingOutline.value = false
    stopOutlineCountdown()  // 停止大纲倒计时
  }
}

// 格式化倒计时 mm:ss
const formatCountdown = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// 格式化已用时间
const formatElapsedTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins} 分 ${secs} 秒`
}

// 开始倒计时
const startCountdown = () => {
  aiGenerating.value = true
  countdown.value = 600
  elapsedTime.value = 0
  aiProgress.value = 0

  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
    }
  }, 1000)

  elapsedTimer = setInterval(() => {
    elapsedTime.value++
    aiProgress.value = Math.min((elapsedTime.value / 600) * 100, 100)
  }, 1000)
}

// 停止倒计时
const stopCountdown = () => {
  aiGenerating.value = false
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }
}

// 开始大纲生成倒计时
const startOutlineCountdown = () => {
  outlineGenerating.value = true
  outlineCountdown.value = 180  // 3分钟
  outlineElapsedTime.value = 0
  outlineProgress.value = 0

  outlineCountdownTimer = setInterval(() => {
    outlineCountdown.value--
    if (outlineCountdown.value <= 0) {
      clearInterval(outlineCountdownTimer)
    }
  }, 1000)

  outlineElapsedTimer = setInterval(() => {
    outlineElapsedTime.value++
    outlineProgress.value = Math.min((outlineElapsedTime.value / 180) * 100, 100)
  }, 1000)
}

// 停止大纲生成倒计时
const stopOutlineCountdown = () => {
  outlineGenerating.value = false
  if (outlineCountdownTimer) {
    clearInterval(outlineCountdownTimer)
    outlineCountdownTimer = null
  }
  if (outlineElapsedTimer) {
    clearInterval(outlineElapsedTimer)
    outlineElapsedTimer = null
  }
}

// 根据大纲生成内容
const generateFromOutline = async () => {
  if (!outline.sections || outline.sections.length === 0) {
    ElMessage.warning('请先生成或编辑大纲')
    return
  }

  generating.value = true
  generateError.value = ''
  startCountdown()  // 开始倒计时

  try {
    // 将大纲信息合并到请求中，包含完整的sections数据用于视频占位符后处理
    const response = await aiAPI.generateSimpleContent({
      courseName: form.courseName,
      subject: outline.title || form.subject,
      courseLevel: form.courseLevel,
      major: form.major,
      additionalRequirements: `
教学大纲：
${outline.sections.map((s, i) => `${i + 1}. ${s.title}：${s.description || ''}${s.mediaType === 'video' ? '（含B站视频，章节ID：' + s.id + '）' : ''}${s.mediaType === 'image' && s.imageUrl ? '（含预设图片，章节ID：' + s.id + '）' : ''}${s.mediaType === 'article' && s.articleUrl ? '（含公众号文章链接）' : ''}${s.hasQuiz ? '（含考核点：' + s.quizType + '）' : ''}`).join('\n')}

学习目标：
${outline.learningObjectives.join('\n')}

自测知识点：${outline.finalQuizTopics.join('、')}

${form.additionalRequirements || ''}
      `.trim(),
      contentDirections: form.contentDirections,
      teachingMethod: form.teachingMethod,
      sections: outline.sections  // 传递完整的sections数据，用于后处理替换视频和图片占位符
    })

    if (response && response.content) {
      form.contentHtml = response.content
      ElMessage.success('内容生成成功！')
    } else {
      throw new Error('生成内容格式错误')
    }
  } catch (error) {
    console.error('AI生成失败:', error)
    generateError.value = error.message || '生成失败，请稍后重试'
    ElMessage.error('AI生成失败: ' + (error.message || '未知错误'))
  } finally {
    generating.value = false
    stopCountdown()  // 停止倒计时
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
      router.push('/dashboard/resources')
    } else {
      // 创建模式：创建新资源
      const response = await resourceAPI.create(submitData)
      ElMessage.success('草稿保存成功')
      // 传递新资源ID，用于高亮显示
      router.push({
        path: '/dashboard/resources',
        query: { newResourceId: response.id }
      })
    }
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

    // 新建时传递资源ID，用于高亮显示
    if (!isEditMode.value && response?.id) {
      router.push({
        path: '/dashboard/resources',
        query: { newResourceId: response.id }
      })
    } else {
      router.push('/dashboard/resources')
    }
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

    // 处理 major 字段（后端返回的是数组）
    let majorArray = response.major || []
    // 兼容旧数据：如果是字符串则转为数组
    if (typeof majorArray === 'string') {
      majorArray = majorArray ? [majorArray] : []
    }

    // 填充表单数据
    Object.assign(form, {
      subject: response.title || response.subject || '',
      courseName: response.course_name || '',
      courseLevel: response.course_level || '',
      major: majorArray,
      additionalRequirements: response.additional_requirements || '',
      contentHtml: response.content_html || ''
    })

    // 编辑模式直接跳到第3步
    currentStep.value = 2
    console.log('资源数据加载成功')
  } catch (error) {
    console.error('加载资源失败:', error)
    ElMessage.error('加载资源失败: ' + (error.message || '未知错误'))
    router.push('/dashboard/resources')
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

/* 内容方向和教学法样式 */
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

/* 专业标签样式 */
.major-tags-container {
  width: 100%;
}

.major-tags-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-height: 40px;
  padding: 4px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
}

.major-tags-list:focus-within {
  border-color: #409eff;
}

.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.el-radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.el-radio {
  display: flex;
  align-items: flex-start;
  height: auto;
  white-space: normal;
}

.method-label {
  font-weight: 500;
  margin-right: 8px;
}

.method-desc {
  color: #909399;
  font-size: 12px;
}

/* 大纲生成阶段样式 */
.outline-generation-phase {
  margin-bottom: 20px;
}

.input-tabs {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.quick-outline-panel {
  padding: 40px 20px;
}

.panel-desc {
  text-align: center;
  color: #606266;
  font-size: 14px;
  margin-bottom: 20px;
}

/* 大纲编辑阶段样式 */
.outline-edit-phase {
  margin-top: 20px;
}

.phase-desc {
  text-align: center;
  color: #606266;
  font-size: 14px;
  margin-bottom: 20px;
}

/* 上传区域样式 */
.upload-sub-tabs {
  margin-bottom: 16px;
}

.upload-tabs {
  margin-bottom: 20px;
}

.upload-area {
  padding: 20px 0;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}

.uploaded-file {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.outline-section {
  margin-top: 24px;
}

/* AI 生成倒计时模态框样式 */
.ai-generating-content {
  text-align: center;
  padding: 20px;
}

.ai-generating-content .is-loading {
  margin-bottom: 20px;
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.countdown-container {
  margin: 20px 0;
}

.countdown-time {
  font-size: 48px;
  font-weight: bold;
  color: #409eff;
  font-family: 'Courier New', monospace;
}

.countdown-label {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}

.ai-generating-content .el-alert {
  margin: 20px 0;
  text-align: left;
}

.ai-generating-content .el-alert p {
  margin: 5px 0;
}

.progress-container {
  margin-top: 20px;
}

.progress-text {
  margin-top: 10px;
  font-size: 14px;
  color: #606266;
}

/* 大纲生成倒计时样式（绿色主题） */
.outline-countdown {
  color: #67c23a !important;
}
</style>
