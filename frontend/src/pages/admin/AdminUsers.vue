<template>
  <div class="admin-users">
    <el-card v-loading="loading" class="users-card">
      <template #header>
        <div class="card-header">
          <h3>用户管理</h3>
          <div class="header-actions">
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>
              新增用户
            </el-button>
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户手机号或昵称"
              style="width: 250px"
              clearable
              @clear="loadUsers"
              @keyup.enter="loadUsers"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <!-- 批量操作栏 -->
      <div v-if="selectedUsers.length > 0" class="batch-actions">
        <span class="selected-count">已选择 {{ selectedUsers.length }} 项</span>
        <el-button type="danger" @click="batchDisable">批量禁用</el-button>
        <el-button type="success" @click="batchEnable">批量启用</el-button>
        <el-button @click="batchChangeRole">批量修改角色</el-button>
        <el-button link @click="clearSelection">取消选择</el-button>
      </div>

      <!-- 筛选条件 -->
      <div class="filters">
        <el-select v-model="filterStatus" placeholder="用户状态" clearable @change="loadUsers" style="width: 120px">
          <el-option label="正常" :value="1" />
          <el-option label="已禁用" :value="0" />
        </el-select>

        <el-select v-model="filterRole" placeholder="用户角色" clearable @change="loadUsers" style="width: 140px">
          <el-option label="管理员" value="admin" />
          <el-option label="教师" value="teacher" />
          <el-option label="学生" value="student" />
        </el-select>
      </div>

      <!-- 用户列表 -->
      <el-table
        ref="tableRef"
        :data="users"
        stripe
        style="width: 100%; margin-top: 16px"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="phone" label="手机号" width="130">
          <template #default="{ row }">
            {{ row.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }}
          </template>
        </el-table-column>
        <el-table-column prop="real_name" label="真实姓名" width="120">
          <template #default="{ row }">
            {{ row.real_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" width="120">
          <template #default="{ row }">
            {{ row.nickname || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="organization" label="单位/机构" width="150">
          <template #default="{ row }">
            {{ row.organization || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)" size="small">
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="resourceCount" label="资源数" width="100" align="center">
          <template #default="{ row }">
            <el-link type="primary" @click="viewUserResources(row)">
              {{ row.resourceCount }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewUserResources(row)">
              查看资源
            </el-button>
            <el-button
              link
              :type="row.status === 1 ? 'warning' : 'success'"
              size="small"
              @click="toggleUserStatus(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="primary" size="small" @click="editUser(row)">
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click="deleteUser(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadUsers"
          @size-change="loadUsers"
        />
      </div>
    </el-card>

    <!-- 编辑用户对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑用户" width="600px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" disabled />
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="editForm.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" placeholder="选填，用于平台展示" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="教师" value="teacher" />
            <el-option label="学生" value="student" />
          </el-select>
        </el-form-item>

        <!-- 教师字段 -->
        <template v-if="editForm.role === 'teacher'">
          <el-form-item label="单位/机构">
            <el-input v-model="editForm.organization" placeholder="请输入单位或机构名称" />
          </el-form-item>
          <el-form-item label="职称">
            <el-select v-model="editForm.teacher_title" placeholder="请选择职称" style="width: 100%">
              <el-option v-for="item in teacherTitles" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="专业领域">
            <el-input v-model="editForm.teacher_field" placeholder="选填，如：内科护理、解剖学等" />
          </el-form-item>
        </template>

        <!-- 学生字段 -->
        <template v-if="editForm.role === 'student'">
          <el-form-item label="学校">
            <el-input v-model="editForm.student_school" placeholder="请输入学校名称" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="专业">
                <el-input v-model="editForm.student_major" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="班级">
                <el-input v-model="editForm.student_class" placeholder="选填" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="年级">
                <el-input v-model="editForm.student_grade" placeholder="选填，如：2024级" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="层次">
                <el-select v-model="editForm.student_level" placeholder="请选择" style="width: 100%">
                  <el-option v-for="item in studentLevels" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增用户对话框 -->
    <el-dialog v-model="createDialogVisible" title="新增用户" width="600px" @closed="resetCreateForm">
      <!-- 步骤1：选择角色 -->
      <div v-if="createStep === 0" class="create-step-content">
        <p class="step-description">请选择用户角色，不同角色需要填写不同的信息</p>
        <div class="role-options">
          <div
            class="role-card"
            :class="{ active: createForm.role === 'teacher' }"
            @click="selectCreateRole('teacher')"
          >
            <el-icon :size="40"><Reading /></el-icon>
            <h3>教师</h3>
            <p>创建、管理和分享教学资源</p>
          </div>
          <div
            class="role-card"
            :class="{ active: createForm.role === 'student' }"
            @click="selectCreateRole('student')"
          >
            <el-icon :size="40"><Notebook /></el-icon>
            <h3>学生</h3>
            <p>浏览和学习优质教学资源</p>
          </div>
          <div
            class="role-card"
            :class="{ active: createForm.role === 'admin' }"
            @click="selectCreateRole('admin')"
          >
            <el-icon :size="40"><UserFilled /></el-icon>
            <h3>管理员</h3>
            <p>管理系统和用户</p>
          </div>
        </div>
      </div>

      <!-- 步骤2：填写信息 -->
      <div v-if="createStep === 1" class="create-step-content">
        <!-- 教师表单 -->
        <el-form
          v-if="createForm.role === 'teacher'"
          ref="teacherFormRef"
          :model="createForm"
          :rules="teacherRules"
          label-width="100px"
        >
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="createForm.phone" placeholder="请输入手机号" maxlength="11" />
          </el-form-item>
          <el-form-item label="真实姓名" prop="real_name">
            <el-input v-model="createForm.real_name" placeholder="请输入真实姓名" />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="createForm.nickname" placeholder="选填，用于平台展示" />
          </el-form-item>
          <el-form-item label="单位/机构" prop="organization">
            <el-input v-model="createForm.organization" placeholder="请输入单位或机构名称" />
          </el-form-item>
          <el-form-item label="职称" prop="teacher_title">
            <el-select v-model="createForm.teacher_title" placeholder="请选择职称" style="width: 100%">
              <el-option v-for="item in teacherTitles" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="专业领域" prop="teacher_field">
            <el-input v-model="createForm.teacher_field" placeholder="选填，如：内科护理、解剖学等" />
          </el-form-item>
        </el-form>

        <!-- 学生表单 -->
        <el-form
          v-if="createForm.role === 'student'"
          ref="studentFormRef"
          :model="createForm"
          :rules="studentRules"
          label-width="100px"
        >
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="createForm.phone" placeholder="请输入手机号" maxlength="11" />
          </el-form-item>
          <el-form-item label="真实姓名" prop="real_name">
            <el-input v-model="createForm.real_name" placeholder="请输入真实姓名" />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="createForm.nickname" placeholder="选填，用于平台展示" />
          </el-form-item>
          <el-form-item label="学校" prop="student_school">
            <el-input v-model="createForm.student_school" placeholder="请输入学校名称" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="专业" prop="student_major">
                <el-input v-model="createForm.student_major" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="班级" prop="student_class">
                <el-input v-model="createForm.student_class" placeholder="选填" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="年级" prop="student_grade">
                <el-input v-model="createForm.student_grade" placeholder="选填，如：2024级" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="层次" prop="student_level">
                <el-select v-model="createForm.student_level" placeholder="请选择" style="width: 100%">
                  <el-option v-for="item in studentLevels" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <!-- 管理员表单 -->
        <el-form
          v-if="createForm.role === 'admin'"
          ref="adminFormRef"
          :model="createForm"
          :rules="adminRules"
          label-width="100px"
        >
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="createForm.phone" placeholder="请输入手机号" maxlength="11" />
          </el-form-item>
          <el-form-item label="真实姓名" prop="real_name">
            <el-input v-model="createForm.real_name" placeholder="请输入真实姓名" />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="createForm.nickname" placeholder="选填，用于平台展示" />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button v-if="createStep === 1" @click="createStep = 0">上一步</el-button>
        <el-button v-if="createStep === 0" @click="createDialogVisible = false">取消</el-button>
        <el-button
          v-if="createStep === 0"
          type="primary"
          :disabled="!createForm.role"
          @click="createStep = 1"
        >
          下一步
        </el-button>
        <el-button
          v-if="createStep === 1"
          type="primary"
          :loading="creating"
          @click="createUser"
        >
          创建用户
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量修改角色对话框 -->
    <el-dialog v-model="batchRoleDialogVisible" title="批量修改角色" width="400px">
      <el-form :model="batchRoleForm" label-width="80px">
        <el-form-item label="选择角色">
          <el-select v-model="batchRoleForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="教师" value="teacher" />
            <el-option label="学生" value="student" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchRoleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchOperating" @click="confirmBatchChangeRole">
          确定修改 ({{ selectedUsers.length }}个用户)
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminAPI } from '@/api/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Reading, Notebook, UserFilled } from '@element-plus/icons-vue'

const router = useRouter()
const tableRef = ref(null)
const loading = ref(false)
const users = ref([])
const searchKeyword = ref('')
const filterStatus = ref('')
const filterRole = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 批量选择
const selectedUsers = ref([])

const editDialogVisible = ref(false)
const editForm = reactive({
  id: null,
  phone: '',
  nickname: '',
  real_name: '',
  role: 'student',
  // 教师字段
  organization: '',
  teacher_title: '',
  teacher_field: '',
  // 学生字段
  student_school: '',
  student_major: '',
  student_class: '',
  student_grade: '',
  student_level: ''
})

// 新增用户相关
const createDialogVisible = ref(false)
const teacherFormRef = ref(null)
const studentFormRef = ref(null)
const adminFormRef = ref(null)
const createStep = ref(0)
const creating = ref(false)

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

const createForm = reactive({
  role: '',
  phone: '',
  real_name: '',
  nickname: '',
  // 教师字段
  organization: '',
  teacher_title: '',
  teacher_field: '',
  // 学生字段
  student_school: '',
  student_major: '',
  student_class: '',
  student_grade: '',
  student_level: ''
})

// 教师表单验证规则
const teacherRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
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
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度应为2-20个字符', trigger: 'blur' }
  ],
  student_school: [
    { required: true, message: '请输入学校名称', trigger: 'blur' }
  ]
}

// 管理员表单验证规则
const adminRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度应为2-20个字符', trigger: 'blur' }
  ]
}

// 批量修改角色
const batchRoleDialogVisible = ref(false)
const batchOperating = ref(false)
const batchRoleForm = reactive({
  role: 'student'
})

/**
 * 角色相关辅助函数
 */
const getRoleType = (role) => {
  const types = { admin: 'danger', teacher: 'warning', student: 'success' }
  return types[role] || 'info'
}

const getRoleLabel = (role) => {
  const labels = { admin: '管理员', teacher: '教师', student: '学生' }
  return labels[role] || '未知'
}

/**
 * 加载用户列表
 */
const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (filterStatus.value !== '') params.status = filterStatus.value
    if (filterRole.value) params.role = filterRole.value

    const data = await adminAPI.getUsers(params)
    users.value = data.list
    pagination.total = data.pagination.total
  } catch (error) {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 格式化日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 查看用户资源
 */
const viewUserResources = (user) => {
  router.push(`/admin/resources?userId=${user.id}`)
}

/**
 * 表格选择变化
 */
const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

/**
 * 清除选择
 */
const clearSelection = () => {
  tableRef.value?.clearSelection()
  selectedUsers.value = []
}

/**
 * 切换用户状态（单个）
 */
const toggleUserStatus = async (user) => {
  const action = user.status === 1 ? '禁用' : '启用'
  try {
    if (user.status === 1) {
      // 禁用操作 - 要求输入原因
      const { value } = await ElMessageBox.prompt(
        `请输入禁用用户 ${user.phone} 的原因`,
        '禁用用户',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputPattern: /.+/,
          inputErrorMessage: '请输入禁用原因'
        }
      )
      await adminAPI.updateUserStatus(user.id, 0, value)
    } else {
      // 启用操作 - 无需原因
      await ElMessageBox.confirm(
        `确定要启用用户 ${user.phone} 吗？`,
        '确认操作',
        { type: 'warning' }
      )
      await adminAPI.updateUserStatus(user.id, 1)
    }
    ElMessage.success(`用户已${action}`)
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

/**
 * 批量禁用
 */
const batchDisable = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      `请输入禁用 ${selectedUsers.value.length} 个用户的原因`,
      '批量禁用用户',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '请输入禁用原因'
      }
    )

    const userIds = selectedUsers.value.map(u => u.id)
    await adminAPI.batchUpdateUserStatus({ userIds, status: 0, reason: value })

    ElMessage.success(`已禁用 ${selectedUsers.value.length} 个用户`)
    clearSelection()
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量禁用失败')
    }
  }
}

