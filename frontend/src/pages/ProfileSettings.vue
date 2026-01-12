<template>
  <div class="profile-settings-page">
    <div class="page-card">
      <h1 class="page-title">个人设置</h1>

      <el-skeleton :loading="loading" animated :rows="10">
        <template #default>
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="100px"
            class="profile-form"
          >
            <!-- 头像设置区域 -->
            <div class="form-section">
              <h2 class="section-title">头像设置</h2>
              <div class="avatar-section">
                <el-avatar
                  :size="80"
                  :src="form.avatar_url || undefined"
                  class="user-avatar"
                >
                  <el-icon :size="40"><User /></el-icon>
                </el-avatar>
                <div class="avatar-actions">
                  <el-input
                    v-model="form.avatar_url"
                    placeholder="请输入头像图片链接"
                    clearable
                    class="avatar-input"
                  />
                  <p class="avatar-tip">支持输入图片URL地址</p>
                </div>
              </div>
            </div>

            <!-- 基本信息区域 -->
            <div class="form-section">
              <h2 class="section-title">基本信息</h2>

              <el-form-item label="昵称" prop="nickname">
                <el-input
                  v-model="form.nickname"
                  placeholder="请输入昵称"
                  maxlength="20"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="真实姓名" prop="real_name">
                <el-input
                  v-model="form.real_name"
                  placeholder="请输入真实姓名"
                  maxlength="20"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="手机号">
                <el-input
                  :value="maskedPhone"
                  disabled
                  class="readonly-input"
                />
              </el-form-item>
            </div>

            <!-- 角色信息区域 -->
            <div class="form-section">
              <h2 class="section-title">
                {{ userRole === 'teacher' ? '教师信息' : (userRole === 'student' ? '学生信息' : '其他信息') }}
              </h2>

              <!-- 教师角色字段 -->
              <template v-if="userRole === 'teacher'">
                <el-form-item label="单位/机构" prop="organization">
                  <el-input
                    v-model="form.organization"
                    placeholder="请输入您的单位或机构名称"
                    maxlength="50"
                    show-word-limit
                  />
                </el-form-item>

                <el-form-item label="职称" prop="teacher_title">
                  <el-select
                    v-model="form.teacher_title"
                    placeholder="请选择职称"
                    class="full-width"
                    clearable
                  >
                    <el-option
                      v-for="item in teacherTitles"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="专业领域" prop="teacher_field">
                  <el-input
                    v-model="form.teacher_field"
                    placeholder="请输入您的专业领域"
                    maxlength="50"
                    show-word-limit
                  />
                </el-form-item>
              </template>

              <!-- 学生角色字段 -->
              <template v-else-if="userRole === 'student'">
                <el-form-item label="学校" prop="student_school">
                  <el-input
                    v-model="form.student_school"
                    placeholder="请输入您的学校名称"
                    maxlength="50"
                    show-word-limit
                  />
                </el-form-item>

                <el-form-item label="专业" prop="student_major">
                  <el-input
                    v-model="form.student_major"
                    placeholder="请输入您的专业"
                    maxlength="50"
                    show-word-limit
                  />
                </el-form-item>

                <el-form-item label="班级" prop="student_class">
                  <el-input
                    v-model="form.student_class"
                    placeholder="请输入您的班级"
                    maxlength="30"
                    show-word-limit
                  />
                </el-form-item>

                <el-form-item label="年级" prop="student_grade">
                  <el-input
                    v-model="form.student_grade"
                    placeholder="请输入您的年级"
                    maxlength="20"
                    show-word-limit
                  />
                </el-form-item>

                <el-form-item label="层次" prop="student_level">
                  <el-select
                    v-model="form.student_level"
                    placeholder="请选择层次"
                    class="full-width"
                    clearable
                  >
                    <el-option
                      v-for="item in studentLevels"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </template>

              <!-- 非教师/学生角色（如管理员或普通用户） -->
              <template v-else>
                <el-form-item label="单位/机构" prop="organization">
                  <el-input
                    v-model="form.organization"
                    placeholder="请输入您的单位或机构名称"
                    maxlength="50"
                    show-word-limit
                  />
                </el-form-item>
              </template>
            </div>

            <!-- 保存按钮 -->
            <div class="form-actions">
              <el-button
                type="primary"
                size="large"
                :loading="saving"
                @click="handleSave"
              >
                {{ saving ? '保存中...' : '保存修改' }}
              </el-button>
            </div>
          </el-form>
        </template>
      </el-skeleton>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import { userAPI } from '@/api/user'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(true)
const saving = ref(false)

// 选项数据
const teacherTitles = ref([
  { value: 'junior', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'associate_senior', label: '副高级' },
  { value: 'senior', label: '高级' }
])

const studentLevels = ref([
  { value: 'secondary_vocational', label: '中职' },
  { value: 'higher_vocational', label: '高职' },
  { value: 'undergraduate', label: '本科' },
  { value: 'postgraduate', label: '研究生' }
])

// 表单数据
const form = reactive({
  nickname: '',
  real_name: '',
  avatar_url: '',
  organization: '',
  teacher_title: '',
  teacher_field: '',
  student_school: '',
  student_major: '',
  student_class: '',
  student_grade: '',
  student_level: ''
})

// 用户角色
const userRole = computed(() => userStore.userInfo?.role || 'user')

