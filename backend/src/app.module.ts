import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BracketsModule } from './brackets/brackets.module';
import { PoolsModule } from './pools/pools.module';
import { GamesModule } from './games/games.module';
import { TeamsModule } from './teams/teams.module';
import { ScoresModule } from './scores/scores.module';
import { DatabaseController } from './database/database.controller';
import { getDatabaseConfig } from './database/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    AuthModule,
    UsersModule,
    BracketsModule,
    PoolsModule,
    GamesModule,
    TeamsModule,
    ScoresModule,
  ],
  controllers: [AppController, DatabaseController],
  providers: [AppService],
})
export class AppModule {}