/**
 * 批量启用
 */
const batchEnable = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要启用选中的 ${selectedUsers.value.length} 个用户吗？`,
      '批量启用',
      { type: 'warning' }
    )

    const userIds = selectedUsers.value.map(u => u.id)
    await adminAPI.batchUpdateUserStatus({ userIds, status: 1 })

    ElMessage.success(`已启用 ${selectedUsers.value.length} 个用户`)
    clearSelection()
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量启用失败')
    }
  }
}

/**
 * 批量修改角色 - 打开对话框
 */
const batchChangeRole = () => {
  batchRoleForm.role = 'student'
  batchRoleDialogVisible.value = true
}

/**
 * 批量修改角色 - 确认
 */
const confirmBatchChangeRole = async () => {
  try {
    batchOperating.value = true

    const userIds = selectedUsers.value.map(u => u.id)
    await adminAPI.batchUpdateUserRole({ userIds, role: batchRoleForm.role })

    const roleName = getRoleLabel(batchRoleForm.role)
    ElMessage.success(`已将 ${selectedUsers.value.length} 个用户修改为${roleName}`)

    batchRoleDialogVisible.value = false
    clearSelection()
    loadUsers()
  } catch (error) {
    ElMessage.error('批量修改角色失败')
  } finally {
    batchOperating.value = false
  }
}

/**
 * 编辑用户
 */
const editUser = (user) => {
  editForm.id = user.id
  editForm.phone = user.phone
  editForm.nickname = user.nickname || ''
  editForm.real_name = user.real_name || ''
  editForm.role = user.role || 'student'
  // 教师字段
  editForm.organization = user.organization || ''
  editForm.teacher_title = user.teacher_title || ''
  editForm.teacher_field = user.teacher_field || ''
  // 学生字段
  editForm.student_school = user.student_school || ''
  editForm.student_major = user.student_major || ''
  editForm.student_class = user.student_class || ''
  editForm.student_grade = user.student_grade || ''
  editForm.student_level = user.student_level || ''
  editDialogVisible.value = true
}

/**
 * 保存用户
 */
const saveUser = async () => {
  try {
    const submitData = {
      nickname: editForm.nickname,
      real_name: editForm.real_name,
      role: editForm.role
    }

    // 教师字段
    if (editForm.role === 'teacher') {
      submitData.organization = editForm.organization
      submitData.teacher_title = editForm.teacher_title
      submitData.teacher_field = editForm.teacher_field
    }

    // 学生字段
    if (editForm.role === 'student') {
      submitData.student_school = editForm.student_school
      submitData.student_major = editForm.student_major
      submitData.student_class = editForm.student_class
      submitData.student_grade = editForm.student_grade
      submitData.student_level = editForm.student_level
    }

    console.log('提交的用户数据:', submitData)
    await adminAPI.updateUser(editForm.id, submitData)
    ElMessage.success('用户信息已更新')
    editDialogVisible.value = false
    loadUsers()
  } catch (error) {
    console.error('保存用户失败:', error)
    ElMessage.error(error.message || '保存失败')
  }
}

/**
 * 删除用户
 */
const deleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 ${user.phone} (${user.real_name || user.nickname || ''}) 吗？此操作不可恢复！`,
      '删除用户',
      {
        type: 'error',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }
    )

    await adminAPI.deleteUser(user.id)
    ElMessage.success('用户已删除')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