// 脱敏手机号
const maskedPhone = computed(() => {
  const phone = userStore.userInfo?.phone || ''
  if (!phone || phone.length < 7) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
})

// 表单验证规则（根据角色动态生成）
const rules = computed(() => {
  // 基本规则：昵称必填
  const baseRules = {
    nickname: [
      { required: true, message: '请输入昵称', trigger: 'blur' },
      { max: 20, message: '昵称最多20个字符', trigger: 'blur' }
    ],
    real_name: [
      { max: 20, message: '姓名最多20个字符', trigger: 'blur' }
    ]
  }

  if (userRole.value === 'teacher') {
    return {
      ...baseRules,
      organization: [
        { required: true, message: '请输入单位/机构名称', trigger: 'blur' },
        { max: 50, message: '单位名称最多50个字符', trigger: 'blur' }
      ],
      teacher_field: [
        { max: 50, message: '专业领域最多50个字符', trigger: 'blur' }
      ]
    }
  } else if (userRole.value === 'student') {
    return {
      ...baseRules,
      student_school: [
        { required: true, message: '请输入学校名称', trigger: 'blur' },
        { max: 50, message: '学校名称最多50个字符', trigger: 'blur' }
      ],
      student_major: [
        { max: 50, message: '专业最多50个字符', trigger: 'blur' }
      ],
      student_class: [
        { max: 30, message: '班级最多30个字符', trigger: 'blur' }
      ],
      student_grade: [
        { max: 20, message: '年级最多20个字符', trigger: 'blur' }
      ]
    }
  }

  // 管理员和其他角色：昵称必填
  return baseRules
})

/**
 * 加载用户信息
 */
const loadUserProfile = async () => {
  loading.value = true
  try {
    // 获取选项
    // 注意：request.js 响应拦截器在 success:true 时直接返回 data
    const optionsRes = await userAPI.getOptions()
    if (optionsRes) {
      if (optionsRes.teacherTitles) {
        teacherTitles.value = optionsRes.teacherTitles
      }
      if (optionsRes.studentLevels) {
        studentLevels.value = optionsRes.studentLevels
      }
    }

    // 获取用户信息
    const userData = await userAPI.getProfile()
    if (userData && userData.id) {
      form.nickname = userData.nickname || ''
      form.real_name = userData.real_name || ''
      form.avatar_url = userData.avatar_url || ''
      form.organization = userData.organization || ''
      form.teacher_title = userData.teacher_title || ''
      form.teacher_field = userData.teacher_field || ''
      form.student_school = userData.student_school || ''
      form.student_major = userData.student_major || ''
      form.student_class = userData.student_class || ''
      form.student_grade = userData.student_grade || ''
      form.student_level = userData.student_level || ''
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
    ElMessage.error('加载用户信息失败')
  } finally {
    loading.value = false
  }
}

/**
 * 保存用户信息
 */
const handleSave = async () => {
  if (!formRef.value) return

  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    saving.value = true

    // 构建提交数据
    const submitData = {
      nickname: form.nickname,
      real_name: form.real_name,
      avatar_url: form.avatar_url
    }

    if (userRole.value === 'teacher') {
      submitData.organization = form.organization
      submitData.teacher_title = form.teacher_title
      submitData.teacher_field = form.teacher_field
    } else if (userRole.value === 'student') {
      submitData.student_school = form.student_school
      submitData.student_major = form.student_major
      submitData.student_class = form.student_class
      submitData.student_grade = form.student_grade
      submitData.student_level = form.student_level
    } else {
      submitData.organization = form.organization
    }

    const res = await userAPI.updateProfile(submitData)

    // 注意：request.js 响应拦截器在 success:true 时直接返回 data
    // 所以 res 就是用户数据对象，不需要再检查 res.success
    if (res && res.id) {
      // 更新 store 中的用户信息
      userStore.setUserInfo(res)
      ElMessage.success('保存成功')
    } else {
      ElMessage.error('保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUserProfile()
})
</script>

<style scoped>
.profile-settings-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 32px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 32px 0;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f1f5f9;
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 20px 0;
  padding-left: 12px;
  border-left: 3px solid #0369a1;
}

.avatar-section {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding-left: 100px;
}

.user-avatar {
  flex-shrink: 0;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
  color: white;
}

.avatar-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.avatar-input {
  max-width: 400px;
}

.avatar-tip {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.profile-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.profile-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #475569;
}

.profile-form :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.readonly-input :deep(.el-input__wrapper) {
  background-color: #f8fafc;
}

.full-width {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: center;
  padding-top: 16px;
}

.form-actions .el-button {
  min-width: 160px;
  height: 44px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
  border: none;
}

.form-actions .el-button:hover {
  background: linear-gradient(135deg, #0284c7 0%, #0284c7 100%);
}

/* 响应式调整 */
@media (max-width: 640px) {
  .page-card {
    padding: 20px;
  }

  .avatar-section {
    flex-direction: column;
    padding-left: 0;
    align-items: center;
  }

  .avatar-actions {
    width: 100%;
    align-items: center;
  }

  .avatar-input {
    max-width: 100%;
  }

  .profile-form :deep(.el-form-item__label) {
    width: 100% !important;
    text-align: left;
    padding-bottom: 4px;
  }

  .profile-form :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
}
</style>
