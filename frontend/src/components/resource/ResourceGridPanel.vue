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
        <el-button
          v-if="selectedResources.length > 0"
          type="primary"
          @click="handleMoveSelected"
        >
          <el-icon><FolderAdd /></el-icon>
          移动选中 ({{ selectedResources.length }})
        </el-button>
      </div>
    </div>

    <!-- 全选 + 资源列表 -->
    <div class="resource-list">
      <div v-if="resources.length > 0" class="select-all-bar">
        <el-checkbox
          v-model="selectAll"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        >
          全选 ({{ resources.length }})
        </el-checkbox>
      </div>

      <div v-loading="loading" class="resource-grid">
        <el-empty v-if="!loading && resources.length === 0" description="暂无资源" />

        <ResourceCard
          v-for="resource in resources"
          :key="resource.id"
          :resource="resource"
          :selected="selectedResources.includes(resource.id)"
          @select="handleToggleSelect"
          @click="handlePreview"
        />
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
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, FolderAdd } from '@element-plus/icons-vue'
import { resourceAPI } from '@/api/resource'
import ResourceCard from './ResourceCard.vue'
import ResourcePreviewDialog from './ResourcePreviewDialog.vue'
import ResourceMoveDialog from './ResourceMoveDialog.vue'

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

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const currentFolderId = computed(() => props.folderId)

// 计算全选状态
const selectAll = computed({
  get: () => selectedResources.value.length > 0 && selectedResources.value.length === resources.value.length,
  set: (val) => {
    // 不需要实际操作，由 handleSelectAll 处理
  }
})

const isIndeterminate = computed(() => {
  const len = selectedResources.value.length
  return len > 0 && len < resources.value.length
})

// 加载资源列表
const loadResources = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }

    // folderId 特殊值处理：
    // 'all' - 全部资源（不传folderId参数）
    // 'uncategorized' - 未分类资源（传'uncategorized'）
    // 数字 - 指定文件夹
    if (props.folderId && props.folderId !== 'all') {
      params.folderId = props.folderId
    }

    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }

    const response = await resourceAPI.getList(params)
    resources.value = response.list || []
    pagination.total = response.pagination?.total || 0

    // 清除不在当前页的选择
    selectedResources.value = selectedResources.value.filter(id =>
      resources.value.some(r => r.id === id)
    )
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
  } else {
    selectedResources.value = []
  }
}

// 切换选择状态
const handleToggleSelect = (resourceId, selected) => {
  if (selected) {
    if (!selectedResources.value.includes(resourceId)) {
      selectedResources.value.push(resourceId)
    }
  } else {
    selectedResources.value = selectedResources.value.filter(id => id !== resourceId)
  }
}

// 预览资源
const handlePreview = (resource) => {
  previewResource.value = resource
  previewVisible.value = true
}

// 移动选中的资源
const handleMoveSelected = () => {
  if (selectedResources.value.length === 0) {
    ElMessage.warning('请先选择要移动的资源')
    return
  }
  moveDialogVisible.value = true
}

// 移动成功回调
const handleMoveSuccess = () => {
  selectedResources.value = []
  loadResources()
  emit('updated')
}

// 监听文件夹变化
watch(() => props.folderId, () => {
  pagination.page = 1
  selectedResources.value = []
  loadResources()
}, { immediate: true })

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
