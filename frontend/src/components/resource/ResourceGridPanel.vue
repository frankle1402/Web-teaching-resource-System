<template>
  <div class="resource-grid-panel">
    <div class="panel-header">
      <h3>{{ folderName }}</h3>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索资源..."
          clearable
          style="width: 200px"
          @input="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <!-- 视图切换按钮组 -->
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
    <div v-if="selectedResources.length > 0" class="batch-toolbar">
      <span class="selection-info">
        <el-checkbox
          v-model="selectAll"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        />
        已选 {{ selectedResources.length }} 项
      </span>
      <div class="batch-actions">
        <el-button size="small" @click="handleBatchMove">
          <el-icon><FolderAdd /></el-icon>
          移动到文件夹
        </el-button>
        <!-- 全部草稿时显示发布按钮 -->
        <el-button
          v-if="canBatchPublish"
          size="small"
          type="success"
          @click="handleBatchPublish"
        >
          发布
        </el-button>
        <!-- 全部已发布时显示回收按钮 -->
        <el-button
          v-if="canBatchUnpublish"
          size="small"
          type="warning"
          @click="handleBatchUnpublish"
        >
          回收
        </el-button>
        <el-button size="small" text @click="clearSelection">
          取消选择
        </el-button>
        <el-divider direction="vertical" />
        <!-- 删除按钮固定在右侧，只能删除草稿状态的资源 -->
        <el-button
          v-if="canBatchDelete"
          size="small"
          type="danger"
          @click="handleBatchDelete"
        >
          删除
        </el-button>
      </div>
    </div>

    <!-- 全选 + 资源列表 -->
    <div class="resource-list">
      <div v-if="resources.length > 0 && selectedResources.length === 0" class="select-all-bar">
        <el-checkbox
          v-model="selectAll"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        >
          全选 ({{ resources.length }})
        </el-checkbox>
      </div>

      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" v-loading="loading" class="resource-grid">
        <el-empty v-if="!loading && resources.length === 0" description="暂无资源" />

        <ResourceCard
          v-for="resource in resources"
          :key="resource.id"
          :resource="resource"
          :selected="selectedResources.includes(resource.id)"
          @select="handleToggleSelect"
          @click="handlePreview"
          @visit="handleVisit"
          @copy-url="handleCopyUrl"
          @unpublish="handleUnpublish"
          @publish="handlePublish"
          @delete="handleDelete"
          @edit="handleEdit"
          @move="handleSingleMove"
        />
      </div>

      <!-- 表格视图 -->
      <div v-else v-loading="loading" class="resource-table">
        <el-empty v-if="!loading && resources.length === 0" description="暂无资源" />

        <el-table
          v-else
          :data="resources"
          @selection-change="handleTableSelectionChange"
          ref="tableRef"
          row-key="id"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="title" label="标题" min-width="200">
            <template #default="{ row }">
              <span class="resource-title" @click="handlePreview(row)">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="course_name" label="课程名称" width="150" />
          <el-table-column prop="course_level" label="课程层次" width="100">
            <template #default="{ row }">
              <el-tag :type="getLevelTagType(row.course_level)" size="small">
                {{ row.course_level }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="major" label="专业" width="120" />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
                {{ row.status === 'published' ? '已发布' : '草稿' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
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
                    <el-dropdown-item command="move">
                      <el-icon><FolderAdd /></el-icon> 移动
                    </el-dropdown-item>
                    <el-dropdown-item command="publish">
                      <el-icon><Upload /></el-icon> 发布
                    </el-dropdown-item>
                    <el-dropdown-item command="visit">
                      <el-icon><View /></el-icon> 访问
                    </el-dropdown-item>
                    <el-dropdown-item command="copy">
                      <el-icon><CopyDocument /></el-icon> 复制地址
                    </el-dropdown-item>
                    <el-dropdown-item command="unpublish">
                      <el-icon><Download /></el-icon> 回收
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
        @current-change="loadResources"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 资源预览弹窗 -->
    <ResourcePreviewDialog
      v-model="previewVisible"
      :resource="previewResource"
    />

    <!-- 资源迁移弹窗 -->
    <ResourceMoveDialog
      v-model="moveDialogVisible"
      :resource-ids="selectedResources"
      :folder-tree="folderTree"
      :current-folder-id="currentFolderId"
      @success="handleMoveSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, FolderAdd, Grid, List, ArrowDown, Edit, Upload, View, CopyDocument, Download, Delete } from '@element-plus/icons-vue'
import { resourceAPI } from '@/api/resource'
import ResourceCard from './ResourceCard.vue'
import ResourcePreviewDialog from './ResourcePreviewDialog.vue'
import ResourceMoveDialog from './ResourceMoveDialog.vue'

const router = useRouter()

const props = defineProps({
  folderId: {
    type: [Number, String],
    default: null
  },
  folderName: {
    type: String,
    default: '全部资源'
  },
  folderTree: {
    type: Array,
    default: () => []
  },
  // 外部筛选条件
  filter: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['updated'])

const loading = ref(false)
const resources = ref([])
const searchKeyword = ref('')
const selectedResources = ref([])
const previewVisible = ref(false)
const previewResource = ref(null)
const moveDialogVisible = ref(false)
const viewMode = ref('card') // 'card' | 'table'
const tableRef = ref(null)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const currentFolderId = computed(() => props.folderId)

// 计算全选状态
const selectAll = computed({
  get: () => selectedResources.value.length > 0 && selectedResources.value.length === resources.value.length,
  set: () => {
    // 由 handleSelectAll 处理
  }
})

const isIndeterminate = computed(() => {
  const len = selectedResources.value.length
  return len > 0 && len < resources.value.length
})

// 批量操作按钮显示逻辑
const selectedResourceObjects = computed(() => {
  return resources.value.filter(r => selectedResources.value.includes(r.id))
})

const canBatchPublish = computed(() => {
  // 全部草稿时显示发布按钮
  return selectedResourceObjects.value.length > 0 &&
    selectedResourceObjects.value.every(r => r.status === 'draft')
})

const canBatchUnpublish = computed(() => {
  // 全部已发布时显示回收按钮
  return selectedResourceObjects.value.length > 0 &&
    selectedResourceObjects.value.every(r => r.status === 'published')
})

// 批量删除：只能删除草稿状态的资源
const canBatchDelete = computed(() => {
  return selectedResourceObjects.value.length > 0 &&
    selectedResourceObjects.value.every(r => r.status === 'draft')
})

// 加载资源列表
const loadResources = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      myResources: true // 始终只获取当前用户的资源
    }

    // folderId 特殊值处理
    if (props.folderId && props.folderId !== 'all') {
      params.folderId = props.folderId
    }

    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }

    // 应用外部筛选条件
    if (props.filter.keyword) {
      params.keyword = props.filter.keyword
    }
    if (props.filter.courseLevel) {
      params.courseLevel = props.filter.courseLevel
    }
    if (props.filter.status) {
      params.status = props.filter.status
    }

    const response = await resourceAPI.getList(params)
    resources.value = response.list || []
    pagination.total = response.pagination?.total || 0

    // 清除不在当前页的选择
    selectedResources.value = selectedResources.value.filter(id =>
      resources.value.some(r => r.id === id)
    )

    // 同步表格选择状态
    if (viewMode.value === 'table' && tableRef.value) {
      nextTick(() => {
        resources.value.forEach(row => {
          if (selectedResources.value.includes(row.id)) {
            tableRef.value.toggleRowSelection(row, true)
          }
        })
      })
    }
  } catch (error) {
    console.error('加载资源列表失败:', error)
    ElMessage.error('加载资源列表失败')
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
    loadResources()
  }, 300)
}

