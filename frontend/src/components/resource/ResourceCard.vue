<template>
  <div
    class="resource-card"
    :class="{ selected }"
    @click="$emit('click', resource)"
  >
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
        <el-button type="primary" link size="small">
          查看 <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Reading, School, ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  resource: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click', 'select'])

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
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`

  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
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
</style>
