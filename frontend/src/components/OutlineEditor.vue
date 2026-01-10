<template>
  <div class="outline-editor">
    <!-- 大纲标题和概述 -->
    <div class="outline-header">
      <el-input
        v-model="localOutline.title"
        placeholder="教学主题"
        size="large"
        class="outline-title-input"
      />
      <el-input
        v-model="localOutline.summary"
        type="textarea"
        :rows="2"
        placeholder="内容概述（50字以内）"
        maxlength="100"
        show-word-limit
      />
    </div>

    <!-- 关键字/标签 -->
    <el-card class="keywords-card">
      <template #header>
        <div class="card-header">
          <span>关键字/标签</span>
          <el-text type="info" size="small">用于全站标签系统，最多5个</el-text>
        </div>
      </template>
      <div class="keywords-list">
        <el-tag
          v-for="(keyword, index) in localOutline.keywords"
          :key="index"
          closable
          @close="removeKeyword(index)"
          style="margin: 4px"
        >
          {{ keyword }}
        </el-tag>
        <el-input
          v-if="localOutline.keywords.length < 5"
          v-model="newKeyword"
          placeholder="添加关键字"
          size="small"
          style="width: 150px; margin: 4px"
          @blur="handleKeywordBlur"
          @keyup.enter="addKeyword"
        >
          <template #append>
            <el-button @click="addKeyword">
              <el-icon><Plus /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>
      <el-text v-if="localOutline.keywords.length >= 5" type="warning" size="small">
        已达到最大关键字数量
      </el-text>
    </el-card>

    <!-- 学习目标 -->
    <el-card class="objectives-card">
      <template #header>
        <div class="card-header">
          <span>学习目标</span>
          <el-button type="primary" link @click="addObjective">
            <el-icon><Plus /></el-icon> 添加
          </el-button>
        </div>
      </template>
      <div class="objectives-list">
        <div
          v-for="(obj, index) in localOutline.learningObjectives"
          :key="index"
          class="objective-item"
        >
          <span class="objective-number">{{ index + 1 }}.</span>
          <el-input
            v-model="localOutline.learningObjectives[index]"
            placeholder="输入学习目标"
            size="small"
          />
          <el-button type="danger" link @click="removeObjective(index)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 章节列表 -->
    <el-card class="sections-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span>教学内容大纲</span>
            <el-text type="info" size="small" style="margin-left: 12px">
              总时长: {{ totalDuration }} 分钟
            </el-text>
          </div>
          <el-button type="primary" link @click="addSection">
            <el-icon><Plus /></el-icon> 添加章节
          </el-button>
        </div>
      </template>

      <div class="sections-list">
        <div
          v-for="(section, index) in localOutline.sections"
          :key="section.id"
          class="section-item"
          :class="{ 'is-quiz': section.hasQuiz }"
        >
          <!-- 排序按钮 -->
          <div class="section-sort-buttons">
            <el-button
              v-if="index > 0"
              type="primary"
              link
              size="small"
              @click="moveSection(index, 'up')"
              title="上移"
            >
              <el-icon><ArrowUp /></el-icon>
            </el-button>
            <el-button
              v-if="index < localOutline.sections.length - 1"
              type="primary"
              link
              size="small"
              @click="moveSection(index, 'down')"
              title="下移"
            >
              <el-icon><ArrowDown /></el-icon>
            </el-button>
          </div>

          <div class="section-content">
            <div class="section-header">
              <el-tag
                :type="getSectionTypeTag(section.type)"
                size="small"
                class="section-type-tag"
              >
                {{ getSectionTypeName(section.type) }}
              </el-tag>
              <el-input
                v-model="section.title"
                placeholder="章节标题"
                size="small"
                class="section-title-input"
              />
              <!-- 时长输入 -->
              <el-input-number
                v-model="section.duration"
                :min="1"
                :max="90"
                size="small"
                style="width: 100px"
                controls-position="right"
              />
              <el-text type="info" size="small">分钟</el-text>
            </div>

            <el-input
              v-model="section.description"
              type="textarea"
              :rows="2"
              placeholder="章节内容概要"
              size="small"
              class="section-desc-input"
            />

            <div class="section-options">
              <!-- 预设媒体 -->
              <el-select
                v-model="section.mediaType"
                placeholder="预设媒体"
                size="small"
                style="width: 130px"
              >
                <el-option label="无媒体" value="none" />
                <el-option label="预设图片" value="image" />
                <el-option label="B站视频" value="video" />
              </el-select>

              <!-- 考核点配置 -->
              <el-checkbox v-model="section.hasQuiz">
                包含考核点
              </el-checkbox>
              <el-select
                v-if="section.hasQuiz"
                v-model="section.quizType"
                placeholder="题型"
                size="small"
                style="width: 120px; margin-left: 10px"
              >
                <el-option label="单选题" value="choice" />
                <el-option label="排序题" value="order" />
                <el-option label="判断题" value="judge" />
                <el-option label="案例分析" value="case" />
              </el-select>
            </div>
          </div>

          <div class="section-actions">
            <el-button type="danger" link @click="removeSection(index)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 结尾自测 -->
    <el-card class="quiz-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span>结尾自测</span>
            <el-text type="info" size="small" style="margin-left: 12px">
              共 {{ totalQuizCount }} 题 (最多25题)
            </el-text>
          </div>
          <el-button
            v-if="localOutline.finalQuizTopics.length < 5"
            type="primary"
            link
            @click="addQuizTopic"
          >
            <el-icon><Plus /></el-icon> 添加知识点
          </el-button>
        </div>
      </template>

      <div class="quiz-topics-list">
        <div
          v-for="(topic, index) in localOutline.finalQuizTopics"
          :key="index"
          class="quiz-topic-item"
        >
          <el-input
            v-model="topic.topic"
            placeholder="知识点名称"
            size="small"
            style="flex: 1; min-width: 150px"
          />
          <el-select
            v-model="topic.questionType"
            size="small"
            style="width: 100px"
          >
            <el-option label="单选题" value="choice" />
            <el-option label="多选题" value="multiple" />
            <el-option label="判断题" value="judge" />
          </el-select>
          <el-input-number
            v-model="topic.questionCount"
            :min="1"
            :max="5"
            size="small"
            style="width: 90px"
            controls-position="right"
          />
          <el-text type="info" size="small">题</el-text>
          <el-checkbox v-model="topic.randomOrder" size="small">
            随机排序
          </el-checkbox>
          <el-button type="danger" link @click="removeQuizTopic(index)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <el-text v-if="totalQuizCount > 25" type="danger" size="small">
        题目总数超过25题限制，请减少题目数量
      </el-text>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { Plus, Delete, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      title: '',
      summary: '',
      keywords: [],
      learningObjectives: [],
      sections: [],
      finalQuizTopics: []
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 本地数据副本
const localOutline = reactive({
  title: '',
  summary: '',
  keywords: [],
  learningObjectives: [],
  sections: [],
  finalQuizTopics: []
})

// 新增关键字输入
const newKeyword = ref('')

// 计算总时长
const totalDuration = computed(() => {
  return localOutline.sections.reduce((sum, section) => {
    return sum + (section.duration || 0)
  }, 0)
})

// 计算总题数
const totalQuizCount = computed(() => {
  return localOutline.finalQuizTopics.reduce((sum, topic) => {
    return sum + (topic.questionCount || 0)
  }, 0)
})

// 初始化和同步数据
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      Object.assign(localOutline, {
        title: newVal.title || '',
        summary: newVal.summary || '',
        keywords: [...(newVal.keywords || [])],
        learningObjectives: [...(newVal.learningObjectives || [])],
        sections: (newVal.sections || []).map(s => ({
          id: s.id || `section-${Date.now()}-${Math.random()}`,
          title: s.title || '',
          type: s.type || 'content',
          description: s.description || '',
          duration: s.duration || 15,
          mediaType: normalizeMediaType(s.mediaType),
          hasQuiz: s.hasQuiz || false,
          quizType: normalizeQuizType(s.quizType),
          keyPoints: s.keyPoints || []
        })),
        finalQuizTopics: (newVal.finalQuizTopics || []).map(t => {
          // 兼容旧的字符串格式
          if (typeof t === 'string') {
            return {
              topic: t,
              questionType: 'choice',
              questionCount: 1,
              randomOrder: true
            }
          }
          return {
            topic: t.topic || '',
            questionType: normalizeQuestionType(t.questionType),
            questionCount: t.questionCount || 1,
            randomOrder: t.randomOrder !== false
          }
        })
      })
    }
  },
  { immediate: true, deep: true }
)

