const initSqlJs = require('sql.js');
const fs = require('fs');

async function checkTables() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync('./database/teaching_resources.sqlite');
  const db = new SQL.Database(buffer);
  
  const result = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
  
  console.log('Tables in database:');
  if (result.length > 0) {
    result[0].values.forEach(row => {
      console.log('  - ' + row[0]);
    });
  } else {
    console.log('  (no tables)');
  }
  
  db.close();
}

checkTables().catch(console.error);
