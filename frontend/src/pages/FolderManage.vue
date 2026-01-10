<template>
  <div class="my-resources-page">
    <!-- 顶部筛选区域 -->
    <div class="filter-section">
      <div class="filter-form">
        <el-form :inline="true" :model="filterForm" class="filter-form-inline">
          <el-form-item label="关键词">
            <el-input
              v-model="filterForm.keyword"
              placeholder="搜索标题或课程名称"
              clearable
              style="width: 200px"
              @clear="handleFilterChange"
            />
          </el-form-item>
          <el-form-item label="课程层次">
            <el-select
              v-model="filterForm.courseLevel"
              placeholder="全部"
              clearable
              style="width: 120px"
              @change="handleFilterChange"
            >
              <el-option label="中职" value="中职" />
              <el-option label="高职" value="高职" />
              <el-option label="本科" value="本科" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="filterForm.status"
              placeholder="全部"
              clearable
              style="width: 120px"
              @change="handleFilterChange"
            >
              <el-option label="已发布" value="published" />
              <el-option label="草稿" value="draft" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleFilterChange">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleResetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
      <div class="filter-actions">
        <el-button type="primary" @click="handleCreateResource">
          <el-icon><Plus /></el-icon>
          创建资源
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="content-container">
      <!-- 左侧文件夹树 -->
      <div class="left-panel">
        <FolderTreePanel
          ref="folderTreeRef"
          @folder-selected="handleFolderSelected"
          @folder-updated="handleFolderUpdated"
        />
      </div>

      <!-- 右侧资源列表 -->
      <div class="right-panel">
        <ResourceGridPanel
          ref="resourceGridRef"
          :folder-id="selectedFolderId"
          :folder-name="selectedFolderName"
          :folder-tree="folderTree"
          :filter="filterConditions"
          :new-resource-id="newResourceId"
          @updated="handleResourceUpdated"
        />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, Plus } from '@element-plus/icons-vue'
import { folderAPI } from '@/api/folder'
import FolderTreePanel from '@/components/folder/FolderTreePanel.vue'
import ResourceGridPanel from '@/components/resource/ResourceGridPanel.vue'

const router = useRouter()
const route = useRoute()
const folderTreeRef = ref(null)
const resourceGridRef = ref(null)

const selectedFolderId = ref('all') // 默认选中"全部资源"
const selectedFolderName = ref('全部资源')
const folderTree = ref([])
const newResourceId = ref(null) // 新创建的资源ID，用于高亮显示

// 筛选表单
const filterForm = ref({
  keyword: '',
  courseLevel: '',
  status: ''
})

// 实际应用的筛选条件（只有非空值才会传递）
const filterConditions = computed(() => {
  const conditions = {}
  if (filterForm.value.keyword) {
    conditions.keyword = filterForm.value.keyword
  }
  if (filterForm.value.courseLevel) {
    conditions.courseLevel = filterForm.value.courseLevel
  }
  if (filterForm.value.status) {
    conditions.status = filterForm.value.status
  }
  return conditions
})

// 加载文件夹树数据
const loadFolderTree = async () => {
  try {
    const response = await folderAPI.getTree()
    if (response.tree) {
      folderTree.value = response.tree
    } else if (Array.isArray(response)) {
      folderTree.value = response
    }
  } catch (error) {
    console.error('加载文件夹树失败:', error)
  }
}

// 文件夹被选中
const handleFolderSelected = (folderId, folderName) => {
  selectedFolderId.value = folderId
  selectedFolderName.value = folderName
}

// 文件夹更新后刷新
const handleFolderUpdated = () => {
  loadFolderTree()
  if (resourceGridRef.value) {
    resourceGridRef.value.loadResources()
  }
}

// 资源更新后刷新文件夹树
const handleResourceUpdated = () => {
  if (folderTreeRef.value) {
    folderTreeRef.value.loadFolders()
  }
}

// 筛选条件变化
const handleFilterChange = () => {
  // ResourceGridPanel 会通过 watch filterConditions 自动刷新
}

// 重置筛选
const handleResetFilter = () => {
  filterForm.value = {
    keyword: '',
    courseLevel: '',
    status: ''
  }
}

// 创建资源
const handleCreateResource = () => {
  router.push('/dashboard/resources/create')
}

// 监听路由参数，当有新资源ID时自动切换到"全部资源"并传递给子组件
watch(() => route.query.newResourceId, (id) => {
  if (id) {
    newResourceId.value = parseInt(id)
    // 自动切换到"全部资源"视图，确保新资源可见
    selectedFolderId.value = 'all'
    selectedFolderName.value = '全部资源'
  } else {
    newResourceId.value = null
  }
}, { immediate: true })

// 初始化
loadFolderTree()
</script>

<style scoped>
.my-resources-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filter-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.filter-form-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.filter-form-inline :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 16px;
}

.filter-actions {
  display: flex;
  gap: 12px;
}

.content-container {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

.left-panel {
  width: 280px;
  flex-shrink: 0;
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.right-panel {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}
</style>