// 同步到父组件
watch(
  localOutline,
  (newVal) => {
    emit('update:modelValue', { ...newVal })
  },
  { deep: true }
)

// 规范化媒体类型，确保值在下拉选项中
function normalizeMediaType(type) {
  const validTypes = ['none', 'image', 'video']
  return validTypes.includes(type) ? type : 'none'
}

// 规范化考核点题型，确保值在下拉选项中
function normalizeQuizType(type) {
  const validTypes = ['choice', 'order', 'judge', 'case']
  return validTypes.includes(type) ? type : 'choice'
}

// 规范化自测题型，确保值在下拉选项中
function normalizeQuestionType(type) {
  const validTypes = ['choice', 'multiple', 'judge']
  return validTypes.includes(type) ? type : 'choice'
}

// 关键字操作
const addKeyword = () => {
  if (localOutline.keywords.length >= 5) {
    ElMessage.warning('最多只能添加5个关键字')
    return
  }

  const keyword = newKeyword.value.trim()
  if (!keyword) return

  // 校验：只允许中文、英文、数字
  const keywordPattern = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/
  if (!keywordPattern.test(keyword)) {
    ElMessage.error('关键字只能包含中文、英文或数字，不能有标点符号')
    return
  }

  // 检查重复
  if (localOutline.keywords.includes(keyword)) {
    ElMessage.warning('该关键字已存在')
    return
  }

  localOutline.keywords.push(keyword)
  newKeyword.value = ''
}

