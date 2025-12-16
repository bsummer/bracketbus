import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'brackets_db',
});

async function enableUuidExtension() {
  console.log('Enabling UUID extension...');
  
  try {
    await dataSource.initialize();
    
    // Enable the uuid-ossp extension
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    console.log('✅ UUID extension enabled successfully!');
    
    // Verify it's enabled
    const result = await dataSource.query(
      "SELECT * FROM pg_extension WHERE extname = 'uuid-ossp'"
    );
    
    if (result.length > 0) {
      console.log('✅ Extension verified:', result[0]);
    }
    
    await dataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Failed to enable UUID extension');
    console.error('Error:', error.message);
    console.error('');
    console.log('💡 You can also enable it manually:');
    console.log('   psql -U postgres -d brackets_db -c "CREATE EXTENSION IF NOT EXISTS \\"uuid-ossp\\";"');
    
    await dataSource.destroy().catch(() => {});
    process.exit(1);
  }
}

enableUuidExtension();

