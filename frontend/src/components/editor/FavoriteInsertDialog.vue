<template>
  <el-dialog
    v-model="dialogVisible"
    title="插入收藏夹内容"
    width="800px"
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="favorite-insert-container">
      <!-- 搜索和筛选 -->
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          placeholder="搜索收藏..."
          clearable
          style="width: 200px"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select v-model="typeFilter" placeholder="类型" clearable style="width: 120px" @change="loadFavorites">
          <el-option label="全部" value="" />
          <el-option label="B站视频" value="bilibili" />
          <el-option label="公众号文章" value="wechat_article" />
          <el-option label="图片" value="image" />
        </el-select>

        <el-select v-model="folderId" placeholder="文件夹" clearable style="width: 150px" @change="loadFavorites">
          <el-option label="全部收藏" value="all" />
          <el-option label="未分类" value="uncategorized" />
          <el-option
            v-for="folder in folders"
            :key="folder.id"
            :label="folder.name"
            :value="folder.id"
          />
        </el-select>
      </div>

      <!-- 收藏列表 -->
      <div class="favorite-list" v-loading="loading">
        <div v-if="favorites.length === 0" class="empty-tip">
          <el-empty description="暂无收藏内容" />
        </div>

        <div v-else class="favorite-grid">
          <div
            v-for="item in favorites"
            :key="item.id"
            class="favorite-item"
            :class="{ selected: selectedId === item.id }"
            @click="selectItem(item)"
            @dblclick="confirmInsert(item)"
          >
            <!-- 缩略图 -->
            <div class="item-thumbnail">
              <img v-if="getThumbnail(item)" :src="getThumbnail(item)" alt="" />
              <div v-else class="no-thumbnail">
                <el-icon :size="32">
                  <VideoPlay v-if="item.type === 'bilibili'" />
                  <Document v-else-if="item.type === 'wechat_article'" />
                  <Picture v-else />
                </el-icon>
              </div>
              <!-- 类型标签 -->
              <span class="type-tag" :class="item.type">
                {{ getTypeLabel(item.type) }}
              </span>
            </div>

            <!-- 标题 -->
            <div class="item-title" :title="item.custom_title || item.title">
              {{ item.custom_title || item.title }}
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-bar" v-if="total > pageSize">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="loadFavorites"
        />
      </div>

      <!-- 插入选项 -->
      <div class="insert-options" v-if="selectedItem">
        <el-divider content-position="left">插入方式</el-divider>
        <el-radio-group v-model="insertMode">
          <el-radio value="embed" v-if="selectedItem.type === 'bilibili'">嵌入播放器</el-radio>
          <el-radio value="link">插入链接</el-radio>
          <el-radio value="image" v-if="selectedItem.type === 'image'">插入图片</el-radio>
          <el-radio value="card">插入卡片</el-radio>
        </el-radio-group>
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!selectedItem" @click="handleInsert">
        插入
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Search, VideoPlay, Document, Picture } from '@element-plus/icons-vue'
import { favoriteAPI } from '@/api/favorite'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'insert'])

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 状态
const loading = ref(false)
const keyword = ref('')
const typeFilter = ref('')
const folderId = ref('all')
const page = ref(1)
const pageSize = ref(12)
const total = ref(0)
const favorites = ref([])
const folders = ref([])
const selectedId = ref(null)
const selectedItem = ref(null)
const insertMode = ref('embed')

// 搜索防抖
let searchTimer = null
const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadFavorites()
  }, 300)
}

// 加载文件夹列表
const loadFolders = async () => {
  try {
    const res = await favoriteAPI.getFolders()
    // request.js响应拦截器已解包data，直接使用res.tree
    folders.value = res.tree || []
  } catch (e) {
    console.error('加载文件夹失败:', e)
  }
}

// 加载收藏列表
const loadFavorites = async () => {
  loading.value = true
  try {
    const res = await favoriteAPI.getList({
      page: page.value,
      pageSize: pageSize.value,
      folderId: folderId.value,
      type: typeFilter.value,
      keyword: keyword.value
    })
    // request.js响应拦截器已解包data，直接使用res.list和res.total
    favorites.value = res.list || []
    total.value = res.total || 0
  } catch (e) {
    console.error('加载收藏失败:', e)
    ElMessage.error('加载收藏失败')
  } finally {
    loading.value = false
  }
}

