<template>
  <div
    class="favorite-card"
    :class="{ selected, highlighted: selected }"
    @click="$emit('click', favorite)"
  >
    <!-- 选择框 -->
    <div class="card-checkbox" @click.stop>
      <el-checkbox
        :model-value="selected"
        @change="$emit('select', favorite.id)"
      />
    </div>

    <!-- 封面/缩略图 -->
    <div class="card-thumbnail">
      <img
        v-if="favorite.thumbnail_url"
        :src="favorite.thumbnail_url"
        :alt="favorite.title"
      />
      <div v-else class="no-thumbnail">
        <el-icon class="type-icon" :class="favorite.type">
          <VideoPlay v-if="favorite.type === 'bilibili'" />
          <ChatLineSquare v-else-if="favorite.type === 'wechat_article'" />
          <Picture v-else />
        </el-icon>
      </div>

      <!-- 类型标签 -->
      <div class="type-badge" :class="favorite.type">
        {{ typeName }}
      </div>

      <!-- 视频时长 -->
      <div v-if="favorite.type === 'bilibili' && favorite.video_duration" class="duration-badge">
        {{ formatDuration(favorite.video_duration) }}
      </div>
    </div>

    <!-- 内容 -->
    <div class="card-content">
      <h4 class="card-title" :title="favorite.title">{{ favorite.title }}</h4>

      <div class="card-meta">
        <span v-if="favorite.author_name" class="meta-item">
          <el-icon><User /></el-icon>
          {{ favorite.author_name }}
        </span>
        <span v-else-if="favorite.article_author" class="meta-item">
          <el-icon><ChatLineSquare /></el-icon>
          {{ favorite.article_author }}
        </span>
        <span v-if="favorite.play_count" class="meta-item">
          <el-icon><View /></el-icon>
          {{ formatPlayCount(favorite.play_count) }}
        </span>
      </div>

      <div class="card-footer">
        <span class="create-time">
          {{ formatDate(favorite.created_at) }}
        </span>
        <div class="card-actions" @click.stop>
          <el-button size="small" type="primary" text @click="$emit('insert', favorite)">
            <el-icon><Select /></el-icon>
            插入
          </el-button>
          <el-dropdown trigger="click" @command="handleCommand">
            <el-button size="small" text>
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="visit">
                  <el-icon><Link /></el-icon> 访问原链接
                </el-dropdown-item>
                <el-dropdown-item command="move">
                  <el-icon><FolderAdd /></el-icon> 移动
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
import {
  VideoPlay, ChatLineSquare, Picture, User, View,
  Select, MoreFilled, Link, FolderAdd, Delete
} from '@element-plus/icons-vue'
import { favoriteAPI } from '@/api/favorite'

const props = defineProps({
  favorite: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'click', 'delete', 'move', 'insert'])

const typeName = computed(() => {
  const typeMap = {
    bilibili: 'B站视频',
    wechat_article: '公众号',
    image: '图片'
  }
  return typeMap[props.favorite.type] || '未知'
})

const formatDuration = (seconds) => {
  return favoriteAPI.formatDuration(seconds)
}

const formatPlayCount = (count) => {
  return favoriteAPI.formatPlayCount(count)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const handleCommand = (command) => {
  switch (command) {
    case 'visit':
      window.open(props.favorite.source_url, '_blank')
      break
    case 'move':
      emit('move', props.favorite)
      break
    case 'delete':
      emit('delete', props.favorite)
      break
  }
}
</script>

<style scoped>
.favorite-card {
  position: relative;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  cursor: pointer;
}

.favorite-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.favorite-card.selected {
  ring: 2px solid #f59e0b;
  box-shadow: 0 0 0 2px #f59e0b;
}

.card-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s;
}

.favorite-card:hover .card-checkbox,
.favorite-card.selected .card-checkbox {
  opacity: 1;
}

.card-thumbnail {
  position: relative;
  width: 100%;
  height: 160px;
  background: #f1f5f9;
  overflow: hidden;
}

.card-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-thumbnail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}

.type-icon {
  font-size: 48px;
  color: #94a3b8;
}

.type-icon.bilibili {
  color: #fb7299;
}

.type-icon.wechat_article {
  color: #07c160;
}

.type-icon.image {
  color: #3b82f6;
}

.type-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: white;
  background: rgba(0, 0, 0, 0.6);
}

.type-badge.bilibili {
  background: #fb7299;
}

.type-badge.wechat_article {
  background: #07c160;
}

.type-badge.image {
  background: #3b82f6;
}

.duration-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
}

.card-content {
  padding: 12px;
}

.card-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.create-time {
  font-size: 12px;
  color: #94a3b8;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.favorite-card:hover .card-actions {
  opacity: 1;
}

.danger-item {
  color: #ef4444 !important;
}
</style>
