const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * 运行数据��迁移
 * 添加新字段和新表
 */
function runMigrations(db) {
  try {
    // 检查resource_likes表是否存在
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='resource_likes'");
    if (tables.length === 0) {
      console.log('⚙️  运行迁移: 创建resource_likes表...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS resource_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          resource_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          like_type TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(resource_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_resource_likes_resource_id ON resource_likes(resource_id);
        CREATE INDEX IF NOT EXISTS idx_resource_likes_user_id ON resource_likes(user_id);
      `);
      console.log('✓ resource_likes表创建成功');
    }

    // 检查resources表是否有like_count字段
    const columns = db.exec("PRAGMA table_info(resources)");
    let hasLikeCount = false;
    let hasDislikeCount = false;
    let hasIsDisabled = false;
    let hasDisabledAt = false;
    let hasDisabledBy = false;
    let hasDisabledReason = false;

    if (columns.length > 0) {
      const colNames = columns[0].values.map(col => col[1]);
      hasLikeCount = colNames.includes('like_count');
      hasDislikeCount = colNames.includes('dislike_count');
      hasIsDisabled = colNames.includes('is_disabled');
      hasDisabledAt = colNames.includes('disabled_at');
      hasDisabledBy = colNames.includes('disabled_by');
      hasDisabledReason = colNames.includes('disabled_reason');
    }

    if (!hasLikeCount) {
      console.log('⚙️  运行迁移: 添加like_count字段...');
      db.exec("ALTER TABLE resources ADD COLUMN like_count INTEGER DEFAULT 0");
      console.log('✓ like_count字段添加成功');
    }

    if (!hasDislikeCount) {
      console.log('⚙️  运行迁移: 添加dislike_count字段...');
      db.exec("ALTER TABLE resources ADD COLUMN dislike_count INTEGER DEFAULT 0");
      console.log('✓ dislike_count字段添加成功');
    }

    // 添加资源禁用相关字段
    if (!hasIsDisabled) {
      console.log('⚙️  运行迁移: 添加is_disabled字段...');
      db.exec("ALTER TABLE resources ADD COLUMN is_disabled INTEGER DEFAULT 0");
      console.log('✓ is_disabled字段添加成功');
    }

    if (!hasDisabledAt) {
      console.log('⚙️  运行迁移: 添加disabled_at字段...');
      db.exec("ALTER TABLE resources ADD COLUMN disabled_at DATETIME");
      console.log('✓ disabled_at字段添加成功');
    }

    if (!hasDisabledBy) {
      console.log('⚙️  运行迁移: 添加disabled_by字段...');
      db.exec("ALTER TABLE resources ADD COLUMN disabled_by INTEGER");
      console.log('✓ disabled_by字段添加成功');
    }

    if (!hasDisabledReason) {
      console.log('⚙️  运行迁移: 添加disabled_reason字段...');
      db.exec("ALTER TABLE resources ADD COLUMN disabled_reason TEXT");
      console.log('✓ disabled_reason字段添加成功');
    }

    // 检查users表是否有role字段
    const userColumns = db.exec("PRAGMA table_info(users)");
    let hasRole = false;
    let hasRealName = false;
    let hasOrganization = false;
    let hasProfileCompleted = false;
    if (userColumns.length > 0) {
      const userColNames = userColumns[0].values.map(col => col[1]);
      hasRole = userColNames.includes('role');
      hasRealName = userColNames.includes('real_name');
      hasOrganization = userColNames.includes('organization');
      hasProfileCompleted = userColNames.includes('profile_completed');
    }

    if (!hasRole) {
      console.log('⚙️  运行迁移: 添加users.role字段...');
      db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
      console.log('✓ users.role字段添加成功');
    }

    // 用户资料完善相关字段
    if (!hasRealName) {
      console.log('⚙️  运行迁移: 添加users.real_name字段...');
      db.exec("ALTER TABLE users ADD COLUMN real_name TEXT");
      console.log('✓ users.real_name字段添加成功');
    }

    if (!hasOrganization) {
      console.log('⚙️  运行迁移: 添加users.organization字段...');
      db.exec("ALTER TABLE users ADD COLUMN organization TEXT");
      console.log('✓ users.organization字段添加成功');
    }

    if (!hasProfileCompleted) {
      console.log('⚙️  运行迁移: 添加users.profile_completed字段...');
      db.exec("ALTER TABLE users ADD COLUMN profile_completed INTEGER DEFAULT 0");
      console.log('✓ users.profile_completed字段添加成功');
    }

    // 检查admin_logs表是否存在
    const adminLogsTables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_logs'");
    if (adminLogsTables.length === 0) {
      console.log('⚙️  运行迁移: 创建admin_logs表...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS admin_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id INTEGER NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
        CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_type, target_id);
        CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
      `);
      console.log('✓ admin_logs表创建成功');
    }

    // 如果有迁移执行，保存数据库
    if (!hasLikeCount || !hasDislikeCount || tables.length === 0 ||
        !hasIsDisabled || !hasDisabledAt || !hasDisabledBy || !hasDisabledReason ||
        !hasRole || !hasRealName || !hasOrganization || !hasProfileCompleted ||
        adminLogsTables.length === 0) {
      saveDatabase();
      console.log('✓ 数据库迁移完成并保存');
    }
  } catch (error) {
    // 忽略字段已存在的错误
    if (!error.message.includes('duplicate column name')) {
      console.error('迁移警告:', error.message);
    }
  }
}

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

    // 数据库迁移：添加新字段和新表
    runMigrations(db);

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
