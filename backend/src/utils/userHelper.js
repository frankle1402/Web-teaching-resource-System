/**
 * 用户相关工具函数
 */

/**
 * 手机号脱敏处理
 * @param {string} phone - 完整手机号
 * @returns {string} 脱敏后的手机号（如：138****8000）
 */
function maskPhone(phone) {
  if (!phone || phone.length < 7) {
    return phone || '未知用户';
  }
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 获取用户显示名称
 * 优先使用昵称，如果没有昵称则使用脱敏手机号
 * @param {Object} user - 用户对象
 * @returns {string} 显示名称
 */
function getDisplayName(user) {
  if (!user) return '未知用户';
  return user.nickname || maskPhone(user.phone) || '用户' + user.id;
}

/**
 * 格式化用户信息用于API响应
 * @param {Object} user - 数据库用户对象
 * @returns {Object} 格式化后的用户对象
 */
function formatUserForResponse(user) {
  if (!user) return null;

  return {
    id: user.id,
    phone: user.phone,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    real_name: user.real_name,
    organization: user.organization,
    role: user.role,
    profile_completed: user.profile_completed,
    created_at: user.created_at,
    last_login: user.last_login,
    status: user.status,
    // 计算属性
    displayName: getDisplayName(user),
    maskedPhone: maskPhone(user.phone),
    // 教师扩展字段
    teacher_title: user.teacher_title,
    teacher_field: user.teacher_field,
    // 学生扩展字段
    student_school: user.student_school,
    student_major: user.student_major,
    student_class: user.student_class,
    student_grade: user.student_grade,
    student_level: user.student_level
  };
}

/**
 * 角色显示名称映射
 */
const ROLE_LABELS = {
  admin: '系统管理员',
  teacher: '教师',
  student: '学生'
};

/**
 * 获取角色显示名称
 * @param {string} role - 角色标识
 * @returns {string} 角色显示名称
 */
function getRoleLabel(role) {
  return ROLE_LABELS[role] || '未知角色';
}

/**
 * 职称选项
 */
const TEACHER_TITLES = [
  { value: 'junior', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'associate_senior', label: '副高级' },
  { value: 'senior', label: '高级' }
];

/**
 * 学生层次选项
 */
const STUDENT_LEVELS = [
  { value: 'secondary_vocational', label: '中职' },
  { value: 'higher_vocational', label: '高职' },
  { value: 'undergraduate', label: '本科' },
  { value: 'postgraduate', label: '研究生' }
];

/**
 * 获取职称显示名称
 * @param {string} titleValue - 职称值
 * @returns {string} 职称显示名称
 */
function getTeacherTitleLabel(titleValue) {
  const title = TEACHER_TITLES.find(t => t.value === titleValue);
  return title ? title.label : titleValue || '';
}

/**
 * 获取学生层次显示名称
 * @param {string} levelValue - 层次值
 * @returns {string} 层次显示名称
 */
function getStudentLevelLabel(levelValue) {
  const level = STUDENT_LEVELS.find(l => l.value === levelValue);
  return level ? level.label : levelValue || '';
}

/**
 * 格式化时长（秒转为易读格式）
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0秒';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

module.exports = {
  maskPhone,
  getDisplayName,
  formatUserForResponse,
  getRoleLabel,
  getTeacherTitleLabel,
  getStudentLevelLabel,
  formatDuration,
  ROLE_LABELS,
  TEACHER_TITLES,
  STUDENT_LEVELS
};
