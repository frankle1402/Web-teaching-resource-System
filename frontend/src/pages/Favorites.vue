<template>
  <div class="favorites-page">
    <div class="page-container">
      <!-- 左侧文件夹树 -->
      <div class="sidebar">
        <FavoriteFolderTreePanel
          ref="folderTreeRef"
          @folder-selected="handleFolderSelected"
          @type-selected="handleTypeSelected"
          @folder-updated="handleFolderUpdated"
        />
      </div>

      <!-- 右侧收藏列表 -->
      <div class="main-content">
        <FavoriteGridPanel
          ref="gridPanelRef"
          :folder-id="currentFolderId"
          :folder-name="currentFolderName"
          :filter-type="currentFilterType"
          :folder-tree="folderTree"
          @folder-updated="handleFolderUpdated"
          @insert-favorite="handleInsertFavorite"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FavoriteFolderTreePanel from '@/components/favorite/FavoriteFolderTreePanel.vue'
import FavoriteGridPanel from '@/components/favorite/FavoriteGridPanel.vue'

const folderTreeRef = ref(null)
const gridPanelRef = ref(null)

const currentFolderId = ref('all')
const currentFolderName = ref('全部收藏')
const currentFilterType = ref('')
const folderTree = ref([])

// 选择文件夹
const handleFolderSelected = (folderId, folderName) => {
  currentFolderId.value = folderId
  currentFolderName.value = folderName
}

// 选择类型筛选
const handleTypeSelected = (type) => {
  currentFilterType.value = type
}

// 文件夹更新后刷新
const handleFolderUpdated = async () => {
  // 刷新文件夹树
  if (folderTreeRef.value) {
    await folderTreeRef.value.loadFolders()
  }
  // 刷新收藏列表
  if (gridPanelRef.value) {
    await gridPanelRef.value.loadFavorites()
  }
}

// 插入收藏到资源（预留接口，Phase 5实现）
const handleInsertFavorite = (favorite) => {
  ElMessage.info(`功能开发中：插入 ${favorite.title}`)
  // TODO: 实现插入到大纲编辑器或HTML编辑器的逻辑
}
</script>

<style scoped>
.favorites-page {
  height: 100%;
  background: #f8fafc;
}

.page-container {
  display: flex;
  height: 100%;
  gap: 24px;
  padding: 24px;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.main-content {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
