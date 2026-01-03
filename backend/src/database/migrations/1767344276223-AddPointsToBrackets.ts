import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddPointsToBrackets1767344276223 implements MigrationInterface {
    name = 'AddPointsToBrackets1767344276223'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the email column already exists
        const table = await queryRunner.getTable('brackets');
        const pointsColumn = table?.findColumnByName('points_earned');

        if (!pointsColumn) {
            await queryRunner.addColumn('brackets', new TableColumn({
                name: 'points_earned',
                type: 'integer',
                default: 0,
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Check if the email column already exists
        const table = await queryRunner.getTable('brackets');
        const pointsColumn = table?.findColumnByName('points_earned');

        if (pointsColumn) {
            await queryRunner.dropColumn('brackets', 'points_earned');
        }
    }

}
