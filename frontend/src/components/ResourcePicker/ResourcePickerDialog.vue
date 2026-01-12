<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="900px"
    top="5vh"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-tabs v-model="activeTab">
      <!-- 从收藏夹选择 -->
      <el-tab-pane label="从我的收藏" name="favorites">
        <div class="picker-content">
          <!-- 左侧文件夹树 -->
          <div class="picker-sidebar">
            <div class="sidebar-header">
              <h4>收藏夹</h4>
            </div>
            <div class="folder-list">
              <div
                class="folder-item"
                :class="{ active: selectedFolderId === 'all' }"
                @click="selectedFolderId = 'all'"
              >
                <el-icon><Star /></el-icon>
                全部收藏
              </div>
              <div
                v-for="folder in folderTree"
                :key="folder.id"
                class="folder-item"
                :class="{ active: selectedFolderId === folder.id }"
                @click="selectedFolderId = folder.id"
              >
                <el-icon><Folder /></el-icon>
                {{ folder.name }}
              </div>
            </div>

            <!-- 类型筛选 -->
            <div class="type-filter" v-if="!type || type === 'all'">
              <h4>资源类型</h4>
              <el-radio-group v-model="filterType" size="small">
                <el-radio-button value="">全部</el-radio-button>
                <el-radio-button value="bilibili">视频</el-radio-button>
                <el-radio-button value="wechat_article">文章</el-radio-button>
                <el-radio-button value="image">图片</el-radio-button>
              </el-radio-group>
            </div>
          </div>

          <!-- 右侧收藏列表 -->
          <div class="picker-main">
            <div class="search-bar">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索收藏..."
                clearable
                @input="handleSearch"
              >
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
            </div>

            <el-scrollbar class="favorite-list" v-loading="loading">
              <el-empty v-if="!loading && favorites.length === 0" description="暂无收藏" />

              <div
                v-for="item in favorites"
                :key="item.id"
                class="favorite-item"
                :class="{ selected: isSelected(item.id) }"
                @click="toggleSelect(item)"
              >
                <div class="item-thumbnail">
                  <img v-if="item.thumbnail_url" :src="item.thumbnail_url" alt="" />
                  <el-icon v-else class="no-thumb">
                    <VideoPlay v-if="item.type === 'bilibili'" />
                    <ChatLineSquare v-else-if="item.type === 'wechat_article'" />
                    <Picture v-else />
                  </el-icon>
                </div>
                <div class="item-info">
                  <div class="item-title">{{ item.title }}</div>
                  <div class="item-meta">
                    <el-tag size="small" :type="getTypeTagType(item.type)">
                      {{ getTypeName(item.type) }}
                    </el-tag>
                    <span v-if="item.author_name">{{ item.author_name }}</span>
                    <span v-else-if="item.article_author">{{ item.article_author }}</span>
                  </div>
                </div>
                <el-checkbox v-if="multiple" :model-value="isSelected(item.id)" @click.stop />
              </div>
            </el-scrollbar>
          </div>
        </div>
      </el-tab-pane>

      <!-- 添加B站视频 -->
      <el-tab-pane v-if="!type || type === 'all' || type === 'video'" label="添加B站视频" name="bilibili">
        <div class="add-content">
          <el-form label-width="100px">
            <el-form-item label="视频URL">
              <el-input
                v-model="bilibiliUrl"
                placeholder="请输入B站视频链接，例如：https://www.bilibili.com/video/BV..."
              >
                <template #append>
                  <el-button :loading="fetchingBilibili" @click="fetchBilibili">
                    获取信息
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-form>

          <div v-if="bilibiliMeta" class="meta-preview">
            <div class="preview-thumbnail">
              <img :src="bilibiliMeta.thumbnailUrl" alt="封面" />
              <span class="duration">{{ formatDuration(bilibiliMeta.videoDuration) }}</span>
            </div>
            <div class="preview-info">
              <h4>{{ bilibiliMeta.title }}</h4>
              <p><el-icon><User /></el-icon> {{ bilibiliMeta.authorName }}</p>
              <p><el-icon><View /></el-icon> {{ formatPlayCount(bilibiliMeta.playCount) }} 播放</p>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 添加公众号文章 -->
      <el-tab-pane v-if="!type || type === 'all' || type === 'article'" label="添加公众号文章" name="wechat">
        <div class="add-content">
          <el-form label-width="100px">
            <el-form-item label="文章URL">
              <el-input
                v-model="wechatUrl"
                placeholder="请输入微信公众号文章链接"
              >
                <template #append>
                  <el-button :loading="fetchingWechat" @click="fetchWechat">
                    获取信息
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-form>

          <div v-if="wechatMeta" class="meta-preview">
            <div class="preview-thumbnail" v-if="wechatMeta.thumbnailUrl">
              <img :src="wechatMeta.thumbnailUrl" alt="封面" />
            </div>
            <div class="preview-info">
              <h4>{{ wechatMeta.title }}</h4>
              <p><el-icon><ChatLineSquare /></el-icon> {{ wechatMeta.articleAuthor }}</p>
              <p v-if="wechatMeta.publishTime">发布于 {{ wechatMeta.publishTime }}</p>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 添加图片 -->
      <el-tab-pane v-if="!type || type === 'all' || type === 'image'" label="添加图片" name="image">
        <div class="add-content">
          <el-form label-width="100px">
            <el-form-item label="添加方式">
              <el-radio-group v-model="imageMode">
                <el-radio value="url">图片URL</el-radio>
                <el-radio value="upload">本地上传</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="imageMode === 'url'" label="图片URL">
              <el-input v-model="imageUrl" placeholder="请输入图片URL">
                <template #append>
                  <el-button :loading="imageLoading" @click="fetchImage">
                    获取图片
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item v-else label="选择图片">
              <el-upload
                action="#"
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                @change="handleImageSelect"
              >
                <el-button type="primary">选择图片</el-button>
              </el-upload>
            </el-form-item>
          </el-form>

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
            <p v-if="imageFilename">{{ imageFilename }}</p>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 已选择的项目 -->
    <div v-if="multiple && selectedItems.length > 0" class="selected-items">
      <span>已选择 {{ selectedItems.length }} 项</span>
      <div class="selected-tags">
        <el-tag
          v-for="item in selectedItems"
          :key="item.id"
          closable
          @close="removeSelected(item.id)"
        >
          {{ item.title }}
        </el-tag>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button
        v-if="activeTab !== 'favorites'"
        type="success"
        :loading="saving"
        @click="handleSaveAndInsert"
      >
        收藏并插入
      </el-button>
      <el-button type="primary" :loading="saving" @click="handleConfirm">
        {{ activeTab === 'favorites' ? '确定选择' : '仅插入' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Star, Folder, Search, VideoPlay, ChatLineSquare, Picture,
  User, View, Close
} from '@element-plus/icons-vue'
import { favoriteAPI } from '@/api/favorite'

const props = defineProps({
  visible: Boolean,
  type: {
    type: String,
    default: 'all' // 'all' | 'video' | 'image' | 'article'
  },
  multiple: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

const activeTab = ref('favorites')
const loading = ref(false)
const saving = ref(false)

// 收藏夹选择
const folderTree = ref([])
const selectedFolderId = ref('all')
const filterType = ref('')
const searchKeyword = ref('')
const favorites = ref([])
const selectedItems = ref([])

// B站视频
const bilibiliUrl = ref('')
const bilibiliMeta = ref(null)
const fetchingBilibili = ref(false)

// 公众号文章
const wechatUrl = ref('')
const wechatMeta = ref(null)
const fetchingWechat = ref(false)

// 图片
const imageMode = ref('url')
const imageUrl = ref('')
const imageFile = ref(null)
const imageFilename = ref('')
const imagePreview = ref(null)
const imageLoading = ref(false)
const imageUploadResult = ref(null)  // 存储图片上传结果

const dialogTitle = computed(() => {
  const typeNames = {
    video: '选择B站视频',
    image: '选择图片',
    article: '选择公众号文章'
  }
  return typeNames[props.type] || '选择收藏资源'
})

// 初始化
watch(() => props.visible, async (val) => {
  if (val) {
    await loadFolders()
    await loadFavorites()
    // 根据type设置默认筛选
    if (props.type === 'video') {
      filterType.value = 'bilibili'
    } else if (props.type === 'image') {
      filterType.value = 'image'
    } else if (props.type === 'article') {
      filterType.value = 'wechat_article'
    }
  } else {
    // 重置
    selectedItems.value = []
    bilibiliUrl.value = ''
    bilibiliMeta.value = null
    wechatUrl.value = ''
    wechatMeta.value = null
    imageUrl.value = ''
    imageFile.value = null
    imagePreview.value = null
    imageFilename.value = ''
    imageUploadResult.value = null
  }
})

watch([selectedFolderId, filterType], () => {
  loadFavorites()
})

// 加载文件夹
const loadFolders = async () => {
  try {
    const response = await favoriteAPI.getFolders()
    // 注意：request.js响应拦截器已经解包了data，直接访问response.xxx
    if (response) {
      folderTree.value = response.tree || []
    }
  } catch (error) {
    console.error('加载文件夹失败:', error)
  }
}

// 加载收藏列表
const loadFavorites = async () => {
  loading.value = true
  try {
    const response = await favoriteAPI.getList({
      page: 1,
      pageSize: 50,
      folderId: selectedFolderId.value,
      type: filterType.value || (props.type === 'video' ? 'bilibili' : props.type === 'article' ? 'wechat_article' : ''),
      keyword: searchKeyword.value
    })
    // 注意：request.js响应拦截器已经解包了data，直接访问response.xxx
    if (response) {
      favorites.value = response.list || []
    }
  } catch (error) {
    console.error('加载收藏失败:', error)
  } finally {
    loading.value = false
  }
}

let searchTimer = null
const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadFavorites, 300)
}

// 选择操作
const isSelected = (id) => selectedItems.value.some(item => item.id === id)

const toggleSelect = (item) => {
  if (props.multiple) {
    const index = selectedItems.value.findIndex(i => i.id === item.id)
    if (index > -1) {
      selectedItems.value.splice(index, 1)
    } else {
      selectedItems.value.push(item)
    }
  } else {
    selectedItems.value = [item]
  }
}

const removeSelected = (id) => {
  const index = selectedItems.value.findIndex(item => item.id === id)
  if (index > -1) {
    selectedItems.value.splice(index, 1)
  }
}

// B站视频
const fetchBilibili = async () => {
  if (!bilibiliUrl.value) return
  fetchingBilibili.value = true
  try {
    const response = await favoriteAPI.fetchBilibiliMeta(bilibiliUrl.value)
    // 注意：request.js响应拦截器已经解包了data，直接使用response
    if (response) {
      bilibiliMeta.value = response
    }
  } catch (error) {
    ElMessage.error(error.message || '获取视频信息失败')
    bilibiliMeta.value = null
  } finally {
    fetchingBilibili.value = false
  }
}

// 公众号文章
const fetchWechat = async () => {
  if (!wechatUrl.value) return
  fetchingWechat.value = true
  try {
    const response = await favoriteAPI.fetchWechatMeta(wechatUrl.value)
    // 注意：request.js响应拦截器已经解包了data，直接使用response
    if (response) {
      wechatMeta.value = response
    }
  } catch (error) {
    ElMessage.error(error.message || '获取文章信息失败')
    wechatMeta.value = null
  } finally {
    fetchingWechat.value = false
  }
}

// 图片选择
const handleImageSelect = (uploadFile) => {
  const file = uploadFile.raw
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  imageFile.value = file
  imageFilename.value = file.name
  imageUploadResult.value = null  // 清除之前的上传结果
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

// 从URL获取图片
const fetchImage = async () => {
  if (!imageUrl.value) {
    ElMessage.warning('请输入图片URL')
    return
  }

  imageLoading.value = true
  try {
    const response = await favoriteAPI.uploadImage({ url: imageUrl.value })
    // 注意：request.js响应拦截器已经解包了data，直接使用response
    if (response) {
      imageUploadResult.value = response
      imagePreview.value = imageUrl.value
      imageFilename.value = response.originalFilename || '图片'
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
  imageFile.value = null
  imageFilename.value = ''
  imageUrl.value = ''
  imageUploadResult.value = null
}

// 工具函数
const formatDuration = (seconds) => favoriteAPI.formatDuration(seconds)
const formatPlayCount = (count) => favoriteAPI.formatPlayCount(count)
const getTypeName = (type) => ({ bilibili: 'B站视频', wechat_article: '公众号', image: '图片' }[type] || type)
const getTypeTagType = (type) => ({ bilibili: 'danger', wechat_article: 'success', image: 'primary' }[type] || 'info')

// 构建返回数据
const buildResultData = (item) => {
  const result = {
    type: item.type,
    id: item.id,
    title: item.title,
    sourceUrl: item.source_url,
    thumbnailUrl: item.thumbnail_url
  }
  if (item.type === 'bilibili') {
    result.bvid = item.bvid
    result.embedCode = favoriteAPI.generateBilibiliEmbed(item.bvid)
  }
  if (item.type === 'image') {
    result.localPath = item.local_path
  }
  return result
}

// 确认选择
const handleConfirm = async () => {
  if (activeTab.value === 'favorites') {
    if (selectedItems.value.length === 0) {
      ElMessage.warning('请选择要插入的收藏')
      return
    }
    const results = selectedItems.value.map(buildResultData)
    emit('confirm', props.multiple ? results : results[0])
    emit('update:visible', false)
  } else {
    // 直接插入（不保存到收藏夹）
    await handleInsertOnly()
  }
}

// 保存并插入
const handleSaveAndInsert = async () => {
  saving.value = true
  try {
    let savedItem = null

    if (activeTab.value === 'bilibili') {
      if (!bilibiliMeta.value) {
        ElMessage.warning('请先获取视频信息')
        return
      }
      // 注意：request.js响应拦截器已经解包了data，直接使用response
      const response = await favoriteAPI.create({
        type: 'bilibili',
        title: bilibiliMeta.value.title,
        description: bilibiliMeta.value.description,
        thumbnailUrl: bilibiliMeta.value.thumbnailUrl,
        sourceUrl: bilibiliMeta.value.sourceUrl,
        bvid: bilibiliMeta.value.bvid,
        videoDuration: bilibiliMeta.value.videoDuration,
        authorName: bilibiliMeta.value.authorName,
        playCount: bilibiliMeta.value.playCount
      })
      savedItem = {
        ...response,
        type: 'bilibili',
        embedCode: favoriteAPI.generateBilibiliEmbed(bilibiliMeta.value.bvid)
      }
    } else if (activeTab.value === 'wechat') {
      if (!wechatMeta.value) {
        ElMessage.warning('请先获取文章信息')
        return
      }
      const response = await favoriteAPI.create({
        type: 'wechat_article',
        title: wechatMeta.value.title,
        description: wechatMeta.value.description,
        thumbnailUrl: wechatMeta.value.thumbnailUrl,
        sourceUrl: wechatMeta.value.sourceUrl,
        articleAuthor: wechatMeta.value.articleAuthor,
        publishTime: wechatMeta.value.publishTime
      })
      savedItem = response
    } else if (activeTab.value === 'image') {
      // 先上传图片
      let uploadResult
      if (imageMode.value === 'url') {
        if (!imageUrl.value) {
          ElMessage.warning('请输入图片URL')
          return
        }
        // 如果已经通过"获取图片"按钮预先上传，直接使用结果
        if (imageUploadResult.value) {
          uploadResult = imageUploadResult.value
        } else {
          // 注意：响应拦截器已解包data，直接使用response
          const uploadResponse = await favoriteAPI.uploadImage({ url: imageUrl.value })
          uploadResult = uploadResponse
        }
      } else {
        if (!imageFile.value) {
          ElMessage.warning('请选择图片')
          return
        }
        // 注意：响应拦截器已解包data，直接使用response
        const uploadResponse = await favoriteAPI.uploadImage({ file: imageFile.value })
        uploadResult = uploadResponse
      }

      if (!uploadResult) {
        ElMessage.error('图片处理失败，请重试')
        return
      }

      const response = await favoriteAPI.create({
        type: 'image',
        title: uploadResult.originalFilename || '图片',
        sourceUrl: uploadResult.sourceUrl || imageUrl.value || 'local-upload',
        localPath: uploadResult.localPath,
        originalFilename: uploadResult.originalFilename,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        width: uploadResult.width,
        height: uploadResult.height
      })
      savedItem = response
    }

    if (savedItem) {
      ElMessage.success('已收藏并插入')
      emit('confirm', buildResultData(savedItem))
      emit('update:visible', false)
    }
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    saving.value = false
  }
}

// 仅插入（不保存）
const handleInsertOnly = async () => {
  saving.value = true
  try {
    let result = null

    if (activeTab.value === 'bilibili') {
      if (!bilibiliMeta.value) {
        ElMessage.warning('请先获取视频信息')
        return
      }
      result = {
        type: 'bilibili',
        title: bilibiliMeta.value.title,
        sourceUrl: bilibiliMeta.value.sourceUrl,
        thumbnailUrl: bilibiliMeta.value.thumbnailUrl,
        bvid: bilibiliMeta.value.bvid,
        embedCode: favoriteAPI.generateBilibiliEmbed(bilibiliMeta.value.bvid)
      }
    } else if (activeTab.value === 'wechat') {
      if (!wechatMeta.value) {
        ElMessage.warning('请先获取文章信息')
        return
      }
      result = {
        type: 'wechat_article',
        title: wechatMeta.value.title,
        sourceUrl: wechatMeta.value.sourceUrl,
        thumbnailUrl: wechatMeta.value.thumbnailUrl
      }
    } else if (activeTab.value === 'image') {
      // 图片需要先上传
      let uploadResult
      if (imageMode.value === 'url') {
        if (!imageUrl.value) {
          ElMessage.warning('请输入图片URL')
          return
        }
        // 如果已经通过"获取图片"按钮预先上传，直接使用结果
        if (imageUploadResult.value) {
          uploadResult = imageUploadResult.value
        } else {
          // 注意：响应拦截器已解包data，直接使用response
          const uploadResponse = await favoriteAPI.uploadImage({ url: imageUrl.value })
          uploadResult = uploadResponse
        }
      } else {
        if (!imageFile.value) {
          ElMessage.warning('请选择图片')
          return
        }
        // 注意：响应拦截器已解包data，直接使用response
        const uploadResponse = await favoriteAPI.uploadImage({ file: imageFile.value })
        uploadResult = uploadResponse
      }

      if (!uploadResult) {
        ElMessage.error('图片处理失败，请重试')
        return
      }

      result = {
        type: 'image',
        title: uploadResult.originalFilename || '图片',
        localPath: uploadResult.localPath,
        sourceUrl: uploadResult.sourceUrl || imageUrl.value || 'local-upload'
      }
    }

    if (result) {
      emit('confirm', result)
      emit('update:visible', false)
    }
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.picker-content {
  display: flex;
  height: 400px;
  gap: 16px;
}

.picker-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  padding-right: 16px;
}

.sidebar-header h4,
.type-filter h4 {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 8px;
}

.folder-list {
  margin-bottom: 16px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #475569;
}

.folder-item:hover {
  background: #f1f5f9;
}

.folder-item.active {
  background: #fef3c7;
  color: #d97706;
}

.type-filter {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.picker-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-bar {
  margin-bottom: 12px;
}

.favorite-list {
  flex: 1;
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.favorite-item:hover {
  background: #f8fafc;
}

.favorite-item.selected {
  background: #fef3c7;
}

.item-thumbnail {
  width: 80px;
  height: 50px;
  border-radius: 4px;
  overflow: hidden;
  background: #f1f5f9;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-thumbnail .no-thumb {
  font-size: 24px;
  color: #94a3b8;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}

/* 添加内容区域 */
.add-content {
  padding: 16px 0;
}

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
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
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
}

.preview-info h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #1e293b;
}

.preview-info p {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 0;
  font-size: 13px;
  color: #64748b;
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
  max-height: 200px;
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

/* 已选择项 */
.selected-items {
  margin-top: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.selected-items > span {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
  display: block;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
