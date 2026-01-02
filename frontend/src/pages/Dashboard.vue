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
  SwitchButton
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 当前页面标题
const currentPageTitle = computed(() => {
  return route.meta.title || '首页'
})

// 用户手机号
const userPhone = computed(() => {
  return userStore.userPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
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

.dashboard-main {
  padding: 24px;
  overflow-y: auto;
}
</style>
