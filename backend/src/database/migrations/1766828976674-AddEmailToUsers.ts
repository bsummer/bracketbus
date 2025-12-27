import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailToUsers1766828976674 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the email column already exists
        const table = await queryRunner.getTable('users');
        const emailColumn = table?.findColumnByName('email');

        if (!emailColumn) {
            // Step 1: Add column as nullable first
            await queryRunner.addColumn(
                'users',
                new TableColumn({
                    name: 'email',
                    type: 'varchar',
                    length: '255',
                    isUnique: true,
                    isNullable: true, // Start as nullable
                })
            );

            // Step 2: Backfill existing users with placeholder emails
            // Replace with your actual logic
            await queryRunner.query(`
                UPDATE users 
                SET email = CONCAT('user_', id, '@placeholder.local')
                WHERE email IS NULL
            `);

            // Step 3: Make it NOT NULL
            await queryRunner.changeColumn(
                'users',
                'email',
                new TableColumn({
                    name: 'email',
                    type: 'varchar',
                    length: '255',
                    isUnique: true,
                    isNullable: false,
                })
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the email column if rolling back
        const table = await queryRunner.getTable('users');
        const emailColumn = table?.findColumnByName('email');

        if (emailColumn) {
            await queryRunner.dropColumn('users', 'email');
        }
    }
}