const { initDatabase, saveDatabase, closeDatabase } = require('./connection');

/**
 * 数据库初始化脚本
 * 用于创建数据库表结构和初始数据
 */
async function initAppDatabase() {
  try {
    await initDatabase();
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
