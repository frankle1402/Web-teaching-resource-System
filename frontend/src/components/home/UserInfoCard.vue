<template>
  <div class="user-card">
    <div class="user-card-header">
      <div class="user-avatar">
        <el-icon :size="40"><User /></el-icon>
      </div>
      <div class="user-info">
        <h3 class="user-phone">{{ userStore.userPhone }}</h3>
        <el-tag
          :type="userStore.isAdmin ? 'danger' : 'primary'"
          size="small"
          class="user-role"
        >
          {{ userStore.isAdmin ? '管理员' : '普通用户' }}
        </el-tag>
      </div>
    </div>

    <div class="user-card-body">
      <div class="user-stats">
        <div class="user-stat">
          <div class="stat-icon">📚</div>
          <div class="stat-text">
            <div class="stat-label">我的资源</div>
            <div class="stat-value">{{ userStats.resourceCount }}</div>
          </div>
        </div>
        <div class="user-stat">
          <div class="stat-icon">📁</div>
          <div class="stat-text">
            <div class="stat-label">文件夹</div>
            <div class="stat-value">{{ userStats.folderCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="user-card-footer">
      <router-link to="/dashboard" class="btn btn-primary btn-block">
        <el-icon><Monitor /></el-icon>
        进入系统
      </router-link>
      <el-button class="btn btn-outline btn-block" @click="handleLogout">
        <el-icon><SwitchButton /></el-icon>
        退出登录
      </el-button>
    </div>

    <!-- 资源中心入口 -->
    <div class="explore-entry">
      <div class="entry-divider">
        <span>或</span>
      </div>
      <router-link to="/explore" class="explore-link">
        <el-button class="explore-button">
          <el-icon><Collection /></el-icon>
          浏览教学资源中心
        </el-button>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { User, Monitor, SwitchButton, Collection } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { resourceAPI } from '@/api/resource'
import { folderAPI } from '@/api/folder'

const router = useRouter()
const userStore = useUserStore()

const userStats = ref({
  resourceCount: 0,
  folderCount: 0
})

// 获取用户统计数据
const fetchUserStats = async () => {
  try {
    const [resources, folders] = await Promise.all([
      resourceAPI.getList({ page: 1, pageSize: 1 }),
      folderAPI.getList()
    ])
    userStats.value.resourceCount = resources.total || 0
    userStats.value.folderCount = folders.length || 0
  } catch (error) {
    console.error('获取用户统计失败:', error)
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await userStore.logout()
  } catch (error) {
    // 用户取消
  }
}

onMounted(() => {
  fetchUserStats()
})
</script>

<script>
export default {
  name: 'UserInfoCard'
}
</script>

<style scoped>
.user-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.user-card-header {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-avatar {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.user-info {
  color: white;
}

.user-phone {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.user-role {
  font-size: 0.75rem;
}

.user-card-body {
  padding: 1.5rem 2rem;
}

.user-stats {
  display: flex;
  gap: 1rem;
}

.user-stat {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-text {
  flex: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2563eb;
}

.user-card-footer {
  padding: 0 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-block {
  width: 100%;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-outline {
  background: transparent;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  width: 100%;
}

.btn-outline:hover {
  background: #f9fafb;
  color: #1f2937;
}

/* 资源中心入口 */
.explore-entry {
  margin-top: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
}

.entry-divider {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.entry-divider::before,
.entry-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.entry-divider span {
  padding: 0 1rem;
  font-size: 0.875rem;
  color: #9ca3af;
}

.explore-link {
  text-decoration: none;
}

.explore-button {
  width: 100%;
  height: 44px;
  font-size: 0.9rem;
  border: 2px solid #3b82f6;
  color: #3b82f6;
  background: white;
  border-radius: 8px;
  transition: all 0.3s;
}

.explore-button:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
</style>
