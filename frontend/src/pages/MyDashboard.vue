<template>
  <div class="my-dashboard">
    <div v-loading="loading" class="dashboard-container">
      <!-- 顶部欢迎区域 -->
      <div class="welcome-section">
        <div class="welcome-content">
          <div class="user-avatar">
            <el-avatar
              :size="80"
              :src="userData.user?.avatar_url"
              :icon="User"
            />
          </div>
          <div class="user-info">
            <h1 class="welcome-title">
              欢迎回来，{{ userData.user?.displayName || userData.user?.nickname || '用户' }}！
            </h1>
            <div class="user-meta">
              <el-tag
                :type="userData.user?.role === 'admin' ? 'danger' : (userData.user?.role === 'student' ? 'success' : 'primary')"
                size="small"
                effect="dark"
              >
                {{ userData.user?.role === 'admin' ? '管理员' : (userData.user?.role === 'student' ? '学生' : '教师') }}
              </el-tag>
              <span v-if="userData.user?.organization" class="organization">
                {{ userData.user.organization }}
              </span>
            </div>
            <div class="last-login">
              上次登录：{{ formatLastLogin(userData.user?.last_login) }}
            </div>
          </div>
        </div>
        <!-- 右上角修改个人设置按钮 -->
        <div class="welcome-actions">
          <el-button
            type="primary"
            plain
            size="small"
            class="edit-profile-btn"
            @click="handleGoToSettings"
          >
            <el-icon><Edit /></el-icon>
            修改个人设置
          </el-button>
        </div>
      </div>

      <!-- 统计卡片区域 -->
      <div class="stats-section">
        <el-row :gutter="20">
          <el-col :xs="12" :sm="12" :md="6">
            <div class="stat-card glass-card">
              <div class="stat-icon monthly-views">
                <el-icon :size="24"><View /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ userData.stats?.monthlyViews || 0 }}</div>
                <div class="stat-label">本月浏览</div>
                <div
                  v-if="userData.stats?.monthlyViewsChange !== undefined"
                  class="stat-change"
                  :class="{ 'positive': userData.stats.monthlyViewsChange >= 0, 'negative': userData.stats.monthlyViewsChange < 0 }"
                >
                  {{ userData.stats.monthlyViewsChange >= 0 ? '+' : '' }}{{ userData.stats.monthlyViewsChange }}%
                  <el-icon v-if="userData.stats.monthlyViewsChange >= 0"><Top /></el-icon>
                  <el-icon v-else><Bottom /></el-icon>
                </div>
              </div>
            </div>
          </el-col>

          <el-col :xs="12" :sm="12" :md="6">
            <div class="stat-card glass-card">
              <div class="stat-icon total-views">
                <el-icon :size="24"><DataLine /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ userData.stats?.totalViews || 0 }}</div>
                <div class="stat-label">总浏览量</div>
              </div>
            </div>
          </el-col>

          <el-col :xs="12" :sm="12" :md="6">
            <div class="stat-card glass-card">
              <div class="stat-icon monthly-duration">
                <el-icon :size="24"><Clock /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ formatDuration(userData.stats?.monthlyDuration) }}</div>
                <div class="stat-label">本月时长</div>
                <div
                  v-if="userData.stats?.monthlyDurationChange !== undefined"
                  class="stat-change"
                  :class="{ 'positive': userData.stats.monthlyDurationChange >= 0, 'negative': userData.stats.monthlyDurationChange < 0 }"
                >
                  {{ userData.stats.monthlyDurationChange >= 0 ? '+' : '' }}{{ userData.stats.monthlyDurationChange }}%
                  <el-icon v-if="userData.stats.monthlyDurationChange >= 0"><Top /></el-icon>
                  <el-icon v-else><Bottom /></el-icon>
                </div>
              </div>
            </div>
          </el-col>

          <el-col :xs="12" :sm="12" :md="6">
            <div class="stat-card glass-card">
              <div class="stat-icon total-duration">
                <el-icon :size="24"><Timer /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ formatDuration(userData.stats?.totalDuration) }}</div>
                <div class="stat-label">总学习时长</div>
              </div>
            </div>
          </el-col>
        </el-row>

        <!-- 教师专属统计 -->
        <el-row v-if="isTeacher" :gutter="20" class="teacher-stats">
          <el-col :xs="12" :sm="12" :md="6">
            <div class="stat-card glass-card teacher-card">
              <div class="stat-icon created-resources">
                <el-icon :size="24"><Document /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ userData.stats?.createdResourcesCount || 0 }}</div>
                <div class="stat-label">创建资源数</div>
              </div>
            </div>
          </el-col>

          <el-col :xs="12" :sm="12" :md="6">
            <div class="stat-card glass-card teacher-card">
              <div class="stat-icon resource-views">
                <el-icon :size="24"><TrendCharts /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ userData.stats?.createdResourcesViewsCount || 0 }}</div>
                <div class="stat-label">资源被浏览量</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 主内容区域 -->
      <div class="main-content">
        <el-row :gutter="20">
          <!-- 左侧：最近浏览 -->
          <el-col :xs="24" :md="14">
            <div class="content-card">
              <div class="card-header">
                <h3>最近浏览</h3>
                <el-button link type="primary" @click="handleViewAllHistory">
                  查看全部浏览记录
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
              <div class="card-body">
                <div v-if="userData.recentViews?.length" class="recent-list">
                  <div
                    v-for="item in userData.recentViews"
                    :key="item.id"
                    class="recent-item"
                    @click="handleViewResource(item.resource)"
                  >
                    <div class="recent-cover">
                      <el-icon :size="32"><Document /></el-icon>
                    </div>
                    <div class="recent-info">
                      <div class="recent-title">{{ item.resource?.title || '未知资源' }}</div>
                      <div class="recent-meta">
                        <span>{{ formatViewTime(item.startTime) }}</span>
                        <span class="dot"></span>
                        <span>学习 {{ item.durationText || formatDuration(item.duration) }}</span>
                      </div>
                    </div>
                    <el-icon class="recent-arrow"><ArrowRight /></el-icon>
                  </div>
                </div>
                <el-empty v-else description="暂无浏览记录" :image-size="80" />
              </div>
            </div>
          </el-col>

          <!-- 右侧：学习趋势 + 快捷入口 -->
          <el-col :xs="24" :md="10">
            <!-- 学习趋势图表 -->
            <div class="content-card chart-card">
              <div class="card-header">
                <h3>学习趋势</h3>
              </div>
              <div class="card-body">
                <div ref="chartRef" class="chart-container"></div>
              </div>
            </div>

            <!-- 快捷入口 -->
            <div class="content-card shortcuts-card">
              <div class="card-header">
                <h3>快捷入口</h3>
              </div>
              <div class="card-body">
                <div class="shortcuts-grid">
                  <div class="shortcut-item" @click="handleGoToExplore">
                    <div class="shortcut-icon explore">
                      <el-icon :size="24"><Collection /></el-icon>
                    </div>
                    <span>资源中心</span>
                  </div>
                  <div v-if="isTeacher" class="shortcut-item" @click="handleCreateResource">
                    <div class="shortcut-icon create">
                      <el-icon :size="24"><Plus /></el-icon>
                    </div>
                    <span>创建资源</span>
                  </div>
                  <div v-else class="shortcut-item" @click="handleGoToRecommend">
                    <div class="shortcut-icon recommend">
                      <el-icon :size="24"><Star /></el-icon>
                    </div>
                    <span>推荐资源</span>
                  </div>
                  <div class="shortcut-item" @click="handleGoToSettings">
                    <div class="shortcut-icon settings">
                      <el-icon :size="24"><Setting /></el-icon>
                    </div>
                    <span>个人设置</span>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { userAPI } from '@/api/user'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  User,
  View,
  DataLine,
  Clock,
  Timer,
  Document,
  TrendCharts,
  ArrowRight,
  Collection,
  Plus,
  Star,
  Setting,
  Top,
  Bottom,
  Edit
} from '@element-plus/icons-vue'
import { getApiBaseUrl } from '@/utils/url'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const chartRef = ref(null)
let chartInstance = null

