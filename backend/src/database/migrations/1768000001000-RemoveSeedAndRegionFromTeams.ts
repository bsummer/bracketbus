import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveSeedAndRegionFromTeams1768000001000 implements MigrationInterface {
  name = 'RemoveSeedAndRegionFromTeams1768000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('teams');

    if (table) {
      // Check and drop seed column if it exists
      const seedColumn = table.findColumnByName('seed');
      if (seedColumn) {
        await queryRunner.dropColumn('teams', 'seed');
      }

      // Check and drop region column if it exists
      const regionColumn = table.findColumnByName('region');
      if (regionColumn) {
        await queryRunner.dropColumn('teams', 'region');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('teams');

    if (table) {
      // Re-add seed column if it doesn't exist
      const seedColumn = table.findColumnByName('seed');
      if (!seedColumn) {
        await queryRunner.addColumn(
          'teams',
          new TableColumn({
            name: 'seed',
            type: 'integer',
            isNullable: true,
          }),
        );
      }

      // Re-add region column if it doesn't exist
      const regionColumn = table.findColumnByName('region');
      if (!regionColumn) {
        await queryRunner.addColumn(
          'teams',
          new TableColumn({
            name: 'region',
            type: 'varchar',
            isNullable: true,
          }),
        );
      }
    }
  }
}

