<template>
  <el-dialog
    :model-value="visible"
    title="添加收藏"
    width="600px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-tabs v-model="activeTab">
      <!-- B站视频 -->
      <el-tab-pane label="B站视频" name="bilibili">
        <el-form :model="bilibiliForm" label-width="100px">
          <el-form-item label="视频URL">
            <el-input
              v-model="bilibiliForm.url"
              placeholder="请输入B站视频链接，例如：https://www.bilibili.com/video/BV..."
              @blur="fetchBilibiliMeta"
            >
              <template #append>
                <el-button :loading="bilibiliLoading" @click="fetchBilibiliMeta">
                  获取信息
                </el-button>
              </template>
            </el-input>
          </el-form-item>

          <!-- 视频预览 -->
          <div v-if="bilibiliMeta" class="meta-preview">
            <div class="preview-thumbnail">
              <img :src="bilibiliMeta.thumbnailUrl" alt="封面" />
              <span class="duration">{{ formatDuration(bilibiliMeta.videoDuration) }}</span>
            </div>
            <div class="preview-info">
              <h4>{{ bilibiliMeta.title }}</h4>
              <p class="meta-author">
                <el-icon><User /></el-icon>
                {{ bilibiliMeta.authorName }}
              </p>
              <p class="meta-stats">
                <span><el-icon><View /></el-icon> {{ formatPlayCount(bilibiliMeta.playCount) }} 播放</span>
              </p>
            </div>
          </div>
        </el-form>
      </el-tab-pane>

      <!-- 公众号文章 -->
      <el-tab-pane label="公众号文章" name="wechat">
        <el-form :model="wechatForm" label-width="100px">
          <el-form-item label="文章URL">
            <el-input
              v-model="wechatForm.url"
              placeholder="请输入微信公众号文章链接"
              @blur="fetchWechatMeta"
            >
              <template #append>
                <el-button :loading="wechatLoading" @click="fetchWechatMeta">
                  获取信息
                </el-button>
              </template>
            </el-input>
          </el-form-item>

          <!-- 文章预览 -->
          <div v-if="wechatMeta" class="meta-preview">
            <div class="preview-thumbnail" v-if="wechatMeta.thumbnailUrl">
              <img :src="wechatMeta.thumbnailUrl" alt="封面" />
            </div>
            <div class="preview-info">
              <h4>{{ wechatMeta.title }}</h4>
              <p class="meta-author">
                <el-icon><ChatLineSquare /></el-icon>
                {{ wechatMeta.articleAuthor }}
              </p>
              <p class="meta-time" v-if="wechatMeta.publishTime">
                发布时间：{{ wechatMeta.publishTime }}
              </p>
              <p class="meta-desc" v-if="wechatMeta.description">
                {{ wechatMeta.description }}
              </p>
            </div>
          </div>
        </el-form>
      </el-tab-pane>

      <!-- 图片 -->
      <el-tab-pane label="图片" name="image">
        <el-form :model="imageForm" label-width="100px">
          <el-form-item label="添加方式">
            <el-radio-group v-model="imageForm.mode">
              <el-radio value="url">图片URL</el-radio>
              <el-radio value="upload">本地上传</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="imageForm.mode === 'url'" label="图片URL">
            <el-input
              v-model="imageForm.url"
              placeholder="请输入图片URL"
            >
              <template #append>
                <el-button :loading="imageLoading" @click="fetchImage">
                  获取图片
                </el-button>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item v-else label="选择图片">
            <el-upload
              ref="uploadRef"
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              @change="handleImageSelect"
            >
              <el-button type="primary">
                <el-icon><Upload /></el-icon>
                选择图片
              </el-button>
            </el-upload>
          </el-form-item>

          <!-- 图片预览 -->
          <div v-if="imagePreview" class="image-preview">
            <div class="preview-wrapper">
              <img :src="imagePreview" alt="预览" />
              <el-button
                class="delete-btn"
                type="danger"
                size="small"
                circle
                @click="clearImagePreview"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
            <p v-if="imageForm.filename">{{ imageForm.filename }}</p>
          </div>

          <el-form-item label="图片标题">
            <el-input
              v-model="imageForm.title"
              placeholder="请输入图片标题（可选）"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        添加收藏
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { User, View, ChatLineSquare, Upload, Close } from '@element-plus/icons-vue'
import { favoriteAPI } from '@/api/favorite'

