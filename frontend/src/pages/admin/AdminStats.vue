<template>
  <div class="admin-stats">
    <div v-loading="loading" class="stats-container">
      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card users">
            <div class="stat-icon">
              <el-icon :size="32"><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.users.total }}</div>
              <div class="stat-label">总用户数</div>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card active-users">
            <div class="stat-icon">
              <el-icon :size="32"><UserFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.users.active }}</div>
              <div class="stat-label">活跃用户</div>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card resources">
            <div class="stat-icon">
              <el-icon :size="32"><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.resources.total }}</div>
              <div class="stat-label">总资源数</div>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card ai-calls">
            <div class="stat-icon">
              <el-icon :size="32"><MagicStick /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.ai.totalCalls }}</div>
              <div class="stat-label">AI调用次数</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 详细统计 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="24" :sm="12" :md="8">
          <div class="detail-card">
            <h3>今日数据</h3>
            <div class="detail-item">
              <span class="label">新注册用户</span>
              <span class="value">{{ stats.users.todayNew }}</span>
            </div>
            <div class="detail-item">
              <span class="label">今日活跃</span>
              <span class="value">{{ stats.users.todayActive }}</span>
            </div>
            <div class="detail-item">
              <span class="label">AI调用</span>
              <span class="value">{{ stats.ai.todayCalls }}</span>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :md="8">
          <div class="detail-card">
            <h3>资源状态</h3>
            <div class="detail-item">
              <span class="label">已发布</span>
              <span class="value success">{{ stats.resources.published }}</span>
            </div>
            <div class="detail-item">
              <span class="label">草稿</span>
              <span class="value">{{ stats.resources.total - stats.resources.published }}</span>
            </div>
            <div class="detail-item">
              <span class="label">已禁用</span>
              <span class="value danger">{{ stats.resources.disabled }}</span>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :sm="24" :md="8">
          <div class="detail-card">
            <h3>快捷操作</h3>
            <div class="quick-actions">
              <el-button type="primary" @click="$router.push('/dashboard/admin/users')">
                <el-icon><User /></el-icon>
                用户管理
              </el-button>
              <el-button type="success" @click="$router.push('/dashboard/admin/resources')">
                <el-icon><FolderOpened /></el-icon>
                资源管理
              </el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { adminAPI } from '@/api/admin'
import { ElMessage } from 'element-plus'
import {
  User,
  UserFilled,
  Document,
  MagicStick,
  FolderOpened
} from '@element-plus/icons-vue'

const loading = ref(false)

const stats = reactive({
  users: {
    total: 0,
    active: 0,
    todayNew: 0,
    todayActive: 0
  },
  resources: {
    total: 0,
    published: 0,
    disabled: 0
  },
  ai: {
    totalCalls: 0,
    todayCalls: 0
  },
  weekTrend: []
})

/**
 * 加载统计数据
 */
const loadStats = async () => {
  loading.value = true
  try {
    const data = await adminAPI.getStats()
    Object.assign(stats, data)
  } catch (error) {
    ElMessage.error('加载统计数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-stats {
  padding: 0;
}

.stats-container {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-card.users .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-card.active-users .stat-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.stat-card.resources .stat-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.stat-card.ai-calls .stat-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
}

.detail-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.detail-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.detail-item .label {
  color: #64748b;
  font-size: 14px;
}

.detail-item .value {
  font-weight: 600;
  color: #1e293b;
  font-size: 16px;
}

.detail-item .value.success {
  color: #10b981;
}

.detail-item .value.danger {
  color: #ef4444;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-actions .el-button {
  justify-content: flex-start;
}
</style>