const removeKeyword = (index) => {
  localOutline.keywords.splice(index, 1)
}

const handleKeywordBlur = () => {
  if (newKeyword.value.trim()) {
    addKeyword()
  }
}

// 学习目标操作
const addObjective = () => {
  localOutline.learningObjectives.push('')
}

const removeObjective = (index) => {
  localOutline.learningObjectives.splice(index, 1)
}

// 章节操作
const addSection = () => {
  const newId = `section-${Date.now()}`
  localOutline.sections.push({
    id: newId,
    title: '',
    type: 'content',
    description: '',
    duration: 15,
    mediaType: 'none',
    hasQuiz: false,
    quizType: 'choice',
    keyPoints: []
  })
}

const removeSection = (index) => {
  localOutline.sections.splice(index, 1)
}

// 章节移动（上移/下移）
const moveSection = (index, direction) => {
  if (direction === 'up' && index > 0) {
    // 上移：与上一个元素交换位置
    const temp = localOutline.sections[index]
    localOutline.sections[index] = localOutline.sections[index - 1]
    localOutline.sections[index - 1] = temp
    ElMessage.success('章节已上移')
  } else if (direction === 'down' && index < localOutline.sections.length - 1) {
    // 下移：与下一个元素交换位置
    const temp = localOutline.sections[index]
    localOutline.sections[index] = localOutline.sections[index + 1]
    localOutline.sections[index + 1] = temp
    ElMessage.success('章节已下移')
  }
}

// 章节类型
const getSectionTypeName = (type) => {
  const types = {
    content: '内容',
    quiz: '考核',
    summary: '总结'
  }
  return types[type] || '内容'
}

const getSectionTypeTag = (type) => {
  const tags = {
    content: 'primary',
    quiz: 'warning',
    summary: 'success'
  }
  return tags[type] || 'primary'
}

// 结尾自测操作
const addQuizTopic = () => {
  if (localOutline.finalQuizTopics.length >= 5) {
    ElMessage.warning('最多只能添加5个知识点')
    return
  }

  if (totalQuizCount.value >= 25) {
    ElMessage.warning('题目总数已达到25题上限')
    return
  }

  localOutline.finalQuizTopics.push({
    topic: '',
    questionType: 'choice',
    questionCount: 1,
    randomOrder: true
  })
}

const removeQuizTopic = (index) => {
  localOutline.finalQuizTopics.splice(index, 1)
}
</script>

<style scoped>
.outline-editor {
  padding: 16px 0;
}

.outline-header {
  margin-bottom: 20px;
}

.outline-title-input {
  margin-bottom: 12px;
}

.outline-title-input :deep(.el-input__inner) {
  font-size: 18px;
  font-weight: 600;
}

.keywords-card,
.objectives-card,
.sections-card,
.quiz-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.objectives-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.objective-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.objective-number {
  color: #909399;
  min-width: 20px;
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 排序按钮 */
.section-sort-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px;
  margin-right: 8px;
  min-width: 32px;
}

.section-sort-buttons .el-button {
  padding: 4px;
  margin: 0;
}

.section-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  transition: all 0.3s;
}

.section-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.section-item.is-quiz {
  border-left: 3px solid #e6a23c;
}

.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.section-type-tag {
  flex-shrink: 0;
}

.section-title-input {
  flex: 1;
  min-width: 200px;
}

.section-desc-input {
  margin-top: 4px;
}

.section-options {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.section-actions {
  padding: 8px;
  flex-shrink: 0;
}

/* ���尾自测列表 */
.quiz-topics-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quiz-topic-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>
