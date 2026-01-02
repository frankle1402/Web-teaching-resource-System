const { getDB } = require('./src/database/connection');

async function checkSchema() {
  const db = await getDB();

  try {
    console.log('检查resources表结构...\n');

    const result = db.exec("PRAGMA table_info(resources)");

    if (result && result.length > 0) {
      console.log('当前表结构:');
      result[0].values.forEach(col => {
        console.log(`  - ${col[1]} (${col[2]})`);
      });
    }

    // 检查是否存在course_level列
    try {
      db.exec("SELECT course_level FROM resources LIMIT 1");
      console.log('\n✓ course_level列存在');
    } catch (error) {
      console.log('\n✗ course_level列不存在！');
      console.log('需要重新创建数据库');
    }

    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkSchema();
