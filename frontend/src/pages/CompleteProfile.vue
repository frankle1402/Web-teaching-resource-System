<template>
  <div class="complete-profile-container">
    <div class="complete-profile-card">
      <div class="header">
        <div class="icon-wrapper">
          <el-icon :size="48"><User /></el-icon>
        </div>
        <h1 class="title">完善个人信息</h1>
        <p class="subtitle">欢迎加入教学资源生成与管理系统，请完善您的基本信息</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="profile-form"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="真实姓名" prop="real_name">
          <el-input
            v-model="form.real_name"
            placeholder="请输入真实姓名"
            size="large"
            maxlength="20"
            show-word-limit
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="单位/机构" prop="organization">
          <el-input
            v-model="form.organization"
            placeholder="请输入您的单位或机构名称"
            size="large"
            maxlength="50"
            show-word-limit
          >
            <template #prefix>
              <el-icon><OfficeBuilding /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="昵称" prop="nickname">
          <el-input
            v-model="form.nickname"
            placeholder="请输入昵称（可选，默认使用真实姓名）"
            size="large"
            maxlength="20"
            show-word-limit
          >
            <template #prefix>
              <el-icon><Avatar /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="头像URL" prop="avatar_url">
          <el-input
            v-model="form.avatar_url"
            placeholder="请输入头像图片链接（可选）"
            size="large"
          >
            <template #prefix>
              <el-icon><Picture /></el-icon>
            </template>
          </el-input>
          <div class="avatar-preview" v-if="form.avatar_url">
            <img :src="form.avatar_url" alt="头像预览" @error="handleImageError" />
            <el-button
              link
              type="danger"
              size="small"
              @click="form.avatar_url = ''"
              class="remove-btn"
            >
              移除
            </el-button>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="submit-btn"
            @click="handleSubmit"
          >
            {{ loading ? '提交中...' : '完成并进入系统' }}
          </el-button>
        </el-form-item>

        <div class="tips">
          <el-icon><InfoFilled /></el-icon>
          <span>标有 * 的字段为必填项</span>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { User, OfficeBuilding, Avatar, Picture, InfoFilled } from '@element-plus/icons-vue'

const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(false)

// 表单数据
const form = reactive({
  real_name: '',
  organization: '',
  nickname: '',
  avatar_url: ''
})

// 表单验证规则
const rules = {
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' }
  ],
  organization: [
    { required: true, message: '请输入单位/机构名称', trigger: 'blur' },
    { min: 2, max: 50, message: '单位名称长度在2-50个字符', trigger: 'blur' }
  ]
}

/**
 * 处理图片加载错误
 */
const handleImageError = (e) => {
  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E图片加载失败%3C/text%3E%3C/svg%3E'
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    loading.value = true

    // 昵称默认使用真实姓名
    const submitData = {
      real_name: form.real_name,
      organization: form.organization,
      nickname: form.nickname || form.real_name
    }

    if (form.avatar_url) {
      submitData.avatar_url = form.avatar_url
    }

    const success = await userStore.completeProfile(submitData)

    if (!success) {
      loading.value = false
    }
    // 成功后会自动跳转，不需要处理
  } catch (error) {
    console.error('提交失败:', error)
    loading.value = false
  }
}
</script>

<style scoped>
.complete-profile-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #38bdf8 100%);
  padding: 20px;
}

.complete-profile-card {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

.profile-form {
  width: 100%;
}

.avatar-preview {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-preview img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #e2e8f0;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
  border: none;
  margin-top: 8px;
}

.submit-btn:hover {
  background: linear-gradient(135deg, #0284c7 0%, #0284c7 100%);
}

.tips {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 20px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
  color: #0369a1;
  font-size: 13px;
}

.tips .el-icon {
  font-size: 16px;
}
</style>
