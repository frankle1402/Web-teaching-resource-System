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
          :class="{ 'has-media': section.mediaType && section.mediaType !== 'none' }"
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
                <el-option label="公众号文章" value="article" />
              </el-select>

              <!-- B站视频地址输入（仅当选择B站视频时显示） -->
              <div v-if="section.mediaType === 'video'" class="media-input-group" style="flex: 1; min-width: 300px; display: flex; align-items: center; gap: 8px;">
                <el-input
                  v-model="section.videoUrl"
                  placeholder="粘贴B站视频地址，如 https://www.bilibili.com/video/BV..."
                  size="small"
                  style="flex: 1"
                  clearable
                  @blur="handleVideoUrlChange(section)"
                >
                  <template #prepend>B站链接</template>
                </el-input>
                <el-button type="primary" size="small" @click="openResourcePicker(section, 'video')">
                  <el-icon><Link /></el-icon> 从收藏夹添加
                </el-button>
              </div>

              <!-- 图片上传（仅当选择预设图片时显示） -->
              <div v-if="section.mediaType === 'image'" class="image-upload-area" style="flex: 1; min-width: 300px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <el-upload
                  :action="uploadUrl"
                  :headers="uploadHeaders"
                  :on-success="(res) => handleImageUpload(res, section)"
                  :on-error="handleImageUploadError"
                  :show-file-list="false"
                  accept="image/*"
                >
                  <el-button type="primary" size="small">
                    <el-icon><Upload /></el-icon> 上传
                  </el-button>
                </el-upload>
                <el-input
                  v-model="section.imageInputUrl"
                  placeholder="或输入图片URL"
                  size="small"
                  style="width: 200px"
                  clearable
                  @blur="handleImageUrlInput(section)"
                />
                <!-- 图片预览 -->
                <div v-if="section.imageUrl" class="image-preview-mini" style="display: flex; align-items: center; gap: 8px;">
                  <img :src="section.imageUrl" alt="预览" style="max-width: 60px; max-height: 40px; border-radius: 4px; object-fit: cover;" />
                  <el-input
                    v-model="section.imageCaption"
                    placeholder="图片说明"
                    size="small"
                    style="width: 120px"
                  />
                  <el-button type="danger" size="small" link @click="clearSectionImage(section)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <!-- 从收藏夹添加按钮永远在最右侧 -->
                <el-button type="success" size="small" @click="openResourcePicker(section, 'image')" style="margin-left: auto;">
                  <el-icon><Link /></el-icon> 从收藏夹添加
                </el-button>
              </div>

              <!-- 公众号文章输入（仅当选择公众号文章时显示） -->
              <div v-if="section.mediaType === 'article'" class="article-input-group" style="flex: 1; min-width: 300px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <el-input
                  v-model="section.articleUrl"
                  placeholder="粘贴公众号文章地址"
                  size="small"
                  style="width: 280px"
                  clearable
                  @blur="handleArticleUrlChange(section)"
                >
                  <template #prepend>公众号</template>
                </el-input>
                <!-- 公众号文章元数据显示在链接旁边 -->
                <div v-if="section.articleTitle" class="article-preview-card" style="display: flex; align-items: center; gap: 8px; padding: 4px 8px; background: #f5f7fa; border-radius: 4px;">
                  <el-text size="small" :title="section.articleTitle" style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ section.articleTitle }}
                  </el-text>
                  <el-button type="danger" size="small" link @click="section.articleUrl = ''; section.articleTitle = ''; section.articleCover = ''">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <!-- 从收藏夹添加按钮永远在最右侧 -->
                <el-button type="primary" size="small" @click="openResourcePicker(section, 'article')" style="margin-left: auto;">
                  <el-icon><Link /></el-icon> 从收藏夹添加
                </el-button>
              </div>
            </div>

            <!-- 考核点配置（单独一行） -->
            <div class="section-quiz-options">
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

    <!-- 资源选择器对话框 -->
    <ResourcePickerDialog
      v-model:visible="resourcePickerVisible"
      :type="currentPickerType"
      @confirm="handleResourcePicked"
    />
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { Plus, Delete, ArrowUp, ArrowDown, Upload, Link } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ResourcePickerDialog from '@/components/ResourcePicker/ResourcePickerDialog.vue'
import { favoriteAPI } from '@/api/favorite'

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

