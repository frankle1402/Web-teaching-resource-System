<template>
  <div class="favorite-folder-tree-panel">
    <div class="panel-header">
      <h3>我的收藏夹</h3>
      <el-button size="small" @click="handleCreateRoot">
        <el-icon><Plus /></el-icon>
        新建文件夹
      </el-button>
    </div>

    <!-- 全部收藏选项 -->
    <div
      class="all-favorites-item"
      :class="{ active: selectedFolderId === 'all' }"
      @click="handleSelectAll"
    >
      <el-icon class="folder-icon"><Star /></el-icon>
      <span class="folder-name">全部收藏</span>
      <span class="folder-count">{{ totalCount }}</span>
    </div>

    <!-- 未分类收藏选项 -->
    <div
      class="uncategorized-item"
      :class="{ active: selectedFolderId === 'uncategorized' }"
      @click="handleSelectUncategorized"
    >
      <el-icon class="folder-icon"><FolderOpened /></el-icon>
      <span class="folder-name">未分类</span>
      <span class="folder-count">{{ unclassifiedCount }}</span>
    </div>

    <el-divider style="margin: 12px 0;" />

    <!-- 类型筛选 -->
    <div class="type-filters">
      <div
        class="type-filter-item"
        :class="{ active: selectedType === 'resource' }"
        @click="handleSelectType('resource')"
      >
        <el-icon class="type-icon resource"><Document /></el-icon>
        <span>课件资源</span>
        <span class="type-count">{{ typeCounts.resource || 0 }}</span>
      </div>
      <div
        class="type-filter-item"
        :class="{ active: selectedType === 'bilibili' }"
        @click="handleSelectType('bilibili')"
      >
        <el-icon class="type-icon bilibili"><VideoPlay /></el-icon>
        <span>B站视频</span>
        <span class="type-count">{{ typeCounts.bilibili || 0 }}</span>
      </div>
      <div
        class="type-filter-item"
        :class="{ active: selectedType === 'wechat_article' }"
        @click="handleSelectType('wechat_article')"
      >
        <svg class="wechat-icon-mini" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <path fill="#07c160" d="M690.1 377.4c5.9 0 11.8.2 17.6.5-24.4-128.7-158.3-227.1-319.9-227.1C209 150.8 64 271.4 64 420.2c0 81.1 43.6 154.2 111.9 203.6 5.5 3.9 9.1 10.3 9.1 17.6 0 2.4-.5 4.6-1.1 6.9-5.5 20.3-14.2 52.8-14.6 54.3-.7 2.6-1.7 5.2-1.7 7.9 0 5.9 4.8 10.8 10.8 10.8 2.3 0 4.2-.9 6.2-2l70.9-40.9c5.3-3.1 11-5 17.2-5 3.2 0 6.4.5 9.5 1.4 33.1 9.5 68.8 14.8 105.7 14.8 6 0 11.9-.1 17.8-.4-7.1-21-10.9-43.1-10.9-66 0-135.8 132.2-245.8 295.3-245.8zm-194.3-86.5c23.8 0 43.2 19.3 43.2 43.1s-19.3 43.1-43.2 43.1c-23.8 0-43.2-19.3-43.2-43.1s19.4-43.1 43.2-43.1zm-215.9 86.2c-23.8 0-43.2-19.3-43.2-43.1s19.3-43.1 43.2-43.1 43.2 19.3 43.2 43.1-19.4 43.1-43.2 43.1zm586.8 415.6c56.9-41.2 93.2-102 93.2-169.7 0-124-120.8-224.5-269.9-224.5-149 0-269.9 100.5-269.9 224.5S540.9 847.5 690 847.5c30.8 0 60.6-4.4 88.1-12.3 2.6-.8 5.2-1.2 7.9-1.2 5.2 0 9.9 1.6 14.3 4.1l59.1 34c1.7 1 3.3 1.7 5.2 1.7a9 9 0 0 0 6.4-2.6 9 9 0 0 0 2.6-6.4c0-2.2-.9-4.4-1.4-6.6-.3-1.2-7.6-28.3-12.2-45.3-.5-1.9-.9-3.8-.9-5.7.1-5.9 3.1-11.2 7.6-14.5zM600.2 587.2c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9c0 19.8-16.2 35.9-36 35.9zm179.9 0c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9a36.08 36.08 0 0 1-36 35.9z"/>
        </svg>
        <span>公众号文章</span>
        <span class="type-count">{{ typeCounts.wechat_article || 0 }}</span>
      </div>
      <div
        class="type-filter-item"
        :class="{ active: selectedType === 'image' }"
        @click="handleSelectType('image')"
      >
        <el-icon class="type-icon image"><Picture /></el-icon>
        <span>图片</span>
        <span class="type-count">{{ typeCounts.image || 0 }}</span>
      </div>
    </div>

    <el-divider style="margin: 12px 0;" />

    <!-- 文件夹树 -->
    <el-scrollbar class="tree-scrollbar">
      <el-tree
        ref="treeRef"
        v-loading="loading"
        :data="folderTree"
        :props="{ children: 'children', label: 'name' }"
        node-key="id"
        :highlight-current="true"
        :current-node-key="selectedFolderId"
        :expand-on-click-node="false"
        :default-expanded-keys="expandedKeys"
        @node-click="handleNodeClick"
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
      >
        <template #default="{ node, data }">
          <div class="tree-node">
            <el-icon class="node-icon"><Folder /></el-icon>
            <span class="node-label">{{ node.label }}</span>
            <span class="node-count">{{ data.favoriteCount || 0 }}</span>
            <div class="node-actions" @click.stop>
              <el-dropdown trigger="click">
                <el-button size="small" type="primary" text class="edit-btn">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="handleCreateChild(data)">
                      <el-icon><Plus /></el-icon> 添加子文件夹
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleRename(data)">
                      <el-icon><Edit /></el-icon> 重命名
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleDelete(data)">
                      <el-icon><Delete /></el-icon> 删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
      </el-tree>
    </el-scrollbar>

    <!-- 创建/重命名对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建文件夹' : '重命名文件夹'"
      width="500px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="文件夹名称">
          <el-input
            v-model="form.name"
            placeholder="请输入文件夹名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Folder, FolderOpened, Edit, Delete, Star,
  VideoPlay, ChatLineSquare, Picture, Document
} from '@element-plus/icons-vue'
import { favoriteAPI } from '@/api/favorite'

