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
          created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
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
          created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
          FOREIGN KEY (admin_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
        CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_type, target_id);
        CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
      `);
      console.log('✓ admin_logs表创建成功');
    }

    // ========== 用户角色升级和扩展字段迁移 ==========

    // ���查users表的扩展字段
    const userColumnsExtended = db.exec("PRAGMA table_info(users)");
    let hasTenantId = false;
    let hasTeacherTitle = false;
    let hasTeacherField = false;
    let hasStudentSchool = false;
    let hasStudentMajor = false;
    let hasStudentClass = false;
    let hasStudentGrade = false;
    let hasStudentLevel = false;
    let hasUserDisabledAt = false;
    let hasUserDisabledBy = false;
    let hasUserDisabledReason = false;

    if (userColumnsExtended.length > 0) {
      const extColNames = userColumnsExtended[0].values.map(col => col[1]);
      hasTenantId = extColNames.includes('tenant_id');
      hasTeacherTitle = extColNames.includes('teacher_title');
      hasTeacherField = extColNames.includes('teacher_field');
      hasStudentSchool = extColNames.includes('student_school');
      hasStudentMajor = extColNames.includes('student_major');
      hasStudentClass = extColNames.includes('student_class');
      hasStudentGrade = extColNames.includes('student_grade');
      hasStudentLevel = extColNames.includes('student_level');
      hasUserDisabledAt = extColNames.includes('disabled_at');
      hasUserDisabledBy = extColNames.includes('disabled_by');
      hasUserDisabledReason = extColNames.includes('disabled_reason');
    }

    // 多租户预留字段
    if (!hasTenantId) {
      console.log('⚙️  运行迁移: 添加users.tenant_id字段...');
      db.exec("ALTER TABLE users ADD COLUMN tenant_id INTEGER DEFAULT NULL");
      console.log('✓ users.tenant_id字段添加成功');
    }

    // 教师扩展字段
    if (!hasTeacherTitle) {
      console.log('⚙️  运行迁移: 添加users.teacher_title字段...');
      db.exec("ALTER TABLE users ADD COLUMN teacher_title TEXT");
      console.log('✓ users.teacher_title字段添加成功');
    }

    if (!hasTeacherField) {
      console.log('⚙️  运行迁移: 添加users.teacher_field字段...');
      db.exec("ALTER TABLE users ADD COLUMN teacher_field TEXT");
      console.log('✓ users.teacher_field字段添加成功');
    }

    // 学生扩展字段
    if (!hasStudentSchool) {
      console.log('⚙️  运行迁移: 添加users.student_school字段...');
      db.exec("ALTER TABLE users ADD COLUMN student_school TEXT");
      console.log('✓ users.student_school字段添加成功');
    }

    if (!hasStudentMajor) {
      console.log('⚙️  运行迁移: 添加users.student_major字段...');
      db.exec("ALTER TABLE users ADD COLUMN student_major TEXT");
      console.log('✓ users.student_major字段添加成功');
    }

    if (!hasStudentClass) {
      console.log('⚙️  运行迁移: 添加users.student_class字段...');
      db.exec("ALTER TABLE users ADD COLUMN student_class TEXT");
      console.log('✓ users.student_class字段添加成功');
    }

    if (!hasStudentGrade) {
      console.log('⚙️  运行迁移: 添加users.student_grade字段...');
      db.exec("ALTER TABLE users ADD COLUMN student_grade TEXT");
      console.log('✓ users.student_grade字段添加成功');
    }

    if (!hasStudentLevel) {
      console.log('⚙️  运行迁移: 添加users.student_level字段...');
      db.exec("ALTER TABLE users ADD COLUMN student_level TEXT");
      console.log('✓ users.student_level字段添加成功');
    }

    // 用户角色迁移：将 role='user' 迁移为 role='teacher'
    const userRoleCheck = db.exec("SELECT COUNT(*) as count FROM users WHERE role = 'user'");
    if (userRoleCheck.length > 0 && userRoleCheck[0].values[0][0] > 0) {
      console.log('⚙️  运行迁移: 将user角色升级为teacher...');
      db.exec("UPDATE users SET role = 'teacher' WHERE role = 'user'");
      console.log('✓ 用户角色升级完成');
    }

    // 用户禁用相关字段
    if (!hasUserDisabledAt) {
      console.log('⚙️  运行迁移: 添加users.disabled_at字段...');
      db.exec("ALTER TABLE users ADD COLUMN disabled_at DATETIME");
      console.log('✓ users.disabled_at字段添加成功');
    }

    if (!hasUserDisabledBy) {
      console.log('⚙️  运行迁移: 添加users.disabled_by字段...');
      db.exec("ALTER TABLE users ADD COLUMN disabled_by INTEGER");
      console.log('✓ users.disabled_by字段添加成功');
    }

    if (!hasUserDisabledReason) {
      console.log('⚙️  运行迁移: 添加users.disabled_reason字段...');
      db.exec("ALTER TABLE users ADD COLUMN disabled_reason TEXT");
      console.log('✓ users.disabled_reason字段添加成功');
    }

    // ========== 资源浏览记录表 ==========

    const resourceViewsTables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='resource_views'");
    if (resourceViewsTables.length === 0) {
      console.log('⚙️  运行迁移: 创建resource_views表...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS resource_views (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          resource_id INTEGER NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          start_time DATETIME NOT NULL,
          duration INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_resource_views_user_id ON resource_views(user_id);
        CREATE INDEX IF NOT EXISTS idx_resource_views_resource_id ON resource_views(resource_id);
        CREATE INDEX IF NOT EXISTS idx_resource_views_start_time ON resource_views(start_time DESC);
        CREATE INDEX IF NOT EXISTS idx_resource_views_user_resource ON resource_views(user_id, resource_id);
      `);
      console.log('✓ resource_views表创建成功');
    }

    // ========== 收藏夹功能表 ==========

    // 检查favorite_folders表是否存在
    const favoriteFoldersTables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='favorite_folders'");
    if (favoriteFoldersTables.length === 0) {
      console.log('⚙️  运行迁移: 创建favorite_folders表...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS favorite_folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          parent_id INTEGER DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
          updated_at DATETIME DEFAULT (datetime('now', '+8 hours')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_favorite_folders_user_id ON favorite_folders(user_id);
        CREATE INDEX IF NOT EXISTS idx_favorite_folders_parent_id ON favorite_folders(parent_id);
      `);
      console.log('✓ favorite_folders表创建成功');
    }

    // 检查favorites表是否存在
    const favoritesTables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='favorites'");
    if (favoritesTables.length === 0) {
      console.log('⚙️  运行迁移: 创建favorites表...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS favorites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          folder_id INTEGER DEFAULT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          custom_title TEXT,
          notes TEXT,
          description TEXT,
          thumbnail_url TEXT,
          source_url TEXT NOT NULL,
          bvid TEXT,
          video_duration INTEGER,
          author_name TEXT,
          play_count INTEGER,
          article_author TEXT,
          publish_time DATETIME,
          local_path TEXT,
          original_filename TEXT,
          file_size INTEGER,
          mime_type TEXT,
          width INTEGER,
          height INTEGER,
          metadata TEXT,
          fetch_time DATETIME DEFAULT (datetime('now', '+8 hours')),
          created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
          updated_at DATETIME DEFAULT (datetime('now', '+8 hours')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (folder_id) REFERENCES favorite_folders(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
        CREATE INDEX IF NOT EXISTS idx_favorites_folder_id ON favorites(folder_id);
        CREATE INDEX IF NOT EXISTS idx_favorites_type ON favorites(type);
        CREATE INDEX IF NOT EXISTS idx_favorites_bvid ON favorites(bvid);
        CREATE INDEX IF NOT EXISTS idx_favorites_source_url ON favorites(source_url);
      `);
      console.log('✓ favorites表创建成功');
    }

    // 检查favorites表是否有custom_title、notes和resource_id字段（为现有数据库添加）
    const favoritesColumns = db.exec("PRAGMA table_info(favorites)");
    let hasCustomTitle = false;
    let hasNotes = false;
    let hasResourceId = false;
    if (favoritesColumns.length > 0) {
      const favColNames = favoritesColumns[0].values.map(col => col[1]);
      hasCustomTitle = favColNames.includes('custom_title');
      hasNotes = favColNames.includes('notes');
      hasResourceId = favColNames.includes('resource_id');
    }

    if (!hasCustomTitle) {
      console.log('⚙️  运行迁移: 添加favorites.custom_title字段...');
      db.exec("ALTER TABLE favorites ADD COLUMN custom_title TEXT");
      console.log('✓ favorites.custom_title字段添加成功');
    }

    if (!hasNotes) {
      console.log('⚙️  运行迁移: 添加favorites.notes字段...');
      db.exec("ALTER TABLE favorites ADD COLUMN notes TEXT");
      console.log('✓ favorites.notes字段添加成功');
    }

    // 添加resource_id字段用于收藏课件资源
    if (!hasResourceId) {
      console.log('⚙️  运行迁移: 添加favorites.resource_id字段...');
      db.exec("ALTER TABLE favorites ADD COLUMN resource_id INTEGER");
      db.exec("CREATE INDEX IF NOT EXISTS idx_favorites_resource_id ON favorites(resource_id)");
      console.log('✓ favorites.resource_id字段添加成功');
    }

    // 如果有迁移执行，保存数据库
    const needsSave = !hasLikeCount || !hasDislikeCount || tables.length === 0 ||
        !hasIsDisabled || !hasDisabledAt || !hasDisabledBy || !hasDisabledReason ||
        !hasRole || !hasRealName || !hasOrganization || !hasProfileCompleted ||
        adminLogsTables.length === 0 ||
        !hasTenantId || !hasTeacherTitle || !hasTeacherField ||
        !hasStudentSchool || !hasStudentMajor || !hasStudentClass || !hasStudentGrade || !hasStudentLevel ||
        !hasUserDisabledAt || !hasUserDisabledBy || !hasUserDisabledReason ||
        resourceViewsTables.length === 0 ||
        favoriteFoldersTables.length === 0 || favoritesTables.length === 0 ||
        !hasCustomTitle || !hasNotes || !hasResourceId;

    if (needsSave) {
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
