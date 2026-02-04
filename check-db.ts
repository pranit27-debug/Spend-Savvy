import { connectToPostgres } from './lib/db.js';

async function checkTables() {
  try {
    const pool = await connectToPostgres();
    
    console.log('=== NOTIFICATION_LOGS TABLE ===');
    const nlResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notification_logs'
      ORDER BY ordinal_position
    `);
    console.log('Columns:', nlResult.rows);
    
    console.log('\n=== PARENT_CHILD_RELATIONSHIPS TABLE ===');
    const pcrResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'parent_child_relationships'
      ORDER BY ordinal_position
    `);
    console.log('Columns:', pcrResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkTables();
