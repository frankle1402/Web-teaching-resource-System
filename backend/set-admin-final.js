const { getDB, saveDatabase, closeDatabase } = require('./src/database/connection');

async function setAdminRole() {
  try {
    console.log('开始设置管理员角色...');

    const db = await getDB();

    // 检查当前角色
    const before = db.prepare('SELECT phone, role FROM users WHERE phone = ?').get(['13800138000']);
    console.log('修改前:', before);

    // 更新角色
    const result = db.prepare("UPDATE users SET role = 'admin' WHERE phone = '13800138000'").run();
    console.log('更新影响行数:', result.changes);

    // 立即保存数据库
    console.log('正在保存数据库...');
    saveDatabase();
    console.log('数据库已保存');

    // 验证更新结果
    const after = db.prepare('SELECT phone, role FROM users WHERE phone = ?').get(['13800138000']);
    console.log('修改后:', after);

    // 再次确认（重新加载数据库）
    const { getDB: getDB2, closeDatabase: closeDB2 } = require('./src/database/connection');
    await closeDatabase(); // 先关闭当前连接

    // 重新连接验证
    const db2 = await getDB2();
    const verify = db2.prepare('SELECT phone, role FROM users WHERE phone = ?').get(['13800138000']);
    console.log('重新连接验证:', verify);

    await closeDB2();

    if (verify && verify.role === 'admin') {
      console.log('\n✓✓✓ 成功！用户 13800138000 已设置为管理员 ✓✓✓');
    } else {
      console.log('\n❌ 失败！角色未正确保存');
    }

  } catch (error) {
    console.error('✗ 设置管理员失败:', error.message);
  }
}

setAdminRole();
