const { getDB, saveDatabase, closeDatabase } = require('./src/database/connection');
const fs = require('fs');
const path = require('path');

async function setAdminRole() {
  try {
    console.log('=== 设置管理员角色 ===');

    const db = await getDB();

    // 查询当前状态
    const before = db.prepare('SELECT * FROM users WHERE phone = ?').get(['13800138000']);
    console.log('修改前:', before ? { phone: before.phone, role: before.role } : '不存在');

    // 更新角色
    db.prepare("UPDATE users SET role = 'admin' WHERE phone = '13800138000'").run();

    // 强制保存到文件
    saveDatabase();
    console.log('已调用 saveDatabase()');

    // 等待文件写入完成
    await new Promise(resolve => setTimeout(resolve, 500));

    // 读取文件确认
    const dbPath = path.join(__dirname, 'database/teaching_resources.sqlite');
    const exists = fs.existsSync(dbPath);
    console.log('数据库文件存在:', exists);

    // 重新连接验证
    const db2 = await getDB();
    const after = db2.prepare('SELECT phone, role FROM users WHERE phone = ?').get(['13800138000']);
    console.log('重新连接验证:', after);

    await closeDatabase();

    if (after && after.role === 'admin') {
      console.log('\n✓✓✓ 成功！角色已设置为 admin ✓✓✓');
    } else {
      console.log('\n❌ 失败！当前角色:', after ? after.role : 'null');
    }

  } catch (error) {
    console.error('错误:', error.message);
  }
}

setAdminRole();
