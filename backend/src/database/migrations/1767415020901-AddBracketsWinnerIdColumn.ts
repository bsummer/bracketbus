import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddUsersWinnerIdColumn1767415020901 implements MigrationInterface {
    name = 'AddUsersWinnerIdColumn1767415020901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        const table = await queryRunner.getTable('brackets');
        const winnerIdColumn = table?.findColumnByName('winner_id');

        if (!winnerIdColumn) {
            await queryRunner.addColumn('users', new TableColumn({
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
            await queryRunner.dropColumn('users', 'winner_id');
        }
    }

}
