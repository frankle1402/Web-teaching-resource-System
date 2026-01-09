<template>
  <el-dialog
    v-model="dialogVisible"
    title="移动资源"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="dialog-content">
      <p class="move-info">
        将 <strong>{{ resourceCount }}</strong> 个资源移动到：
      </p>

      <el-tree-select
        v-model="targetFolderId"
        :data="folderTreeData"
        :props="{ value: 'id', label: 'name', children: 'children' }"
        placeholder="选择目标文件夹"
        check-strictly
        :render-after-expand="false"
        clearable
        class="folder-select"
      >
        <template #default="{ data }">
          <span>{{ data.name }}</span>
          <span v-if="data.resourceCount !== undefined" class="folder-count">
            ({{ data.resourceCount }})
          </span>
        </template>
      </el-tree-select>

      <div class="move-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>选择"未分类"可移除文件夹归属</span>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button
        type="primary"
        :loading="moving"
        :disabled="targetFolderId === undefined"
        @click="handleConfirm"
      >
        确认移动
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { resourceAPI } from '@/api/resource'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  resourceIds: {
    type: Array,
    default: () => []
  },
  folderTree: {
    type: Array,
    default: () => []
  },
  currentFolderId: {
    type: [Number, String],
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const targetFolderId = ref(null)
const moving = ref(false)

const resourceCount = computed(() => props.resourceIds?.length || 0)

// 构建树形选择器数据，包含"未分类"选项
const folderTreeData = computed(() => {
  return [
    {
      id: null,
      name: '未分类',
      resourceCount: 0,
      children: []
    },
    ...props.folderTree
  ]
})

const handleConfirm = async () => {
  if (targetFolderId.value === undefined) {
    ElMessage.warning('请选择目标文件夹')
    return
  }

  moving.value = true
  try {
    await resourceAPI.batchMove(props.resourceIds, targetFolderId.value)
    ElMessage.success(`成功移动 ${resourceCount.value} 个资源`)
    emit('success')
    handleCancel()
  } catch (error) {
    console.error('移动资源失败:', error)
    ElMessage.error(error.message || '移动资源失败')
  } finally {
    moving.value = false
  }
}

const handleCancel = () => {
  targetFolderId.value = null
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (val) => {
  if (val) {
    // 重置目标文件夹
    targetFolderId.value = null
  }
})
</script>

<style scoped>
.dialog-content {
  padding: 10px 0;
}

.move-info {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 16px;
}

.move-info strong {
  color: #3b82f6;
  font-size: 16px;
}

.folder-select {
  width: 100%;
}

.folder-count {
  color: #94a3b8;
  font-size: 12px;
  margin-left: 4px;
}

.move-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 13px;
  color: #64748b;
}

.move-tip .el-icon {
  color: #3b82f6;
}
</style>
