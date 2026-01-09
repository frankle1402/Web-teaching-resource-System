<template>
  <div class="folder-manage-container">
    <!-- 左侧文件夹树 -->
    <div class="left-panel">
      <FolderTreePanel
        ref="folderTreeRef"
        @folder-selected="handleFolderSelected"
        @folder-updated="handleFolderUpdated"
      />
    </div>

    <!-- 右侧资源列表 -->
    <div class="right-panel">
      <ResourceGridPanel
        ref="resourceGridRef"
        :folder-id="selectedFolderId"
        :folder-name="selectedFolderName"
        :folder-tree="folderTree"
        @updated="handleResourceUpdated"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { folderAPI } from '@/api/folder'
import FolderTreePanel from '@/components/folder/FolderTreePanel.vue'
import ResourceGridPanel from '@/components/resource/ResourceGridPanel.vue'

const folderTreeRef = ref(null)
const resourceGridRef = ref(null)

const selectedFolderId = ref('all') // 默认选中"全部资源"
const selectedFolderName = ref('全部资源')
const folderTree = ref([])

// 加载文件夹树数据
const loadFolderTree = async () => {
  try {
    const response = await folderAPI.getTree()
    // 适配新的响应格式 { data: { tree, unclassifiedCount } }
    if (response.tree) {
      folderTree.value = response.tree
    } else if (Array.isArray(response)) {
      // 兼容旧格式
      folderTree.value = response
    }
  } catch (error) {
    console.error('加载文件夹树失败:', error)
  }
}

// 文件夹被选中
const handleFolderSelected = (folderId, folderName) => {
  selectedFolderId.value = folderId
  selectedFolderName.value = folderName
}

// 文件夹更新后刷新
const handleFolderUpdated = () => {
  loadFolderTree()
  // 刷新资源列表
  if (resourceGridRef.value) {
    resourceGridRef.value.loadResources()
  }
}

// 资源更新后刷新文件夹树（资源数量可能变化）
const handleResourceUpdated = () => {
  if (folderTreeRef.value) {
    folderTreeRef.value.loadFolders()
  }
}

// 初始化
loadFolderTree()
</script>

<style scoped>
.folder-manage-container {
  display: flex;
  height: calc(100vh - 140px);
  gap: 24px;
  padding: 20px;
}

.left-panel {
  width: 300px;
  flex-shrink: 0;
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}

.right-panel {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}
</style>