// 分页大小变化
const handleSizeChange = () => {
  pagination.page = 1
  loadResources()
}

// 全选/取消全选
const handleSelectAll = (val) => {
  if (val) {
    selectedResources.value = resources.value.map(r => r.id)
    // 同步表格选择
    if (viewMode.value === 'table' && tableRef.value) {
      tableRef.value.toggleAllSelection()
    }
  } else {
    selectedResources.value = []
    if (viewMode.value === 'table' && tableRef.value) {
      tableRef.value.clearSelection()
    }
  }
}

// 切换选择状态（卡片视图）
const handleToggleSelect = (resourceId, selected) => {
  if (selected) {
    if (!selectedResources.value.includes(resourceId)) {
      selectedResources.value.push(resourceId)
    }
  } else {
    selectedResources.value = selectedResources.value.filter(id => id !== resourceId)
  }
}

// 表格选择变化
const handleTableSelectionChange = (selection) => {
  selectedResources.value = selection.map(r => r.id)
}

// 清空选择
const clearSelection = () => {
  selectedResources.value = []
  if (viewMode.value === 'table' && tableRef.value) {
    tableRef.value.clearSelection()
  }
}

// 预览资源
const handlePreview = (resource) => {
  previewResource.value = resource
  previewVisible.value = true
}

