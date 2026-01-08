// 直接使用 SQL.js 修改数据库文件并保存
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function setAdminRole() {
  try {
    const dbPath = path.join(__dirname, 'database/teaching_resources.sqlite');

    console.log('数据库文件路径:', dbPath);
    console.log('文件是否存在:', fs.existsSync(dbPath));

    // 读取现有数据库
    const SQL = await initSqlJs();
    let db;

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
      console.log('已加载现有数据库');
    } else {
      db = new SQL.Database();
      console.log('创建新数据库');
    }

    // 查询当前状态
    const users = db.exec("SELECT phone, role FROM users WHERE phone = '13800138000'");
    console.log('\n修改前的数据:');
    if (users.length > 0 && users[0].values.length > 0) {
      console.log('  手机号:', users[0].values[0][0]);
      console.log('  角色:', users[0].values[0][1]);
    }

    // 更新角色
    db.exec("UPDATE users SET role = 'admin' WHERE phone = '13800138000'");
    console.log('\n已执行 UPDATE 语句');

    // 验证更新
    const after = db.exec("SELECT phone, role FROM users WHERE phone = '13800138000'");
    console.log('\n修改后（内存中）:');
    if (after.length > 0 && after[0].values.length > 0) {
      console.log('  手机号:', after[0].values[0][0]);
      console.log('  角色:', after[0].values[0][1]);
    }

    // 导出并写入文件
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log('\n✓ 已写入数据库文件');

    // 关闭数据库
    db.close();
    console.log('✓ 已关闭数据库连接');

    // 重新读取验证
    const buffer2 = fs.readFileSync(dbPath);
    const db2 = new SQL.Database(buffer2);
    const verify = db2.exec("SELECT phone, role FROM users WHERE phone = '13800138000'");
    console.log('\n重新读取验证:');
    if (verify.length > 0 && verify[0].values.length > 0) {
      console.log('  手机号:', verify[0].values[0][0]);
      console.log('  角色:', verify[0].values[0][1]);

      if (verify[0].values[0][1] === 'admin') {
        console.log('\n✓✓✓ 成功！数据库文件已保存为 admin ✓✓✓');
      } else {
        console.log('\n❌ 失败！角色仍然是:', verify[0].values[0][1]);
      }
    }
    db2.close();

  } catch (error) {
    console.error('错误:', error.message);
  }
}

setAdminRole();
