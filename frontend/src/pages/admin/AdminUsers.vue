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

      <!-- 筛选条件 -->
      <div class="filters">
        <el-select v-model="filterStatus" placeholder="用户状态" clearable @change="loadUsers" style="width: 120px">
          <el-option label="正常" :value="1" />
          <el-option label="已禁用" :value="0" />
        </el-select>

        <el-select v-model="filterRole" placeholder="用户角色" clearable @change="loadUsers" style="width: 120px">
          <el-option label="管理员" value="admin" />
          <el-option label="普通用户" value="user" />
        </el-select>
      </div>

      <!-- 用户列表 -->
      <el-table :data="users" stripe style="width: 100%; margin-top: 16px">
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
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
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
        <el-table-column label="操作" width="200" fixed="right">
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
    <el-dialog v-model="editDialogVisible" title="编辑用户" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width: 100%">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增用户对话框 -->
    <el-dialog v-model="createDialogVisible" title="新增用户" width="500px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="createForm.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="真实姓名" prop="real_name">
          <el-input v-model="createForm.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="单位/机构" prop="organization">
          <el-input v-model="createForm.organization" placeholder="请输入单位或机构名称" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="createForm.nickname" placeholder="选填，默认使用真实姓名" />
        </el-form-item>
        <el-form-item label="头像URL" prop="avatar_url">
          <el-input v-model="createForm.avatar_url" placeholder="选填，请输入图片链接" />
        </el-form-item>
        <el-form-item label="系统角色" prop="role">
          <el-select v-model="createForm.role" style="width: 100%">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createUser">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminAPI } from '@/api/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'

const router = useRouter()
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

const editDialogVisible = ref(false)
const editForm = reactive({
  id: null,
  phone: '',
  nickname: '',
  role: 'user'
})

// 新增用户相关
const createDialogVisible = ref(false)
const createFormRef = ref(null)
const creating = ref(false)
const createForm = reactive({
  phone: '',
  real_name: '',
  organization: '',
  nickname: '',
  avatar_url: '',
  role: 'user'
})

// 新增用户表单验证规则
const createRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  organization: [
    { required: true, message: '请输入单位/机构', trigger: 'blur' }
  ]
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
 * 切换用户状态
 */
const toggleUserStatus = async (user) => {
  const action = user.status === 1 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户 ${user.phone} 吗？`,
      '确认操作',
      {
        type: 'warning'
      }
    )

    const newStatus = user.status === 1 ? 0 : 1
    await adminAPI.updateUserStatus(user.id, newStatus)
    ElMessage.success(`用户已${action}`)
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

/**
 * 编辑用户
 */
const editUser = (user) => {
  editForm.id = user.id
  editForm.phone = user.phone
  editForm.nickname = user.nickname || ''
  editForm.role = user.role || 'user'
  editDialogVisible.value = true
}

/**
 * 保存用户
 */
const saveUser = async () => {
  try {
    await adminAPI.updateUser(editForm.id, {
      nickname: editForm.nickname,
      role: editForm.role
    })
    ElMessage.success('用户信息已更新')
    editDialogVisible.value = false
    loadUsers()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

/**
 * 打开新增用户对话框
 */
const openCreateDialog = () => {
  // 重置表单
  createForm.phone = ''
  createForm.real_name = ''
  createForm.organization = ''
  createForm.nickname = ''
  createForm.avatar_url = ''
  createForm.role = 'user'
  createDialogVisible.value = true
}

/**
 * 创建新用户
 */
const createUser = async () => {
  if (!createFormRef.value) return

  try {
    const valid = await createFormRef.value.validate()
    if (!valid) return

    creating.value = true

    const submitData = {
      phone: createForm.phone,
      real_name: createForm.real_name,
      organization: createForm.organization,
      role: createForm.role
    }

    if (createForm.nickname) {
      submitData.nickname = createForm.nickname
    }

    if (createForm.avatar_url) {
      submitData.avatar_url = createForm.avatar_url
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

.filters {
  display: flex;
  gap: 12px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
