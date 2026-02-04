import { connectToPostgres } from './lib/db.js';

async function checkData() {
  try {
    const pool = await connectToPostgres();
    
    console.log('=== CHECKING PARENT-CHILD RELATIONSHIPS ===');
    const pcr = await pool.query('SELECT * FROM parent_child_relationships');
    console.log('Parent-child relationships:', pcr.rows);
    
    console.log('\n=== CHECKING USERS (PARENTS AND CHILDREN) ===');
    const users = await pool.query('SELECT id, name, email, role FROM users ORDER BY created_at DESC LIMIT 10');
    console.log('Recent users:', users.rows);
    
    console.log('\n=== CHECKING NOTIFICATION LOGS ===');
    const notifications = await pool.query('SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 5');
    console.log('Recent notifications:', notifications.rows);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkData();
