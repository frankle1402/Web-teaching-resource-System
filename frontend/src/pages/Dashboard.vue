<template>
  <el-container class="dashboard-container">
    <!-- 侧边栏 -->
    <el-aside width="240px" class="dashboard-aside">
      <div class="aside-header">
        <div class="logo">
          <el-icon :size="32"><Reading /></el-icon>
          <span class="logo-text">教学资源系统</span>
        </div>
      </div>

      <el-menu
        :default-active="activeMenu"
        router
        class="aside-menu"
      >
        <el-menu-item index="/resources">
          <el-icon><Document /></el-icon>
          <span>我的资源</span>
        </el-menu-item>

        <el-menu-item index="/resources/create">
          <el-icon><Plus /></el-icon>
          <span>创建资源</span>
        </el-menu-item>

        <el-menu-item index="/folders">
          <el-icon><Folder /></el-icon>
          <span>文件夹管理</span>
        </el-menu-item>

        <el-menu-item index="/templates">
          <el-icon><Grid /></el-icon>
          <span>模板中心</span>
        </el-menu-item>

        <el-menu-item index="/help">
          <el-icon><QuestionFilled /></el-icon>
          <span>帮助中心</span>
        </el-menu-item>

        <el-divider style="margin: 12px 20px; border-color: rgba(255,255,255,0.2)" />

        <!-- 公开资源中心（不需要登录权限） -->
        <el-menu-item index="/explore" @click="handleGoToExplore">
          <el-icon><Collection /></el-icon>
          <span>资源中心</span>
        </el-menu-item>

        <!-- 管理员菜单 -->
        <template v-if="isAdmin">
          <el-divider style="margin: 12px 0; border-color: rgba(255,255,255,0.2)" />
          <div class="menu-group-title">管理员功能</div>

          <el-menu-item index="/admin/stats">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据看板</span>
          </el-menu-item>

          <el-menu-item index="/admin/users">
            <el-icon><UserFilled /></el-icon>
            <span>用户管理</span>
          </el-menu-item>

          <el-menu-item index="/admin/resources">
            <el-icon><Files /></el-icon>
            <span>全站资源</span>
          </el-menu-item>

          <el-menu-item index="/admin/logs">
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
          <!-- 显示当前角色（用于调试和确认） -->
          <span class="role-badge" :class="{ 'is-admin': isAdmin }">
            {{ userRole === 'admin' ? '管理员' : '普通用户' }}
          </span>

          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              <span>{{ userPhone }}</span>
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
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
        <router-view />
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
  Folder,
  Grid,
  QuestionFilled,
  User,
  ArrowDown,
  SwitchButton,
  DataAnalysis,
  UserFilled,
  Files,
  Tickets,
  Collection
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 是否为管理员
const isAdmin = computed(() => userStore.isAdmin)

// 用户角色（用于显示）
const userRole = computed(() => userStore.userRole)

// 当前页面标题
const currentPageTitle = computed(() => {
  return route.meta.title || '首页'
})

// 用户手机号
const userPhone = computed(() => {
  return userStore.userPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
})

// 调试：输出用户信息
console.log('Dashboard - 用户信息:', {
  isAdmin: isAdmin.value,
  userRole: userRole.value,
  userInfo: userStore.userInfo
})

/**
 * 处理下拉菜单命令
 */
const handleCommand = async (command) => {
  if (command === 'logout') {
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

.dashboard-main {
  padding: 24px;
  overflow-y: auto;
}
</style>
