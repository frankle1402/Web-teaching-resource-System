const initSqlJs = require('sql.js');
const fs = require('fs');

async function checkSchema() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync('./database/teaching_resources.sqlite');
  const db = new SQL.Database(buffer);
  
  const result = db.exec("PRAGMA table_info(resources);");
  
  console.log('resources table structure:');
  if (result.length > 0) {
    const columns = result[0];
    console.log('Fields:');
    for (let i = 0; i < columns.values.length; i++) {
      const col = columns.values[i];
      console.log('  ' + col.join(' | '));
    }
  }
  
  db.close();
}

checkSchema().catch(console.error);
