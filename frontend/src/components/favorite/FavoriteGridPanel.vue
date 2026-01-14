<template>
  <div class="favorite-grid-panel">
    <div class="panel-header">
      <h3>{{ folderName }}</h3>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索收藏..."
          clearable
          style="width: 200px"
          @input="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <!-- 添加收藏按钮 -->
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加收藏
        </el-button>

        <!-- 视图切换 -->
        <el-button-group class="view-toggle">
          <el-button
            :type="viewMode === 'card' ? 'primary' : 'default'"
            @click="viewMode = 'card'"
          >
            <el-icon><Grid /></el-icon>
          </el-button>
          <el-button
            :type="viewMode === 'table' ? 'primary' : 'default'"
            @click="viewMode = 'table'"
          >
            <el-icon><List /></el-icon>
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 批量操作工具栏 -->
    <div v-if="selectedItems.length > 0" class="batch-toolbar">
      <span class="selection-info">
        <el-checkbox
          v-model="selectAll"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        />
        已选 {{ selectedItems.length }} 项
      </span>
      <div class="batch-actions">
        <el-button size="small" @click="handleBatchMove">
          <el-icon><FolderAdd /></el-icon>
          移动到文件夹
        </el-button>
        <el-button size="small" text @click="clearSelection">
          取消选择
        </el-button>
        <el-divider direction="vertical" />
        <el-button size="small" type="danger" @click="handleBatchDelete">
          删除
        </el-button>
      </div>
    </div>

    <!-- 全选 + 列表 -->
    <div class="favorite-list">
      <div v-if="favorites.length > 0 && selectedItems.length === 0" class="select-all-bar">
        <el-checkbox
          v-model="selectAll"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        >
          全选 ({{ favorites.length }})
        </el-checkbox>
      </div>

      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" v-loading="loading" class="favorite-grid">
        <el-empty v-if="!loading && favorites.length === 0" description="暂无收藏" />

        <FavoriteCard
          v-for="favorite in favorites"
          :key="favorite.id"
          :favorite="favorite"
          :selected="selectedItems.includes(favorite.id)"
          @select="handleToggleSelect"
          @click="handlePreview"
          @delete="handleDelete"
          @move="handleSingleMove"
          @edit="handleEdit"
        />
      </div>

      <!-- 表格视图 -->
      <div v-else v-loading="loading" class="favorite-table">
        <el-empty v-if="!loading && favorites.length === 0" description="暂无收藏" />

        <el-table
          v-else
          :data="favorites"
          @selection-change="handleTableSelectionChange"
          ref="tableRef"
          row-key="id"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column label="封面" width="100">
            <template #default="{ row }">
              <div class="thumbnail-cell">
                <img v-if="getThumbnailUrl(row)" :src="getThumbnailUrl(row)" alt="封面" />
                <svg v-else-if="row.type === 'wechat_article'" class="wechat-icon-small" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#07c160" d="M690.1 377.4c5.9 0 11.8.2 17.6.5-24.4-128.7-158.3-227.1-319.9-227.1C209 150.8 64 271.4 64 420.2c0 81.1 43.6 154.2 111.9 203.6 5.5 3.9 9.1 10.3 9.1 17.6 0 2.4-.5 4.6-1.1 6.9-5.5 20.3-14.2 52.8-14.6 54.3-.7 2.6-1.7 5.2-1.7 7.9 0 5.9 4.8 10.8 10.8 10.8 2.3 0 4.2-.9 6.2-2l70.9-40.9c5.3-3.1 11-5 17.2-5 3.2 0 6.4.5 9.5 1.4 33.1 9.5 68.8 14.8 105.7 14.8 6 0 11.9-.1 17.8-.4-7.1-21-10.9-43.1-10.9-66 0-135.8 132.2-245.8 295.3-245.8zm-194.3-86.5c23.8 0 43.2 19.3 43.2 43.1s-19.3 43.1-43.2 43.1c-23.8 0-43.2-19.3-43.2-43.1s19.4-43.1 43.2-43.1zm-215.9 86.2c-23.8 0-43.2-19.3-43.2-43.1s19.3-43.1 43.2-43.1 43.2 19.3 43.2 43.1-19.4 43.1-43.2 43.1zm586.8 415.6c56.9-41.2 93.2-102 93.2-169.7 0-124-120.8-224.5-269.9-224.5-149 0-269.9 100.5-269.9 224.5S540.9 847.5 690 847.5c30.8 0 60.6-4.4 88.1-12.3 2.6-.8 5.2-1.2 7.9-1.2 5.2 0 9.9 1.6 14.3 4.1l59.1 34c1.7 1 3.3 1.7 5.2 1.7a9 9 0 0 0 6.4-2.6 9 9 0 0 0 2.6-6.4c0-2.2-.9-4.4-1.4-6.6-.3-1.2-7.6-28.3-12.2-45.3-.5-1.9-.9-3.8-.9-5.7.1-5.9 3.1-11.2 7.6-14.5zM600.2 587.2c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9c0 19.8-16.2 35.9-36 35.9zm179.9 0c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9a36.08 36.08 0 0 1-36 35.9z"/>
                </svg>
                <el-icon v-else class="no-thumbnail">
                  <Picture v-if="row.type === 'image'" />
                  <VideoPlay v-else-if="row.type === 'bilibili'" />
                  <Document v-else-if="row.type === 'resource'" />
                  <ChatLineSquare v-else />
                </el-icon>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="200">
            <template #default="{ row }">
              <div class="title-cell">
                <span class="favorite-title" @click="handlePreview(row)">{{ row.custom_title || row.title }}</span>
                <span v-if="row.custom_title" class="original-title-hint" :title="row.title">原标题: {{ row.title }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getTypeTagType(row.type)" size="small">
                {{ getTypeName(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="author_name" label="来源" width="120">
            <template #default="{ row }">
              {{ row.author_name || row.article_author || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="备注" width="100">
            <template #default="{ row }">
              <el-tooltip v-if="row.notes" :content="row.notes" placement="top" :disabled="!row.notes">
                <el-button size="small" text type="primary">
                  <el-icon><Document /></el-icon>
                  备注
                </el-button>
              </el-tooltip>
              <span v-else class="no-notes">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="收藏时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-dropdown trigger="click" @command="(cmd) => handleTableCommand(cmd, row)">
                <el-button type="primary" size="small">
                  操作 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">
                      <el-icon><Edit /></el-icon> 编辑
                    </el-dropdown-item>
                    <el-dropdown-item command="preview">
                      <el-icon><View /></el-icon> 查看
                    </el-dropdown-item>
                    <el-dropdown-item command="move">
                      <el-icon><FolderAdd /></el-icon> 移动
                    </el-dropdown-item>
                    <el-dropdown-item divided command="delete" class="danger-item">
                      <el-icon><Delete /></el-icon> 删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total > 0" class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadFavorites"
        @current-change="loadFavorites"
      />
    </div>

    <!-- 移动到文件夹对话框 -->
    <el-dialog v-model="moveDialogVisible" title="移动到文件夹" width="400px">
      <el-tree
        :data="folderTreeForMove"
        :props="{ children: 'children', label: 'name' }"
        node-key="id"
        highlight-current
        @node-click="handleMoveTargetSelect"
      >
        <template #default="{ node, data }">
          <span class="move-tree-node">
            <el-icon><Folder /></el-icon>
            {{ node.label }}
          </span>
        </template>
      </el-tree>
      <div class="move-uncategorized" @click="handleMoveToUncategorized">
        <el-icon><FolderOpened /></el-icon>
        移动到未分类
      </div>
      <template #footer>
        <el-button @click="moveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="moving" @click="confirmMove">
          确定移动
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加收藏对话框 -->
    <AddFavoriteDialog
      v-model:visible="showAddDialog"
      :folder-id="currentFolderId"
      @success="handleAddSuccess"
    />

    <!-- 预览对话框 -->
    <el-dialog v-model="previewDialogVisible" :title="previewItem?.title" width="800px">
      <div class="preview-content">
        <!-- B站视频预览 -->
        <div v-if="previewItem?.type === 'bilibili'" class="video-preview" v-html="previewEmbedCode"></div>
        <!-- 图片预览 -->
        <div v-else-if="previewItem?.type === 'image'" class="image-preview">
          <img :src="getPreviewImageUrl(previewItem)" alt="预览图片" />
        </div>
        <!-- 公众号文章预览 -->
        <div v-else-if="previewItem?.type === 'wechat_article'" class="article-preview">
          <p><strong>公众号：</strong>{{ previewItem.article_author }}</p>
          <p><strong>发布时间：</strong>{{ formatPublishTime(previewItem.publish_time) }}</p>
          <p>{{ previewItem.description }}</p>
          <el-button type="primary" @click="openLink(previewItem.source_url)">
            <el-icon><Link /></el-icon>
            打开原文
          </el-button>
        </div>
        <!-- 课件资源预览 -->
        <div v-else-if="previewItem?.type === 'resource'" class="resource-preview">
          <iframe
            v-if="previewItem.source_url"
            :src="previewItem.source_url"
            class="resource-iframe"
            frameborder="0"
            allowfullscreen
          ></iframe>
          <el-empty v-else description="资源链接不可用" />
        </div>
      </div>
    </el-dialog>

    <!-- 编辑对话框 -->
    <EditFavoriteDialog
      v-model:visible="editDialogVisible"
      :favorite="editingItem"
      @success="handleEditSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, Grid, List, FolderAdd, Delete, View, Edit,
  ArrowDown, Folder, FolderOpened, Picture, VideoPlay,
  ChatLineSquare, Link, Document
} from '@element-plus/icons-vue'
import { favoriteAPI } from '@/api/favorite'
import FavoriteCard from './FavoriteCard.vue'
import AddFavoriteDialog from './AddFavoriteDialog.vue'
import EditFavoriteDialog from './EditFavoriteDialog.vue'

const props = defineProps({
  folderId: {
    type: [String, Number],
    default: 'all'
  },
  folderName: {
    type: String,
    default: '全部收藏'
  },
  filterType: {
    type: String,
    default: ''
  },
  folderTree: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['folder-updated'])

const loading = ref(false)
const viewMode = ref('card')
const searchKeyword = ref('')
const favorites = ref([])
const selectedItems = ref([])
const tableRef = ref(null)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 对话框状态
const moveDialogVisible = ref(false)
const showAddDialog = ref(false)
const editDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const moving = ref(false)
const moveTargetFolderId = ref(null)
const moveItemIds = ref([])
const previewItem = ref(null)
const editingItem = ref(null)

const currentFolderId = computed(() => {
  if (props.folderId === 'all' || props.folderId === 'uncategorized') {
    return null
  }
  return props.folderId
})

const folderTreeForMove = computed(() => props.folderTree)

const selectAll = computed({
  get: () => selectedItems.value.length === favorites.value.length && favorites.value.length > 0,
  set: () => {}
})

const isIndeterminate = computed(() => {
  return selectedItems.value.length > 0 && selectedItems.value.length < favorites.value.length
})

const previewEmbedCode = computed(() => {
  if (previewItem.value?.type === 'bilibili' && previewItem.value?.bvid) {
    return favoriteAPI.generateBilibiliEmbed(previewItem.value.bvid)
  }
  return ''
})

// 加载收藏列表
const loadFavorites = async () => {
  loading.value = true
  try {
    const response = await favoriteAPI.getList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      folderId: props.folderId,
      type: props.filterType,
      keyword: searchKeyword.value
    })
    // 注意：request.js响应拦截器已经解包了data，直��访问response.xxx
    if (response) {
      favorites.value = response.list || []
      pagination.total = response.total || 0
    }
  } catch (error) {
    console.error('加载收藏列表失败:', error)
    ElMessage.error('加载收藏列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
let searchTimer = null
const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.page = 1
    loadFavorites()
  }, 300)
}

// 选择操作
const handleToggleSelect = (id) => {
  const index = selectedItems.value.indexOf(id)
  if (index > -1) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push(id)
  }
}

const handleSelectAll = (checked) => {
  if (checked) {
    selectedItems.value = favorites.value.map(f => f.id)
  } else {
    selectedItems.value = []
  }
}

const handleTableSelectionChange = (selection) => {
  selectedItems.value = selection.map(item => item.id)
}

const clearSelection = () => {
  selectedItems.value = []
  if (tableRef.value) {
    tableRef.value.clearSelection()
  }
}

// 删除
const handleDelete = async (favorite) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除收藏"${favorite.title}"吗？`,
      '确认删除',
      { type: 'warning' }
    )
    await favoriteAPI.delete(favorite.id)
    ElMessage.success('删除成功')
    loadFavorites()
    emit('folder-updated')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedItems.value.length} 个收藏吗？`,
      '确认批量删除',
      { type: 'warning' }
    )
    await favoriteAPI.batchDelete(selectedItems.value)
    ElMessage.success('批量删除成功')
    clearSelection()
    loadFavorites()
    emit('folder-updated')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '批量删除失败')
    }
  }
}

