<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑收藏"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <!-- 原始标题（只读） -->
      <el-form-item label="原标题">
        <el-input
          :value="favorite?.title"
          disabled
          placeholder="原始标题"
        />
      </el-form-item>

      <!-- 自定义标题 -->
      <el-form-item label="自定义标题" prop="customTitle">
        <el-input
          v-model="form.customTitle"
          placeholder="输入自定义标题（可选）"
          clearable
          maxlength="200"
          show-word-limit
        />
        <div class="form-tip">自定义标题将优先显示，留空则显示原标题</div>
      </el-form-item>

      <!-- 备注 -->
      <el-form-item label="备注" prop="notes">
        <el-input
          v-model="form.notes"
          type="textarea"
          placeholder="输入备注信息（可选）"
          :rows="4"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { favoriteAPI } from '@/api/favorite'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  favorite: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

const dialogVisible = ref(false)
const formRef = ref(null)
const saving = ref(false)

const form = reactive({
  customTitle: '',
  notes: ''
})

const rules = {
  customTitle: [
    { max: 200, message: '标题最多200个字符', trigger: 'blur' }
  ],
  notes: [
    { max: 1000, message: '备注最多1000个字符', trigger: 'blur' }
  ]
}

// 同步visible状态
watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val && props.favorite) {
    // 初始化表单数据
    form.customTitle = props.favorite.custom_title || ''
    form.notes = props.favorite.notes || ''
  }
})

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

const handleClose = () => {
  dialogVisible.value = false
  // 重置表单
  form.customTitle = ''
  form.notes = ''
}

const handleSave = async () => {
  if (!props.favorite) return

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    await favoriteAPI.update(props.favorite.id, {
      customTitle: form.customTitle || null,
      notes: form.notes || null
    })

    ElMessage.success('保存成功')
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
