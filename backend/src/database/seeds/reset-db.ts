import { AppDataSource } from '../../data-source';
import { seedDatabase } from './seed';

export async function reset() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    // Drop all tables
    console.log('Dropping all tables...');
    // await AppDataSource.dropDatabase();
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Drop all tables including the migrations table
      // Using CASCADE will handle all foreign key constraints
      const result = await queryRunner.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
      `);

      if (result.length > 0) {
        // Drop all tables with CASCADE to automatically handle foreign key constraints
        const tableNames = result.map((row: any) => `"${row.tablename}"`).join(', ');
        await queryRunner.query(`DROP TABLE IF EXISTS ${tableNames} CASCADE;`);
        console.log(`✅ Dropped ${result.length} tables (including migrations table)`);
      } else {
        console.log('✅ No tables to drop');
      }
    } catch (error) {
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Recreate tables
    console.log('Recreating tables...');
    await AppDataSource.synchronize();

    console.log('Database reset completed successfully!');
    console.log('Running seed script to populate initial data...');
    await seedDatabase(AppDataSource);
    console.log('Run the seed script to populate initial data.');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

reset();