const props = defineProps({
  visible: Boolean,
  folderId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

const activeTab = ref('bilibili')
const submitting = ref(false)

// B站视频
const bilibiliForm = reactive({ url: '' })
const bilibiliMeta = ref(null)
const bilibiliLoading = ref(false)

// 公众号文章
const wechatForm = reactive({ url: '' })
const wechatMeta = ref(null)
const wechatLoading = ref(false)

// 图片
const imageForm = reactive({
  mode: 'url',
  url: '',
  file: null,
  filename: '',
  title: ''
})
const imagePreview = ref(null)
const imageLoading = ref(false)
const imageUploadResult = ref(null)  // 存储图片上传结果
const uploadRef = ref(null)

// 重置表单
const resetForms = () => {
  bilibiliForm.url = ''
  bilibiliMeta.value = null
  wechatForm.url = ''
  wechatMeta.value = null
  imageForm.mode = 'url'
  imageForm.url = ''
  imageForm.file = null
  imageForm.filename = ''
  imageForm.title = ''
  imagePreview.value = null
  imageUploadResult.value = null
}

watch(() => props.visible, (val) => {
  if (!val) {
    resetForms()
  }
})

// 获取B站视频信息
const fetchBilibiliMeta = async () => {
  if (!bilibiliForm.url) return

  bilibiliLoading.value = true
  try {
    const response = await favoriteAPI.fetchBilibiliMeta(bilibiliForm.url)
    // 注意：request.js响应拦截器已经解包了data，直接使用response
    if (response) {
      bilibiliMeta.value = response
    }
  } catch (error) {
    ElMessage.error(error.message || '获取视频信息失败')
    bilibiliMeta.value = null
  } finally {
    bilibiliLoading.value = false
  }
}

// 获取公众号文章信息
const fetchWechatMeta = async () => {
  if (!wechatForm.url) return

  wechatLoading.value = true
  try {
    const response = await favoriteAPI.fetchWechatMeta(wechatForm.url)
    // 注意：request.js响应拦截器已经解包了data，直接使用response
    if (response) {
      wechatMeta.value = response
    }
  } catch (error) {
    ElMessage.error(error.message || '获取文章信息失败')
    wechatMeta.value = null
  } finally {
    wechatLoading.value = false
  }
}

// 选择图片
const handleImageSelect = (uploadFile) => {
  const file = uploadFile.raw
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }

  imageForm.file = file
  imageForm.filename = file.name
  imageUploadResult.value = null  // 清除之前的上传结果

  // 生成预览
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

// 从URL获取图片
const fetchImage = async () => {
  if (!imageForm.url) {
    ElMessage.warning('请输入图片URL')
    return
  }

  imageLoading.value = true
  try {
    const response = await favoriteAPI.uploadImage({ url: imageForm.url })
    // 注意：request.js响应拦截器已经解包了data，直接使用response
    if (response) {
      imageUploadResult.value = response
      imagePreview.value = imageForm.url
      imageForm.filename = response.originalFilename || '图片'
      ElMessage.success('图片获取成功')
    }
  } catch (error) {
    ElMessage.error(error.message || '获取图片失败')
    imageUploadResult.value = null
    imagePreview.value = null
  } finally {
    imageLoading.value = false
  }
}

// 清除图片预览
const clearImagePreview = () => {
  imagePreview.value = null
  imageForm.file = null
  imageForm.filename = ''
  imageForm.url = ''
  imageUploadResult.value = null
}

// 格式化
const formatDuration = (seconds) => favoriteAPI.formatDuration(seconds)
const formatPlayCount = (count) => favoriteAPI.formatPlayCount(count)

// 提交
const handleSubmit = async () => {
  submitting.value = true

  try {
    let favoriteData = null

    if (activeTab.value === 'bilibili') {
      if (!bilibiliMeta.value) {
        ElMessage.warning('请先获取视频信息')
        submitting.value = false
        return
      }
      favoriteData = {
        type: 'bilibili',
        title: bilibiliMeta.value.title,
        description: bilibiliMeta.value.description,
        thumbnailUrl: bilibiliMeta.value.thumbnailUrl,
        sourceUrl: bilibiliMeta.value.sourceUrl,
        bvid: bilibiliMeta.value.bvid,
        videoDuration: bilibiliMeta.value.videoDuration,
        authorName: bilibiliMeta.value.authorName,
        playCount: bilibiliMeta.value.playCount,
        folderId: props.folderId
      }
    } else if (activeTab.value === 'wechat') {
      if (!wechatMeta.value) {
        ElMessage.warning('请先点击"获取信息"按钮获取文章信息')
        submitting.value = false
        return
      }
      // 验证必要字段
      if (!wechatMeta.value.title || !wechatMeta.value.sourceUrl) {
        ElMessage.warning('文章信息不完整，请重新获取')
        submitting.value = false
        return
      }
      favoriteData = {
        type: 'wechat_article',
        title: wechatMeta.value.title,
        description: wechatMeta.value.description || '',
        thumbnailUrl: wechatMeta.value.thumbnailUrl || '',
        sourceUrl: wechatMeta.value.sourceUrl,
        articleAuthor: wechatMeta.value.articleAuthor || '',
        publishTime: wechatMeta.value.publishTime || '',
        folderId: props.folderId
      }
    } else if (activeTab.value === 'image') {
      // 先上传/下载图片
      let imageResult = null

      if (imageForm.mode === 'url') {
        if (!imageForm.url) {
          ElMessage.warning('请输入图片URL')
          submitting.value = false
          return
        }
        // 如果已经通过"获取图片"按钮预先上传，直接使用结果
        if (imageUploadResult.value) {
          imageResult = imageUploadResult.value
        } else {
          // 否则现在上传（注意：响应拦截器已解包data，直接使用response）
          const uploadResponse = await favoriteAPI.uploadImage({ url: imageForm.url })
          imageResult = uploadResponse
        }
      } else {
        if (!imageForm.file) {
          ElMessage.warning('请选择图片')
          submitting.value = false
          return
        }
        // 注意：响应拦截器已解包data，直接使用response
        const uploadResponse = await favoriteAPI.uploadImage({ file: imageForm.file })
        imageResult = uploadResponse
      }

      if (!imageResult) {
        ElMessage.error('图片处理失败，请重试')
        submitting.value = false
        return
      }

      favoriteData = {
        type: 'image',
        title: imageForm.title || imageResult.originalFilename || '未命名图片',
        sourceUrl: imageResult.sourceUrl || imageForm.url || 'local-upload',
        localPath: imageResult.localPath,
        originalFilename: imageResult.originalFilename,
        fileSize: imageResult.fileSize,
        mimeType: imageResult.mimeType,
        width: imageResult.width,
        height: imageResult.height,
        folderId: props.folderId
      }
    }

    // 创建收藏
    await favoriteAPI.create(favoriteData)
    ElMessage.success('收藏添加成功')
    emit('update:visible', false)
    emit('success')
  } catch (error) {
    ElMessage.error(error.message || '添加收藏失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.meta-preview {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-top: 16px;
}

.preview-thumbnail {
  position: relative;
  width: 160px;
  height: 100px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
}

.preview-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-thumbnail .duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
  border-radius: 4px;
}

.preview-info {
  flex: 1;
  overflow: hidden;
}

.preview-info h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.4;
}

.meta-author,
.meta-stats,
.meta-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #64748b;
  margin: 4px 0;
}

.meta-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.image-preview {
  text-align: center;
  margin-top: 16px;
}

.image-preview .preview-wrapper {
  position: relative;
  display: inline-block;
}

.image-preview img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
}

.image-preview .delete-btn {
  position: absolute;
  top: -10px;
  right: -10px;
}

.image-preview p {
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;
}
</style>
