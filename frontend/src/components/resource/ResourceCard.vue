<template>
  <div
    class="resource-card"
    :class="{ selected, highlighted }"
    @click="$emit('click', resource)"
  >
    <!-- 颗粒效果容器 -->
    <div v-if="highlighted" class="sparkle-container">
      <div class="sparkle"></div>
      <div class="sparkle"></div>
      <div class="sparkle"></div>
      <div class="sparkle"></div>
      <div class="sparkle"></div>
    </div>

    <el-checkbox
      :model-value="selected"
      @change="$emit('select', resource.id, $event)"
      class="card-checkbox"
      @click.stop
    />

    <div class="card-content">
      <!-- 标题行：标题 + 状态 -->
      <div class="card-title-row">
        <h4 class="card-title">{{ resource.title }}</h4>
        <span class="card-status" :class="statusClass">
          {{ statusText }}
        </span>
      </div>

      <!-- 层次标签 -->
      <div v-if="resource.course_level" class="card-level">
        <el-tag size="small" :type="levelTagType">
          {{ resource.course_level }}
        </el-tag>
      </div>

      <!-- 信息行 -->
      <div class="card-info">
        <div class="info-item">
          <el-icon><Reading /></el-icon>
          <span>{{ resource.course_name }}</span>
        </div>
        <div class="info-item" v-if="resource.major">
          <el-icon><School /></el-icon>
          <span>{{ resource.major }}</span>
        </div>
      </div>

      <div class="card-footer">
        <span class="update-time">{{ formatDate(resource.updated_at) }}</span>
        <div class="card-actions" @click.stop>
          <el-dropdown trigger="click" @command="handleCommand">
            <el-button type="primary" size="small">
              操作 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <el-icon><Edit /></el-icon> 编辑
                </el-dropdown-item>
                <el-dropdown-item command="move">
                  <el-icon><FolderAdd /></el-icon> 移动
                </el-dropdown-item>
                <el-dropdown-item command="publish">
                  <el-icon><Upload /></el-icon> 发布
                </el-dropdown-item>
                <el-dropdown-item command="visit">
                  <el-icon><View /></el-icon> 访问
                </el-dropdown-item>
                <el-dropdown-item command="copy">
                  <el-icon><CopyDocument /></el-icon> 复制地址
                </el-dropdown-item>
                <el-dropdown-item command="unpublish">
                  <el-icon><Download /></el-icon> 回收
                </el-dropdown-item>
                <el-dropdown-item divided command="delete" class="danger-item">
                  <el-icon><Delete /></el-icon> 删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Reading, School, ArrowDown, Edit, Upload, View, CopyDocument, Download, Delete, FolderAdd } from '@element-plus/icons-vue'

const props = defineProps({
  resource: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  highlighted: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'click', 'select',
  'visit', 'copy-url', 'unpublish',
  'publish', 'delete', 'edit', 'move'
])

// 处理下拉菜单命令
const handleCommand = (command) => {
  const isDraft = props.resource.status === 'draft'
  const isPublished = props.resource.status === 'published'

  switch (command) {
    case 'edit':
      emit('edit', props.resource)
      break
    case 'move':
      emit('move', props.resource)
      break
    case 'publish':
      if (isPublished) {
        ElMessageBox.alert('该资源已发布，无需重复发布', '提示', { type: 'warning' })
      } else {
        emit('publish', props.resource)
      }
      break
    case 'visit':
      if (isDraft) {
        ElMessageBox.alert('请先发布资源后再访问', '提示', { type: 'warning' })
      } else {
        emit('visit', props.resource)
      }
      break
    case 'copy':
      if (isDraft) {
        ElMessageBox.alert('请先发布资源后再复制地址', '提示', { type: 'warning' })
      } else {
        emit('copy-url', props.resource)
      }
      break
    case 'unpublish':
      if (isDraft) {
        ElMessageBox.alert('资源尚未发布，无需回收', '提示', { type: 'warning' })
      } else {
        emit('unpublish', props.resource)
      }
      break
    case 'delete':
      if (isPublished) {
        ElMessageBox.alert('请先回收资源后再删除', '提示', { type: 'warning' })
      } else {
        emit('delete', props.resource)
      }
      break
  }
}

const levelTagType = computed(() => {
  const levelMap = {
    '中职': 'success',
    '高职': 'primary',
    '本科': 'warning'
  }
  return levelMap[props.resource.course_level] || 'info'
})

