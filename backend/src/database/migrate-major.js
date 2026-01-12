/**
 * 数据迁移脚本：将 major 字段从单字符串转换为 JSON 数组格式
 *
 * 使用方法：
 * cd backend
 * node src/database/migrate-major.js
 */

const { getDB, saveDatabase } = require('./connection');

async function migrateMajorField() {
  console.log('开始迁移 major 字段...\n');

  try {
    const db = await getDB();

    // 获取所有资源
    const resources = db.prepare('SELECT id, major FROM resources').all();
    console.log(`共找到 ${resources.length} 条资源记录\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const resource of resources) {
      const { id, major } = resource;

      // 跳过空值
      if (!major) {
        console.log(`资源 ID ${id}: major 为空，跳过`);
        skippedCount++;
        continue;
      }

      // 检查是否已经是 JSON 数组格式
      try {
        const parsed = JSON.parse(major);
        if (Array.isArray(parsed)) {
          console.log(`资源 ID ${id}: 已是数组格式 ${major}，跳过`);
          skippedCount++;
          continue;
        }
      } catch (e) {
        // 不是 JSON 格式，需要迁移
      }

      // 转换为 JSON 数组格式
      const majorArray = JSON.stringify([major]);

      try {
        db.prepare('UPDATE resources SET major = ? WHERE id = ?').run([majorArray, id]);
        console.log(`资源 ID ${id}: "${major}" -> ${majorArray}`);
        migratedCount++;
      } catch (err) {
        console.error(`资源 ID ${id}: 迁移失败 - ${err.message}`);
        errorCount++;
      }
    }

    // 保存数据库
    saveDatabase();

    console.log('\n迁移完成！');
    console.log(`- 成功迁移: ${migratedCount} 条`);
    console.log(`- 跳过: ${skippedCount} 条`);
    console.log(`- 失败: ${errorCount} 条`);

  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

// 执行迁移
migrateMajorField().then(() => {
  console.log('\n脚本执行完毕');
  process.exit(0);
}).catch(err => {
  console.error('脚本执行出错:', err);
  process.exit(1);
});
