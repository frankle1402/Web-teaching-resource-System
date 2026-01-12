<template>
  <div class="explore-page">
    <!-- 顶部导航栏 -->
    <div class="top-nav">
      <div class="nav-container">
        <div class="nav-logo" @click="$router.push('/login')">
          <el-icon><Document /></el-icon>
          <span>医教智创云平台</span>
        </div>
        <div class="nav-actions">
          <el-button v-if="!userStore.isLoggedIn" type="primary" @click="goToLogin">
            <el-icon><User /></el-icon>
            登录
          </el-button>
          <div v-else class="user-info">
            <el-button @click="goToDashboard">
              <el-icon><HomeFilled /></el-icon>
              进入系统
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hero区域 -->
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="title-main">教学资源中心</span>
          <span class="title-sub">探索优质教学资源，助力医卫教育</span>
        </h1>
        <p class="hero-desc">
          汇集护理、急救、药学等多个专业的优质教学资源，支持在线浏览与学习
        </p>

        <!-- 搜索框 -->
        <div class="hero-search">
          <el-input
            v-model="filterForm.keyword"
            placeholder="搜索资源标题、课程名称或专业..."
            size="large"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #append>
              <el-button :icon="Search" @click="handleSearch">搜索</el-button>
            </template>
          </el-input>
        </div>

        <!-- 统计信息 -->
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">{{ pagination.total }}</span>
            <span class="stat-label">优质资源</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">{{ majorList.length }}</span>
            <span class="stat-label">覆盖专业</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">免费</span>
            <span class="stat-label">全部开放</span>
          </div>
        </div>
      </div>

      <!-- 装饰背景 -->
      <div class="hero-bg">
        <div class="bg-circle bg-circle-1"></div>
        <div class="bg-circle bg-circle-2"></div>
        <div class="bg-circle bg-circle-3"></div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <div class="filter-container">
        <div class="filter-tags">
          <span class="filter-label">课程层次:</span>
          <el-tag
            v-for="level in courseLevels"
            :key="level.value"
            :type="filterForm.courseLevel === level.value ? 'primary' : 'info'"
            :effect="filterForm.courseLevel === level.value ? 'dark' : 'plain'"
            class="filter-tag"
            @click="toggleCourseLevel(level.value)"
          >
            {{ level.label }}
          </el-tag>
        </div>

        <div class="filter-tags">
          <span class="filter-label">专业:</span>
          <el-select
            v-model="filterForm.major"
            placeholder="选择专业"
            clearable
            filterable
            @change="handleSearch"
            :loading="majorsLoading"
            style="width: 160px"
          >
            <el-option
              v-for="major in majorList"
              :key="major"
              :label="major"
              :value="major"
            />
          </el-select>
        </div>

        <div class="filter-tags">
          <span class="filter-label">排序:</span>
          <el-select
            v-model="filterForm.sortBy"
            @change="handleSearch"
            style="width: 120px"
          >
            <el-option label="最新发布" value="latest" />
            <el-option label="最多浏览" value="popular" />
            <el-option label="最多点赞" value="liked" />
          </el-select>
        </div>

        <el-button v-if="hasFilters" link @click="handleReset">
          <el-icon><RefreshLeft /></el-icon>
          清空筛选
        </el-button>
      </div>
    </div>

    <!-- 资源列表 -->
    <div class="content-section">
      <div v-loading="loading" class="resource-list">
        <!-- 空状态 -->
        <el-empty
          v-if="!loading && resourceList.length === 0"
          description="暂无符合条件的资源"
          :image-size="120"
        >
          <el-button type="primary" @click="handleReset">清除筛选条件</el-button>
        </el-empty>

        <!-- 资源卡片 -->
        <div
          v-for="resource in resourceList"
          :key="resource.id"
          class="resource-card"
          @click="handleViewResource(resource)"
        >
          <div class="card-badge">
            <el-tag v-if="resource.course_level === '中职'" type="success" size="small">
              中职
            </el-tag>
            <el-tag v-else-if="resource.course_level === '高职'" type="primary" size="small">
              高职
            </el-tag>
            <el-tag v-else-if="resource.course_level === '本科'" type="warning" size="small">
              本科
            </el-tag>
          </div>

          <div class="card-icon">
            <el-icon :size="40"><Document /></el-icon>
          </div>

          <h3 class="card-title">{{ resource.title }}</h3>

          <div class="card-meta">
            <span class="meta-item">
              <el-icon><Reading /></el-icon>
              {{ resource.course_name }}
            </span>
            <div class="meta-majors">
              <el-icon><School /></el-icon>
              <template v-if="Array.isArray(resource.major)">
                <el-tag
                  v-for="(majorItem, idx) in resource.major.slice(0, 3)"
                  :key="idx"
                  size="small"
                  type="info"
                  class="major-tag"
                >
                  {{ majorItem }}
                </el-tag>
                <span v-if="resource.major.length > 3" class="major-more">
                  +{{ resource.major.length - 3 }}
                </span>
              </template>
              <span v-else>{{ resource.major }}</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="card-stats">
              <span class="stat" title="浏览量">
                <el-icon><View /></el-icon>
                {{ resource.view_count || 0 }}
              </span>
              <span class="stat" title="点赞数">
                <el-icon><StarFilled /></el-icon>
                {{ resource.like_count || 0 }}
              </span>
            </div>
            <span class="card-time">{{ formatDate(resource.updated_at) }}</span>
          </div>

          <div class="card-action">
            <el-button type="primary" link>
              查看详情 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="pagination.total > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[12, 24, 36]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <!-- 页脚 -->
    <div class="page-footer">
      <p>© 2026 教学资源生成与管理系统</p>
      <p>探索优质教学资源，助力医卫教育事业发展</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Document, User, Search, HomeFilled, RefreshLeft,
  Reading, School, View, StarFilled, ArrowRight
} from '@element-plus/icons-vue'
import { publicAPI } from '@/api/public'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()

