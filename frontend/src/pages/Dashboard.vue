<template>
  <el-container class="dashboard-container">
    <!-- 侧边栏 -->
    <el-aside width="240px" class="dashboard-aside">
      <div class="aside-header">
        <div class="logo">
          <el-icon :size="32"><Reading /></el-icon>
          <span class="logo-text">医教智创云平台<span class="beta-tag">Beta</span></span>
        </div>
      </div>

      <el-menu
        :default-active="activeMenu"
        router
        class="aside-menu"
      >
        <el-menu-item index="/dashboard/home">
          <el-icon><HomeFilled /></el-icon>
          <span>个人中心</span>
        </el-menu-item>

        <!-- 教师和管理员可以管理资源 -->
        <el-menu-item v-if="!isStudent" index="/dashboard/resources">
          <el-icon><Document /></el-icon>
          <span>我的资源</span>
        </el-menu-item>

        <el-menu-item v-if="!isStudent" index="/dashboard/resources/create">
          <el-icon><Plus /></el-icon>
          <span>创建资源</span>
        </el-menu-item>

        <el-menu-item v-if="!isStudent" index="/dashboard/templates">
          <el-icon><Grid /></el-icon>
          <span>模板中心</span>
        </el-menu-item>

        <el-menu-item index="/dashboard/favorites">
          <el-icon><Star /></el-icon>
          <span>我的收藏</span>
        </el-menu-item>

        <el-menu-item index="/dashboard/view-history">
          <el-icon><Clock /></el-icon>
          <span>浏览记录</span>
        </el-menu-item>

        <el-menu-item index="/dashboard/help">
          <el-icon><QuestionFilled /></el-icon>
          <span>帮助中心</span>
        </el-menu-item>

        <el-divider style="margin: 12px 20px; border-color: rgba(255,255,255,0.2)" />

        <!-- 公开资源中心（不需要登录权限，新窗口打开） -->
        <div class="el-menu-item" @click="handleGoToExplore">
          <el-icon><Collection /></el-icon>
          <span>资源中心</span>
        </div>

        <!-- 管理员菜单 -->
        <template v-if="isAdmin">
          <el-divider style="margin: 12px 0; border-color: rgba(255,255,255,0.2)" />
          <div class="menu-group-title">管理员功能</div>

          <el-menu-item index="/dashboard/admin/stats">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据看板</span>
          </el-menu-item>

          <el-menu-item index="/dashboard/admin/users">
            <el-icon><UserFilled /></el-icon>
            <span>用户管理</span>
          </el-menu-item>

          <el-menu-item index="/dashboard/admin/resources">
            <el-icon><Files /></el-icon>
            <span>全站资源</span>
          </el-menu-item>

          <el-menu-item index="/dashboard/admin/logs">
            <el-icon><Tickets /></el-icon>
            <span>操作日志</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container class="main-container">
      <!-- 顶部导航栏 -->
      <el-header class="dashboard-header">
        <div class="header-left">
          <h2 class="page-title">{{ currentPageTitle }}</h2>
        </div>

        <div class="header-right">
          <!-- 显示当前角色 -->
          <span class="role-badge" :class="roleBadgeClass">
            {{ roleLabel }}
          </span>

          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="28" :src="userStore.userInfo.avatar_url">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span>{{ displayName }}</span>
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="settings">
                  <el-icon><Setting /></el-icon>
                  <span>个人设置</span>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容 -->
      <el-main class="dashboard-main">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { ElMessageBox } from 'element-plus'
import {
  Reading,
  Document,
  Plus,
  Grid,
  QuestionFilled,
  User,
  ArrowDown,
  SwitchButton,
  Setting,
  DataAnalysis,
  UserFilled,
  Files,
  Tickets,
  Collection,
  HomeFilled,
  Clock,
  Star
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 是否为管理员
const isAdmin = computed(() => userStore.isAdmin)

// 是否为学生
const isStudent = computed(() => userStore.isStudent)

// 用户角色（用于显示）
const userRole = computed(() => userStore.userRole)

// 当前页面标题
const currentPageTitle = computed(() => {
  return route.meta.title || '首页'
})

// 显示名称（优先昵称，否则脱敏手机号）
const displayName = computed(() => userStore.displayName)

// 角色标签文本
const roleLabel = computed(() => {
  switch (userRole.value) {
    case 'admin':
      return '管理员'
    case 'teacher':
      return '教师'
    case 'student':
      return '学生'
    default:
      return '用户'
  }
})

// 角色标签样式类
const roleBadgeClass = computed(() => ({
  'is-admin': userRole.value === 'admin',
  'is-teacher': userRole.value === 'teacher',
  'is-student': userRole.value === 'student'
}))

/**
 * 处理下拉菜单命令
 */
const handleCommand = async (command) => {
  if (command === 'settings') {
    router.push('/dashboard/settings')
  } else if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      await userStore.logout()
    } catch (error) {
      // 用户取消
    }
  }
}

/**
 * 跳转到资源中心（新窗口打开）
 */
const handleGoToExplore = () => {
  window.open('/explore', '_blank')
}
</script>

<style scoped>
.dashboard-container {
  height: 100vh;
}

.dashboard-aside {
  background: #0369a1;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.aside-header {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  font-weight: 600;
}

.logo .el-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 18px;
}

.beta-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  color: #fff;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-radius: 4px;
  vertical-align: middle;
}

.aside-menu {
  border: none;
  background: transparent;
}

.aside-menu .el-menu-item {
  color: rgba(255, 255, 255, 0.8);
  border-left: 3px solid transparent;
}

.aside-menu .el-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.aside-menu .el-menu-item.is-active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-left-color: #38bdf8;
}

.menu-group-title {
  padding: 8px 20px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.main-container {
  background: #f1f5f9;
}

.dashboard-header {
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  color: #475569;
  font-size: 14px;
}

.user-info:hover {
  background: #f1f5f9;
}

.role-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #e2e8f0;
  color: #64748b;
  margin-right: 12px;
}

.role-badge.is-admin {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.role-badge.is-teacher {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.role-badge.is-student {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.dashboard-main {
  padding: 24px;
  overflow-y: auto;
}
</style>
