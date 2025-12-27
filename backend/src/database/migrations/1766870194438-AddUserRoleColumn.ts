import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRoleColumn1766870194438 implements MigrationInterface {
    name = 'AddUserRoleColumn1766870194438'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`UPDATE "users" SET "role" = 'admin' WHERE "username" = 'admin' limit 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
