import { connectToPostgres } from '../lib/db';

async function updateDatabaseSchema() {
  console.log('Starting database schema update...');
  
  try {
    const db = await connectToPostgres();
    
    // Add role column to users table if it doesn't exist
    console.log('Adding role column to users table...');
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' 
      CHECK (role IN ('user', 'parent'))
    `);
    
    // Create parent_child_relationships table
    console.log('Creating parent_child_relationships table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS parent_child_relationships (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        child_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        threshold_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(parent_id, child_id)
      )
    `);
    
    // Create notification_logs table for tracking sent notifications
    console.log('Creating notification_logs table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        relationship_id VARCHAR(255) REFERENCES parent_child_relationships(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('spending_threshold', 'safety_alert')),
        alert_type VARCHAR(50),
        message TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Database schema update completed successfully!');
    
    // Verify the changes
    console.log('Verifying tables...');
    
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('parent_child_relationships', 'notification_logs')
    `);
    
    console.log('New tables created:', tables.rows.map(row => row.table_name));
    
    // Check if role column exists
    const roleColumn = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name = 'role'
    `);
    
    if (roleColumn.rows.length > 0) {
      console.log('Role column successfully added to users table');
    } else {
      console.log('Warning: Role column not found in users table');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1);
  }
}

updateDatabaseSchema();
