<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1 class="register-title">新用户注册</h1>
        <p class="register-subtitle">完善信息，开启智能教学资源创作之旅</p>
      </div>

      <!-- 步骤条 -->
      <el-steps :active="currentStep" align-center class="register-steps">
        <el-step title="选择角色" :icon="UserFilled" />
        <el-step title="填写信息" :icon="EditPen" />
        <el-step title="完成注册" :icon="CircleCheck" />
      </el-steps>

      <!-- 步骤1：选择角色 -->
      <div v-if="currentStep === 0" class="step-content">
        <p class="step-description">请选择您的身份，以便我们为您提供更好的服务</p>
        <div class="role-options">
          <div
            class="role-card"
            :class="{ active: selectedRole === 'teacher' }"
            @click="selectRole('teacher')"
          >
            <el-icon :size="48"><Reading /></el-icon>
            <h3>我是教师</h3>
            <p>创建、管理和分享教学资源</p>
          </div>
          <div
            class="role-card"
            :class="{ active: selectedRole === 'student' }"
            @click="selectRole('student')"
          >
            <el-icon :size="48"><Notebook /></el-icon>
            <h3>我是学生</h3>
            <p>浏览和学习优质教学资源</p>
          </div>
        </div>
        <div class="step-actions">
          <el-button @click="goBack">返回登录</el-button>
          <el-button
            type="primary"
            :disabled="!selectedRole"
            @click="nextStep"
          >
            下一步
          </el-button>
        </div>
      </div>

      <!-- 步骤2：填写信息 -->
      <div v-if="currentStep === 1" class="step-content">
        <!-- 教师表单 -->
        <el-form
          v-if="selectedRole === 'teacher'"
          ref="teacherFormRef"
          :model="teacherForm"
          :rules="teacherRules"
          label-position="top"
          class="register-form"
        >
          <el-form-item label="真实姓名" prop="real_name">
            <el-input
              v-model="teacherForm.real_name"
              placeholder="请输入您的真实姓名"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="昵称" prop="nickname">
            <el-input
              v-model="teacherForm.nickname"
              placeholder="选填，用于平台展示"
              :prefix-icon="ChatDotRound"
            />
          </el-form-item>

          <el-form-item label="单位/机构" prop="organization">
            <el-input
              v-model="teacherForm.organization"
              placeholder="请输入您所在的单位或机构"
              :prefix-icon="OfficeBuilding"
            />
          </el-form-item>

          <el-form-item label="职称" prop="teacher_title">
            <el-select
              v-model="teacherForm.teacher_title"
              placeholder="请选择您的职称"
              style="width: 100%"
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
              v-model="teacherForm.teacher_field"
              placeholder="选填，如：内科护理、解剖学等"
              :prefix-icon="Briefcase"
            />
          </el-form-item>
        </el-form>

        <!-- 学生表单 -->
        <el-form
          v-if="selectedRole === 'student'"
          ref="studentFormRef"
          :model="studentForm"
          :rules="studentRules"
          label-position="top"
          class="register-form"
        >
          <el-form-item label="真实姓名" prop="real_name">
            <el-input
              v-model="studentForm.real_name"
              placeholder="请输入您的真实姓名"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="昵称" prop="nickname">
            <el-input
              v-model="studentForm.nickname"
              placeholder="选填，用于平台展示"
              :prefix-icon="ChatDotRound"
            />
          </el-form-item>

          <el-form-item label="学校" prop="student_school">
            <el-input
              v-model="studentForm.student_school"
              placeholder="请输入您所在的学校"
              :prefix-icon="School"
            />
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="专业" prop="student_major">
                <el-input
                  v-model="studentForm.student_major"
                  placeholder="选填"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="班级" prop="student_class">
                <el-input
                  v-model="studentForm.student_class"
                  placeholder="选填"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="年级" prop="student_grade">
                <el-input
                  v-model="studentForm.student_grade"
                  placeholder="选填，如：2024级"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="层次" prop="student_level">
                <el-select
                  v-model="studentForm.student_level"
                  placeholder="请选择"
                  style="width: 100%"
                >
                  <el-option
                    v-for="item in studentLevels"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <div class="step-actions">
          <el-button @click="prevStep">上一步</el-button>
          <el-button
            type="primary"
            :loading="submitting"
            @click="submitForm"
          >
            {{ submitting ? '提交中...' : '完成注册' }}
          </el-button>
        </div>
      </div>

      <!-- 步骤3：完成注册 -->
      <div v-if="currentStep === 2" class="step-content success-content">
        <div class="success-icon">
          <el-icon :size="80" color="#67c23a"><CircleCheckFilled /></el-icon>
        </div>
        <h2 class="success-title">注册成功</h2>
        <p class="success-description">欢迎加入教学资源生成与管理系统</p>
        <el-button type="primary" size="large" @click="goToDashboard">
          进入系统
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  UserFilled,
  EditPen,
  CircleCheck,
  CircleCheckFilled,
  Reading,
  Notebook,
  User,
  ChatDotRound,
  OfficeBuilding,
  Briefcase,
  School
} from '@element-plus/icons-vue'
import { authAPI } from '@/api/auth'

