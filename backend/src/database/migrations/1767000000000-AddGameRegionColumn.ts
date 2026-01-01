import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGameRegionColumn1767000000000 implements MigrationInterface {
    name = 'AddGameRegionColumn1767000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "games" ADD "region" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "region"`);
    }

}