// 访问资源
const handleVisit = (resource) => {
  if (resource.public_url) {
    window.open(resource.public_url, '_blank')
  } else {
    ElMessage.warning('该资源暂无公开访问地址')
  }
}

// 复制URL
const handleCopyUrl = async (resource) => {
  if (resource.public_url) {
    try {
      await navigator.clipboard.writeText(resource.public_url)
      ElMessage.success('链接已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败，请手动复制')
    }
  } else {
    ElMessage.warning('该资源暂无公开访问地址')
  }
}

// 发布资源
const handlePublish = async (resource) => {
  try {
    await resourceAPI.publish(resource.id)
    ElMessage.success('发布成功')
    loadResources()
    emit('updated')
  } catch (error) {
    ElMessage.error(error.message || '发布失败')
  }
}

// 回收资源
const handleUnpublish = async (resource) => {
  try {
    await ElMessageBox.confirm('确定要将该资源回收为草稿吗？', '确认回收', { type: 'warning' })
    await resourceAPI.unpublish(resource.id)
    ElMessage.success('已回收为草稿')
    loadResources()
    emit('updated')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '回收失败')
    }
  }
}

// 删除资源
const handleDelete = async (resource) => {
  try {
    await ElMessageBox.confirm(`确定要删除资源"${resource.title}"吗？此操作不可恢复。`, '确认删除', { type: 'warning' })
    await resourceAPI.delete(resource.id)
    ElMessage.success('删除成功')
    loadResources()
    emit('updated')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 编辑资源
const handleEdit = (resource) => {
  router.push(`/dashboard/resources/edit/${resource.id}`)
}

// 表格下拉菜单命令处理
const handleTableCommand = (command, resource) => {
  const isDraft = resource.status === 'draft'
  const isPublished = resource.status === 'published'

  switch (command) {
    case 'edit':
      handleEdit(resource)
      break
    case 'move':
      handleSingleMove(resource)
      break
    case 'publish':
      if (isPublished) {
        ElMessageBox.alert('该资源已发布，无需重复发布', '提示', { type: 'warning' })
      } else {
        handlePublish(resource)
      }
      break
    case 'visit':
      if (isDraft) {
        ElMessageBox.alert('请先发布资源后再访问', '提示', { type: 'warning' })
      } else {
        handleVisit(resource)
      }
      break
    case 'copy':
      if (isDraft) {
        ElMessageBox.alert('请先发布资源后再复制地址', '提示', { type: 'warning' })
      } else {
        handleCopyUrl(resource)
      }
      break
    case 'unpublish':
      if (isDraft) {
        ElMessageBox.alert('资源尚未发布，无需回收', '提示', { type: 'warning' })
      } else {
        handleUnpublish(resource)
      }
      break
    case 'delete':
      if (isPublished) {
        ElMessageBox.alert('请先回收资源后再删除', '提示', { type: 'warning' })
      } else {
        handleDelete(resource)
      }
      break
  }
}

// 批量移动
const handleBatchMove = () => {
  if (selectedResources.value.length === 0) {
    ElMessage.warning('请先选择要移动的资源')
    return
  }
  moveDialogVisible.value = true
}

// 单个资源移动
const handleSingleMove = (resource) => {
  selectedResources.value = [resource.id]
  moveDialogVisible.value = true
}

// 批量发布
const handleBatchPublish = async () => {
  try {
    await ElMessageBox.confirm(`确定要发布选中的 ${selectedResources.value.length} 个资源吗？`, '批量发布', { type: 'info' })

    let successCount = 0
    for (const id of selectedResources.value) {
      try {
        await resourceAPI.publish(id)
        successCount++
      } catch {
        // 忽略单个失败
      }
    }

    ElMessage.success(`成功发布 ${successCount} 个资源`)
    clearSelection()
    loadResources()
    emit('updated')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量发布失败')
    }
  }
}

// 批量回收
const handleBatchUnpublish = async () => {
  try {
    await ElMessageBox.confirm(`确定要将选中的 ${selectedResources.value.length} 个资源回收为草稿吗？`, '批量回收', { type: 'warning' })

    let successCount = 0
    for (const id of selectedResources.value) {
      try {
        await resourceAPI.unpublish(id)
        successCount++
      } catch {
        // 忽略单个失败
      }
    }

    ElMessage.success(`成功回收 ${successCount} 个资源`)
    clearSelection()
    loadResources()
    emit('updated')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量回收失败')
    }
  }
}

