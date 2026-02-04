import { connectToPostgres } from '@/lib/db';

async function addPaymentColumns() {
  const db = await connectToPostgres();
  
  try {
    console.log('Adding payment tracking columns to expense_splits table...');
    
    // Add paid column if it doesn't exist
    await db.query(`
      ALTER TABLE expense_splits 
      ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT false
    `);
    
    // Add paid_at column if it doesn't exist
    await db.query(`
      ALTER TABLE expense_splits 
      ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP
    `);
    
    console.log('Successfully added payment tracking columns');
    console.log('- paid: BOOLEAN DEFAULT false');
    console.log('- paid_at: TIMESTAMP');
    
    // Check the current schema
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'expense_splits'
      ORDER BY ordinal_position
    `);
    
    console.log('\nCurrent expense_splits table schema:');
    result.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
  } catch (error) {
    console.error('Error adding payment columns:', error);
    throw error;
  }
}

// Run the migration
addPaymentColumns()
  .then(() => {
    console.log('\nMigration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
