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
        v-if="thumbnailSrc"
        :src="thumbnailSrc"
        :alt="favorite.title"
        @error="handleImageError"
      />
      <div v-else class="no-thumbnail">
        <!-- 微信公众号使用自定义SVG图标 -->
        <svg v-if="favorite.type === 'wechat_article'" class="wechat-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <path fill="#07c160" d="M690.1 377.4c5.9 0 11.8.2 17.6.5-24.4-128.7-158.3-227.1-319.9-227.1C209 150.8 64 271.4 64 420.2c0 81.1 43.6 154.2 111.9 203.6 5.5 3.9 9.1 10.3 9.1 17.6 0 2.4-.5 4.6-1.1 6.9-5.5 20.3-14.2 52.8-14.6 54.3-.7 2.6-1.7 5.2-1.7 7.9 0 5.9 4.8 10.8 10.8 10.8 2.3 0 4.2-.9 6.2-2l70.9-40.9c5.3-3.1 11-5 17.2-5 3.2 0 6.4.5 9.5 1.4 33.1 9.5 68.8 14.8 105.7 14.8 6 0 11.9-.1 17.8-.4-7.1-21-10.9-43.1-10.9-66 0-135.8 132.2-245.8 295.3-245.8zm-194.3-86.5c23.8 0 43.2 19.3 43.2 43.1s-19.3 43.1-43.2 43.1c-23.8 0-43.2-19.3-43.2-43.1s19.4-43.1 43.2-43.1zm-215.9 86.2c-23.8 0-43.2-19.3-43.2-43.1s19.3-43.1 43.2-43.1 43.2 19.3 43.2 43.1-19.4 43.1-43.2 43.1zm586.8 415.6c56.9-41.2 93.2-102 93.2-169.7 0-124-120.8-224.5-269.9-224.5-149 0-269.9 100.5-269.9 224.5S540.9 847.5 690 847.5c30.8 0 60.6-4.4 88.1-12.3 2.6-.8 5.2-1.2 7.9-1.2 5.2 0 9.9 1.6 14.3 4.1l59.1 34c1.7 1 3.3 1.7 5.2 1.7a9 9 0 0 0 6.4-2.6 9 9 0 0 0 2.6-6.4c0-2.2-.9-4.4-1.4-6.6-.3-1.2-7.6-28.3-12.2-45.3-.5-1.9-.9-3.8-.9-5.7.1-5.9 3.1-11.2 7.6-14.5zM600.2 587.2c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9c0 19.8-16.2 35.9-36 35.9zm179.9 0c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9a36.08 36.08 0 0 1-36 35.9z"/>
        </svg>
        <el-icon v-else class="type-icon" :class="favorite.type">
          <VideoPlay v-if="favorite.type === 'bilibili'" />
          <Document v-else-if="favorite.type === 'resource'" />
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
      <h4 class="card-title" :title="displayTitle">{{ displayTitle }}</h4>
      <p v-if="favorite.custom_title" class="original-title" :title="favorite.title">
        原标题：{{ favorite.title }}
      </p>

      <!-- 备注信息（前100字） -->
      <p v-if="favorite.notes" class="card-notes" :title="favorite.notes">
        {{ truncatedNotes }}
      </p>

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
          <el-dropdown trigger="click" @command="handleCommand">
            <el-button size="small" text>
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <el-icon><Edit /></el-icon> 编辑
                </el-dropdown-item>
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
import { ref, computed } from 'vue'
import {
  VideoPlay, ChatLineSquare, Picture, User, View,
  MoreFilled, Link, FolderAdd, Delete, Edit, Document
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

const emit = defineEmits(['select', 'click', 'delete', 'move', 'edit'])

// 图片加载失败标记
const imageLoadFailed = ref(false)

// 显示标题（优先自定义标题）
const displayTitle = computed(() => {
  return props.favorite.custom_title || props.favorite.title
})

// 截断的备注（前100字）
const truncatedNotes = computed(() => {
  if (!props.favorite.notes) return ''
  return props.favorite.notes.length > 100
    ? props.favorite.notes.substring(0, 100) + '...'
    : props.favorite.notes
})

// 计算缩略图URL
const thumbnailSrc = computed(() => {
  // 如果图片加载失败，返回空
  if (imageLoadFailed.value) return ''

  // 微信公众号文章不显示图片（防盗链），改用图标
  if (props.favorite.type === 'wechat_article') return ''

  // 对于图片类型，优先使用local_path
  if (props.favorite.type === 'image' && props.favorite.local_path) {
    return favoriteAPI.getImageUrl(props.favorite.local_path)
  }

  // 对于B站视频，使用代理获取图片（解决防盗链问题）
  if (props.favorite.type === 'bilibili' && props.favorite.thumbnail_url) {
    return favoriteAPI.getBilibiliImageUrl(props.favorite.thumbnail_url)
  }

  // 其他类型直接返回thumbnail_url
  return props.favorite.thumbnail_url || ''
})

// 图片加载错误处理
const handleImageError = () => {
  imageLoadFailed.value = true
}

const typeName = computed(() => {
  const typeMap = {
    bilibili: 'B站视频',
    wechat_article: '公众号',
    image: '图片',
    resource: '课件资源'
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
    case 'edit':
      emit('edit', props.favorite)
      break
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

.wechat-icon {
  width: 64px;
  height: 64px;
}

.type-icon {
  font-size: 48px;
  color: #94a3b8;
}

.type-icon.bilibili {
  color: #fb7299;
}

.type-icon.image {
  color: #3b82f6;
}

.type-icon.resource {
  color: #8b5cf6;
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

.type-badge.resource {
  background: #8b5cf6;
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
  margin: 0 0 4px;
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

.original-title {
  margin: 0 0 4px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-notes {
  margin: 4px 0 8px;
  font-size: 12px;
  color: #64748b;
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