// 获取缩略图
const getThumbnail = (item) => {
  if (item.type === 'image' && item.local_path) {
    return favoriteAPI.getImageUrl(item.local_path)
  }
  if (item.thumbnail_url) {
    if (item.type === 'bilibili') {
      return favoriteAPI.getBilibiliImageUrl(item.thumbnail_url)
    }
    return item.thumbnail_url
  }
  return null
}

// 获取类型标签
const getTypeLabel = (type) => {
  const labels = {
    bilibili: 'B站',
    wechat_article: '公众号',
    image: '图片'
  }
  return labels[type] || type
}

// 选择项目
const selectItem = (item) => {
  selectedId.value = item.id
  selectedItem.value = item

  // 根据类型设置默认插入模式
  if (item.type === 'bilibili') {
    insertMode.value = 'embed'
  } else if (item.type === 'image') {
    insertMode.value = 'image'
  } else {
    insertMode.value = 'link'
  }
}

// 双击确认插入
const confirmInsert = (item) => {
  selectItem(item)
  handleInsert()
}

// 生成插入的 HTML
const generateInsertHtml = () => {
  if (!selectedItem.value) return ''

  const item = selectedItem.value

  switch (insertMode.value) {
    case 'embed':
      // B站视频嵌入
      if (item.type === 'bilibili' && item.bvid) {
        return favoriteAPI.generateBilibiliEmbed(item.bvid)
      }
      return ''

    case 'link':
      // 插入链接
      return `<a href="${item.source_url}" target="_blank">${item.custom_title || item.title}</a>`

    case 'image':
      // 插入图片
      if (item.type === 'image' && item.local_path) {
        const imgUrl = favoriteAPI.getImageUrl(item.local_path)
        return `<img src="${imgUrl}" alt="${item.custom_title || item.title}" style="max-width: 100%; height: auto;" />`
      }
      return ''

    case 'card':
      // 插入卡片样式
      const thumbnail = getThumbnail(item)
      return `
<div class="favorite-card" style="border: 1px solid #e4e7ed; border-radius: 8px; padding: 16px; margin: 16px 0; display: flex; gap: 16px; background: #fafafa;">
  ${thumbnail ? `<img src="${thumbnail}" alt="" style="width: 120px; height: 80px; object-fit: cover; border-radius: 4px;" />` : ''}
  <div style="flex: 1;">
    <div style="font-weight: 600; margin-bottom: 8px;">
      <a href="${item.source_url}" target="_blank" style="color: #333; text-decoration: none;">${item.custom_title || item.title}</a>
    </div>
    ${item.description ? `<div style="color: #666; font-size: 14px; line-height: 1.5;">${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}</div>` : ''}
  </div>
</div>`

    default:
      return ''
  }
}

// 处理插入
const handleInsert = () => {
  const html = generateInsertHtml()
  if (html) {
    emit('insert', html)
    dialogVisible.value = false
    // 重置选择
    selectedId.value = null
    selectedItem.value = null
  } else {
    ElMessage.warning('无法生成插入内容')
  }
}

// 监听对话框打开
watch(dialogVisible, (val) => {
  if (val) {
    loadFolders()
    loadFavorites()
  } else {
    // 关闭时重置
    selectedId.value = null
    selectedItem.value = null
    keyword.value = ''
    typeFilter.value = ''
    folderId.value = 'all'
    page.value = 1
  }
})
</script>

<style scoped>
.favorite-insert-container {
  min-height: 400px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.favorite-list {
  min-height: 300px;
}

.favorite-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.favorite-item {
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  background: #f5f7fa;
}

.favorite-item:hover {
  border-color: #c0c4cc;
}

.favorite-item.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.item-thumbnail {
  position: relative;
  width: 100%;
  height: 100px;
  background: #e4e7ed;
  overflow: hidden;
}

.item-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-thumbnail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.type-tag {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 4px;
  color: #fff;
}

.type-tag.bilibili {
  background: #fb7299;
}

.type-tag.wechat_article {
  background: #07c160;
}

.type-tag.image {
  background: #409eff;
}

.item-title {
  padding: 8px;
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-bar {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.insert-options {
  margin-top: 16px;
}

.empty-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
</style>