/**
 * 打开新增用户对话框
 */
const openCreateDialog = () => {
  resetCreateForm()
  createDialogVisible.value = true
}

/**
 * 重置新增用户表单
 */
const resetCreateForm = () => {
  createStep.value = 0
  createForm.role = ''
  createForm.phone = ''
  createForm.real_name = ''
  createForm.nickname = ''
  // 教师字段
  createForm.organization = ''
  createForm.teacher_title = ''
  createForm.teacher_field = ''
  // 学生字段
  createForm.student_school = ''
  createForm.student_major = ''
  createForm.student_class = ''
  createForm.student_grade = ''
  createForm.student_level = ''
}

/**
 * 选择创建用户角色
 */
const selectCreateRole = (role) => {
  createForm.role = role
}

/**
 * 创建新用户
 */
const createUser = async () => {
  // 获取对应的表单引用
  let formRef = null
  if (createForm.role === 'teacher') {
    formRef = teacherFormRef.value
  } else if (createForm.role === 'student') {
    formRef = studentFormRef.value
  } else if (createForm.role === 'admin') {
    formRef = adminFormRef.value
  }

  if (!formRef) return

  try {
    const valid = await formRef.validate()
    if (!valid) return

    creating.value = true

    const submitData = {
      phone: createForm.phone,
      real_name: createForm.real_name,
      role: createForm.role
    }

    if (createForm.nickname) {
      submitData.nickname = createForm.nickname
    }

    // 教师字段
    if (createForm.role === 'teacher') {
      submitData.organization = createForm.organization
      if (createForm.teacher_title) {
        submitData.teacher_title = createForm.teacher_title
      }
      if (createForm.teacher_field) {
        submitData.teacher_field = createForm.teacher_field
      }
    }

    // 学生字段
    if (createForm.role === 'student') {
      submitData.student_school = createForm.student_school
      if (createForm.student_major) {
        submitData.student_major = createForm.student_major
      }
      if (createForm.student_class) {
        submitData.student_class = createForm.student_class
      }
      if (createForm.student_grade) {
        submitData.student_grade = createForm.student_grade
      }
      if (createForm.student_level) {
        submitData.student_level = createForm.student_level
      }
    }

    await adminAPI.createUser(submitData)

    ElMessage.success('用户创建成功')
    createDialogVisible.value = false
    loadUsers()
  } catch (error) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.admin-users {
  padding: 0;
}

.users-card {
  min-height: calc(100vh - 140px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 16px;
}

.selected-count {
  font-weight: 500;
  color: #409eff;
}

.filters {
  display: flex;
  gap: 12px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 新增用户对话框样式 */
.create-step-content {
  min-height: 300px;
}

.step-description {
  text-align: center;
  color: #64748b;
  margin-bottom: 20px;
  font-size: 14px;
}

.role-options {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 20px;
}

.role-card {
  flex: 1;
  max-width: 160px;
  padding: 24px 16px;
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
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
}

.role-card.active {
  border-color: #0ea5e9;
  background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
}

.role-card .el-icon {
  color: #64748b;
  margin-bottom: 12px;
  transition: color 0.3s;
}

.role-card:hover .el-icon,
.role-card.active .el-icon {
  color: #0ea5e9;
}

.role-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 6px 0;
}

.role-card p {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}
</style>
