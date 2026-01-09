<template>
  <div class="folder-tree-panel">
    <div class="panel-header">
      <h3>我的文件夹</h3>
      <el-button size="small" @click="handleCreateRoot">
        <el-icon><Plus /></el-icon>
        新建
      </el-button>
    </div>

    <!-- 全部资源选项（固定在顶部，默认选中） -->
    <div
      class="all-resources-item"
      :class="{ active: selectedFolderId === 'all' }"
      @click="handleSelectAllResources"
    >
      <el-icon class="folder-icon"><Files /></el-icon>
      <span class="folder-name">全部资源</span>
      <span class="folder-count">{{ totalCount }}</span>
    </div>

    <!-- 未分类资源选项 -->
    <div
      class="uncategorized-item"
      :class="{ active: selectedFolderId === 'uncategorized' }"
      @click="handleSelectUncategorized"
    >
      <el-icon class="folder-icon"><FolderOpened /></el-icon>
      <span class="folder-name">未分类资源</span>
      <span class="folder-count">{{ unclassifiedCount }}</span>
    </div>

    <el-divider style="margin: 12px 0;" />

    <el-scrollbar class="tree-scrollbar">
      <el-tree
        v-loading="loading"
        :data="folderTree"
        :props="{ children: 'children', label: 'name' }"
        node-key="id"
        :highlight-current="true"
        :current-node-key="selectedFolderId"
        :expand-on-click-node="false"
        @node-click="handleNodeClick"
      >
        <template #default="{ node, data }">
          <div class="tree-node">
            <el-icon class="node-icon"><Folder /></el-icon>
            <span class="node-label">{{ node.label }}</span>
            <span class="node-count">{{ data.resourceCount || 0 }}</span>
            <div class="node-actions" @click.stop>
              <el-dropdown trigger="click">
                <el-button size="small" text>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="handleCreateChild(data)">
                      <el-icon><Plus /></el-icon> 添加子文件夹
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleRename(data)">
                      <el-icon><Edit /></el-icon> 重命名
                    </el-dropdown-item>
                    <el-dropdown-item
                      @click="handleDelete(data)"
                      :disabled="!data.canDelete"
                    >
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
  Plus, Folder, FolderOpened, Edit, Delete, MoreFilled, Files
} from '@element-plus/icons-vue'
import { folderAPI } from '@/api/folder'

const emit = defineEmits(['folder-selected', 'folder-updated'])

const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref('create') // create | rename
const submitting = ref(false)
const folderTree = ref([])
const unclassifiedCount = ref(0)
const selectedFolderId = ref('all') // 默认选中"全部资源"
const currentFolder = ref(null)

const form = reactive({
  name: ''
})

// 计算总资源数量
const totalCount = computed(() => {
  const countFromFolders = (folders) => {
    let count = 0
    folders.forEach(folder => {
      count += (folder.resourceCount || 0)
      if (folder.children && folder.children.length > 0) {
        count += countFromFolders(folder.children)
      }
    })
    return count
  }
  return unclassifiedCount.value + countFromFolders(folderTree.value)
})

// 加载文件夹树
const loadFolders = async () => {
  loading.value = true
  try {
    const response = await folderAPI.getTree()
    // 适配新的响应格式 { data: { tree, unclassifiedCount } }
    if (response.tree && response.unclassifiedCount !== undefined) {
      folderTree.value = response.tree
      unclassifiedCount.value = response.unclassifiedCount
    } else if (Array.isArray(response)) {
      // 兼容旧格式
      folderTree.value = response
    }
  } catch (error) {
    console.error('加载文件夹列表失败:', error)
    ElMessage.error('加载文件夹列表失败')
  } finally {
    loading.value = false
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  dialogMode.value = 'create'
  form.name = ''
  currentFolder.value = null
  dialogVisible.value = true
}

// 创建根文件夹
const handleCreateRoot = () => {
  showCreateDialog()
}

// 创建子文件夹
const handleCreateChild = (parent) => {
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
  if (!folder.canDelete) {
    ElMessage.warning('文件夹非空，无法删除')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除文件夹"${folder.name}"吗？`,
      '确认删除',
      { type: 'warning' }
    )
    await folderAPI.delete(folder.id)
    ElMessage.success('删除成功')
    loadFolders()
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
      await folderAPI.create({
        name: form.name.trim(),
        parentId: currentFolder.value?.id || null
      })
      ElMessage.success('创建成功')
    } else {
      await folderAPI.update(currentFolder.value.id, {
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

// 点击全部资源
const handleSelectAllResources = () => {
  selectedFolderId.value = 'all'
  emit('folder-selected', 'all', '全部资源')
}

// 点击文件夹节点
const handleNodeClick = (data) => {
  selectedFolderId.value = data.id
  emit('folder-selected', data.id, data.name)
}

// 点击未分类资源
const handleSelectUncategorized = () => {
  selectedFolderId.value = 'uncategorized'
  emit('folder-selected', 'uncategorized', '未分类资源')
}

// 暴露方法供父组件调用
defineExpose({
  loadFolders,
  selectFolder: (id, name) => {
    if (id === 'all') {
      handleSelectAllResources()
    } else if (id === 'uncategorized' || id === null) {
      handleSelectUncategorized()
    } else {
      selectedFolderId.value = id
      emit('folder-selected', id, name)
    }
  }
})

onMounted(() => {
  loadFolders()
  // 默认触发全部资源选择
  handleSelectAllResources()
})
</script>

<style scoped>
.folder-tree-panel {
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

.all-resources-item,
.uncategorized-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.all-resources-item:hover,
.uncategorized-item:hover {
  background: #f1f5f9;
}

.all-resources-item.active,
.uncategorized-item.active {
  background: #eff6ff;
  color: #3b82f6;
}

.folder-icon {
  font-size: 18px;
  color: #94a3b8;
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

.tree-scrollbar {
  flex: 1;
}

:deep(.el-tree-node__content) {
  height: 40px;
  padding-right: 8px;
}

:deep(.el-tree-node__content:hover) {
  background: #f8fafc;
}

:deep(.is-current > .el-tree-node__content) {
  background: #eff6ff;
  color: #3b82f6;
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
</style>
