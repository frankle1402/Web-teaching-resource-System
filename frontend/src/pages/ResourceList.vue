<template>
  <div class="resource-list-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>教学资源管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        创建资源
      </el-button>
    </div>

    <!-- 筛选区域 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="filterForm.keyword"
            placeholder="搜索标题或课程名"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>

        <el-form-item label="文件夹">
          <el-cascader
            v-model="filterForm.folderId"
            :options="folderTree"
            :props="{
              value: 'id',
              label: 'name',
              children: 'children',
              checkStrictly: true,
              emitPath: false
            }"
            placeholder="全部文件夹"
            clearable
            @change="handleSearch"
          />
        </el-form-item>

        <el-form-item label="课程层次">
          <el-select
            v-model="filterForm.courseLevel"
            placeholder="全部"
            clearable
            @change="handleSearch"
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
            @change="handleSearch"
          >
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 资源列表 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="resourceList"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="title" label="资源标题" min-width="200" />

        <el-table-column prop="course_name" label="课程名称" width="150" />

        <el-table-column prop="course_level" label="层次" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.course_level === '中职'" type="success" size="small">
              中职
            </el-tag>
            <el-tag v-else-if="row.course_level === '高职'" type="primary" size="small">
              高职
            </el-tag>
            <el-tag v-else-if="row.course_level === '本科'" type="warning" size="small">
              本科
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="major" label="专业" width="120" />

        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'draft'" type="info" size="small">
              草稿
            </el-tag>
            <el-tag v-else-if="row.status === 'published'" type="success" size="small">
              已发布
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="updated_at" label="更新时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.updated_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <!-- 已发布资源：显示访问、复制网址、回收按钮 -->
            <template v-if="row.status === 'published'">
              <el-button
                type="success"
                size="small"
                link
                @click="handleVisit(row)"
              >
                访问
              </el-button>
              <el-button
                type="primary"
                size="small"
                link
                @click="handleCopyUrl(row)"
              >
                复制网址
              </el-button>
              <el-button
                type="warning"
                size="small"
                link
                @click="handleUnpublish(row)"
              >
                回收
              </el-button>
              <el-button
                type="info"
                size="small"
                link
                @click="handleViewVersions(row)"
              >
                版本
              </el-button>
              <el-button
                type="primary"
                size="small"
                link
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
            </template>
            <!-- 草稿资源：显示编辑、版本、发布、删除按钮 -->
            <template v-else>
              <el-button
                type="primary"
                size="small"
                link
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                type="info"
                size="small"
                link
                @click="handleViewVersions(row)"
              >
                版本
              </el-button>
              <el-button
                type="success"
                size="small"
                link
                @click="handlePublish(row)"
              >
                发布
              </el-button>
              <el-button
                type="danger"
                size="small"
                link
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 版本历史对话框 -->
    <el-dialog
      v-model="versionDialogVisible"
      title="版本历史"
      width="800px"
    >
      <el-timeline v-loading="loadingVersions">
        <el-timeline-item
          v-for="version in versions"
          :key="version.id"
          :timestamp="formatDate(version.created_at)"
          placement="top"
        >
          <div class="version-item">
            <div class="version-header">
              <strong>版本 {{ version.version_number }}</strong>
              <el-button
                v-if="version.version_number !== 1"
                type="primary"
                size="small"
                @click="handleRestoreVersion(version)"
              >
                恢复到此版本
              </el-button>
            </div>
            <div class="version-note">{{ version.version_note }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { resourceAPI } from '@/api/resource'
import { folderAPI } from '@/api/folder'

const router = useRouter()

// 数据状态
const loading = ref(false)
const loadingVersions = ref(false)
const resourceList = ref([])
const folderTree = ref([])
const versions = ref([])
const versionDialogVisible = ref(false)
const currentResourceId = ref(null)

// 筛选表单
const filterForm = reactive({
  keyword: '',
  folderId: null,
  courseLevel: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 加载资源列表
const loadResources = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filterForm
    }
    // 响应拦截器已经返回了 res.data，所以直接使用返回值
    const response = await resourceAPI.getList(params)
    resourceList.value = response.list || []
    pagination.total = response.pagination?.total || 0
  } catch (error) {
    console.error('加载资源列表失败:', error)
    ElMessage.error('加载资源列表失败')
  } finally {
    loading.value = false
  }
}

