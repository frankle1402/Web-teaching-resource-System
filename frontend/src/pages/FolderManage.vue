<template>
  <div class="folder-manage-container">
    <div class="page-header">
      <h2>文件夹管理</h2>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新建文件夹
      </el-button>
    </div>

    <el-card>
      <el-tree
        v-loading="loading"
        :data="folderTree"
        :props="{ children: 'children', label: 'name' }"
        node-key="id"
        default-expand-all
      >
        <template #default="{ node, data }">
          <div class="tree-node">
            <span>{{ node.label }}</span>
            <div class="node-actions">
              <el-button
                type="primary"
                size="small"
                link
                @click.stop="handleCreateChild(data)"
              >
                添加子文件夹
              </el-button>
              <el-button
                type="primary"
                size="small"
                link
                @click.stop="handleRename(data)"
              >
                重命名
              </el-button>
              <el-button
                type="danger"
                size="small"
                link
                @click.stop="handleDelete(data)"
              >
                删除
              </el-button>
            </div>
          </div>
        </template>
      </el-tree>
    </el-card>

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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { folderAPI } from '@/api/folder'

const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref('create') // create | rename
const submitting = ref(false)
const folderTree = ref([])
const currentFolder = ref(null)

const form = reactive({
  name: ''
})

// 加载文件夹树
const loadFolders = async () => {
  loading.value = true
  try {
    // 响应拦截器已经返回了 res.data
    const response = await folderAPI.getTree()
    folderTree.value = response || []
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
  try {
    await ElMessageBox.confirm(
      `确定要删除文件夹"${folder.name}"吗？`,
      '确认删除',
      {
        type: 'warning'
      }
    )
    await folderAPI.delete(folder.id)
    ElMessage.success('删除成功')
    loadFolders()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.error?.message || '删除失败')
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
  } catch (error) {
    ElMessage.error(error.response?.data?.error?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadFolders()
})
</script>

<style scoped>
.folder-manage-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
  color: #1f2937;
}

.tree-node {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 10px;
}

.node-actions {
  display: flex;
  gap: 5px;
}
</style>
