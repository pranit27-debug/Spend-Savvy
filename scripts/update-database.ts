import { initializeDatabase } from '../lib/db';

async function runDatabaseUpdate() {
  try {
    console.log('Initializing database with new parent-child monitoring schema...');
    await initializeDatabase();
    console.log('Database schema updated successfully!');
    
    // Test if the new tables were created
    const { connectToPostgres } = await import('../lib/db');
    const db = await connectToPostgres();
    
    // Check if role column exists in users table
    const roleCheck = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    console.log('Role column in users table:', roleCheck.rows.length > 0 ? 'EXISTS' : 'MISSING');
    
    // Check if parent_child_relationships table exists
    const relationshipTableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'parent_child_relationships'
    `);
    
    console.log('Parent-child relationships table:', relationshipTableCheck.rows.length > 0 ? 'EXISTS' : 'MISSING');
    
    // Check if notification_logs table exists
    const notificationLogsCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'notification_logs'
    `);
    
    console.log('Notification logs table:', notificationLogsCheck.rows.length > 0 ? 'EXISTS' : 'MISSING');
    
    console.log('Database verification completed!');
    
  } catch (error) {
    console.error('Error updating database:', error);
  }
}

runDatabaseUpdate();
