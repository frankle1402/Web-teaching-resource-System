const { getDB, saveDatabase, closeDatabase } = require('./src/database/connection');

async function setAdminRole() {
  try {
    const db = await getDB();

    // 直接执行SQL更新
    db.prepare("UPDATE users SET role = 'admin' WHERE phone = '13800138000'").run();
    saveDatabase();

    // 验证更新结果
    const user = db.prepare('SELECT phone, role FROM users WHERE phone = ?').get(['13800138000']);

    console.log('✓ 用户角色已更新:');
    console.log('  手机号:', user.phone);
    console.log('  角色:', user.role);

    await closeDatabase();
  } catch (error) {
    console.error('✗ 设置管理员失败:', error.message);
  }
}

setAdminRole();