const emit = defineEmits(['folder-selected', 'type-selected', 'folder-updated', 'tree-loaded'])

const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref('create')
const submitting = ref(false)
const folderTree = ref([])
const unclassifiedCount = ref(0)
const totalCount = ref(0)
const typeCounts = ref({})
const selectedFolderId = ref('all')
const selectedType = ref('')
const currentFolder = ref(null)
const treeRef = ref(null)
const expandedKeys = ref([])

const form = reactive({
  name: ''
})

// 加载文件夹树
const loadFolders = async () => {
  loading.value = true
  try {
    const response = await favoriteAPI.getFolders()
    // 注意：request.js响应拦截器已经解包了data，直接访问response.xxx
    if (response) {
      folderTree.value = response.tree || []
      unclassifiedCount.value = response.unclassifiedCount || 0
      totalCount.value = response.totalCount || 0
      typeCounts.value = response.typeCounts || {}
      // 通知父组件文件夹树已加载
      emit('tree-loaded', folderTree.value)
    }
  } catch (error) {
    console.error('加载收藏文件夹列表失败:', error)
    ElMessage.error('加载收藏文件夹列表失败')
  } finally {
    loading.value = false
  }
}

// 创建根文件夹
const handleCreateRoot = () => {
  dialogMode.value = 'create'
  form.name = ''
  currentFolder.value = null
  dialogVisible.value = true
}

// 计算文件夹深度
const getFolderDepth = (folderId) => {
  const flattenFolders = (tree, result = []) => {
    tree.forEach(folder => {
      result.push({ id: folder.id, parent_id: folder.parent_id })
      if (folder.children?.length) {
        flattenFolders(folder.children, result)
      }
    })
    return result
  }

  const allFolders = flattenFolders(folderTree.value)
  let depth = 1
  let currentId = folderId

  while (currentId && currentId !== 0) {
    const folder = allFolders.find(f => f.id === currentId)
    if (!folder || !folder.parent_id || folder.parent_id === 0) break
    depth++
    currentId = folder.parent_id
  }

  return depth
}

// 创建子文件夹
const handleCreateChild = (parent) => {
  const currentDepth = getFolderDepth(parent.id)
  if (currentDepth >= 5) {
    ElMessageBox.alert(
      '文件夹最多支持5层嵌套，无法继续创建子文件夹。',
      '无法创建',
      { type: 'warning' }
    )
    return
  }

  dialogMode.value = 'create'
  form.name = ''
  currentFolder.value = parent
  dialogVisible.value = true
}

// 重命名
const handleRename = (folder) => {
  dialogMode.value = 'rename'
  form.name = folder.name
  currentFolder.value = folder
  dialogVisible.value = true
}

