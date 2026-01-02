/**
 * 强制重新创建数据库（用于修复schema问题）
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
require('dotenv').config();

async function forceRecreateDatabase() {
  console.log('=== 强制重新创建数据库 ===\n');

  const dbPath = process.env.DB_PATH || './database/teaching_resources.sqlite';

  // 1. 删除旧数据库
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✓ 删除旧数据库文件:', dbPath);
  }

  // 2. 创建新数据库
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  console.log('✓ 创建新数据库实例');

  // 3. 执行SQL脚本
  const sqlPath = path.join(__dirname, '../docs/database.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    db.exec(sql);
    console.log('✓ 执行SQL脚本成功');
  } catch (error) {
    console.error('✗ SQL执行失败:', error.message);
    process.exit(1);
  }

  // 4. 检查resources表结构
  const result = db.exec("PRAGMA table_info(resources);");
  console.log('\n=== resources表结构检查 ===');
  if (result.length > 0) {
    result[0].values.forEach(col => {
      const [cid, name, type, notnull, dflt_value, pk] = col;
      const nullableStr = notnull ? 'NOT NULL' : 'NULLABLE';
      console.log(`  ${name.padEnd(20)} ${type.padEnd(15)} ${nullableStr}`);
    });
  } else {
    console.log('  ⚠️  resources表不存在！');
  }

  // 4.5 检查所有表
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
  console.log('\n=== 所有表列表 ===');
  if (tables.length > 0) {
    tables[0].values.forEach(row => console.log('  - ' + row[0]));
  } else {
    console.log('  ⚠️  数据库中没有任何表！');
  }

  // 5. 保存到文件
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  console.log('\n✓ 数据库已保存到:', dbPath);

  db.close();
  console.log('✓ 数据库连接已关闭');
  console.log('\n=== 数据库重建成功！===');
}

forceRecreateDatabase().catch(error => {
  console.error('✗ 重建失败:', error);
  process.exit(1);
});
