import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class CreateTournamentTeamsTable1768000000000 implements MigrationInterface {
  name = 'CreateTournamentTeamsTable1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tournament_teams');

    if (!table) {
      // Create the tournament_teams table
      await queryRunner.createTable(
        new Table({
          name: 'tournament_teams',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'tournament_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'team_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'seed',
              type: 'integer',
              isNullable: false,
            },
            {
              name: 'region',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // Create foreign keys
      await queryRunner.createForeignKey(
        'tournament_teams',
        new TableForeignKey({
          columnNames: ['tournament_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'tournaments',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'tournament_teams',
        new TableForeignKey({
          columnNames: ['team_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'teams',
          onDelete: 'CASCADE',
        }),
      );

      // Create unique constraints
      await queryRunner.createIndex(
        'tournament_teams',
        new TableIndex({
          name: 'IDX_tournament_teams_tournament_team',
          columnNames: ['tournament_id', 'team_id'],
          isUnique: true,
        }),
      );

      await queryRunner.createIndex(
        'tournament_teams',
        new TableIndex({
          name: 'IDX_tournament_teams_tournament_region_seed',
          columnNames: ['tournament_id', 'region', 'seed'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tournament_teams');

    if (table) {
      await queryRunner.dropTable('tournament_teams');
    }
  }
}