// 移动
const handleSingleMove = (favorite) => {
  moveItemIds.value = [favorite.id]
  moveTargetFolderId.value = null
  moveDialogVisible.value = true
}

const handleBatchMove = () => {
  moveItemIds.value = [...selectedItems.value]
  moveTargetFolderId.value = null
  moveDialogVisible.value = true
}

const handleMoveTargetSelect = (data) => {
  moveTargetFolderId.value = data.id
}

const handleMoveToUncategorized = () => {
  moveTargetFolderId.value = null
}

const confirmMove = async () => {
  moving.value = true
  try {
    await favoriteAPI.batchMove(moveItemIds.value, moveTargetFolderId.value)
    ElMessage.success('移动成功')
    moveDialogVisible.value = false
    clearSelection()
    loadFavorites()
    emit('folder-updated')
  } catch (error) {
    ElMessage.error(error.message || '移动失败')
  } finally {
    moving.value = false
  }
}

// 预览
const handlePreview = (favorite) => {
  previewItem.value = favorite
  previewDialogVisible.value = true
}

// 添加成功
const handleAddSuccess = () => {
  loadFavorites()
  emit('folder-updated')
}

// 表格命令处理
const handleTableCommand = (command, row) => {
  switch (command) {
    case 'edit':
      handleEdit(row)
      break
    case 'preview':
      handlePreview(row)
      break
    case 'move':
      handleSingleMove(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

// 编辑处理
const handleEdit = (favorite) => {
  editingItem.value = favorite
  editDialogVisible.value = true
}

// 编辑成功回调
const handleEditSuccess = () => {
  loadFavorites()
}

// 工具函数
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化发布时间（处理时间戳）
const formatPublishTime = (time) => {
  if (!time) return '-'
  // 如果是纯数字（时间戳），转换为日期
  const timestamp = typeof time === 'string' ? parseInt(time) : time
  if (!isNaN(timestamp) && timestamp > 1000000000) {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  return time
}

const getTypeName = (type) => {
  const typeMap = {
    bilibili: 'B站视频',
    wechat_article: '公众号文章',
    image: '图片',
    resource: '课件资源'
  }
  return typeMap[type] || type
}

const getTypeTagType = (type) => {
  const typeMap = {
    bilibili: 'danger',
    wechat_article: 'success',
    image: 'primary',
    resource: 'warning'
  }
  return typeMap[type] || 'info'
}

const getImageUrl = (localPath) => {
  return favoriteAPI.getImageUrl(localPath)
}

// 获取缩略图URL（处理不同类型的收藏）
const getThumbnailUrl = (favorite) => {
  // 微信公众号文章不显示图片（防盗链），改用图标
  if (favorite.type === 'wechat_article') return ''
  // 对于图片类型，优先使用local_path
  if (favorite.type === 'image' && favorite.local_path) {
    return favoriteAPI.getImageUrl(favorite.local_path)
  }
  // 对于B站视频，使用代理获取图片（解决防盗链问题）
  if (favorite.type === 'bilibili' && favorite.thumbnail_url) {
    return favoriteAPI.getBilibiliImageUrl(favorite.thumbnail_url)
  }
  // 其他类型使用thumbnail_url
  return favorite.thumbnail_url || ''
}

// 获取预览图片URL
const getPreviewImageUrl = (favorite) => {
  if (!favorite) return ''
  // 图片类型优先使用local_path
  if (favorite.local_path) {
    return favoriteAPI.getImageUrl(favorite.local_path)
  }
  return favorite.thumbnail_url || ''
}

const openLink = (url) => {
  window.open(url, '_blank')
}

// 监听筛选条件变化
watch(() => [props.folderId, props.filterType], () => {
  pagination.page = 1
  loadFavorites()
}, { immediate: true })

// 暴露方法
defineExpose({
  loadFavorites,
  clearSelection
})
</script>

<style scoped>
.favorite-grid-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-toggle {
  margin-left: 8px;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 8px;
  margin-bottom: 16px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #92400e;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.favorite-list {
  flex: 1;
  overflow-y: auto;
}

.select-all-bar {
  padding: 8px 0;
  margin-bottom: 8px;
}

.favorite-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.favorite-table {
  height: 100%;
}

.thumbnail-cell {
  width: 80px;
  height: 50px;
  border-radius: 4px;
  overflow: hidden;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-cell .no-thumbnail {
  font-size: 24px;
  color: #94a3b8;
}

.thumbnail-cell .wechat-icon-small {
  width: 32px;
  height: 32px;
}

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.favorite-title {
  color: #3b82f6;
  cursor: pointer;
}

.favorite-title:hover {
  text-decoration: underline;
}

.original-title-hint {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.no-notes {
  color: #cbd5e1;
  font-size: 12px;
}

.pagination-wrapper {
  padding: 16px 0;
  display: flex;
  justify-content: flex-end;
}

/* 移动对话框 */
.move-tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.move-uncategorized {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-top: 12px;
  border-top: 1px solid #e2e8f0;
  cursor: pointer;
  color: #64748b;
}

.move-uncategorized:hover {
  color: #3b82f6;
  background: #f8fafc;
}

/* 预览 */
.preview-content {
  min-height: 300px;
}

.video-preview {
  width: 100%;
  aspect-ratio: 16/9;
}

.image-preview {
  text-align: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
}

.article-preview {
  padding: 16px;
}

.article-preview p {
  margin-bottom: 12px;
}

.resource-preview {
  width: 100%;
  min-height: 400px;
}

.resource-iframe {
  width: 100%;
  height: 500px;
  border-radius: 8px;
}

.danger-item {
  color: #ef4444 !important;
}
</style>