// 资源选择器对话框状态
const resourcePickerVisible = ref(false)
const currentPickerSection = ref(null)  // 当前正在编辑的章节
const currentPickerType = ref('all')  // 'video' | 'image' | 'article'

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
          videoUrl: s.videoUrl || '',
          videoEmbedCode: s.videoEmbedCode || '',
          imageUrl: s.imageUrl || '',
          imageInputUrl: s.imageInputUrl || '',
          imageCaption: s.imageCaption || '',
          articleUrl: s.articleUrl || '',
          articleTitle: s.articleTitle || '',
          articleCover: s.articleCover || '',
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
  const validTypes = ['none', 'image', 'video', 'article']
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
    videoUrl: '',
    videoEmbedCode: '',
    imageUrl: '',
    imageInputUrl: '',
    imageCaption: '',
    articleUrl: '',
    articleTitle: '',
    articleCover: '',
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

/**
 * 从B站视频URL中提取BV号
 * @param {string} url - B站视频URL
 * @returns {string|null} - BV号或null
 */
const extractBilibiliVideoId = (url) => {
  if (!url) return null

  // 匹配 BV 号的正则表达式
  // 支持格式:
  // - https://www.bilibili.com/video/BV1GM41197Tx/
  // - https://www.bilibili.com/video/BV1GM41197Tx?spm_id_from=xxx
  // - https://b23.tv/BV1GM41197Tx
  // - BV1GM41197Tx
  const bvMatch = url.match(/BV[a-zA-Z0-9]+/)
  if (bvMatch) {
    return bvMatch[0]
  }

  return null
}

/**
 * 生成B站视频嵌入代码
 * @param {string} bvid - B站视频BV号
 * @returns {string} - 嵌入代码
 */
const generateBilibiliEmbedCode = (bvid) => {
  if (!bvid) return ''

  // 生成自适应的嵌入代码，最小高度600px确保视频画面不会过小
  return `<div class="video-container" style="position: relative; width: 100%; min-height: 600px; aspect-ratio: 16/9; overflow: hidden;">
  <iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0" scrolling="no" frameborder="no" allowfullscreen="true" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; min-height: 600px;"></iframe>
</div>`
}

// ========== 图片上传相关 ==========

/**
 * 图片上传URL（使用收藏模块的上传接口）
 */
const uploadUrl = '/api/favorites/upload/image'

/**
 * 上传请求头（包含认证token）
 */
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

/**
 * 处理图片上传失败
 * @param {Error} error - 错误对象
 */
const handleImageUploadError = (error) => {
  console.error('图片上传错误:', error)
  ElMessage.error('图片上传失败，请重试')
}

// ========== 资源选择器相关 ==========

/**
 * 打开资源选择器
 * @param {Object} section - 当前章节对象
 * @param {string} type - 资源类型 ('video' | 'image' | 'article')
 */
const openResourcePicker = (section, type) => {
  currentPickerSection.value = section
  currentPickerType.value = type
  resourcePickerVisible.value = true
}

/**
 * 处理资源选中
 * @param {Object} resource - 选中的资源对象
 */
const handleResourcePicked = (resource) => {
  if (!currentPickerSection.value) return

  const section = currentPickerSection.value

  if (resource.type === 'bilibili') {
    // B站视频
    section.mediaType = 'video'
    section.videoUrl = resource.sourceUrl
    section.videoEmbedCode = resource.embedCode
  } else if (resource.type === 'image') {
    // 图片
    section.mediaType = 'image'
    section.imageUrl = resource.localPath ? favoriteAPI.getImageUrl(resource.localPath) : resource.sourceUrl
  } else if (resource.type === 'wechat_article') {
    // 公众号文章
    section.mediaType = 'article'
    section.articleUrl = resource.sourceUrl
    section.articleTitle = resource.title
    section.articleCover = resource.thumbnailUrl
  }

  ElMessage.success('资源已添加')
  currentPickerSection.value = null
}

// ========== 图片相关 ==========

/**
 * 处理图片URL输入
 * @param {Object} section - 章节对象
 */
const handleImageUrlInput = async (section) => {
  const url = section.imageInputUrl?.trim()
  if (!url) return

  try {
    // 上传图片到服务器
    const result = await favoriteAPI.uploadImage({ url })
    if (result && result.localPath) {
      section.imageUrl = favoriteAPI.getImageUrl(result.localPath)
      ElMessage.success('图片已添加')

      // 自动收藏
      await favoriteAPI.create({
        type: 'image',
        title: result.originalFilename || '图片',
        sourceUrl: url,
        localPath: result.localPath,
        originalFilename: result.originalFilename,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        folderId: null
      }).catch(() => {})
    }
  } catch (error) {
    console.error('获取图片失败:', error)
    // 直接使用URL
    section.imageUrl = url
  }
}

/**
 * 清除章节图片
 * @param {Object} section - 章节对象
 */
