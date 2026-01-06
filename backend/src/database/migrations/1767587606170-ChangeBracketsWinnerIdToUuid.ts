import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeBracketsWinnerIdToUuid1767587606170 implements MigrationInterface {
    name = 'ChangeBracketsWinnerIdToUuid1767587606170'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the column exists and is not already UUID type
        const table = await queryRunner.getTable('brackets');
        const winnerIdColumn = table?.findColumnByName('winner_id');

        if (winnerIdColumn && winnerIdColumn.type !== 'uuid') {
            // First, ensure any existing values are valid UUIDs or NULL
            // This will fail if there are invalid UUID strings, so handle that first
            await queryRunner.query(`
                UPDATE brackets 
                SET winner_id = NULL 
                WHERE winner_id IS NOT NULL 
                AND winner_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            `);

            // Change the column type to UUID, casting valid UUID strings
            await queryRunner.query(`
                ALTER TABLE brackets 
                ALTER COLUMN winner_id TYPE uuid 
                USING CASE 
                    WHEN winner_id IS NULL THEN NULL 
                    ELSE winner_id::uuid 
                END
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('brackets');
        const winnerIdColumn = table?.findColumnByName('winner_id');

        if (winnerIdColumn && winnerIdColumn.type === 'uuid') {
            // Revert back to varchar
            await queryRunner.query(`
                ALTER TABLE brackets 
                ALTER COLUMN winner_id TYPE varchar 
                USING winner_id::text
            `);
        }
    }
}