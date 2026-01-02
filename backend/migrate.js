require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function migrateDatabase() {
  try {
    console.log('开始数据库迁移...\n');

    const dbPath = process.env.DB_PATH || './database/teaching_resources.sqlite';

    // 删除旧数据库
    if (fs.existsSync(dbPath)) {
      console.log('✓ 删除旧数据库文件');
      fs.unlinkSync(dbPath);
    }

    // 重新创建数据库
    console.log('✓ 重新初始化数据库');
    const { initDatabase } = require('./src/database/init');
    await initDatabase();

    console.log('\n✓ 数据库迁移成功完成！');
    console.log('  - 使用最新的schema创建数据库');
    console.log('  - education_level → course_level');
    console.log('  - topic → subject');
    console.log('  - html_content → content_html');
    console.log('  - status INTEGER → status TEXT');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ 数据库迁移失败:', error);
    process.exit(1);
  }
}

// 运行迁移
migrateDatabase();
