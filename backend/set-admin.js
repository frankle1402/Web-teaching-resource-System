const { getDB, saveDatabase, closeDatabase } = require('./src/database/connection');

async function setAdminRole() {
  try {
    const db = await getDB();

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(['13800138000']);

    if (!user) {
      console.log('❌ 用户不存在，请先使用该手机号登录一次');
    } else {
      // 更新角色为管理员
      db.prepare('UPDATE users SET role = ? WHERE phone = ?').run(['admin', '13800138000']);
      saveDatabase();

      console.log('✓ 用户 13800138000 已设置为管理员');
      console.log('  手机号: 13800138000');
      console.log('  角色: admin');
      console.log('  昵称: ' + (user.nickname || '未设置'));
    }

    await closeDatabase();
  } catch (error) {
    console.error('✗ 设置管理员失败:', error.message);
  }
}

setAdminRole();