const statusText = computed(() => {
  return props.resource.status === 'published' ? '已发布' : '草稿'
})

const statusClass = computed(() => {
  return props.resource.status === 'published' ? 'status-published' : 'status-draft'
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()

  // 计算日期差（只比较日期部分）
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.floor((today - targetDay) / (1000 * 60 * 60 * 24))

  // 格式化时间 HH:mm
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

  if (dayDiff === 0) return `今天 ${timeStr}`
  if (dayDiff === 1) return `昨天 ${timeStr}`
  if (dayDiff === 2) return `前天 ${timeStr}`

  // 3天前及更早，显示完整日期时间
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${timeStr}`
}
</script>

<style scoped>
.resource-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  position: relative;
  display: flex;
  flex-direction: column;
}

.resource-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.resource-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.card-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
}

.card-content {
  padding-left: 28px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-published {
  background: #dcfce7;
  color: #166534;
}

.status-draft {
  background: #f1f5f9;
  color: #64748b;
}

.card-level {
  margin-bottom: 8px;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
}

.info-item .el-icon {
  font-size: 14px;
  color: #94a3b8;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  margin-top: auto;
  border-top: 1px solid #f1f5f9;
}

.update-time {
  font-size: 12px;
  color: #94a3b8;
}

.card-actions {
  display: flex;
  align-items: center;
}

/* 高亮动画样式 */
.resource-card.highlighted {
  position: relative;
  z-index: 1;
  animation: cardPulse 3s ease-out forwards;
}

.resource-card.highlighted::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 10px;
  background: linear-gradient(45deg,
    #3b82f6, #8b5cf6, #ec4899, #f59e0b,
    #3b82f6, #8b5cf6, #ec4899, #f59e0b);
  background-size: 400% 400%;
  z-index: -1;
  animation: laserBorder 2s linear infinite;
  filter: blur(8px);
  opacity: 0.8;
}

.resource-card.highlighted::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 9px;
  background: linear-gradient(45deg,
    #3b82f6, #8b5cf6, #ec4899, #f59e0b,
    #3b82f6, #8b5cf6, #ec4899, #f59e0b);
  background-size: 400% 400%;
  z-index: -1;
  animation: laserBorder 1.5s linear infinite;
}

/* 颗粒/星光效果容器 */
.resource-card .sparkle-container {
  position: absolute;
  inset: -10px;
  pointer-events: none;
  overflow: visible;
  z-index: -1;
}

.resource-card .sparkle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  animation: sparkleFloat 1.5s ease-in-out infinite;
  box-shadow: 0 0 6px 2px rgba(59, 130, 246, 0.8),
              0 0 12px 4px rgba(139, 92, 246, 0.6);
}

/* 5个颗粒围绕卡片旋转 */
.resource-card .sparkle:nth-child(1) {
  --tx: -60px; --ty: -40px; --tx2: -30px; --ty2: -20px;
  top: 20%; left: 10%;
  animation-delay: 0s;
}

.resource-card .sparkle:nth-child(2) {
  --tx: 60px; --ty: -40px; --tx2: 30px; --ty2: -20px;
  top: 20%; right: 10%;
  animation-delay: 0.3s;
}

.resource-card .sparkle:nth-child(3) {
  --tx: 60px; --ty: 40px; --tx2: 30px; --ty2: 20px;
  bottom: 20%; right: 10%;
  animation-delay: 0.6s;
}

.resource-card .sparkle:nth-child(4) {
  --tx: -60px; --ty: 40px; --tx2: -30px; --ty2: 20px;
  bottom: 20%; left: 10%;
  animation-delay: 0.9s;
}

.resource-card .sparkle:nth-child(5) {
  --tx: 0; --ty: -70px; --tx2: 0; --ty2: -35px;
  top: -10px; left: 50%;
  animation-delay: 0.45s;
}

@keyframes laserBorder {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes sparkleFloat {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }
  50% {
    transform: translate(var(--tx), var(--ty)) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx2), var(--ty2)) scale(0);
    opacity: 0;
  }
}

@keyframes cardPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 20px 10px rgba(59, 130, 246, 0.2);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

/* 删除菜单项红色样式 */
:deep(.danger-item) {
  color: #f56c6c !important;
}

:deep(.danger-item:hover) {
  background-color: #fef0f0 !important;
  color: #f56c6c !important;
}
</style>