// 批量删除
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedResources.value.length} 个资源吗？此操作不可恢复。`, '批量删除', { type: 'warning' })

    let successCount = 0
    for (const id of selectedResources.value) {
      try {
        await resourceAPI.delete(id)
        successCount++
      } catch {
        // 忽略单个失败
      }
    }

    ElMessage.success(`成功删除 ${successCount} 个资源`)
    clearSelection()
    loadResources()
    emit('updated')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

// 移动成功回调
const handleMoveSuccess = () => {
  clearSelection()
  loadResources()
  emit('updated')
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 获取层次标签类型
const getLevelTagType = (level) => {
  const levelMap = {
    '中职': 'success',
    '高职': 'primary',
    '本科': 'warning'
  }
  return levelMap[level] || 'info'
}

// 监听文件夹变化
watch(() => props.folderId, () => {
  pagination.page = 1
  clearSelection()
  loadResources()
}, { immediate: true })

// 监听外部筛选条件变化
watch(() => props.filter, () => {
  pagination.page = 1
  loadResources()
}, { deep: true })

// 暴露方法
defineExpose({
  loadResources
})
</script>

<style scoped>
.resource-grid-panel {
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
  font-size: 16px;
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
  background: #eff6ff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #3b82f6;
  font-weight: 500;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resource-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.select-all-bar {
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.resource-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding-right: 8px;
}

.resource-table {
  flex: 1;
  overflow: auto;
}

.resource-title {
  color: #3b82f6;
  cursor: pointer;
}

.resource-title:hover {
  text-decoration: underline;
}

/* 删除菜单项红色样式 */
:deep(.danger-item) {
  color: #f56c6c !important;
}

:deep(.danger-item:hover) {
  background-color: #fef0f0 !important;
  color: #f56c6c !important;
}

/* 当屏幕足够宽时，最多显示4列 */
@media (min-width: 1400px) {
  .resource-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 中等屏幕最多3列 */
@media (min-width: 1000px) and (max-width: 1399px) {
  .resource-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 小屏幕最多2列 */
@media (min-width: 600px) and (max-width: 999px) {
  .resource-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 超小屏幕单列 */
@media (max-width: 599px) {
  .resource-grid {
    grid-template-columns: 1fr;
  }
}

/* 滚动条样式 */
.resource-grid::-webkit-scrollbar {
  width: 6px;
}

.resource-grid::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.resource-grid::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}
</style>