const route = useRoute()
const router = useRouter()

// 路由参数
const phone = ref('')
const code = ref('')

// 步骤控制
const currentStep = ref(0)
const selectedRole = ref('')

// 选项数据
const teacherTitles = ref([
  { label: '初级', value: '初级' },
  { label: '中级', value: '中级' },
  { label: '副高级', value: '副高级' },
  { label: '高级', value: '高级' }
])

const studentLevels = ref([
  { label: '中职', value: '中职' },
  { label: '高职', value: '高职' },
  { label: '本科', value: '本科' },
  { label: '研究生', value: '研究生' }
])

// 表单引用
const teacherFormRef = ref(null)
const studentFormRef = ref(null)

// 教师表单数据
const teacherForm = reactive({
  real_name: '',
  nickname: '',
  organization: '',
  teacher_title: '',
  teacher_field: ''
})

// 学生表单数据
const studentForm = reactive({
  real_name: '',
  nickname: '',
  student_school: '',
  student_major: '',
  student_class: '',
  student_grade: '',
  student_level: ''
})

// 教师表单验证规则
const teacherRules = {
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度应为2-20个字符', trigger: 'blur' }
  ],
  organization: [
    { required: true, message: '请输入单位/机构', trigger: 'blur' }
  ]
}

// 学生表单验证规则
const studentRules = {
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度应为2-20个字符', trigger: 'blur' }
  ],
  student_school: [
    { required: true, message: '请输入学校名称', trigger: 'blur' }
  ]
}

// 提交状态
const submitting = ref(false)

/**
 * 初始化
 */
onMounted(async () => {
  // 获取路由参数
  phone.value = route.query.phone || ''
  code.value = route.query.code || ''

  if (!phone.value || !code.value) {
    ElMessage.error('缺少必要的注册信息，请重新登录')
    router.push('/login')
    return
  }

  // 注意：不调用 userAPI.getOptions()，因为该接口需要认证
  // 新用户注册时还没有 token，直接使用默认选项数据即可
})

/**
 * 选择角色
 */
const selectRole = (role) => {
  selectedRole.value = role
}

/**
 * 下一步
 */
const nextStep = () => {
  if (currentStep.value < 2) {
    currentStep.value++
  }
}

/**
 * 上一步
 */
const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

/**
 * 返回登录
 */
const goBack = () => {
  router.push('/login')
}

/**
 * 提交表单
 */
