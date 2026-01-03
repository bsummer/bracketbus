import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBracketsWinnerIdColumn1767415020901 implements MigrationInterface {
    name = 'AddBracketsWinnerIdColumn1767415020901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        const table = await queryRunner.getTable('brackets');
        const winnerIdColumn = table?.findColumnByName('winner_id');

        if (!winnerIdColumn) {
            await queryRunner.addColumn('brackets', new TableColumn({
                name: 'winner_id',
                type: 'varchar',
                isNullable: true,
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Check if the email column already exists
        const table = await queryRunner.getTable('brackets');
        const winnerIdColumn = table?.findColumnByName('winner_id');

        if (winnerIdColumn) {
            await queryRunner.dropColumn('brackets', 'winner_id');
        }
    }

}
