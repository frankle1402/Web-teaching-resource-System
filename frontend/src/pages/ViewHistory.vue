<template>
  <div class="view-history-page">
    <div class="page-header">
      <h2 class="page-title">浏览记录</h2>
      <p class="page-desc">查看您的教学资源学习历史</p>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="16">
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.todayViews || 0 }}</div>
            <div class="stat-label">本月浏览</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.weekViews || 0 }}</div>
            <div class="stat-label">累计浏览</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-value">{{ formatDuration(stats.todayDuration) }}</div>
            <div class="stat-label">本月时长</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-value">{{ formatDuration(stats.weekDuration) }}</div>
            <div class="stat-label">累计时长</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-bar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        :shortcuts="dateShortcuts"
        @change="handleDateChange"
      />
      <el-input
        v-model="searchKeyword"
        placeholder="搜索资源标题"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" @click="handleSearch">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
    </div>

    <!-- 浏览记录列表 -->
    <div v-loading="loading" class="history-list">
      <template v-if="viewList.length > 0">
        <!-- 按日期分组显示 -->
        <div
          v-for="group in groupedViews"
          :key="group.date"
          class="date-group"
        >
          <div class="group-header">
            <span class="group-date">{{ formatGroupDate(group.date) }}</span>
            <span class="group-stats">
              {{ group.views.length }} 条记录 · 学习 {{ formatDuration(group.totalDuration) }}
            </span>
          </div>
          <div class="group-items">
            <div
              v-for="item in group.views"
              :key="item.id"
              class="history-item"
              @click="handleViewResource(item)"
            >
              <div class="item-icon">
                <el-icon :size="24"><Document /></el-icon>
              </div>
              <div class="item-content">
                <div class="item-title">{{ item.resource?.title || '未知资源' }}</div>
                <div class="item-meta">
                  <span class="meta-time">
                    <el-icon><Clock /></el-icon>
                    {{ formatTime(item.startTime) }}
                  </span>
                  <span class="meta-duration">
                    <el-icon><Timer /></el-icon>
                    学习 {{ formatDuration(item.duration) }}
                  </span>
                  <span v-if="item.resource?.authorName" class="meta-author">
                    <el-icon><User /></el-icon>
                    {{ item.resource.authorName }}
                  </span>
                </div>
              </div>
              <el-button
                class="item-action"
                type="primary"
                link
                @click.stop="handleViewResource(item)"
              >
                继续学习
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <el-empty v-else-if="!loading" description="暂无浏览记录">
        <el-button type="primary" @click="handleGoToExplore">
          去资源中心看看
        </el-button>
      </el-empty>
    </div>

    <!-- 分页 -->
    <div v-if="total > 0" class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { viewAPI } from '@/api/view'
import { ElMessage } from 'element-plus'
import {
  Search,
  Document,
  Clock,
  Timer,
  User,
  ArrowRight
} from '@element-plus/icons-vue'
import { getApiBaseUrl } from '@/utils/url'

const router = useRouter()

// 状态
const loading = ref(false)
const viewList = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const dateRange = ref(null)

// 统计数据
const stats = reactive({
  todayViews: 0,
  weekViews: 0,
  todayDuration: 0,
  weekDuration: 0
})

// 日期快捷选项
const dateShortcuts = [
  {
    text: '今天',
    value: () => {
      const today = new Date()
      return [today, today]
    }
  },
  {
    text: '本周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - start.getDay())
      return [start, end]
    }
  },
  {
    text: '本月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(1)
      return [start, end]
    }
  },
  {
    text: '最近7天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 6)
      return [start, end]
    }
  },
  {
    text: '最近30天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 29)
      return [start, end]
    }
  }
]

/**
 * 按日期分组的浏览记录
 */
const groupedViews = computed(() => {
  const groups = {}

  viewList.value.forEach(item => {
    // 使用 startTime（驼峰命名）
    const dateStr = item.startTime || ''
    const date = dateStr ? dateStr.split(' ')[0] : 'unknown'
    if (!groups[date]) {
      groups[date] = {
        date,
        views: [],
        totalDuration: 0
      }
    }
    groups[date].views.push(item)
    groups[date].totalDuration += item.duration || 0
  })

  // 按日期降序排列
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
})

/**
 * 格式化时长
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0分钟'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

/**
 * 格式化时间
 */
function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/**
 * 格式化分组日期
 */
function formatGroupDate(dateStr) {
  if (!dateStr || dateStr === 'unknown') return '未知日期'

  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const dateOnly = dateStr
  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (dateOnly === todayStr) {
    return '今天'
  } else if (dateOnly === yesterdayStr) {
    return '昨天'
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }
}

/**
 * 加载浏览记录
 */
async function loadViewHistory() {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }

    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const result = await viewAPI.getMyViews(params)
    // 正确解析嵌套的数据结构
    viewList.value = result?.list || []
    total.value = result?.pagination?.total || 0

    // 加载统计数据
    await loadStats()
  } catch (error) {
    console.error('加载浏览记录失败:', error)
    ElMessage.error('加载浏览记录失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载统计数据
 */
async function loadStats() {
  try {
    const result = await viewAPI.getViewStats()
    // 正确解析嵌套的统计数据结构
    const statsData = result?.stats || {}
    stats.todayViews = statsData.monthlyViews || 0
    stats.weekViews = statsData.totalViews || 0
    stats.todayDuration = statsData.monthlyDuration || 0
    stats.weekDuration = statsData.totalDuration || 0
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

/**
 * 处理搜索
 */
function handleSearch() {
  currentPage.value = 1
  loadViewHistory()
}

/**
 * 处理日期变化
 */
function handleDateChange() {
  currentPage.value = 1
  loadViewHistory()
}

/**
 * 处理分页大小变化
 */
function handleSizeChange() {
  currentPage.value = 1
  loadViewHistory()
}

/**
 * 处理页码变化
 */
function handlePageChange() {
  loadViewHistory()
}

/**
 * 查看资源
 */
function handleViewResource(item) {
  if (item.resource?.uuid) {
    // 使用后端地址构建公开资源链接
    const baseUrl = getApiBaseUrl()
    window.open(`${baseUrl}/r/${item.resource.uuid}`, '_blank')
  }
}

/**
 * 跳转到资源中心
 */
function handleGoToExplore() {
  router.push('/explore')
}

onMounted(() => {
  loadViewHistory()
})
</script>

<style scoped>
.view-history-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.page-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* 统计概览 */
.stats-overview {
  margin-bottom: 24px;
}

.stat-card {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  opacity: 0.9;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-input {
  width: 240px;
}

/* 历史记录列表 */
.history-list {
  min-height: 300px;
}

.date-group {
  margin-bottom: 24px;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 12px;
}

.group-date {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.group-stats {
  font-size: 13px;
  color: #64748b;
}

.group-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  transform: translateX(4px);
}

.item-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.item-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #64748b;
}

.item-action {
  flex-shrink: 0;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

/* 响应式 */
@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .history-item {
    flex-wrap: wrap;
  }

  .item-action {
    width: 100%;
    margin-top: 8px;
    justify-content: center;
  }

  .item-meta {
    gap: 8px;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-value {
    font-size: 20px;
  }
}
</style>
