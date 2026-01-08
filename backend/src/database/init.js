const { initDatabase, saveDatabase, closeDatabase, getDB } = require('./connection');

/**
 * 数据库初始化脚本
 * 用于创建数据库表结构和初始数据
 */
async function initAppDatabase() {
  try {
    await initDatabase();

    // 设置默认管理员账号
    const db = await getDB();
    const adminPhone = '13800138000';

    // 检查用户是否存在
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get([adminPhone]);

    if (user) {
      // 用户存在，更新为管理员
      db.prepare("UPDATE users SET role = 'admin' WHERE phone = ?").run([adminPhone]);
      console.log(`✓ 已设置用户 ${adminPhone} 为管理员`);
    } else {
      // 用户不存在，创建管理员账号
      const { v4: uuidv4 } = require('uuid');
      const openid = uuidv4();
      db.prepare(`
        INSERT INTO users (openid, phone, role, created_at, last_login)
        VALUES (?, ?, 'admin', datetime('now'), datetime('now'))
      `).run([openid, adminPhone]);
      console.log(`✓ 已创建管理员账号: ${adminPhone}`);
    }

    // 立即保存到文件
    saveDatabase();
    console.log('✓ 数据库已保存到文件');
  } catch (error) {
    console.error('✗ 数据库初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initAppDatabase().then(() => {
    console.log('\n✓ 数据库初始化完成！');
    // 延迟退出确保数据库写入完成
    setTimeout(() => {
      closeDatabase();
      process.exit(0);
    }, 1000);
  });
}

module.exports = { initDatabase: initAppDatabase };
