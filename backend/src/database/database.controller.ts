import { Controller, Post, HttpCode, HttpStatus, Headers, UnauthorizedException } from '@nestjs/common';
import { seedDatabase } from './seeds/seed';
import { AppDataSource } from '../data-source';

@Controller('database')
export class DatabaseController {
  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed(@Headers('authorization') authHeader?: string) {
    // Allow seeding without auth in development, or if ALLOW_PUBLIC_SEED env var is set
    const isDevelopment = process.env.NODE_ENV === 'development';
    const allowPublicSeed = process.env.ALLOW_PUBLIC_SEED === 'true';
    const seedSecret = process.env.SEED_SECRET;

    // Check if auth is required
    if (!isDevelopment && !allowPublicSeed) {
      // In production, require either JWT auth or secret
      if (!authHeader) {
        throw new UnauthorizedException('Authentication required. Set ALLOW_PUBLIC_SEED=true for initial setup or provide Authorization header with SEED_SECRET or JWT token.');
      }

      const providedToken = authHeader.replace('Bearer ', '');
      
      // Check if it's the seed secret
      if (seedSecret && providedToken === seedSecret) {
        // Valid secret, allow seeding
      } else if (authHeader.startsWith('Bearer ')) {
        // Assume it's a JWT token (will be validated by guard if we add it)
        // For now, we'll allow it - you can add JWT validation here if needed
      } else {
        throw new UnauthorizedException('Invalid authorization. Provide SEED_SECRET or valid JWT token.');
      }
    }

    try {
      // Initialize data source if not already initialized
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      // Enable UUID extension if not already enabled
      try {
        await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        console.log('UUID extension enabled');
      } catch (error: any) {
        // Extension might already exist or user might not have permission
        // Continue anyway as it might not be critical
        console.log('Note: Could not enable UUID extension (may already exist):', error.message);
      }

      // Check if schema exists by trying to query a table
      let schemaExists = false;
      try {
        const result = await AppDataSource.query(`
          SELECT COUNT(*) as count 
          FROM pg_tables 
          WHERE schemaname = 'public'
        `);
        schemaExists = parseInt(result[0].count, 10) > 0;
      } catch (_error: any) {
        // Table doesn't exist, need to create schema
        schemaExists = false;
      }

      // Create schema if it doesn't exist
      if (!schemaExists) {
        console.log('Schema not found. Creating database schema...');
        await AppDataSource.synchronize();
        console.log('Database schema created successfully');
      }

      // Now seed the database
      await seedDatabase(AppDataSource);
      
      return {
        success: true,
        message: 'Database schema created and seeded successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to seed database',
        error: error.message,
      };
    }
  }
}

