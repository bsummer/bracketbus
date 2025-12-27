import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppDataSource } from './data-source';

async function bootstrap() {
  // Run migrations BEFORE starting NestJS app
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.runMigrations();
    console.log('Migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
    // Decide: throw to prevent app start, or continue?
    // In production, you probably want to throw
    throw error;
  }

  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:19006',
      'https://gobracketbus.onrender.com', // Add your frontend Render URL
      process.env.FRONTEND_URL,
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  Logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
}

bootstrap();