// 用户数据
const userData = reactive({
  user: null,
  stats: null,
  recentViews: [],
  dailyStats: []
})

// 是否为教师角色（admin或teacher都可以看到教师专属统计）
const isTeacher = computed(() => {
  const role = userData.user?.role || userStore.userRole
  return role === 'admin' || role === 'teacher'
})

/**
 * 格式化时长
 */
function formatDuration(seconds) {
  if (!seconds) return '0分钟'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

/**
 * 格式化上次登录时间
 */
function formatLastLogin(dateStr) {
  if (!dateStr) return '首次登录'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 1 ? '刚刚' : `${minutes}分钟前`
    }
    return `${hours}小时前`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

/**
 * 格式化浏览时间
 */
function formatViewTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

/**
 * 初始化图表
 */
function initChart() {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)
  updateChart()

  // 响应式调整
  window.addEventListener('resize', handleResize)
}

/**
 * 更新图表数据
 */
function updateChart() {
  if (!chartInstance) return

  const dailyStats = userData.dailyStats || []
  const dates = dailyStats.map(item => {
    const date = new Date(item.date)
    return `${date.getMonth() + 1}/${date.getDate()}`
  })
  const views = dailyStats.map(item => item.views || 0)
  const durations = dailyStats.map(item => Math.round((item.duration || 0) / 60)) // 转换为分钟

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function(params) {
        let result = params[0].axisValue + '<br/>'
        params.forEach(param => {
          const value = param.seriesName === '学习时长' ? param.value + '分钟' : param.value + '次'
          result += `${param.marker} ${param.seriesName}: ${value}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['浏览次数', '学习时长'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#e5e7eb'
        }
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 11
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '次数',
        axisLine: {
          show: false
        },
        splitLine: {
          lineStyle: {
            color: '#f1f5f9'
          }
        },
        axisLabel: {
          color: '#64748b'
        }
      },
      {
        type: 'value',
        name: '分钟',
        axisLine: {
          show: false
        },
        splitLine: {
          show: false
        },
        axisLabel: {
          color: '#64748b'
        }
      }
    ],
    series: [
      {
        name: '浏览次数',
        type: 'line',
        smooth: true,
        data: views,
        itemStyle: {
          color: '#6366f1'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
            { offset: 1, color: 'rgba(99, 102, 241, 0.05)' }
          ])
        }
      },
      {
        name: '学习时长',
        type: 'bar',
        yAxisIndex: 1,
        data: durations,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#a855f7' },
            { offset: 1, color: '#6366f1' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '40%'
      }
    ]
  }

  chartInstance.setOption(option)
}

/**
 * 处理窗口大小变化
 */
function handleResize() {
  chartInstance?.resize()
}

/**
 * 加载Dashboard数据
 */
async function loadDashboardData() {
  loading.value = true
  try {
    const data = await userAPI.getDashboard()
    userData.user = data.user
    userData.stats = data.stats
    userData.recentViews = data.recentViews || []
    userData.dailyStats = data.dailyStats || []

    // 更新图表
    await nextTick()
    updateChart()
  } catch (error) {
    console.error('加载Dashboard数据失败:', error)
    ElMessage.error('加载数据失败，请刷新重试')
  } finally {
    loading.value = false
  }
}

/**
 * 查看资源
 */
function handleViewResource(resource) {
  if (resource?.uuid) {
    const baseUrl = getApiBaseUrl()
    window.open(`${baseUrl}/r/${resource.uuid}`, '_blank')
  }
}

/**
 * 查看全部浏览记录
 */
function handleViewAllHistory() {
  router.push('/dashboard/view-history')
}

/**
 * 跳转到资源中心
 */
function handleGoToExplore() {
  window.open('/explore', '_blank')
}

/**
 * 创建资源
 */
function handleCreateResource() {
  router.push('/dashboard/resources/create')
}

/**
 * 跳转到推荐资源
 */
function handleGoToRecommend() {
  window.open('/explore', '_blank')
}

/**
 * 跳转到个人设置
 */
function handleGoToSettings() {
  router.push('/dashboard/settings')
}

onMounted(() => {
  loadDashboardData()
  nextTick(() => {
    initChart()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.my-dashboard {
  padding: 0;
  min-height: 100%;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* 顶部欢迎区域 */
.welcome-section {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  color: white;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.welcome-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.welcome-actions {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.edit-profile-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  color: white !important;
  backdrop-filter: blur(4px);
}

.edit-profile-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  border-color: rgba(255, 255, 255, 0.6) !important;
}

.welcome-content {
  display: flex;
  align-items: center;
  gap: 24px;
  position: relative;
  z-index: 1;
}

.user-avatar {
  flex-shrink: 0;
}

.user-avatar :deep(.el-avatar) {
  border: 3px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.user-info {
  flex: 1;
}

.welcome-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.organization {
  font-size: 14px;
  opacity: 0.9;
}

.last-login {
  font-size: 13px;
  opacity: 0.75;
}

/* 统计卡片区域 */
.stats-section {
  margin-bottom: 24px;
}

.teacher-stats {
  margin-top: 16px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.stat-card {
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  transition: transform 0.3s, box-shadow 0.3s;
  height: 100%;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.monthly-views {
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  color: white;
}

.stat-icon.total-views {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  color: white;
}

.stat-icon.monthly-duration {
  background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
  color: white;
}

.stat-icon.total-duration {
  background: linear-gradient(135deg, #a855f7 0%, #c084fc 100%);
  color: white;
}

.stat-icon.created-resources {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  color: white;
}

.stat-icon.resource-views {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  color: white;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-change {
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.stat-change.positive {
  color: #10b981;
}

.stat-change.negative {
  color: #ef4444;
}

.teacher-card {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.05) 100%);
  border-color: rgba(16, 185, 129, 0.2);
}

/* 主内容区域 */
.main-content {
  margin-bottom: 24px;
}

.content-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.card-body {
  padding: 16px 20px;
}

/* 最近浏览列表 */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f8fafc;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.recent-item:hover {
  background: #f1f5f9;
  transform: translateX(4px);
}

.recent-cover {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-title {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-meta {
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 8px;
}

.recent-meta .dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #cbd5e1;
}

.recent-arrow {
  color: #cbd5e1;
  flex-shrink: 0;
}

/* 图表区域 */
.chart-card .card-body {
  padding: 12px 16px;
}

.chart-container {
  width: 100%;
  height: 220px;
}

/* 快捷入口 */
.shortcuts-card .card-body {
  padding: 20px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.shortcut-item:hover {
  background: #f8fafc;
  transform: translateY(-2px);
}

.shortcut-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.shortcut-icon.explore {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
}

.shortcut-icon.create {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
}

.shortcut-icon.recommend {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
}

.shortcut-icon.settings {
  background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%);
}

.shortcut-item span {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .welcome-section {
    padding: 24px 20px;
    flex-direction: column;
  }

  .welcome-content {
    flex-direction: column;
    text-align: center;
  }

  .welcome-actions {
    margin-top: 16px;
    align-self: center;
  }

  .welcome-title {
    font-size: 22px;
  }

  .user-meta {
    justify-content: center;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-value {
    font-size: 20px;
  }

  .shortcuts-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .shortcut-item {
    padding: 12px 4px;
  }

  .shortcut-icon {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 576px) {
  .welcome-section {
    padding: 20px 16px;
    margin-bottom: 16px;
  }

  .user-avatar :deep(.el-avatar) {
    width: 64px !important;
    height: 64px !important;
  }

  .welcome-title {
    font-size: 18px;
  }

  .stats-section {
    margin-bottom: 16px;
  }

  .stat-card {
    padding: 12px;
    gap: 12px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
  }

  .stat-value {
    font-size: 18px;
  }

  .stat-label {
    font-size: 12px;
  }
}
</style>
