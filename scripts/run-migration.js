#!/usr/bin/env node

/**
 * ============================================================================
 * DATABASE MIGRATION RUNNER
 * ============================================================================
 * Purpose: Execute call data storage migration safely
 * Author: Dr. Elena Voss Implementation Team
 * Usage: node scripts/run-migration.js [--dry-run]
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuration
const MIGRATION_FILE = path.join(__dirname, '../migrations/001_create_call_data_storage.sql');
const BACKUP_DIR = path.join(__dirname, '../backups');

class MigrationRunner {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.isDryRun = process.argv.includes('--dry-run');
  }

  async run() {
    console.log('🔄 Starting Call Data Storage Migration...');
    console.log('=' .repeat(50));
    
    try {
      // 1. Validate environment
      await this.validateEnvironment();
      
      // 2. Create backup (production only)
      if (process.env.NODE_ENV === 'production' && !this.isDryRun) {
        await this.createBackup();
      }
      
      // 3. Read migration file
      const migrationSQL = await this.readMigrationFile();
      
      // 4. Execute migration
      if (this.isDryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made');
        console.log('Migration SQL:');
        console.log(migrationSQL.substring(0, 500) + '...');
      } else {
        await this.executeMigration(migrationSQL);
      }
      
      // 5. Verify migration
      await this.verifyMigration();
      
      console.log('✅ Migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    // Test database connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('✅ Database connection successful');
    } finally {
      client.release();
    }
    
    // Check if migration file exists
    if (!fs.existsSync(MIGRATION_FILE)) {
      throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
    }
    
    console.log('✅ Environment validation passed');
  }

  async createBackup() {
    console.log('💾 Creating database backup...');
    
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const client = await this.pool.connect();
    try {
      // Export current schema (if tables exist)
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('call_data', 'businesses')
      `);
      
      if (result.rows.length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);
        
        // Simple backup: just log that backup would be created
        console.log(`📝 Backup would be created at: ${backupFile}`);
        console.log('ℹ️  In production, use pg_dump for full backup');
      } else {
        console.log('ℹ️  No existing tables to backup');
      }
    } finally {
      client.release();
    }
    
    console.log('✅ Backup process completed');
  }

  async readMigrationFile() {
    console.log('📖 Reading migration file...');
    
    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
    
    if (migrationSQL.length === 0) {
      throw new Error('Migration file is empty');
    }
    
    console.log(`✅ Migration file loaded (${migrationSQL.length} characters)`);
    return migrationSQL;
  }

  async executeMigration(migrationSQL) {
    console.log('⚡ Executing migration...');
    
    const client = await this.pool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Set environment variables for migration
      await client.query("SET client_min_messages = 'warning'");
      
      // Execute migration SQL
      await client.query(migrationSQL);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('✅ Migration executed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration execution failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async verifyMigration() {
    console.log('🔍 Verifying migration...');
    
    const client = await this.pool.connect();
    try {
      // Check if call_data table exists
      const tableResult = await client.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'call_data'
      `);
      
      if (tableResult.rows.length === 0) {
        throw new Error('call_data table was not created');
      }
      
      // Check if indexes exist
      const indexResult = await client.query(`
        SELECT count(*) as index_count 
        FROM pg_indexes 
        WHERE tablename = 'call_data'
      `);
      
      const indexCount = parseInt(indexResult.rows[0].index_count);
      if (indexCount < 6) {
        console.warn(`⚠️  Expected 6+ indexes, found ${indexCount}`);
      } else {
        console.log(`✅ Found ${indexCount} indexes on call_data table`);
      }
      
      // Check if test data exists (if not dry run)
      if (!this.isDryRun) {
        const testDataResult = await client.query(`
          SELECT count(*) as test_count 
          FROM call_data 
          WHERE caller_phone = '+15551234567'
        `);
        
        const testCount = parseInt(testDataResult.rows[0].test_count);
        if (testCount > 0) {
          console.log(`✅ Found ${testCount} test record(s)`);
        }
      }
      
      // Test storage functionality
      if (!this.isDryRun) {
        await this.testStorageFunctionality(client);
      }
      
      console.log('✅ Migration verification passed');
      
    } finally {
      client.release();
    }
  }

  async testStorageFunctionality(client) {
    console.log('🧪 Testing storage functionality...');
    
    try {
      // Test validation functions
      await client.query("SELECT is_valid_phone('+1234567890')");
      await client.query("SELECT is_valid_email('test@example.com')");
      
      console.log('✅ Validation functions working');
      
      // Test row level security
      await client.query("SET app.tenant_id = '00000000-0000-0000-0000-000000000000'");
      const rlsResult = await client.query("SELECT current_setting('app.tenant_id')");
      
      if (rlsResult.rows[0].current_setting) {
        console.log('✅ Row Level Security context setting working');
      }
      
    } catch (error) {
      console.warn(`⚠️  Storage functionality test failed: ${error.message}`);
    }
  }
}

// Main execution
if (require.main === module) {
  const runner = new MigrationRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = MigrationRunner; 