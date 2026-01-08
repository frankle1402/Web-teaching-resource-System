<template>
  <div class="admin-resources">
    <el-card v-loading="loading" class="resources-card">
      <template #header>
        <div class="card-header">
          <h3>全站资源管理</h3>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索资源标题或课程名"
            style="width: 250px"
            clearable
            @clear="loadResources"
            @keyup.enter="loadResources"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filters">
        <el-select v-model="filterStatus" placeholder="资源状态" clearable @change="loadResources" style="width: 120px">
          <el-option label="草稿" value="draft" />
          <el-option label="已发布" value="published" />
        </el-select>

        <el-select v-model="filterDisabled" placeholder="禁用状态" clearable @change="loadResources" style="width: 120px">
          <el-option label="正常" :value="0" />
          <el-option label="已禁用" :value="1" />
        </el-select>

        <el-select
          v-if="filterUserId"
          v-model="filterUserId"
          placeholder="筛选用户"
          clearable
          @change="loadResources"
          style="width: 200px"
        >
          <el-option :label="getUserLabel(filterUserId)" :value="filterUserId" />
        </el-select>
      </div>

      <!-- 资源列表 -->
      <el-table :data="resources" stripe style="width: 100%; margin-top: 16px">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="资源标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="course_name" label="课程名称" width="150" show-overflow-tooltip />
        <el-table-column prop="user_phone" label="创建者" width="130">
          <template #default="{ row }">
            {{ row.user_phone ? row.user_phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="course_level" label="层次" width="100" />
        <el-table-column prop="major" label="专业" width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_disabled" label="禁用状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.is_disabled" type="danger" size="small">已禁用</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="view_count" label="浏览" width="80" align="center" />
        <el-table-column prop="like_count" label="点赞" width="80" align="center" />
        <el-table-column prop="created_at" label="创建时间" width="140">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewResource(row)">
              查看
            </el-button>
            <el-button
              v-if="row.is_disabled"
              link
              type="success"
              size="small"
              @click="toggleResourceDisabled(row, false)"
            >
              启用
            </el-button>
            <el-button
              v-else
              link
              type="warning"
              size="small"
              @click="showDisableDialog(row)"
            >
              禁用
            </el-button>
            <el-button
              v-if="row.status === 'published'"
              link
              type="danger"
              size="small"
              @click="forceUnpublish(row)"
            >
              下架
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadResources"
          @size-change="loadResources"
        />
      </div>
    </el-card>

    <!-- 禁用资源对话框 -->
    <el-dialog v-model="disableDialogVisible" title="禁用资源" width="500px">
      <el-form :model="disableForm" label-width="80px">
        <el-form-item label="资源标题">
          <div>{{ disableForm.resource?.title }}</div>
        </el-form-item>
        <el-form-item label="禁用原因">
          <el-input
            v-model="disableForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入禁用原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="disableDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDisable">确认禁用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { adminAPI } from '@/api/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const resources = ref([])
const searchKeyword = ref('')
const filterStatus = ref('')
const filterDisabled = ref('')
const filterUserId = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const disableDialogVisible = ref(false)
const disableForm = reactive({
  resource: null,
  reason: ''
})

const userCache = ref({})

/**
 * 加载资源列表
 */
const loadResources = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (filterStatus.value) params.status = filterStatus.value
    if (filterDisabled.value !== '') params.isDisabled = filterDisabled.value
    if (filterUserId.value) params.userId = filterUserId.value

    const data = await adminAPI.getAllResources(params)
    resources.value = data.list
    pagination.total = data.pagination.total
  } catch (error) {
    ElMessage.error('加载资源列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 格式化日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

/**
 * 获取用户标签
 */
const getUserLabel = (userId) => {
  const user = userCache.value[userId]
  return user ? user.phone : userId
}

/**
 * 查看资源详情
 */
const viewResource = (resource) => {
  router.push(`/resources/edit/${resource.id}`)
}

/**
 * 显示禁用对话框
 */
const showDisableDialog = (resource) => {
  disableForm.resource = resource
  disableForm.reason = ''
  disableDialogVisible.value = true
}

/**
 * 确认禁用资源
 */
const confirmDisable = async () => {
  try {
    await adminAPI.toggleResourceDisabled(disableForm.resource.id, true, disableForm.reason)
    ElMessage.success('资源已禁用')
    disableDialogVisible.value = false
    loadResources()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

/**
 * 切换资源禁用状态
 */
const toggleResourceDisabled = async (resource, isDisabled) => {
  try {
    await adminAPI.toggleResourceDisabled(resource.id, isDisabled)
    ElMessage.success(isDisabled ? '资源已禁用' : '资源已启用')
    loadResources()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

/**
 * 强制下架资源
 */
const forceUnpublish = async (resource) => {
  try {
    await ElMessageBox.confirm(
      `确定要将资源"${resource.title}"下架吗？下架后资源将退回到草稿状态。`,
      '确认下架',
      {
        type: 'warning'
      }
    )

    await adminAPI.forceUnpublishResource(resource.id)
    ElMessage.success('资源已下架')
    loadResources()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

onMounted(() => {
  // 检查URL参数中是否有userId（从用户管理页面跳转过来）
  if (route.query.userId) {
    filterUserId.value = route.query.userId
  }
  loadResources()
})
</script>

<style scoped>
.admin-resources {
  padding: 0;
}

.resources-card {
  min-height: calc(100vh - 140px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
