const initSqlJs = require('sql.js');
const fs = require('fs');
require('dotenv').config();

async function checkCurrentDB() {
  const dbPath = process.env.DB_PATH || './database/teaching_resources.sqlite';

  console.log('检查数据库文件:', dbPath);
  console.log('绝对路径:', require('path').resolve(dbPath), '\n');

  if (!fs.existsSync(dbPath)) {
    console.log('✗ 数据库文件不存在！');
    return;
  }

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // 检查resources表结构
  const result = db.exec("PRAGMA table_info(resources);");

  console.log('=== resources表字段 ===');
  if (result.length > 0) {
    console.log('字段名'.padEnd(20), '类型'.padEnd(15), '是否可空');
    console.log('-'.repeat(60));
    result[0].values.forEach(col => {
      const [cid, name, type, notnull, dflt_value, pk] = col;
      const nullStr = notnull ? 'NOT NULL' : 'NULLABLE';
      console.log(name.padEnd(20), type.padEnd(15), nullStr);

      if (name === 'template_id' && notnull === 1) {
        console.log('\n⚠️  警告：template_id 是 NOT NULL，这会导致保存失败！');
      }
    });
  }

  db.close();
}

checkCurrentDB().catch(console.error);