// 课程层次选项
const courseLevels = [
  { label: '中职', value: '中职' },
  { label: '高职', value: '高职' },
  { label: '本科', value: '本科' }
]

// 数据状态
const loading = ref(false)
const majorsLoading = ref(false)
const resourceList = ref([])
const majorList = ref([])

// 筛选表单
const filterForm = reactive({
  keyword: '',
  courseLevel: '',
  major: '',
  sortBy: 'latest'
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 12,
  total: 0
})

// 是否有筛选条件
const hasFilters = computed(() => {
  return filterForm.keyword || filterForm.courseLevel || filterForm.major
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
    const response = await publicAPI.getResources(params)

    if (response.data && response.data.success) {
      resourceList.value = response.data.data.list || []
      pagination.total = response.data.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('加载资源列表失败:', error)
    ElMessage.error('加载资源列表失败')
  } finally {
    loading.value = false
  }
}

// 加载专业列表
const loadMajors = async () => {
  majorsLoading.value = true
  try {
    const response = await publicAPI.getMajors()
    if (response.data && response.data.success) {
      majorList.value = response.data.data || []
    }
  } catch (error) {
    console.error('加载专业列表失败:', error)
  } finally {
    majorsLoading.value = false
  }
}

// 切换课程层次
const toggleCourseLevel = (level) => {
  filterForm.courseLevel = filterForm.courseLevel === level ? '' : level
  handleSearch()
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
    courseLevel: '',
    major: '',
    sortBy: 'latest'
  })
  handleSearch()
}

// 翻页
const handlePageChange = () => {
  loadResources()
  // 滚动��顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleSizeChange = () => {
  pagination.page = 1
  loadResources()
}

// 查看资源
const handleViewResource = (resource) => {
  // 使用后端地址构建公开资源链接（端口8080）
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  const publicUrl = `${baseUrl}/r/${resource.uuid}`
  window.open(publicUrl, '_blank')
}

// 跳转登录
const goToLogin = () => {
  router.push('/login')
}

// 跳转首页
const goToDashboard = () => {
  router.push('/')
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`

  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// 初始化
onMounted(() => {
  loadResources()
  loadMajors()
})
</script>

<style scoped>
.explore-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
}

/* 顶部导航 */
.top-nav {
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
}

.nav-logo .el-icon {
  font-size: 24px;
  color: #3b82f6;
}

/* Hero区域 */
.hero-section {
  position: relative;
  padding: 60px 24px 40px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
}

.bg-circle-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  top: -100px;
  right: -100px;
}

.bg-circle-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #06b6d4, #3b82f6);
  bottom: -50px;
  left: -50px;
}

.bg-circle-3 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.hero-title {
  margin-bottom: 16px;
}

.title-main {
  display: block;
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-sub {
  display: block;
  font-size: 20px;
  color: #64748b;
  font-weight: 400;
  margin-top: 8px;
}

.hero-desc {
  font-size: 16px;
  color: #64748b;
  margin-bottom: 32px;
}

.hero-search {
  max-width: 600px;
  margin: 0 auto 32px;
}

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #1e40af;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #e2e8f0;
}

/* 筛选区域 */
.filter-section {
  background: white;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
}

.filter-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.filter-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.filter-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tag:hover {
  transform: translateY(-2px);
}

/* 内容区域 */
.content-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

.resource-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

/* 资源卡片 */
.resource-card {
  position: relative;
  background: white;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.resource-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.card-badge {
  position: absolute;
  top: 16px;
  right: 16px;
}

.card-icon {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: #3b82f6;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #64748b;
}

.meta-majors {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 14px;
  color: #64748b;
}

.major-tag {
  margin: 2px;
}

.major-more {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.card-stats {
  display: flex;
  gap: 16px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #94a3b8;
}

.card-time {
  font-size: 13px;
  color: #94a3b8;
}

.card-action {
  text-align: center;
  margin-top: 8px;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 48px;
}

/* 页脚 */
.page-footer {
  background: #1e293b;
  color: #94a3b8;
  text-align: center;
  padding: 32px 24px;
  margin-top: 48px;
}

.page-footer p {
  margin: 4px 0;
  font-size: 14px;
}
</style>
