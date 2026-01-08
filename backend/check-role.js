const { getDB, closeDatabase } = require('./src/database/connection');

async function checkUserRole() {
  try {
    const db = await getDB();

    // 查找用户
    const user = db.prepare('SELECT id, phone, nickname, role, status FROM users WHERE phone = ?').get(['13800138000']);

    if (user) {
      console.log('用户信息:');
      console.log('  ID:', user.id);
      console.log('  手机号:', user.phone);
      console.log('  昵称:', user.nickname || '未设置');
      console.log('  角色:', user.role || '(空)');
      console.log('  状态:', user.status === 1 ? '正常' : '已禁用');
    } else {
      console.log('❌ 用户不存在');
    }

    // 检查所有用户
    console.log('\n所有用户列表:');
    const allUsers = db.prepare('SELECT id, phone, role FROM users').all();
    allUsers.forEach(u => {
      console.log(`  ${u.phone} - 角色: ${u.role || '(空)'}`);
    });

    await closeDatabase();
  } catch (error) {
    console.error('✗ 查询失败:', error.message);
  }
}

checkUserRole();