const submitForm = async () => {
  // 获取对应的表单引用
  const formRef = selectedRole.value === 'teacher' ? teacherFormRef.value : studentFormRef.value

  if (!formRef) return

  try {
    const valid = await formRef.validate()
    if (!valid) return

    submitting.value = true

    // 构建注册数据
    const registerData = {
      phone: phone.value,
      code: code.value,
      role: selectedRole.value
    }

    if (selectedRole.value === 'teacher') {
      Object.assign(registerData, {
        real_name: teacherForm.real_name,
        nickname: teacherForm.nickname || null,
        organization: teacherForm.organization,
        teacher_title: teacherForm.teacher_title || null,
        teacher_field: teacherForm.teacher_field || null
      })
    } else {
      Object.assign(registerData, {
        real_name: studentForm.real_name,
        nickname: studentForm.nickname || null,
        student_school: studentForm.student_school,
        student_major: studentForm.student_major || null,
        student_class: studentForm.student_class || null,
        student_grade: studentForm.student_grade || null,
        student_level: studentForm.student_level || null
      })
    }

    // 调用注册API
    const result = await authAPI.register(registerData)

    // 保存token和用户信息
    if (result.token) {
      localStorage.setItem('auth_token', result.token)
    }
    if (result.user) {
      localStorage.setItem('user_info', JSON.stringify(result.user))
    }

    // 进入成功步骤
    currentStep.value = 2
    ElMessage.success('注册成功')
  } catch (error) {
    console.error('注册失败:', error)
    ElMessage.error(error.message || '注册失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

/**
 * 进入系统
 */
const goToDashboard = () => {
  router.push('/dashboard/home')
}
</script>

<script>
export default {
  name: 'RegisterPage'
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #38bdf8 100%);
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 560px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-title {
  font-size: 26px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.register-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.register-steps {
  margin-bottom: 32px;
}

.register-steps :deep(.el-step__title) {
  font-size: 14px;
}

.step-content {
  min-height: 300px;
}

.step-description {
  text-align: center;
  color: #64748b;
  margin-bottom: 24px;
}

/* 角色选择卡片 */
.role-options {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 32px;
}

.role-card {
  flex: 1;
  max-width: 200px;
  padding: 32px 24px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8fafc;
}

.role-card:hover {
  border-color: #0ea5e9;
  background: #f0f9ff;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.15);
}

.role-card.active {
  border-color: #0ea5e9;
  background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.2);
}

.role-card .el-icon {
  color: #64748b;
  margin-bottom: 16px;
  transition: color 0.3s;
}

.role-card:hover .el-icon,
.role-card.active .el-icon {
  color: #0ea5e9;
}

.role-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.role-card p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* 表单样式 */
.register-form {
  max-width: 440px;
  margin: 0 auto;
}

.register-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
}

/* 操作按钮 */
.step-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.step-actions .el-button {
  min-width: 120px;
  height: 44px;
  font-size: 15px;
}

.step-actions .el-button--primary {
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
  border: none;
}

.step-actions .el-button--primary:hover {
  background: linear-gradient(135deg, #0284c7 0%, #0284c7 100%);
}

/* 成功页面 */
.success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.success-icon {
  margin-bottom: 24px;
  animation: bounceIn 0.6s ease-out;
}

@keyframes bounceIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.success-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.success-description {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 32px 0;
}

.success-content .el-button {
  min-width: 160px;
  height: 48px;
  font-size: 16px;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
  border: none;
}

.success-content .el-button:hover {
  background: linear-gradient(135deg, #0284c7 0%, #0284c7 100%);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .register-card {
    padding: 24px;
    margin: 16px;
  }

  .register-title {
    font-size: 22px;
  }

  .role-options {
    flex-direction: column;
    align-items: center;
  }

  .role-card {
    max-width: 100%;
    width: 100%;
    padding: 24px 20px;
  }

  .step-actions {
    flex-direction: column;
  }

  .step-actions .el-button {
    width: 100%;
  }

  .register-steps :deep(.el-step__title) {
    font-size: 12px;
  }
}
</style>