const clearSectionImage = (section) => {
  section.imageUrl = ''
  section.imageInputUrl = ''
  section.imageCaption = ''
}

// ========== 公众号文章相关 ==========

/**
 * 处理公众号文章URL变化
 * @param {Object} section - 章节对象
 */
const handleArticleUrlChange = async (section) => {
  const url = section.articleUrl?.trim()
  if (!url) {
    section.articleTitle = ''
    section.articleCover = ''
    return
  }

  // 验证是否为公众号链接
  if (!url.includes('mp.weixin.qq.com')) {
    ElMessage.warning('请输入有效的微信公众号文章链接')
    return
  }

  try {
    // 获取公众号文章元数据
    const meta = await favoriteAPI.fetchWechatMeta(url)
    if (meta) {
      section.articleTitle = meta.title
      section.articleCover = meta.thumbnailUrl

      // 自动收藏到收藏夹（未分类）
      await autoAddToFavorite('wechat_article', meta, url)
    }
  } catch (error) {
    console.error('获取公众号文章信息失败:', error)
    // 即使获取失败也���阻止用户继续使用
  }
}

// ========== 自动收藏功能 ==========

/**
 * 自动添加资源到收藏夹（未分类）
 * @param {string} type - 资源类型
 * @param {Object} meta - 元数据
 * @param {string} url - 原始URL
 */
const autoAddToFavorite = async (type, meta, url) => {
  try {
    const favoriteData = {
      type,
      title: meta.title,
      sourceUrl: url,
      folderId: null, // 未分类
      description: meta.description || '',
      thumbnailUrl: meta.thumbnailUrl || ''
    }

    // B站视频特有字段
    if (type === 'bilibili') {
      favoriteData.bvid = meta.bvid
      favoriteData.videoDuration = meta.videoDuration
      favoriteData.authorName = meta.authorName
      favoriteData.playCount = meta.playCount
    }

    // 公众号文章特有字段
    if (type === 'wechat_article') {
      favoriteData.articleAuthor = meta.articleAuthor
      favoriteData.publishTime = meta.publishTime
    }

    // 调用收藏API，如果已存在会返回错误（我们静默忽略）
    await favoriteAPI.create(favoriteData)
    console.log('✓ 自动收藏成功:', meta.title)
  } catch (error) {
    // 如果是"已存在"错误，静默忽略
    const errorMsg = error.message || error.toString()
    if (errorMsg.includes('已收藏') || errorMsg.includes('已存在') || errorMsg.includes('FAVORITE_EXISTS')) {
      console.log('资源已在收藏夹中，跳过')
      return
    }
    console.error('自动收藏失败:', error)
  }
}

// 更新B站视频URL处理，添加自动收藏
const handleVideoUrlChange = (section) => {
  const url = section.videoUrl?.trim()
  if (!url) {
    section.videoEmbedCode = ''
    return
  }

  const bvid = extractBilibiliVideoId(url)
  if (bvid) {
    section.videoEmbedCode = generateBilibiliEmbedCode(bvid)
    ElMessage.success(`已识别B站视频: ${bvid}`)

    // 自动收藏
    favoriteAPI.fetchBilibiliMeta(url).then(meta => {
      autoAddToFavorite('bilibili', meta, url)
    }).catch(err => {
      console.error('获取B站视频元数据失败:', err)
    })
  } else {
    section.videoEmbedCode = ''
    ElMessage.warning('无法识别B站视频地址，请确保包含BV号')
  }
}

// 更新图片上传处理，添加自动收藏
const handleImageUpload = (response, section) => {
  // 响应格式: { success: true, data: { localPath, originalFilename, ... } }
  const uploadData = response.success ? response.data : response

  if (uploadData && uploadData.localPath) {
    section.imageUrl = favoriteAPI.getImageUrl(uploadData.localPath)
    ElMessage.success('图片上传成功')

    // 自动收藏图片
    favoriteAPI.create({
      type: 'image',
      title: uploadData.originalFilename || '图片',
      sourceUrl: uploadData.sourceUrl || 'local-upload',
      localPath: uploadData.localPath,
      originalFilename: uploadData.originalFilename,
      fileSize: uploadData.fileSize,
      mimeType: uploadData.mimeType,
      folderId: null
    }).catch(() => {})
  } else {
    ElMessage.error(response.error?.message || '图片上传失败')
  }
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

/* 有媒体时左侧显示金黄色边框 */
.section-item.has-media {
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

/* 考核点配置行（单独一行） */
.section-quiz-options {
  display: flex;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e4e7ed;
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
