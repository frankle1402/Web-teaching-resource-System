const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * 数据库连接管理 (使用SQL.js)
 * SQL.js是纯JavaScript实现的SQLite，无需编译
 */
let db = null;
let SQL = null;

/**
 * 初始化数据库连接
 */
async function initDatabase() {
  // 始终重新加载数据库（避免缓存问题）
  if (db) {
    try {
      db.close();
    } catch (error) {
      // 忽略
    }
    db = null;
  }

  // 强制清除SQL模块缓存
  SQL = null;

  const dbPath = process.env.DB_PATH || './database/teaching_resources.sqlite';
  const dbDir = path.dirname(dbPath);

  // 确保database目录存在
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // 加载SQL.js
  SQL = await initSqlJs();

  // 如果数据库文件存在，则加载
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('✓ 数据库连接成功（从文件加载）');

    // 注释掉自动schema检测和重建逻辑，避免意外清空数据库
    // 如果需要更新schema，请手动删除数据库文件或运行迁移脚本

    // // 检查schema版本（template_id是否为NOT NULL）
    // try {
    //   const pragmaResult = db.exec("PRAGMA table_info(resources);");
    //   if (pragmaResult.length > 0) {
    //     const templateIdCol = pragmaResult[0].values.find(col => col[1] === 'template_id');
    //     if (templateIdCol && templateIdCol[3] === 1) { // notnull = 1 表示 NOT NULL
    //       console.log('⚠️  检测到旧schema（template_id为NOT NULL），自动重建数据库...');
    //       db.close();
    //       db = new SQL.Database();
    //
    //       const sqlPath = path.join(__dirname, '../../../docs/database.sql');
    //       if (fs.existsSync(sqlPath)) {
    //         const sql = fs.readFileSync(sqlPath, 'utf-8');
    //         db.exec(sql);
    //         console.log('✓ 数据库已更新到新schema');
    //         saveDatabase();
    //       }
    //     }
    //   }
    // } catch (error) {
    //   console.error('Schema检查失败:', error.message);
    // }
  } else {
    // 创建新数据库
    db = new SQL.Database();
    console.log('✓ 创建新数据库');

    // 读取并执行SQL脚本
    const sqlPath = path.join(__dirname, '../../../docs/database.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      // 使用db.exec()执行整个SQL脚本（SQL.js支持多语句执行）
      try {
        db.exec(sql);
        console.log('✓ 数据库表创建成功');
      } catch (error) {
        console.error('SQL执行错误:', error.message);
      }

      // 保存到文件
      saveDatabase();
    }
  }

  return db;
}

/**
 * 保存数据库到文件
 */
function saveDatabase() {
  if (!db) return;

  const dbPath = process.env.DB_PATH || './database/teaching_resources.sqlite';
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * 获取数据库连接
 */
async function getDatabase() {
  if (!db) {
    await initDatabase();
  }
  return db;
}

/**
 * 关闭数据库连接
 */
function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('✓ 数据库连接已关闭');
  }
}

/**
 * 封装数据库查询方法（模拟better-sqlite3的API）
 */
class DatabaseHelper {
  constructor(db) {
    this.db = db;
  }

  /**
   * 准备SQL语句
   */
  prepare(sql) {
    const db = this.db;
    return {
      all: (params = []) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
      get: (params = []) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        let result = null;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      },
      run: (params = []) => {
        db.run(sql, params);
        const lastId = db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0;
        return {
          lastInsertRowid: lastId,
          changes: db.getRowsModified()
        };
      }
    };
  }

  /**
   * 执行SQL语句
   */
  exec(sql) {
    this.db.exec(sql);
  }

  /**
   * PRAGMA命令
   */
  pragma(cmd) {
    this.db.exec(`PRAGMA ${cmd}`);
  }
}

// 包装getDatabase方法以返回helper
async function getDB() {
  const database = await getDatabase();
  return new DatabaseHelper(database);
}

// 进程退出时保存并关闭数据库
process.on('exit', closeDatabase);
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

// 自动保存（每30秒）
setInterval(() => {
  if (db) saveDatabase();
}, 30000);

module.exports = {
  initDatabase,
  getDatabase,
  getDB,
  saveDatabase,
  closeDatabase
};
