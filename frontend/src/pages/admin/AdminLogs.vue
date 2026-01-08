<template>
  <div class="admin-logs">
    <el-card v-loading="loading" class="logs-card">
      <template #header>
        <div class="card-header">
          <h3>操作日志</h3>
          <el-button type="primary" @click="loadLogs">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="filters">
        <el-select v-model="filterAction" placeholder="操作类型" clearable @change="loadLogs" style="width: 150px">
          <el-option label="禁用用户" value="disable_user" />
          <el-option label="启用用户" value="enable_user" />
          <el-option label="更新用户" value="update_user" />
          <el-option label="禁用资源" value="disable_resource" />
          <el-option label="启用资源" value="enable_resource" />
          <el-option label="下架资源" value="unpublish_resource" />
        </el-select>

        <el-select v-model="filterTargetType" placeholder="目标类型" clearable @change="loadLogs" style="width: 120px">
          <el-option label="用户" value="user" />
          <el-option label="资源" value="resource" />
        </el-select>
      </div>

      <!-- 日志列表 -->
      <el-timeline style="margin-top: 20px">
        <el-timeline-item
          v-for="log in logs"
          :key="log.id"
          :timestamp="formatDateTime(log.created_at)"
          placement="top"
        >
          <el-card class="log-card">
            <div class="log-header">
              <span class="log-action">{{ getActionLabel(log.action) }}</span>
              <el-tag :type="getTargetTagType(log.target_type)" size="small">
                {{ getTargetTypeLabel(log.target_type) }}
              </el-tag>
            </div>
            <div class="log-content">
              <div class="log-operator">
                操作者: <strong>{{ log.admin_phone || log.admin_phone || '-' }}</strong>
              </div>
              <div v-if="log.details" class="log-details">
                <template v-if="log.action === 'disable_resource'">
                  禁用资源: {{ log.details.resourceTitle }}
                  <span v-if="log.details.reason" class="reason">（原因: {{ log.details.reason }}）</span>
                </template>
                <template v-else-if="log.action === 'enable_resource'">
                  启用资源: {{ log.details.resourceTitle }}
                </template>
                <template v-else-if="log.action === 'unpublish_resource'">
                  下架资源: {{ log.details.resourceTitle }}
                  <span v-if="log.details.resourceOwner">（创建者: {{ log.details.resourceOwner }}）</span>
                </template>
                <template v-else-if="log.action === 'disable_user' || log.action === 'enable_user'">
                  {{ log.action === 'disable_user' ? '禁用用户' : '启用用户' }}: {{ log.details.targetUser }}
                </template>
                <template v-else-if="log.action === 'update_user'">
                  更新用户信息: {{ log.details.targetUser }}
                </template>
              </div>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <!-- 空状态 -->
      <el-empty v-if="logs.length === 0 && !loading" description="暂无操作日志" />

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadLogs"
          @size-change="loadLogs"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { adminAPI } from '@/api/admin'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const loading = ref(false)
const logs = ref([])
const filterAction = ref('')
const filterTargetType = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

/**
 * 加载操作日志
 */
const loadLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterAction.value) params.action = filterAction.value
    if (filterTargetType.value) params.targetType = filterTargetType.value

    const data = await adminAPI.getLogs(params)
    logs.value = data.list
    pagination.total = data.pagination.total
  } catch (error) {
    ElMessage.error('加载操作日志失败')
  } finally {
    loading.value = false
  }
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 获取操作类型标签
 */
const getActionLabel = (action) => {
  const labels = {
    disable_user: '禁用用户',
    enable_user: '启用用户',
    update_user: '更新用户',
    disable_resource: '禁用资源',
    enable_resource: '启用资源',
    unpublish_resource: '下架资源'
  }
  return labels[action] || action
}

/**
 * 获取目标类型标签
 */
const getTargetTypeLabel = (type) => {
  const labels = {
    user: '用户',
    resource: '资源'
  }
  return labels[type] || type
}

/**
 * 获取目标类型标签颜色
 */
const getTargetTagType = (type) => {
  const types = {
    user: 'danger',
    resource: 'warning'
  }
  return types[type] || 'info'
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.admin-logs {
  padding: 0;
}

.logs-card {
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
}

.log-card {
  margin-bottom: 0;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.log-action {
  font-weight: 600;
  color: #1e293b;
}

.log-content {
  font-size: 14px;
  color: #64748b;
}

.log-operator {
  margin-bottom: 8px;
}

.log-details {
  line-height: 1.6;
}

.reason {
  color: #ef4444;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