// 加载文件夹树
const loadFolders = async () => {
  try {
    // 响应拦截器已经返回了 res.data
    const response = await folderAPI.getTree()
    folderTree.value = response || []
  } catch (error) {
    console.error('加载文件夹树失败:', error)
    // 不显示错误消息，因为文件夹功能暂时不可用
    folderTree.value = []
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadResources()
}

// 重置
const handleReset = () => {
  Object.assign(filterForm, {
    keyword: '',
    folderId: null,
    courseLevel: '',
    status: ''
  })
  handleSearch()
}

// 翻页
const handlePageChange = () => {
  loadResources()
}

const handleSizeChange = () => {
  pagination.page = 1
  loadResources()
}

// 创建资源
const handleCreate = () => {
  router.push('/resources/create')
}

// 编辑资源
const handleEdit = (row) => {
  router.push(`/resources/edit/${row.id}`)
}

// 查看版本历史
const handleViewVersions = async (row) => {
  currentResourceId.value = row.id
  versionDialogVisible.value = true
  loadingVersions.value = true
  try {
    // 响应拦截器已经返回了 res.data
    const response = await resourceAPI.getVersions(row.id)
    versions.value = response || []
  } catch (error) {
    console.error('加载版本历史失败:', error)
    ElMessage.error('加载版本历史失败')
  } finally {
    loadingVersions.value = false
  }
}

// 恢复版本
const handleRestoreVersion = async (version) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复到版本 ${version.version_number} 吗？当前内容将被替换。`,
      '确认恢复',
      {
        type: 'warning'
      }
    )
    await resourceAPI.restoreVersion(currentResourceId.value, version.id)
    ElMessage.success('版本恢复成功')
    versionDialogVisible.value = false
    loadResources()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('恢复版本失败')
    }
  }
}

// 发布资源
const handlePublish = async (row) => {
  try {
    await ElMessageBox.confirm(
      '确定要发布此资源吗？发布后将生成公开访问链接。',
      '确认发布',
      {
        type: 'warning'
      }
    )
    await resourceAPI.publish(row.id)
    ElMessage.success('资源发布成功')
    loadResources()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('发布失败')
    }
  }
}

// 访问已发布资源
const handleVisit = (row) => {
  if (!row.public_url) {
    ElMessage.warning('该资源尚未生成访问链接')
    return
  }
  // 在新窗口打开
  window.open(row.public_url, '_blank')
}

// 复制访问网址
const handleCopyUrl = async (row) => {
  if (!row.public_url) {
    ElMessage.warning('该资源尚未生成访问链接')
    return
  }

  try {
    // 使用 Clipboard API 复制
    await navigator.clipboard.writeText(row.public_url)
    ElMessage.success('网址已复制到剪贴板')
  } catch (error) {
    // 如果 Clipboard API 不可用，使用备用方法
    const textArea = document.createElement('textarea')
    textArea.value = row.public_url
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      ElMessage.success('网址已复制到剪贴板')
    } catch (err) {
      ElMessage.error('复制失败，请手动复制')
    }
    document.body.removeChild(textArea)
  }
}

// 回收资源为草稿
const handleUnpublish = async (row) => {
  try {
    await ElMessageBox.confirm(
      '确定要回收此资源为草稿吗？回收后公开链接将无法访问。',
      '确认回收',
      {
        type: 'warning'
      }
    )
    await resourceAPI.unpublish(row.id)
    ElMessage.success('资源已回收为草稿')
    loadResources()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('回收失败:', error)
      ElMessage.error('回收失败')
    }
  }
}

// 删除资源
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${row.title}"吗？此操作不可恢复。`,
      '确认删除',
      {
        type: 'warning'
      }
    )
    await resourceAPI.delete(row.id)
    ElMessage.success('删除成功')
    loadResources()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 格式化日期
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

// 初始化
onMounted(() => {
  loadResources()
  loadFolders()
})
</script>

<style scoped>
.resource-list-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
  color: #1f2937;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  margin-bottom: 0;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.version-item {
  padding: 10px 0;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.version-note {
  color: #6b7280;
  font-size: 14px;
}
</style>