// 删除
const handleDelete = async (folder) => {
  const hasChildren = folder.children && folder.children.length > 0
  const hasFavorites = folder.favoriteCount > 0

  if (hasChildren || hasFavorites) {
    let reasons = []
    if (hasChildren) reasons.push('包含子文件夹')
    if (hasFavorites) reasons.push(`包含 ${folder.favoriteCount} 个收藏`)

    ElMessageBox.alert(
      `当前文件夹无法删除，原因：\n\n• ${reasons.join('\n• ')}\n\n请先移动或删除收藏后再试。`,
      '无法删除',
      { type: 'warning' }
    )
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除文件夹"${folder.name}"吗？`,
      '确认删除',
      { type: 'warning' }
    )

    await favoriteAPI.deleteFolder(folder.id)
    ElMessage.success('删除成功')

    const deleteIndex = expandedKeys.value.indexOf(folder.id)
    if (deleteIndex > -1) {
      expandedKeys.value.splice(deleteIndex, 1)
    }

    await loadFolders()
    handleSelectAll()
    emit('folder-updated')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入文件夹名称')
    return
  }

  submitting.value = true
  try {
    if (dialogMode.value === 'create') {
      const parentId = currentFolder.value?.id
      await favoriteAPI.createFolder({
        name: form.name.trim(),
        parentId: parentId || null
      })
      ElMessage.success('创建成功')

      if (parentId && !expandedKeys.value.includes(parentId)) {
        expandedKeys.value.push(parentId)
      }
    } else {
      await favoriteAPI.updateFolder(currentFolder.value.id, {
        name: form.name.trim()
      })
      ElMessage.success('重命名成功')
    }
    dialogVisible.value = false
    loadFolders()
    emit('folder-updated')
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 选择全部收藏
const handleSelectAll = () => {
  selectedFolderId.value = 'all'
  selectedType.value = ''
  emit('folder-selected', 'all', '全部收藏')
  emit('type-selected', '')
}

// 选择未分类
const handleSelectUncategorized = () => {
  selectedFolderId.value = 'uncategorized'
  selectedType.value = ''
  emit('folder-selected', 'uncategorized', '未分类')
  emit('type-selected', '')
}

// 选择类型
const handleSelectType = (type) => {
  if (selectedType.value === type) {
    // 取消选择
    selectedType.value = ''
    emit('type-selected', '')
  } else {
    selectedType.value = type
    selectedFolderId.value = 'all'
    emit('type-selected', type)
    emit('folder-selected', 'all', '全部收藏')
  }
}

// 点击文件夹节点
const handleNodeClick = (data) => {
  selectedFolderId.value = data.id
  selectedType.value = ''
  emit('folder-selected', data.id, data.name)
  emit('type-selected', '')
}

// 节点展开
const handleNodeExpand = (data) => {
  if (!expandedKeys.value.includes(data.id)) {
    expandedKeys.value.push(data.id)
  }
}

// 节点折叠
const handleNodeCollapse = (data) => {
  const index = expandedKeys.value.indexOf(data.id)
  if (index > -1) {
    expandedKeys.value.splice(index, 1)
  }
}

// 暴露方法
defineExpose({
  loadFolders,
  selectFolder: (id, name) => {
    if (id === 'all') {
      handleSelectAll()
    } else if (id === 'uncategorized') {
      handleSelectUncategorized()
    } else {
      selectedFolderId.value = id
      emit('folder-selected', id, name)
    }
  }
})

onMounted(() => {
  loadFolders()
  handleSelectAll()
})
</script>

<style scoped>
.favorite-folder-tree-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.all-favorites-item,
.uncategorized-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.all-favorites-item:hover,
.uncategorized-item:hover {
  background: #f1f5f9;
}

.all-favorites-item.active,
.uncategorized-item.active {
  background: #fef3c7;
  color: #d97706;
}

.folder-icon {
  font-size: 18px;
  color: #94a3b8;
}

.all-favorites-item.active .folder-icon {
  color: #f59e0b;
}

.folder-name {
  flex: 1;
  font-size: 14px;
}

.folder-count {
  font-size: 12px;
  color: #94a3b8;
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 10px;
}

/* 类型筛选 */
.type-filters {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #64748b;
  transition: all 0.2s;
}

.type-filter-item:hover {
  background: #f1f5f9;
}

.type-filter-item.active {
  background: #eff6ff;
  color: #3b82f6;
}

.type-icon {
  font-size: 16px;
}

.type-icon.resource {
  color: #8b5cf6;
}

.type-icon.bilibili {
  color: #fb7299;
}

.type-icon.image {
  color: #3b82f6;
}

.wechat-icon-mini {
  width: 16px;
  height: 16px;
}

.type-count {
  margin-left: auto;
  font-size: 12px;
  color: #94a3b8;
}

.tree-scrollbar {
  flex: 1;
  margin-top: 8px;
}

:deep(.el-tree-node__content) {
  height: 40px;
  padding-right: 8px;
}

:deep(.el-tree-node__content:hover) {
  background: #f8fafc;
}

:deep(.is-current > .el-tree-node__content) {
  background: #fef3c7;
  color: #d97706;
}

.tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 8px;
}

.node-icon {
  font-size: 16px;
  color: #fbbf24;
}

.node-label {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-count {
  font-size: 12px;
  color: #94a3b8;
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 10px;
}

.node-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.tree-node:hover .node-actions {
  opacity: 1;
}

.edit-btn {
  font-size: 12px;
  color: #d97706 !important;
}

.edit-btn:hover {
  background: #fef3c7 !important;
}
</style>
